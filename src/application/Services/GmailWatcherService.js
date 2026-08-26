/**
 * GmailWatcherService
 * 
 * Manages Gmail Pub/Sub watches for GSuite accounts.
 * 
 * How it works:
 * 1. For each GSuite account, calls gmail.users.watch() to register a push subscription
 * 2. Gmail sends a Pub/Sub notification to our webhook whenever the inbox changes
 * 3. Our webhook endpoint enqueues a job to process the notification
 * 4. The worker uses gmail.users.history.list() to get actual changes since last historyId
 * 
 * Watch registration:
 * - Must be renewed every 7 days (expiration returned by watch())
 * - We store historyId and expiration in email_accounts collection
 * - A cron job calls renewAllWatches() daily to renew expiring watches
 * 
 * Prerequisites:
 * - Google Cloud project with Gmail API + Cloud Pub/Sub API enabled
 * - Pub/Sub topic: projects/{projectId}/topics/gmail-push
 * - Topic permission: gmail-api-push@system.gserviceaccount.com as Publisher
 * - Push subscription pointing to: https://yourdomain.com/api/webhooks/gmail-push
 */

const { google } = require('googleapis');
const GmailUtility = require('./GmailUtility');

class GmailWatcherService {

  /**
   * @param {Object} db - MongoDB pluto database
   */
  constructor(db) {
    this.db = db;
    this.topicName = process.env.GMAIL_PUBSUB_TOPIC || 'projects/your-project-id/topics/gmail-push';
  }

  /**
  
   * @param {Object} account - Email account document from DB
   * @returns {Object} { historyId, expiration }
   */
  async startWatch(account) {
    if (account.type !== 'google') {
      throw new Error(`Cannot start Gmail watch for non-Google account: ${account.email}`);
    }

    console.log(`[GmailWatcher] Starting watch for ${account.email}...`);

    const oauth2Client = GmailUtility.setupGoogleClient();
    oauth2Client.setCredentials({
      access_token: account.access_token,
      refresh_token: account.refresh_token,
      expiry_date: account.token_expiry ? new Date(account.token_expiry).getTime() : null
    });

    // Refresh token if needed
    if (account.token_expiry && new Date(account.token_expiry).getTime() <= Date.now()) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
      await this.db.collection('email_accounts').updateOne(
        { email: account.email },
        {
          $set: {
            access_token: credentials.access_token,
            token_expiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null
          }
        }
      );
    }

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const response = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName: this.topicName,
        labelIds: ['INBOX']
      }
    });

    const historyId = response.data.historyId;
    const expiration = response.data.expiration;

    // Store watch metadata in email_accounts
    await this.db.collection('email_accounts').updateOne(
      { email: account.email },
      {
        $set: {
          gmail_watch_active: true,
          gmail_watch_expiry: new Date(parseInt(expiration, 10)),
          gmail_history_id: historyId,
          gmail_watch_error: null,
          gmail_watch_topic: this.topicName,
          updated_at: new Date()
        }
      }
    );

    console.log(`[GmailWatcher] ✅ Watch started for ${account.email} — historyId: ${historyId}, expiry: ${new Date(parseInt(expiration, 10)).toISOString()}`);

    return { historyId, expiration };
  }

  /**
   * Stop watch for a single account
   * @param {Object} account 
   */
  async stopWatch(account) {
    if (account.type !== 'google') return;

    try {
      const oauth2Client = GmailUtility.setupGoogleClient();
      oauth2Client.setCredentials({
        access_token: account.access_token,
        refresh_token: account.refresh_token
      });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      await gmail.users.stop({ userId: 'me' });

      await this.db.collection('email_accounts').updateOne(
        { email: account.email },
        {
          $set: {
            gmail_watch_active: false,
            gmail_watch_error: null,
            updated_at: new Date()
          }
        }
      );

      console.log(`[GmailWatcher] Watch stopped for ${account.email}`);
    } catch (err) {
      console.error(`[GmailWatcher] Failed to stop watch for ${account.email}:`, err.message);
    }
  }

  /**
   * Start/renew watches for ALL GSuite accounts
   * Call on startup and via daily cron
   * 
   * @param {Object} options
   * @param {boolean} options.forceAll - Renew all watches, even if not expiring
   * @returns {Object} { total, started, failed, skipped }
   */
  async renewAllWatches(options = {}) {
    const { forceAll = false } = options;
    const now = new Date();
    const renewThreshold = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours from now

    // Find all GSuite accounts
    const filter = { type: 'google', status: { $in: ['active', 'connected'] } };
    const accounts = await this.db.collection('email_accounts').find(filter).toArray();

    const stats = { total: accounts.length, started: 0, failed: 0, skipped: 0 };
    console.log(`[GmailWatcher] Renewing watches for ${accounts.length} GSuite accounts...`);

    for (const account of accounts) {
      try {
        // Skip if watch is still valid (unless forceAll)
        if (!forceAll && account.gmail_watch_active && account.gmail_watch_expiry) {
          const expiry = new Date(account.gmail_watch_expiry);
          if (expiry > renewThreshold) {
            stats.skipped++;
            continue;
          }
        }

        await this.startWatch(account);
        stats.started++;

        // Small delay between registrations to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err) {
        stats.failed++;
        console.error(`[GmailWatcher] ❌ Watch failed for ${account.email}:`, err.message);

        // Store error for monitoring
        await this.db.collection('email_accounts').updateOne(
          { email: account.email },
          {
            $set: {
              gmail_watch_active: false,
              gmail_watch_error: err.message,
              updated_at: new Date()
            }
          }
        );
      }
    }

    console.log(`[GmailWatcher] Watch renewal complete: ${stats.started} started, ${stats.failed} failed, ${stats.skipped} skipped`);
    return stats;
  }

  /**
   * Process a Pub/Sub notification by fetching history changes
   * Called by gmail-pubsub-worker when a push notification arrives
   * 
   * @param {string} emailAddress - Account email from the notification
   * @param {string} historyId - historyId from the notification
   * @returns {Object} { messagesFound, messagesProcessed }
   */
  async processHistoryNotification(emailAddress, historyId) {
    const account = await this.db.collection('email_accounts').findOne({ email: emailAddress });
    if (!account) {
      console.warn(`[GmailWatcher] Account not found: ${emailAddress}`);
      return { messagesFound: 0, messagesProcessed: 0 };
    }

    const storedHistoryId = account.gmail_history_id;
    if (!storedHistoryId) {
      console.warn(`[GmailWatcher] No stored historyId for ${emailAddress} — doing full sync instead`);
      return { messagesFound: 0, messagesProcessed: 0, needsFullSync: true };
    }

    // Set up Gmail client
    const oauth2Client = GmailUtility.setupGoogleClient();
    oauth2Client.setCredentials({
      access_token: account.access_token,
      refresh_token: account.refresh_token,
      expiry_date: account.token_expiry ? new Date(account.token_expiry).getTime() : null
    });

    // Refresh if needed
    if (account.token_expiry && new Date(account.token_expiry).getTime() <= Date.now()) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
      await this.db.collection('email_accounts').updateOne(
        { email: account.email },
        {
          $set: {
            access_token: credentials.access_token,
            token_expiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null
          }
        }
      );
    }

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Fetch history changes since our last known historyId
    let newMessageIds = [];
    let latestHistoryId = storedHistoryId;

    try {
      let pageToken = null;
      do {
        const params = {
          userId: 'me',
          startHistoryId: storedHistoryId,
          historyTypes: ['messageAdded'],
          labelId: 'INBOX',
          maxResults: 100
        };
        if (pageToken) params.pageToken = pageToken;

        const historyResponse = await gmail.users.history.list(params);
        const historyRecords = historyResponse.data.history || [];
        
        for (const record of historyRecords) {
          const added = record.messagesAdded || [];
          for (const msg of added) {
            if (msg.message && msg.message.id) {
              newMessageIds.push(msg.message.id);
            }
          }
        }

        latestHistoryId = historyResponse.data.historyId || latestHistoryId;
        pageToken = historyResponse.data.nextPageToken;
      } while (pageToken);
    } catch (err) {
      // historyId too old — need full sync
      if (err.code === 404 || (err.message && err.message.includes('Start history id'))) {
        console.warn(`[GmailWatcher] historyId expired for ${emailAddress} — triggering full sync`);
        // Update stored historyId and mark for full sync
        const profile = await gmail.users.getProfile({ userId: 'me' });
        await this.db.collection('email_accounts').updateOne(
          { email: emailAddress },
          { $set: { gmail_history_id: profile.data.historyId, updated_at: new Date() } }
        );
        return { messagesFound: 0, messagesProcessed: 0, needsFullSync: true };
      }
      throw err;
    }

    // Deduplicate
    newMessageIds = [...new Set(newMessageIds)];

    // Update stored historyId
    await this.db.collection('email_accounts').updateOne(
      { email: emailAddress },
      { $set: { gmail_history_id: latestHistoryId, updated_at: new Date() } }
    );

    console.log(`[GmailWatcher] ${emailAddress}: ${newMessageIds.length} new messages, historyId: ${storedHistoryId}→${latestHistoryId}`);

    return {
      messagesFound: newMessageIds.length,
      messageIds: newMessageIds,
      account: account,
      gmail: gmail,
      latestHistoryId
    };
  }
}

module.exports = GmailWatcherService;
