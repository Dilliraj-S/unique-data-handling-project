/**
 * MailcowImapService
 * 
 * Manages persistent IMAP IDLE connections to 50 Mailcow accounts.
 * 
 * How it works:
 * 1. Connects to each Mailcow account's IMAP server
 * 2. Opens INBOX and issues IDLE command
 * 3. When a new email arrives, IMAP server pushes a notification
 * 4. We fetch the new email, classify it, and enqueue actions
 * 5. IDLE connection auto-reconnects on disconnect with exponential backoff
 * 
 * Prerequisites:
 * - imapflow npm package: npm install imapflow
 * - Mailcow accounts with IMAP enabled
 * - IMAP port 993 (SSL) accessible from server
 * 
 * Memory: Each IDLE connection uses ~2-5MB. 50 accounts = ~250MB total.
 */

const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const SmartClassifier = require('./SmartClassifier');
const syncActionQueue = require('../../../queues/syncActionQueue');

class MailcowImapService {

  /**
   * @param {Object} db - MongoDB pluto database
   */
  constructor(db) {
    this.db = db;
    this.connections = new Map(); // email → { client, reconnectTimer, reconnectCount }
    this.isShuttingDown = false;
  }

  /**
   * Start IMAP IDLE for a single Mailcow account
   * 
   * @param {Object} account - Email account from DB
   */
  async startIdle(account) {
    if (account.type === 'google') {
      console.warn(`[MailcowIMAP] Skipping Google account: ${account.email}`);
      return;
    }

    const email = account.email;
    
    // Close existing connection if any
    if (this.connections.has(email)) {
      await this.stopIdle(email);
    }

    console.log(`[MailcowIMAP] Starting IDLE for ${email}...`);

    const client = new ImapFlow({
      host: account.imap_host || account.outgoing_host,
      port: account.imap_port || 993,
      secure: true,
      auth: {
        user: account.email,
        pass: account.password
      },
      logger: false, // Disable verbose IMAP logging
      emitLogs: false,
      tls: {
        rejectUnauthorized: false // Mailcow self-signed certs
      }
    });

    const connState = {
      client,
      reconnectTimer: null,
      reconnectCount: 0,
      lastActivity: new Date()
    };

    this.connections.set(email, connState);

    try {
      await client.connect();
      console.log(`[MailcowIMAP] ✅ Connected: ${email}`);

      // Update DB
      await this.db.collection('email_accounts').updateOne(
        { email },
        {
          $set: {
            imap_idle_active: true,
            imap_idle_connected_at: new Date(),
            imap_idle_error: null,
            updated_at: new Date()
          }
        }
      );

      // Open INBOX
      const mailbox = await client.getMailboxLock('INBOX');

      try {
        // Listen for new emails
        client.on('exists', async (data) => {
          connState.lastActivity = new Date();
          console.log(`[MailcowIMAP] 📬 New email(s) in ${email}: ${data.count} total`);
          
          try {
            await this._fetchNewEmails(client, account);
          } catch (fetchErr) {
            console.error(`[MailcowIMAP] Fetch error for ${email}:`, fetchErr.message);
          }
        });

        // Start IDLE — this blocks until connection drops or new mail arrives
        // imapflow handles IDLE renewal (RFC says max 29 min, imapflow renews at 20 min)
        while (!this.isShuttingDown && client.usable) {
          try {
            await client.idle();
          } catch (idleErr) {
            if (!this.isShuttingDown) {
              console.warn(`[MailcowIMAP] IDLE interrupted for ${email}:`, idleErr.message);
              break;
            }
          }
        }
      } finally {
        mailbox.release();
      }
    } catch (err) {
      console.error(`[MailcowIMAP] ❌ Connection failed for ${email}:`, err.message);

      await this.db.collection('email_accounts').updateOne(
        { email },
        {
          $set: {
            imap_idle_active: false,
            imap_idle_error: err.message,
            updated_at: new Date()
          },
          $inc: { imap_idle_reconnect_count: 1 }
        }
      );
    }

    // Auto-reconnect if not shutting down
    if (!this.isShuttingDown) {
      this._scheduleReconnect(account);
    }
  }

  /**
   * Stop IDLE for a single account
   * @param {string} email 
   */
  async stopIdle(email) {
    const conn = this.connections.get(email);
    if (!conn) return;

    if (conn.reconnectTimer) {
      clearTimeout(conn.reconnectTimer);
    }

    try {
      if (conn.client && conn.client.usable) {
        await conn.client.logout();
      }
    } catch (err) {
      // Ignore logout errors
    }

    this.connections.delete(email);

    await this.db.collection('email_accounts').updateOne(
      { email },
      {
        $set: {
          imap_idle_active: false,
          updated_at: new Date()
        }
      }
    );

    console.log(`[MailcowIMAP] Stopped IDLE for ${email}`);
  }

  /**
   * Start IDLE for ALL Mailcow accounts
   */
  async startAllIdle() {
    const accounts = await this.db.collection('email_accounts').find({
      type: { $ne: 'google' },
      status: { $in: ['active', 'connected'] }
    }).toArray();

    console.log(`[MailcowIMAP] Starting IDLE for ${accounts.length} Mailcow accounts...`);

    // Start connections with staggered delay (avoid thundering herd)
    for (let i = 0; i < accounts.length; i++) {
      // Don't await — start all in parallel
      this.startIdle(accounts[i]).catch(err => {
        console.error(`[MailcowIMAP] Failed to start IDLE for ${accounts[i].email}:`, err.message);
      });

      // Stagger: 200ms between connections
      if (i < accounts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
  }

  /**
   * Stop all IDLE connections
   */
  async stopAll() {
    this.isShuttingDown = true;
    const emails = Array.from(this.connections.keys());
    
    for (const email of emails) {
      await this.stopIdle(email);
    }

    console.log(`[MailcowIMAP] All IDLE connections stopped`);
  }

  /**
   * Get connection status for all accounts
   * @returns {Array}
   */
  getStatus() {
    const status = [];
    for (const [email, conn] of this.connections) {
      status.push({
        email,
        connected: conn.client?.usable || false,
        lastActivity: conn.lastActivity,
        reconnectCount: conn.reconnectCount
      });
    }
    return status;
  }

  // ─── INTERNAL ──────────────────────────────────────────────────

  /**
   * Schedule reconnect with exponential backoff
   */
  _scheduleReconnect(account) {
    const conn = this.connections.get(account.email);
    if (!conn) return;

    conn.reconnectCount++;
    // Backoff: 5s, 10s, 20s, 40s, 60s max
    const delay = Math.min(5000 * Math.pow(2, conn.reconnectCount - 1), 60000);
    
    console.log(`[MailcowIMAP] Reconnecting ${account.email} in ${delay / 1000}s (attempt #${conn.reconnectCount})...`);

    conn.reconnectTimer = setTimeout(() => {
      if (!this.isShuttingDown) {
        this.startIdle(account).catch(err => {
          console.error(`[MailcowIMAP] Reconnect failed for ${account.email}:`, err.message);
        });
      }
    }, delay);
  }

  /**
   * Fetch new (unseen) emails from INBOX
   */
  async _fetchNewEmails(client, account) {
    // Search for UNSEEN messages
    const searchResult = await client.search({ seen: false }, { uid: true });
    
    if (!searchResult || searchResult.length === 0) {
      return;
    }

    console.log(`[MailcowIMAP] ${account.email}: ${searchResult.length} unseen messages`);

    // Deduplicate against stored messages
    const emailsCollection = this.db.collection('emails');

    // Load keywords for classification
    const rawKeywords = await this.db.collection('keywords').find({}).toArray();

    for (const uid of searchResult.slice(0, 50)) { // Process max 50 at a time
      try {
        // Fetch full message
        const message = await client.fetchOne(uid, {
          source: true, // Full RFC822 message
          uid: true
        }, { uid: true });

        if (!message || !message.source) continue;

        // Parse with mailparser
        const parsed = await simpleParser(message.source);

        // Check for duplicate
        const messageIdHeader = parsed.messageId || `${account.email}_${uid}_${Date.now()}`;
        const existing = await emailsCollection.findOne({
          message_id: messageIdHeader,
          email_account_id: account.id
        }, { projection: { _id: 1 } });

        if (existing) continue; // Already stored

        // Extract headers for SmartClassifier
        const structuredHeaders = {
          from: parsed.from?.text || '',
          to: parsed.to?.text || '',
          subject: parsed.subject || '',
          contentType: parsed.headers?.get('content-type')?.toString() || '',
          autoSubmitted: parsed.headers?.get('auto-submitted') || '',
          xAutoreply: parsed.headers?.get('x-autoreply') || '',
          xAutorespond: parsed.headers?.get('x-autorespond') || '',
          xAutoResponseSuppress: parsed.headers?.get('x-auto-response-suppress') || '',
          xMsExchangeGeneratedMessageBy: parsed.headers?.get('x-ms-exchange-generated-message-by') || '',
          precedence: parsed.headers?.get('precedence') || '',
          threadTopic: parsed.headers?.get('thread-topic') || '',
          feedbackType: parsed.headers?.get('feedback-type') || '',
          xComplaintTo: parsed.headers?.get('x-complaint-to') || '',
          xFailedRecipients: parsed.headers?.get('x-failed-recipients') || '',
          inReplyTo: parsed.inReplyTo || '',
          references: (parsed.references || []).join(' '),
          messageId: messageIdHeader
        };

        // Classify
        const classification = SmartClassifier.classify({
          headers: structuredHeaders,
          subject: parsed.subject || '',
          body: parsed.text || '',
          bodyHtml: parsed.html || ''
        }, rawKeywords);

        // Map to legacy status
        const statusMap = {
          'hard_bounce': 'hard_bounce', 'soft_bounce': 'soft_bounce',
          'ratelimit': 'ratelimit', 'spam_block': 'spam_block',
          'auto_reply': 'automatic_reply', 'spam_complaint': 'spam_complaint',
          'unsubscribe': 'unsubscribe', 'human_reply': classification.subType || 'other'
        };

        // Store in emails collection
        const doc = {
          email_account_id: account.id,
          account_email: account.email,
          message_id: messageIdHeader,
          thread_id: null,
          subject: parsed.subject || '',
          from_email: parsed.from?.text || '',
          from_name: parsed.from?.text || '',
          snippet: (parsed.text || '').substring(0, 200),
          body: parsed.html || parsed.text || '',
          body_plain: parsed.text || '',
          in_reply_to: parsed.inReplyTo || null,
          references: (parsed.references || []).join(' ') || null,
          received_at: parsed.date || new Date(),
          category: 'inbox',
          status: statusMap[classification.type] || 'other',
          status_reasons: [],
          classification: classification.type,
          classification_sub_type: classification.subType,
          classification_step: classification.step,
          classified_by: classification.classifiedBy,
          classification_confidence: classification.confidence,
          dsn_code: classification.dsnCode || null,
          dsn_status: classification.dsnStatus || null,
          dsn_diagnostic: classification.diagnostic || null,
          original_message_id: classification.originalMessageId || null,
          bounce_recipient: classification.recipient || null,
          classified_at: new Date(),
          sync_source: 'imap_idle',
          read: 0,
          created_at: new Date(),
          updated_at: new Date()
        };

        await emailsCollection.insertOne(doc);

        // Enqueue post-classification action
        const actionableTypes = [
          'hard_bounce', 'soft_bounce', 'ratelimit', 'spam_block',
          'auto_reply', 'spam_complaint', 'unsubscribe'
        ];
        const isActionable = actionableTypes.includes(classification.type) ||
          (classification.type === 'human_reply' && (classification.subType === 'no_longer' || classification.subType === 'not_interested'));

        if (isActionable) {
          try {
            await syncActionQueue.add({
              classification: {
                type: classification.type, subType: classification.subType,
                dsnCode: classification.dsnCode, dsnStatus: classification.dsnStatus,
                diagnostic: classification.diagnostic, originalMessageId: classification.originalMessageId,
                recipient: classification.recipient, classifiedBy: classification.classifiedBy
              },
              recipientEmail: classification.recipient || parsed.from?.text || '',
              campaignId: null, subscriberId: null,
              accountEmail: account.email
            });
          } catch (queueErr) {
            console.warn(`[MailcowIMAP] Action enqueue failed:`, queueErr.message);
          }
        }

        console.log(`[MailcowIMAP] ✅ ${account.email}: Stored + classified: ${classification.type}/${classification.subType}`);
      } catch (err) {
        console.error(`[MailcowIMAP] Error processing UID ${uid} for ${account.email}:`, err.message);
      }
    }
  }
}

module.exports = MailcowImapService;
