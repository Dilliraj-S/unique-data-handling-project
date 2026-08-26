const { MongoClient } = require('mongodb');
const { google } = require('googleapis');
const GmailUtility = require('./GmailUtility');
// Phase 2: SmartClassifier replaces keyword-based classifyReply()
const SmartClassifier = require('./SmartClassifier');
// Phase 5: Post-classification action queue
let syncActionQueue = null;
try {
  syncActionQueue = require('../../../queues/syncActionQueue');
} catch (e) {
  console.warn('[sync] syncActionQueue not available — post-classification actions disabled');
}

/**
 * EmailSyncService - Handles email synchronization and classification
 * CommonJS version for Queue Worker compatibility
 * 
 * Optimized:
 * - Singleton DB connection (shared across all jobs)
 * - Batch duplicate check ($in query per page)
 * - Batch insert (insertMany, ordered: false)
 * - Keyword caching with 5-minute TTL
 * - Gmail History API (delta sync via historyId)
 * - Parallel message fetch (controlled concurrency)
 */
const MAX_INITIAL_MESSAGES = 500;
const MAX_INCREMENTAL_MESSAGES = 100;
const INITIAL_BATCH_SIZE = 100;
const INCREMENTAL_BATCH_SIZE = 50;

// Parallel fetch concurrency — respects Gmail API rate limits
const PARALLEL_FETCH_CONCURRENCY = 10;

// Keyword cache
let _keywordsCache = null;
let _keywordsCacheTime = 0;
const KEYWORDS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

class EmailSyncService {
  // ─── Singleton DB Connection ───
  static _db = null;
  static _client = null;

  constructor(job = null) {
    this.job = job;
  }

  /**
   * Get database connection (Singleton pattern)
   * Reuses connection across all sync jobs — saves ~200ms per job
   */
  async getDatabase() {
    if (EmailSyncService._db) return EmailSyncService._db;

    const mongoUrl = process.env.PLUTO_MONGODB_URI || 'mongodb://localhost:27017/pluto';
    EmailSyncService._client = new MongoClient(mongoUrl, {
      maxPoolSize: 10,
      minPoolSize: 2
    });
    await EmailSyncService._client.connect();
    EmailSyncService._db = EmailSyncService._client.db('pluto');
    console.log('[sync] Singleton DB connection established');
    return EmailSyncService._db;
  }

  /**
   * Connect to Database (instance method for backward compatibility)
   */
  async connectToDatabase() {
    return this.getDatabase();
  }

  /**
   * Close connection (only for explicit shutdown)
   * In normal operation, keep connection alive for reuse
   */
  async closeConnection() {
    // No-op for singleton — connection stays alive for next job
  }

  /**
   * Close singleton connection (call on worker shutdown only)
   */
  static async closeSingletonConnection() {
    if (EmailSyncService._client) {
      await EmailSyncService._client.close();
      EmailSyncService._client = null;
      EmailSyncService._db = null;
      console.log('[sync] Singleton DB connection closed');
    }
  }

  /**
   * Sync emails for an account
   * @param {string} email - Email address
   * @param {string} category - 'inbox' or 'spam'
   * @param {string} user_id - Optional user_id for validation
   * @returns {Promise<Object>} Sync result
   */
  async syncEmails(email, category = 'inbox', user_id = null) {
    let accountsCollection;
    let accountDoc;

    try {
      console.log(`[sync] Starting run for ${email} (${category})${user_id ? ` [user: ${user_id}]` : ''}`);
      
      const db = await this.getDatabase();
      accountsCollection = db.collection('email_accounts');
      
      // Build query with user_id validation if provided
      const accountQuery = { email: email, status: 'active' };
      if (user_id) {
        accountQuery.user_id = user_id;
      }
      
      accountDoc = await accountsCollection.findOne(accountQuery);

      if (!accountDoc) {
        const errorMsg = user_id 
          ? `Account not found, inactive, or doesn't belong to user ${user_id}: ${email}`
          : `Account not found or inactive: ${email}`;
        throw new Error(errorMsg);
      }
      
      // Additional validation: if user_id was provided, ensure it matches
      if (user_id && accountDoc.user_id !== user_id) {
        throw new Error(`Account ${email} does not belong to user ${user_id}`);
      }

      await accountsCollection.updateOne(
        { _id: accountDoc._id },
        {
          $set: {
            syncing: true,
            syncing_category: category,
            last_sync_started_at: new Date(),
            last_sync_status: 'running',
            last_sync_error: null
          }
        }
      );

      let result;
      if (accountDoc.type === 'google') {
        result = await this.syncGmail(accountDoc, category, db);
      } else {
        console.log('[sync] IMAP provider not implemented');
        result = { count: 0 };
      }

      // Update account with sync result + historyId
      const updateFields = {
        syncing: false,
        last_synced_at: new Date(),
        last_sync_category: category,
        last_sync_count: result.count || 0,
        last_sync_status: 'success'
      };

      // Store historyId for delta sync on next run
      if (result.historyId) {
        updateFields[`last_history_id_${category}`] = result.historyId;
      }

      await accountsCollection.updateOne(
        { _id: accountDoc._id },
        {
          $set: updateFields,
          $unset: { syncing_category: '' }
        }
      );

      return result;
    } catch (error) {
      console.error(`[sync] Failed for ${email}:`, error);
      if (accountsCollection && accountDoc) {
        await accountsCollection.updateOne(
          { _id: accountDoc._id },
          {
            $set: {
              syncing: false,
              last_sync_status: 'failed',
              last_sync_error: error.message || 'sync_failed',
              last_sync_failed_at: new Date()
            },
            $unset: { syncing_category: '' }
          }
        );
      }
      throw error;
    }
    // Note: No closeConnection() — singleton stays alive
  }

  /**
   * Sync Gmail messages
   * Uses History API for delta sync when possible, falls back to full sync
   * @param {Object} account - Account object
   * @param {string} category - Category
   * @param {Object} db - Database instance
   */
  async syncGmail(account, category, db) {
    const client = await GmailUtility.getGoogleClient(account);
    const gmail = google.gmail({ version: 'v1', auth: client });
    const emailsCollection = db.collection('emails');

    // Check if we can use delta sync via historyId
    const lastHistoryId = account[`last_history_id_${category}`];
    
    if (lastHistoryId) {
      try {
        const deltaResult = await this.syncGmailDelta(gmail, account, category, lastHistoryId, emailsCollection, db);
        console.log(`[delta] Delta sync for ${account.email} (${category}) => ${deltaResult.count} new messages`);
        return deltaResult;
      } catch (deltaError) {
        // historyId expired or invalid — fall back to full sync
        if (deltaError.code === 404 || deltaError.code === 400) {
          console.log(`[delta] historyId expired for ${account.email}, falling back to full sync`);
        } else {
          console.warn(`[delta] Delta sync error, falling back:`, deltaError.message);
        }
      }
    }

    // Full sync (initial or fallback)
    return this.syncGmailFull(gmail, account, category, emailsCollection, db);
  }

  /**
   * Delta sync using Gmail History API
   * Only fetches messages added since the last historyId
   */
  async syncGmailDelta(gmail, account, category, startHistoryId, emailsCollection, db) {
    console.log(`[delta] Starting delta sync from historyId: ${startHistoryId}`);

    const keywords = await this.loadKeywords(db);
    let latestHistoryId = startHistoryId;
    const newMessageIds = [];
    let pageToken = null;

    // Step 1: Collect all new message IDs from history
    do {
      const historyParams = {
        userId: 'me',
        startHistoryId: startHistoryId,
        historyTypes: ['messageAdded'],
        maxResults: 100
      };

      if (category === 'spam') {
        historyParams.labelId = 'SPAM';
      } else {
        historyParams.labelId = 'INBOX';
      }

      if (pageToken) {
        historyParams.pageToken = pageToken;
      }

      const response = await gmail.users.history.list(historyParams);
      latestHistoryId = response.data.historyId || latestHistoryId;
      
      const historyRecords = response.data.history || [];
      for (const record of historyRecords) {
        const messagesAdded = record.messagesAdded || [];
        for (const added of messagesAdded) {
          if (added.message && added.message.id) {
            newMessageIds.push(added.message.id);
          }
        }
      }

      pageToken = response.data.nextPageToken || null;
    } while (pageToken);

    if (newMessageIds.length === 0) {
      console.log(`[delta] No new messages since last sync`);
      return { count: 0, historyId: latestHistoryId };
    }

    console.log(`[delta] Found ${newMessageIds.length} new message(s) from history`);

    // Step 2: Batch deduplicate — check which ones we already have
    const existingMessages = await emailsCollection.find({
      message_id: { $in: newMessageIds },
      email_account_id: account.id
    }, { projection: { message_id: 1 } }).toArray();

    const existingIds = new Set(existingMessages.map(e => e.message_id));
    const messagesToFetch = newMessageIds.filter(id => !existingIds.has(id));

    if (messagesToFetch.length === 0) {
      console.log(`[delta] All ${newMessageIds.length} messages already stored, nothing to do`);
      return { count: 0, historyId: latestHistoryId };
    }

    console.log(`[delta] ${messagesToFetch.length} new, ${existingIds.size} already stored`);

    // Step 3: Fetch & store messages (parallel + batch insert)
    const syncedCount = await this._fetchAndStoreMessages(
      gmail, account, category, messagesToFetch, emailsCollection, keywords
    );

    return { count: syncedCount, historyId: latestHistoryId };
  }

  /**
   * Full sync — used for initial sync or when historyId is expired
   */
  async syncGmailFull(gmail, account, category, emailsCollection, db) {
    const accountFilter = {
      email_account_id: account.id,
      category: category
    };

    const existingCount = await emailsCollection.countDocuments(accountFilter);
    const isInitialSync = existingCount === 0;

    let query = category === 'spam' ? 'in:spam' : 'in:inbox';
    if (!isInitialSync) {
      const lastEmail = await emailsCollection
        .find(accountFilter)
        .sort({ received_at: -1 })
        .limit(1)
        .next();

      if (lastEmail && lastEmail.received_at) {
        query += ` after:${this.formatDateForGmail(lastEmail.received_at)}`;
      }
    }

    const maxMessages = isInitialSync ? MAX_INITIAL_MESSAGES : MAX_INCREMENTAL_MESSAGES;
    const batchSize = isInitialSync ? INITIAL_BATCH_SIZE : INCREMENTAL_BATCH_SIZE;

    console.log(`[full] Query "${query}" (batchSize=${batchSize}, max=${maxMessages}, initial=${isInitialSync})`);

    let syncedCount = 0;
    let pageToken = null;
    let latestHistoryId = null;
    const keywords = await this.loadKeywords(db);

    do {
      const listParams = {
        userId: 'me',
        q: query,
        maxResults: batchSize
      };

      if (pageToken) {
        listParams.pageToken = pageToken;
      }

      const response = await gmail.users.messages.list(listParams);
      const messages = response.data.messages || [];
      pageToken = response.data.nextPageToken || null;

      if (messages.length === 0) {
        break;
      }

      // Get historyId from the first response for future delta sync
      if (!latestHistoryId) {
        // Fetch profile to get current historyId
        try {
          const profile = await gmail.users.getProfile({ userId: 'me' });
          latestHistoryId = profile.data.historyId;
        } catch (e) {
          console.warn('[full] Could not fetch historyId:', e.message);
        }
      }

      const messageIds = messages.map(m => m.id).slice(0, maxMessages - syncedCount);

      // Batch duplicate check — one query for entire page
      const existingMessages = await emailsCollection.find({
        message_id: { $in: messageIds },
        email_account_id: account.id
      }, { projection: { message_id: 1 } }).toArray();

      const existingIds = new Set(existingMessages.map(e => e.message_id));
      const newMessageIds = messageIds.filter(id => !existingIds.has(id));

      if (newMessageIds.length === 0) {
        console.log(`[full] All ${messageIds.length} messages in this page already stored, skipping`);
        if (syncedCount >= maxMessages) break;
        continue;
      }

      console.log(`[full] Page: ${messageIds.length} total, ${existingIds.size} existing, ${newMessageIds.length} new`);

      // Fetch & store messages (parallel + batch insert)
      const stored = await this._fetchAndStoreMessages(
        gmail, account, category, newMessageIds, emailsCollection, keywords
      );
      syncedCount += stored;

      if (syncedCount >= maxMessages) break;
    } while (pageToken);

    console.log(`[done] ${account.email} (${category}) => ${syncedCount} new messages`);

    return { count: syncedCount, historyId: latestHistoryId };
  }

  /**
   * Fetch messages in parallel and batch insert into MongoDB
   * @param {Object} gmail - Gmail API client
   * @param {Object} account - Account object
   * @param {string} category - Category
   * @param {string[]} messageIds - Array of Gmail message IDs to fetch
   * @param {Collection} emailsCollection - MongoDB collection
   * @param {Object} keywords - Classified keywords
   * @returns {number} Number of messages stored
   */
  async _fetchAndStoreMessages(gmail, account, category, messageIds, emailsCollection, keywords) {
    if (messageIds.length === 0) return 0;

    // Parallel fetch with controlled concurrency
    const documents = [];
    const chunks = [];

    for (let i = 0; i < messageIds.length; i += PARALLEL_FETCH_CONCURRENCY) {
      chunks.push(messageIds.slice(i, i + PARALLEL_FETCH_CONCURRENCY));
    }

    for (const chunk of chunks) {
      const fetchPromises = chunk.map(async (msgId) => {
        try {
          const fullMessage = await gmail.users.messages.get({
            userId: 'me',
            id: msgId,
            format: 'full'
          });

          const headers = fullMessage.data.payload.headers || [];
          const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

          const subject = getHeader('Subject');
          const from = getHeader('From');
          const inReplyTo = getHeader('In-Reply-To');
          const references = getHeader('References');
          const date = new Date(parseInt(fullMessage.data.internalDate, 10));

          const body = GmailUtility.getMessageBody(fullMessage.data);

          // Phase 2: Use SmartClassifier (header-based) instead of keyword-based classifyReply
          const structuredHeaders = SmartClassifier.extractHeaders(headers);
          const classification = SmartClassifier.classify({
            headers: structuredHeaders,
            subject: subject,
            body: body.plain || '',
            bodyHtml: body.html || ''
          }, keywords._rawKeywords || []);

          // Backward compatibility: map SmartClassifier type to old status field
          const statusMap = {
            'hard_bounce': 'hard_bounce',
            'soft_bounce': 'soft_bounce',
            'ratelimit': 'ratelimit',
            'spam_block': 'spam_block',
            'auto_reply': 'automatic_reply',
            'spam_complaint': 'spam_complaint',
            'unsubscribe': 'unsubscribe',
            'human_reply': classification.subType || 'other'
          };
          const legacyStatus = statusMap[classification.type] || 'other';

          // Check Gmail's UNREAD label to determine read status
          const labelIds = fullMessage.data.labelIds || [];
          const isRead = !labelIds.includes('UNREAD');

          return {
            id: msgId,
            email_account_id: account.id,
            account_email: account.email,
            message_id: msgId,
            thread_id: fullMessage.data.threadId,
            subject: subject,
            from_email: from,
            from_name: from,
            snippet: fullMessage.data.snippet,
            body: body.html,
            body_plain: body.plain,
            in_reply_to: inReplyTo || null,
            references: references || null,
            received_at: date,
            category: category,
            // Legacy status field (backward compatible)
            status: legacyStatus,
            status_reasons: [],
            // Phase 2: New classification fields
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
            read: isRead ? 1 : 0,
            created_at: new Date(),
            updated_at: new Date()
          };
        } catch (fetchError) {
          console.warn(`[fetch] Failed to fetch message ${msgId}:`, fetchError.message);
          return null;
        }
      });

      const results = await Promise.allSettled(fetchPromises);
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          documents.push(result.value);
        }
      }
    }

    // Batch insert — one operation instead of N individual insertOne calls
    if (documents.length > 0) {
      try {
        const insertResult = await emailsCollection.insertMany(documents, { ordered: false });
        console.log(`[batch] Inserted ${insertResult.insertedCount} emails in one batch`);

        // Phase 5: Enqueue post-classification actions for actionable emails
        if (syncActionQueue) {
          await this._enqueueActions(documents);
        }

        return insertResult.insertedCount;
      } catch (insertError) {
        // Handle partial success — some may be duplicates caught by unique index
        if (insertError.code === 11000) {
          const inserted = insertError.insertedCount || 0;
          const duplicates = documents.length - inserted;
          console.log(`[batch] Inserted ${inserted} emails, ${duplicates} duplicates skipped`);

          // Still enqueue actions for successfully inserted docs
          if (syncActionQueue && inserted > 0) {
            await this._enqueueActions(documents);
          }

          return inserted;
        }
        throw insertError;
      }
    }

    return 0;
  }

  /**
   * Phase 5: Enqueue post-classification actions for actionable emails
   * Non-actionable types (human_reply with subType='other') are skipped.
   * @param {Array} documents - Array of classified email documents
   */
  async _enqueueActions(documents) {
    // Types that need post-classification actions
    const actionableTypes = [
      'hard_bounce', 'soft_bounce', 'ratelimit', 'spam_block',
      'auto_reply', 'spam_complaint', 'unsubscribe'
    ];

    let enqueued = 0;
    for (const doc of documents) {
      const type = doc.classification;
      const subType = doc.classification_sub_type;

      // Skip non-actionable: generic human replies with no particular intent
      const isActionable = actionableTypes.includes(type) ||
        (type === 'human_reply' && (subType === 'no_longer' || subType === 'not_interested'));

      if (!isActionable) continue;

      try {
        await syncActionQueue.add({
          classification: {
            type: type,
            subType: subType,
            dsnCode: doc.dsn_code,
            dsnStatus: doc.dsn_status,
            diagnostic: doc.dsn_diagnostic,
            originalMessageId: doc.original_message_id,
            recipient: doc.bounce_recipient,
            classifiedBy: doc.classified_by
          },
          recipientEmail: doc.bounce_recipient || doc.from_email,
          campaignId: null,  // Will be resolved from originalMessageId by ActionProcessor
          subscriberId: null,
          accountEmail: doc.account_email
        }, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 }
        });
        enqueued++;
      } catch (err) {
        console.warn(`[sync] Failed to enqueue action for ${doc.from_email}:`, err.message);
      }
    }

    if (enqueued > 0) {
      console.log(`[sync] Enqueued ${enqueued} post-classification actions`);
    }
  }

  /**
   * Load keywords from database (cached with TTL)
   * @param {Object} db - Database instance
   */
  async loadKeywords(db) {
    const now = Date.now();
    
    // Return cached keywords if within TTL
    if (_keywordsCache && (now - _keywordsCacheTime) < KEYWORDS_CACHE_TTL) {
      return _keywordsCache;
    }

    const keywordsCollection = db.collection('keywords');
    const keywords = await keywordsCollection.find({}).toArray();
    
    const grouped = {};
    keywords.forEach(k => {
      if (!grouped[k.type]) grouped[k.type] = [];
      grouped[k.type].push(k.keyword);
    });
    
    // Cache it
    _keywordsCache = grouped;
    _keywordsCacheTime = now;
    console.log(`[cache] Keywords loaded and cached (${keywords.length} total, TTL: 5min)`);
    
    // Phase 2: Also store raw keyword docs for SmartClassifier
    grouped._rawKeywords = keywords;
    
    return grouped;
  }

  /**
   * Classify email based on keywords (LEGACY — kept for backward compatibility)
   * 
   * @deprecated Use SmartClassifier.classify() instead.
   * SmartClassifier provides header-based DSN parsing, auto-reply detection,
   * spam complaint detection, and confidence-scored unsubscribe detection.
   * This method is only used as fallback when SmartClassifier is not available.
   */
  classifyReply(subject, body, keywords) {
    const content = (subject + ' ' + body).toLowerCase();
    const matchedReasons = [];

    // STEP 1: Check for Automatic Reply FIRST (highest priority)
    if (keywords.automatic_reply && Array.isArray(keywords.automatic_reply)) {
      for (const keyword of keywords.automatic_reply) {
        const keywordLower = keyword.toLowerCase();
        if (content.includes(keywordLower)) {
          matchedReasons.push(keyword);
          return {
            status: 'automatic_reply',
            reasons: matchedReasons
          };
        }
      }
    }

    // STEP 2: Weighted scoring for remaining categories
    let maxScore = 0;
    let bestStatus = null;

    const weights = {
      hard_bounce: 2.0,
      soft_bounce: 1.5,
      unsubscribe: 1.3,
      no_longer: 1.2
    };

    for (const [type, list] of Object.entries(keywords)) {
      if (type === 'automatic_reply' || type === '_rawKeywords') continue;
      if (Array.isArray(list)) {
        for (const keyword of list) {
          const keywordLower = keyword.toLowerCase();
          if (content.includes(keywordLower)) {
            const score = weights[type] || 1.0;
            if (score > maxScore) {
              maxScore = score;
              bestStatus = type;
            }
            matchedReasons.push(keyword);
          }
        }
      }
    }

    return {
      status: bestStatus || 'other',
      reasons: matchedReasons
    };
  }

  formatDateForGmail(dateValue) {
    const date = new Date(dateValue);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  }
}

module.exports = EmailSyncService;
