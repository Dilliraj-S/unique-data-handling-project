const { MongoClient, Long } = require('mongodb');
const { google } = require('googleapis');
const GmailUtility = require('./GmailUtility');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
// Use Redis-based rate limiter for multi-worker coordination
const RedisRateLimiter = require('../../../services/RedisRateLimiter');
// Fallback to in-memory if Redis fails
const AccountRateLimiter = require('../../../services/AccountRateLimiter');
// Parseable Message-ID for bounce attribution (campaign+subscriber embedded)
const MessageIdService = require('./MessageIdService');
// Suppression list check (prevents sending to bounced/spam/unsubscribed)
const SuppressionService = require('./SuppressionService');

const DEFAULT_DAILY_SEND_LIMIT = parseInt(process.env.DEFAULT_DAILY_SEND_LIMIT, 10) || 500;

/**
 * EmailDeliveryService - Handles email campaign sending
 * CommonJS version for Queue Worker compatibility
 * Based on BV project's SendCampaignEmailJob
 * 
 * HIGH-PERFORMANCE: Uses singleton DB connection for speed
 * V1 + V2 HYBRID: V1 Redis caching + V2 MongoDB resilience
 */
class EmailDeliveryService {
  // Singleton database connection (shared across all instances)
  static dbConnection = null;
  static db = null;
  static connectionPromise = null;

  // FIX #3: SMTP transporter pool (reuse TCP+TLS connections)
  static smtpTransporters = new Map(); // email -> transporter

  constructor(job = null) {
    this.job = job;
  }

  // ═══════════════════════════════════════════════════════════════
  // ITEM 1: MongoDB Production Config + Close Event (from V2)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Connect to Database (Singleton pattern for high performance)
   * Reuses connection across all email jobs to save ~200ms per email
   * 
   * PRODUCTION: Connection pool sized for concurrent workers,
   * auto-reconnect on close, retry on transient errors.
   */
  static async getDatabase() {
    // Fast path: if already connected, return (ITEM 1: added dbConnection check)
    if (this.db && this.dbConnection) {
      return this.db;
    }

    // If connection is in progress, wait for it
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    // Create new connection with production config (ITEM 1)
    this.connectionPromise = (async () => {
      const mongoUrl = process.env.PLUTO_MONGODB_URI || 'mongodb://localhost:27017/pluto';
      const poolSize = parseInt(process.env.MONGO_POOL_SIZE, 10) || 100;

      this.dbConnection = new MongoClient(mongoUrl, {
        // Connection pool — sized for concurrent worker count
        maxPoolSize: poolSize,
        minPoolSize: Math.min(20, Math.floor(poolSize / 5)),
        // Timeouts — fail fast, let retryOperation handle recovery
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
        maxIdleTimeMS: 120000,
        // Health monitoring
        heartbeatFrequencyMS: 10000,
        // Auto-retry on transient network errors (driver-level)
        retryWrites: true,
        retryReads: true,
      });

      await this.dbConnection.connect();
      this.db = this.dbConnection.db('pluto');

      // ITEM 1: Listen for connection close — proactively reset singleton
      this.dbConnection.on('close', () => {
        console.warn('⚠️ MongoDB connection closed. Will reconnect on next call.');
        this.db = null;
        this.dbConnection = null;
        this.connectionPromise = null;
      });

      this.dbConnection.on('error', (err) => {
        console.error('⚠️ MongoDB topology error:', err.message);
      });

      console.log(`✅ DB connection established (maxPoolSize=${poolSize}, heartbeat=10s, retryWrites=ON)`);
      return this.db;
    })();

    return this.connectionPromise;
  }

  // ═══════════════════════════════════════════════════════════════
  // ITEM 2: retryOperation static method (from V2)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Retry wrapper for MongoDB operations — handles transient connection failures.
   * Use for critical DB writes that MUST succeed (log updates, progress writes).
   * 
   * Usage: await EmailDeliveryService.retryOperation(() => db.collection('x').updateOne(...))
   */
  static async retryOperation(operation, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        const isConnectionError =
          error.message?.includes('Client must be connected') ||
          error.message?.includes('client was closed') ||
          error.message?.includes('Operation interrupted') ||
          error.message?.includes('connection was destroyed') ||
          error.message?.includes('topology was destroyed') ||
          error.message?.includes('server selection timed out') ||
          error.name === 'MongoNetworkError' ||
          error.name === 'MongoServerSelectionError';

        if (!isConnectionError || attempt === maxRetries) {
          throw error;
        }

        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.warn(`⚠️ DB op failed (attempt ${attempt}/${maxRetries}): ${error.message}. Retry in ${delay}ms...`);

        // Force reconnect on first failure
        if (attempt === 1) {
          this.db = null;
          this.connectionPromise = null;
          try { await this.dbConnection?.close(); } catch (_) {}
          this.dbConnection = null;
        }

        await new Promise(resolve => setTimeout(resolve, delay));
        await this.getDatabase();
      }
    }
  }

  /**
   * Connect to Database (instance method for compatibility)
   */
  async connectToDatabase() {
    return EmailDeliveryService.getDatabase();
  }

  /**
   * Close connection (only closes if explicitly needed)
   * Note: In high-performance mode, we keep connection open
   */
  async closeConnection() {
    // Don't close singleton connection in high-performance mode
    // Connection will be reused for all jobs
    // Only close if explicitly needed (e.g., graceful shutdown)
  }

  /**
   * Close singleton connection (call on worker shutdown)
   */
  static async closeSingletonConnection() {
    if (EmailDeliveryService.dbConnection) {
      await EmailDeliveryService.dbConnection.close();
      EmailDeliveryService.dbConnection = null;
      EmailDeliveryService.db = null;
      EmailDeliveryService.connectionPromise = null;
      console.log('✅ Singleton DB connection closed');
    }
  }

  /**
   * Close all pooled SMTP transporters (call on worker shutdown)
   */
  static async closeSmtpTransporters() {
    for (const [email, transporter] of this.smtpTransporters) {
      try { transporter.close(); } catch (e) { /* ignore */ }
    }
    this.smtpTransporters.clear();
    console.log('✅ All SMTP transporters closed');
  }

  // ─── V1 PRESERVED: Redis-Cached Counters (avoid countDocuments per email) ───

  /**
   * Get daily sent count from Redis cache (falls back to DB, caches for 60s)
   * V1 PRESERVED — replaces per-email countDocuments() bottleneck
   */
  static async getDailySentCount(fromEmail) {
    try {
      const redis = RedisRateLimiter.getRedis();
      const key = `perf:daily_sent:${fromEmail}`;
      const cached = await redis.get(key);
      if (cached !== null) {
        // SELF-HEAL: Check if key is immortal (TTL=-1, stale from race condition)
        // If so, delete it and fall through to DB query for fresh count
        const ttl = await redis.ttl(key);
        if (ttl === -1) {
          await redis.del(key);
          console.warn(`⚠️ Self-healed stale daily counter for ${fromEmail}: cached=${cached}, TTL was -1. Re-querying DB.`);
          // Fall through to DB query below
        } else {
          return parseInt(cached);
        }
      }

      // Cache miss (or stale key deleted): count from DB and cache for 60 seconds
      const db = await EmailDeliveryService.getDatabase();
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const count = await db.collection('email_campaign_logs').countDocuments({
        from_email: fromEmail,
        status: 'sent',
        sent_at: { $gte: twentyFourHoursAgo }
      });
      await redis.set(key, count, 'EX', 60); // 60s TTL
      return count;
    } catch (error) {
      // Fallback to direct DB on Redis failure
      const db = await EmailDeliveryService.getDatabase();
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return db.collection('email_campaign_logs').countDocuments({
        from_email: fromEmail, status: 'sent',
        sent_at: { $gte: twentyFourHoursAgo }
      });
    }
  }

  /**
   * Get batch used count from Redis cache (caches for 30s)
   * V1 PRESERVED — for display/logging only. Use atomicBatchCheck() for enforcement.
   */
  static async getBatchUsedCount(fromEmail, campaignId, progressId) {
    try {
      const redis = RedisRateLimiter.getRedis();
      const key = `perf:batch_used:${fromEmail}:${campaignId}:${progressId || 'none'}`;
      const cached = await redis.get(key);
      if (cached !== null) return parseInt(cached);

      // Cache miss: count from DB
      const db = await EmailDeliveryService.getDatabase();
      const count = await db.collection('email_campaign_logs').countDocuments({
        from_email: fromEmail,
        campaign_id: Long.fromNumber(Number(campaignId)),
        progress_id: progressId || { $exists: false },
        status: { $in: ['sent', 'sending'] }
      });
      await redis.set(key, count, 'EX', 30);
      return count;
    } catch (error) {
      const db = await EmailDeliveryService.getDatabase();
      return db.collection('email_campaign_logs').countDocuments({
        from_email: fromEmail,
        campaign_id: Long.fromNumber(Number(campaignId)),
        progress_id: progressId || { $exists: false },
        status: { $in: ['sent', 'sending'] }
      });
    }
  }

  /**
   * V1 PRESERVED: Atomic batch counter — eliminates overshoot race condition.
   * Redis INCR reserves a slot BEFORE sending. DECR on failure releases it.
   */
  static async atomicBatchCheck(fromEmail, campaignId, progressId, batchSizeLimit) {
    try {
      const redis = RedisRateLimiter.getRedis();
      const key = `batch:atomic:${fromEmail}:${campaignId}:${progressId || 'none'}`;
      const initKey = `${key}:init`;

      // First call: seed from DB (one-time per account per campaign)
      const initialized = await redis.get(initKey);
      if (!initialized) {
        const db = await EmailDeliveryService.getDatabase();
        const dbCount = await db.collection('email_campaign_logs').countDocuments({
          from_email: fromEmail,
          campaign_id: Long.fromNumber(Number(campaignId)),
          progress_id: progressId || { $exists: false },
          status: { $in: ['sent', 'sending'] }
        });
        // Use SETNX to avoid race with another worker also initializing
        const wasSet = await redis.set(key, dbCount, 'EX', 86400, 'NX');
        if (wasSet) {
          console.log(`🔢 Atomic batch counter initialized for ${fromEmail}: ${dbCount}/${batchSizeLimit}`);
        }
        await redis.set(initKey, '1', 'EX', 86400);
      }

      // Atomic increment — reserves a slot
      const current = await redis.incr(key);

      if (current > batchSizeLimit) {
        // Over limit — roll back and reject
        await redis.decr(key);
        return { allowed: false, count: current - 1 };
      }

      return { allowed: true, count: current };
    } catch (error) {
      // Fallback: check DB directly if Redis fails
      console.error('Atomic batch check Redis error, falling back to DB:', error.message);
      const db = await EmailDeliveryService.getDatabase();
      const count = await db.collection('email_campaign_logs').countDocuments({
        from_email: fromEmail,
        campaign_id: Long.fromNumber(Number(campaignId)),
        progress_id: progressId || { $exists: false },
        status: { $in: ['sent', 'sending'] }
      });
      return { allowed: count < batchSizeLimit, count };
    }
  }

  /**
   * V1 PRESERVED: Decrement atomic batch counter (release reserved slot on failure)
   * FIX: Preserves TTL when resetting to 0 (prevents creating immortal key).
   */
  static async decrementBatchCounter(fromEmail, campaignId, progressId) {
    try {
      const redis = RedisRateLimiter.getRedis();
      const key = `batch:atomic:${fromEmail}:${campaignId}:${progressId || 'none'}`;
      const current = await redis.decr(key);
      if (current < 0) {
        // Preserve TTL when resetting to 0 (don't use bare SET which removes TTL)
        const ttl = await redis.ttl(key);
        if (ttl > 0) {
          await redis.set(key, 0, 'EX', ttl);
        } else {
          await redis.del(key); // If no TTL, just remove the stale key
        }
      }
    } catch (e) { /* non-critical */ }
  }

  /**
   * V1 PRESERVED: Increment cached daily count after successful send
   * FIX: Uses TTL check instead of exists() to prevent race condition.
   * If key expires between exists() and incr(), Redis INCR creates a NEW key
   * with value 1 and NO TTL — making the counter immortal and stale.
   * TTL check: only increment if key has positive TTL (active cache with expiry).
   */
  static async incrementDailySentCount(fromEmail) {
    try {
      const redis = RedisRateLimiter.getRedis();
      const key = `perf:daily_sent:${fromEmail}`;
      const ttl = await redis.ttl(key);
      // ttl > 0:  key exists WITH expiry → safe to increment
      // ttl = -1: key exists WITHOUT expiry → STALE immortal key, don't touch
      // ttl = -2: key doesn't exist → skip, getDailySentCount() will re-cache from DB
      if (ttl > 0) {
        await redis.incr(key);
      } else if (ttl === -1) {
        // Self-heal: delete immortal stale key so next getDailySentCount() refreshes from DB
        await redis.del(key);
        console.warn(`⚠️ Deleted stale immortal daily counter for ${fromEmail} (TTL was -1)`);
      }
    } catch (e) { /* non-critical */ }
  }

  /**
   * V1 PRESERVED: Increment cached batch count after successful send
   * FIX: Uses TTL check instead of exists() to prevent immortal key race condition.
   */
  static async incrementBatchUsedCount(fromEmail, campaignId, progressId) {
    try {
      const redis = RedisRateLimiter.getRedis();
      const key = `perf:batch_used:${fromEmail}:${campaignId}:${progressId || 'none'}`;
      const ttl = await redis.ttl(key);
      if (ttl > 0) {
        await redis.incr(key);
      } else if (ttl === -1) {
        await redis.del(key);
        console.warn(`⚠️ Deleted stale immortal batch counter for ${fromEmail} (TTL was -1)`);
      }
    } catch (e) { /* non-critical */ }
  }

  /**
   * Get or create pooled SMTP transporter (V1 PRESERVED: maxMessages=1000)
   */
  static getSmtpTransporter(account) {
    if (this.smtpTransporters.has(account.email)) {
      return this.smtpTransporters.get(account.email);
    }

    const isSSL = account.outgoing_encryption === 'ssl' || account.outgoing_port === 465;
    const isSTARTTLS = account.outgoing_encryption === 'starttls' || 
                       account.outgoing_encryption === 'tls' || 
                       (account.outgoing_port === 587 && !isSSL);

    const config = {
      host: account.outgoing_host,
      port: account.outgoing_port,
      secure: isSSL,
      auth: { user: account.email, pass: account.password },
      pool: true,            // Enable connection pooling
      maxConnections: 5,     // Max 5 connections per account
      maxMessages: 1000,     // V1 PRESERVED: 1000 (V2 had 100)
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 30000,
      tls: { rejectUnauthorized: false }
    };

    if (isSTARTTLS) {
      config.requireTLS = true;
      config.secure = false;
    } else if (isSSL) {
      config.tls.ciphers = 'SSLv3';
    }

    const transporter = nodemailer.createTransport(config);
    this.smtpTransporters.set(account.email, transporter);
    console.log(`📧 Pooled SMTP transporter created for ${account.email}`);
    return transporter;
  }

  /**
   * Send email to subscriber
   * @param {Object} jobData - Job data containing campaign, subscriber, account info
   * @returns {Promise<Object>} Send result
   */
  async sendEmail(jobData) {
    // ITEM 4: Accept pre-loaded subscriber+account data from dispatcher
    const {
      campaignId,
      fromEmail,
      subject,
      templateContent,
      subscriberId,
      region,
      timezone,
      progressId,
      batchSize,
      subscriberData: jobSubscriberData,
      accountData: jobAccountData
    } = jobData;

    const DEBUG = process.env.EMAIL_DEBUG === 'true';

    // Track the log's status BEFORE this attempt, so the catch block knows
    // whether this is the first failure or a Bull retry of an already-failed email.
    // This prevents counter double-counting: failed_emails and pending_emails
    // should only be adjusted ONCE per email, not on every Bull attempt.
    let previousLogStatus = null;

    try {
      if (DEBUG) console.log(`📧 Sending email: Campaign ${campaignId}, Subscriber ${subscriberId}, From ${fromEmail}`);

      // Use singleton DB connection for high performance
      const db = await EmailDeliveryService.getDatabase();
      
      // ITEM 4: Use pre-loaded account data if available (saves 1 DB query)
      // ITEM 3(3A): Wrapped with retryOperation for connection resilience
      let emailAccount = jobAccountData || null;
      if (!emailAccount) {
        emailAccount = await EmailDeliveryService.retryOperation(() =>
          db.collection('email_accounts').findOne({
            email: fromEmail,
            status: 'active'
          })
        );
      }

      if (!emailAccount) {
        throw new Error(`Email account not found: ${fromEmail}`);
      }

      // V1 PRESERVED: Use Redis-cached daily count (was countDocuments per email = #1 bottleneck)
      const sentCount = await EmailDeliveryService.getDailySentCount(fromEmail);

      // BUG FIX: twentyFourHoursAgo was undefined in V1 daily limit section
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // V1 PRESERVED: Atomic batch check (CRITICAL — hard cap per account per campaign)
      if (batchSize && Number(batchSize) > 0) {
        const batchSizeLimit = Number(batchSize);
        
        const batchResult = await EmailDeliveryService.atomicBatchCheck(
          fromEmail, campaignId, progressId, batchSizeLimit
        );
        
        if (!batchResult.allowed) {
          console.warn(`⚠️ Batch size limit reached for ${fromEmail} in campaign ${campaignId}: ${batchResult.count}/${batchSizeLimit}. Marking as skipped.`);
          await this.updateLogStatus(db, campaignId, subscriberId, progressId, 'failed', 
            `Batch size safety limit reached (${batchResult.count}/${batchSizeLimit}). Account already sent its batch quota.`);
          
          if (progressId) {
            await EmailDeliveryService.retryOperation(() =>
              db.collection('campaign_progress').updateOne(
                { progress_id: progressId },
                {
                  $inc: { failed_emails: 1, pending_emails: -1 },
                  $set: { updated_at: new Date() }
                }
              )
            );
          }
          
          return { skipped: true, status: 'batch_limit_reached', reason: `Batch size limit reached: ${batchResult.count}/${batchSizeLimit}` };
        }
      }

      // Check daily send limit (use 24-hour rolling window for true rate limiting)
      const dailyLimit = emailAccount.daily_send_limit || DEFAULT_DAILY_SEND_LIMIT;
      if (sentCount >= dailyLimit) {
        console.warn(`⚠️ Daily send limit reached for ${fromEmail}: ${sentCount}/${dailyLimit} (24-hour rolling window)`);
        await this.updateLogStatus(db, campaignId, subscriberId, progressId, 'pending', 
          'Queued for retry after daily send limit reached');
        
        // FIX: Release the batch slot reserved by atomicBatchCheck (prevents counter leak)
        // Without this, each daily-limit hit permanently inflates the batch counter,
        // blocking tomorrow's retries from succeeding.
        if (batchSize && Number(batchSize) > 0) {
          await EmailDeliveryService.decrementBatchCounter(fromEmail, campaignId, progressId);
        }
        
        // Calculate delay until oldest sent email is 24 hours old
        const oldestSentEmail = await EmailDeliveryService.retryOperation(() =>
          db.collection('email_campaign_logs')
            .findOne(
              { 
                from_email: fromEmail, 
                status: 'sent',
                sent_at: { $gte: twentyFourHoursAgo }
              },
              { sort: { sent_at: 1 } }
            )
        );
        
        let delayUntilReset = 24 * 60 * 60 * 1000;
        if (oldestSentEmail && oldestSentEmail.sent_at) {
          const oldestSentTime = oldestSentEmail.sent_at instanceof Date 
            ? oldestSentEmail.sent_at.getTime() 
            : new Date(oldestSentEmail.sent_at).getTime();
          const resetTime = oldestSentTime + (24 * 60 * 60 * 1000);
          const now = Date.now();
          delayUntilReset = Math.max(0, resetTime - now);
        }
        
        const delayHours = Math.round(delayUntilReset / 1000 / 60 / 60 * 10) / 10;
        if (DEBUG) console.log(`⏰ Daily limit reached for ${fromEmail}. Retry in ${delayHours}h.`);
        return { retry: true, delay: delayUntilReset };
      }

      // ITEM 4: Use pre-loaded subscriber data if available, with retryOperation fallback
      // V1 PRESERVED: Parallel DB calls via Promise.all
      const [subscriber, existingLog] = await Promise.all([
        jobSubscriberData
          ? Promise.resolve(jobSubscriberData)
          : EmailDeliveryService.retryOperation(() =>
              db.collection('subscribers').findOne({ id: Long.fromNumber(Number(subscriberId)) })
            ),
        EmailDeliveryService.retryOperation(() =>
          db.collection('email_campaign_logs').findOne({
            campaign_id: Long.fromNumber(Number(campaignId)),
            subscriber_id: Long.fromNumber(Number(subscriberId)),
            progress_id: progressId || { $exists: false }
          })
        )
      ]);

      if (!subscriber) {
        throw new Error(`Subscriber not found: ${subscriberId}`);
      }

      // CHECK SUPPRESSION: Skip bounced/spam-complained/unsubscribed addresses
      // Reuses subscriber from above (saves ~3ms vs separate findOne)
      try {
        if (subscriber.email) {
          const redis = RedisRateLimiter.getRedis();
          const suppressionSvc = new SuppressionService(db, redis);
          const isSuppressed = await suppressionSvc.isSuppressed(subscriber.email);
          if (isSuppressed) {
            console.warn(`🚫 Suppressed: ${subscriber.email} — skipping send`);
            await this.updateLogStatus(db, campaignId, subscriberId, progressId, 'failed',
              'Recipient is suppressed (bounced/spam/unsubscribed)');
            if (progressId) {
              await EmailDeliveryService.retryOperation(() =>
                db.collection('campaign_progress').updateOne(
                  { progress_id: progressId },
                  { $inc: { failed_emails: 1, pending_emails: -1 }, $set: { updated_at: new Date() } }
                )
              );
            }
            if (batchSize && Number(batchSize) > 0) {
              await EmailDeliveryService.decrementBatchCounter(fromEmail, campaignId, progressId);
            }
            return { skipped: true, status: 'suppressed', reason: 'Recipient suppressed' };
          }
        }
      } catch (suppressionErr) {
        console.warn(`⚠️ Suppression check failed for subscriber ${subscriberId}:`, suppressionErr.message);
      }

      // Validate email address
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!subscriber.email || !emailRegex.test(subscriber.email)) {
        await this.updateLogStatus(
          db, campaignId, subscriberId, progressId,
          'failed', `Invalid email address: ${subscriber.email || 'empty'}`
        );
        // FIX: Release batch slot reserved by atomicBatchCheck
        if (batchSize && Number(batchSize) > 0) {
          await EmailDeliveryService.decrementBatchCounter(fromEmail, campaignId, progressId);
        }
        return { skipped: true, status: 'failed', reason: 'Invalid email address' };
      }

      // If log exists and is already sent, skip
      if (existingLog && existingLog.status === 'sent') {
        if (DEBUG) console.log(`⏭️ Skipping already sent: ${subscriber.email}`);
        // FIX: Release batch slot reserved by atomicBatchCheck
        if (batchSize && Number(batchSize) > 0) {
          await EmailDeliveryService.decrementBatchCounter(fromEmail, campaignId, progressId);
        }
        return { skipped: true, status: 'sent', messageId: existingLog.message_id };
      }

      // MULTI-DAY RESUME SAFETY NET: If no log found for THIS progress_id,
      // check if subscriber was already sent in a PREVIOUS dispatch for the same campaign.
      // This prevents double-sends if dispatcher's pre-loaded Set missed an edge case.
      // For single-dispatch campaigns (One Full Dispatch), existingLog always exists → this never runs.
      if (!existingLog) {
        const previouslySent = await EmailDeliveryService.retryOperation(() =>
          db.collection('email_campaign_logs').findOne({
            campaign_id: Long.fromNumber(Number(campaignId)),
            subscriber_id: Long.fromNumber(Number(subscriberId)),
            status: 'sent'
            // NO progress_id filter → catches ALL previous dispatches
          }, { projection: { _id: 1, message_id: 1 } })
        );
        
        if (previouslySent) {
          console.log(`⏭️ Already sent in previous dispatch: subscriber ${subscriberId}, campaign ${campaignId}`);
          // FIX: Release batch slot reserved by atomicBatchCheck
          if (batchSize && Number(batchSize) > 0) {
            await EmailDeliveryService.decrementBatchCounter(fromEmail, campaignId, progressId);
          }
          return { skipped: true, status: 'already_sent_previous_dispatch' };
        }
      }

      // If log exists and is stuck in "sending" state for more than 5 minutes, reset
      if (existingLog && existingLog.status === 'sending') {
        const updatedAt = existingLog.updated_at ? new Date(existingLog.updated_at) : new Date(0);
        const stuckFor = Date.now() - updatedAt.getTime();
        const stuckThreshold = 5 * 60 * 1000;
        
        if (stuckFor > stuckThreshold) {
          if (DEBUG) console.log(`⚠️ Stuck email reset: ${subscriber.email} (${Math.round(stuckFor / 1000)}s)`);
          // ITEM 3(3C): Wrapped with retryOperation
          await EmailDeliveryService.retryOperation(() =>
            db.collection('email_campaign_logs').updateOne(
              { _id: existingLog._id },
              { $set: { status: 'pending', updated_at: new Date() } }
            )
          );
        } else {
          if (DEBUG) console.log(`⏭️ Email in-flight, skipping: ${subscriber.email}`);
          // FIX: Release batch slot reserved by atomicBatchCheck
          if (batchSize && Number(batchSize) > 0) {
            await EmailDeliveryService.decrementBatchCounter(fromEmail, campaignId, progressId);
          }
          return { skipped: true, status: 'sending' };
        }
      }

      // If log exists and is failed, allow retry
      if (existingLog && existingLog.status === 'failed') {
        if (DEBUG) console.log(`🔄 Retrying failed: ${subscriber.email}`);
      }

      // Capture the log status BEFORE we update it to 'sending'
      // Used by catch block to prevent counter double-counting on Bull retries
      previousLogStatus = existingLog ? existingLog.status : 'new';

      const trackingId = existingLog?.tracking_id || this.generateTrackingId();
      const messageIdHeader = this.generateMessageId(campaignId, subscriberId, fromEmail);

      // Update log to 'sending' — ITEM 3(3D): wrapped with retryOperation
      if (existingLog) {
        await EmailDeliveryService.retryOperation(() =>
          db.collection('email_campaign_logs').updateOne(
            { _id: existingLog._id },
            {
              $set: {
                status: 'sending',
                message_id: messageIdHeader,
                updated_at: new Date()
              }
            }
          )
        );
      } else {
        // Atomic counter — O(1), no collection scan, race-condition-safe
        const counterDoc = await EmailDeliveryService.retryOperation(() =>
          db.collection('counters').findOneAndUpdate(
            { _id: 'email_campaign_logs' },
            { $inc: { seq: Long.fromNumber(1) } },
            { upsert: true, returnDocument: 'after' }
          )
        );
        const nextLogId = Long.fromNumber(
          counterDoc.seq instanceof Long
            ? counterDoc.seq.toNumber()
            : Number(counterDoc.seq)
        );

        // ITEM 6: Added original_message_id + open_synced fields
        await EmailDeliveryService.retryOperation(() =>
          db.collection('email_campaign_logs').insertOne({
            id: nextLogId,
            progress_id: progressId || null,
            campaign_id: Long.fromNumber(Number(campaignId)),
            subscriber_id: Long.fromNumber(Number(subscriberId)),
            from_email: fromEmail,
            to_email: subscriber.email,
            region: region || null,
            timezone: timezone || null,
            batch_size: batchSize ? String(batchSize) : null,
            status: 'sending',
            message_id: messageIdHeader,
            original_message_id: messageIdHeader,  // ITEM 6: for bounce attribution
            tracking_id: trackingId,
            tracking_open: 0,
            open_synced: false,                     // ITEM 6: for open tracking sync
            tracking_clicks: null,
            retry_attempts: 0,
            error_message: null,
            sent_at: null,
            sent_method: 'sent_immediately',
            created_at: new Date(),
            updated_at: new Date()
          })
        );
      }

      // ITEM 3(3F): Increment sending_emails — wrapped with retryOperation
      if (progressId) {
        await EmailDeliveryService.retryOperation(() =>
          db.collection('campaign_progress').updateOne(
            { progress_id: progressId },
            { $inc: { sending_emails: 1 } }
          )
        );
      }

      // Process template content with placeholders + tracking pixel
      const processedContent = this.processTemplateContent(
        templateContent,
        subscriber,
        emailAccount,
        { trackingId, campaignId, subscriberId }
      );

      // Send email
      const sendResult = await this.sendEmailToSubscriber(
        emailAccount,
        subscriber,
        subject,
        processedContent,
        messageIdHeader,
        campaignId,
        subscriberId
      );

      // ═══════════════════════════════════════════════════════════════
      // ITEM 5: Parallel DB writes after send (saves ~3ms/email)
      // ═══════════════════════════════════════════════════════════════
      const updatePromises = [
        EmailDeliveryService.retryOperation(() =>
          db.collection('email_campaign_logs').updateOne(
            {
              campaign_id: Long.fromNumber(Number(campaignId)),
              subscriber_id: Long.fromNumber(Number(subscriberId)),
              progress_id: progressId || { $exists: false }
            },
            {
              $set: {
                status: 'sent',
                sent_at: new Date(),
                message_id: sendResult.messageId || messageIdHeader,
                thread_id: sendResult.threadId || null,  // ITEM 9: Gmail thread ID
                updated_at: new Date()
              }
            }
          )
        )
      ];

      if (progressId) {
        updatePromises.push(
          EmailDeliveryService.retryOperation(() =>
            db.collection('campaign_progress').updateOne(
              { progress_id: progressId },
              {
                $inc: { sent_emails: 1, sending_emails: -1, pending_emails: -1 },
                $set: { updated_at: new Date() }
              }
            )
          )
        );
      }

      await Promise.all(updatePromises);

      // V1 PRESERVED: Redis cache increments AFTER parallel writes
      if (progressId) {
        await EmailDeliveryService.incrementDailySentCount(fromEmail);
        await EmailDeliveryService.incrementBatchUsedCount(fromEmail, campaignId, progressId);

        // V1 PRESERVED: Throttled status check every 50 emails (saves 3 DB calls each)
        try {
          const redis = RedisRateLimiter.getRedis();
          const checkKey = `perf:status_check:${progressId}`;
          const checkCount = await redis.incr(checkKey);
          if (checkCount === 1) await redis.expire(checkKey, 3600);

          // Read totalSubs from campaign_progress (not campaigns collection)
          const progressDocForCheck = await db.collection('campaign_progress').findOne(
            { progress_id: progressId },
            { projection: { 'campaign_metadata.total_subscribers': 1, total_emails: 1 } }
          );
          const totalSubs = progressDocForCheck?.campaign_metadata?.total_subscribers || progressDocForCheck?.total_emails || 0;
          const shouldCheck = checkCount % 50 === 0 || 
                              (totalSubs > 0 && (checkCount >= totalSubs - 10));
          if (shouldCheck) {
            await this.updateCampaignStatusIfNeeded(db, campaignId, progressId);
          }
        } catch (redisErr) {
          // Fallback: always check if Redis fails
          await this.updateCampaignStatusIfNeeded(db, campaignId, progressId);
        }
      } else {
        await this.updateCampaignStatusIfNeeded(db, campaignId, null);
      }

      if (DEBUG) console.log(`✅ Sent: ${subscriber.email}`);
      return { success: true, messageId: sendResult.messageId || messageIdHeader };

    } catch (error) {
      console.error(`❌ Failed to send email:`, error);
      
      // ═══════════════════════════════════════════════════════════════
      // LOCK TIMEOUT FIX: Detect lock timeout and handle differently.
      // Previously, lock timeout was treated like any other error:
      //   1. Marked email as 'failed' permanently
      //   2. Decremented pending_emails and incremented failed_emails
      //   3. When Bull retried, catch ran AGAIN → counters double-counted
      //   Result: pending_emails went deeply negative, failed_emails overcounted
      //
      // NEW BEHAVIOR for lock timeout:
      //   1. Revert log status to 'pending' (undo the 'sending' set)
      //   2. Revert sending_emails counter (undo the +1 at line ~658)
      //   3. Increment retry_attempts on the log document
      //   4. DO NOT touch failed_emails or pending_emails
      //   5. Throw to Bull for automatic retry (attempts:3, backoff:exponential)
      //   → Counters stay balanced, email retries cleanly
      // ═══════════════════════════════════════════════════════════════
      const isLockTimeout = error.message && error.message.includes('Local concurrency lock timeout');
      
      // V1 PRESERVED: Release the atomic batch slot on failure (both lock timeout and other errors)
      if (batchSize && Number(batchSize) > 0) {
        await EmailDeliveryService.decrementBatchCounter(fromEmail, campaignId, progressId);
      }
      
      const db = await EmailDeliveryService.getDatabase();
      
      if (isLockTimeout) {
        // ─── LOCK TIMEOUT PATH: Clean retry without counter corruption ───
        console.warn(`⚠️ Lock timeout for ${fromEmail}, subscriber ${subscriberId}. Reverting to pending for Bull retry.`);
        
        // 1. Revert log status from 'sending' back to 'pending' + track retry
        await EmailDeliveryService.retryOperation(() =>
          db.collection('email_campaign_logs').updateOne(
            {
              campaign_id: Long.fromNumber(Number(campaignId)),
              subscriber_id: Long.fromNumber(Number(subscriberId)),
              progress_id: progressId || { $exists: false }
            },
            {
              $set: { status: 'pending', updated_at: new Date() },
              $inc: { retry_attempts: 1 }
            }
          )
        );
        
        // 2. Revert sending_emails +1 that was incremented at line ~658
        //    Do NOT touch pending_emails or failed_emails — email is still pending
        if (progressId) {
          await EmailDeliveryService.retryOperation(() =>
            db.collection('campaign_progress').updateOne(
              { progress_id: progressId },
              {
                $inc: { sending_emails: -1 },
                $set: { updated_at: new Date() }
              }
            )
          );
        }
        
        // 3. Throw to Bull for automatic retry (attempts:3, backoff:exponential 2s)
        //    NO failed counter increment, NO pending decrement, NO completion check
        throw error;
      }
      
      // ─── ALL OTHER ERRORS: Mark as failed ───
      // COUNTER GUARD: Only adjust failed_emails/pending_emails on the FIRST failure.
      // If this is a Bull retry of an already-failed email (previousLogStatus='failed'),
      // the counters were already adjusted on the first attempt — only revert sending_emails.
      // This prevents triple-counting (3 Bull attempts × 1 increment = 3× overcounted).
      const isFirstFailure = previousLogStatus !== 'failed';
      
      // ITEM 3(3G): Wrapped with retryOperation for connection resilience
      await EmailDeliveryService.retryOperation(() =>
        this.updateLogStatus(db, campaignId, subscriberId, progressId, 'failed', error.message)
      );

      if (progressId) {
        if (isFirstFailure) {
          // FIRST FAILURE: Full counter adjustment (failed+1, sending-1, pending-1)
          await EmailDeliveryService.retryOperation(() =>
            db.collection('campaign_progress').updateOne(
              { progress_id: progressId },
              {
                $inc: { failed_emails: 1, sending_emails: -1, pending_emails: -1 },
                $set: { updated_at: new Date() }
              }
            )
          );
        } else {
          // RETRY OF ALREADY-FAILED: Only revert sending_emails (it was +1 at line ~658)
          // Do NOT increment failed_emails or decrement pending_emails again
          await EmailDeliveryService.retryOperation(() =>
            db.collection('campaign_progress').updateOne(
              { progress_id: progressId },
              {
                $inc: { sending_emails: -1 },
                $set: { updated_at: new Date() }
              }
            )
          );
        }

        // FIX: Increment checkCount for failed emails too (same as success path)
        // Without this, failed emails don't contribute to throttled completion detection
        try {
          const redis = RedisRateLimiter.getRedis();
          const checkKey = `perf:status_check:${progressId}`;
          await redis.incr(checkKey);
        } catch (redisErr) {
          // Non-fatal — updateCampaignStatusIfNeeded below is the safety net
        }

        await this.updateCampaignStatusIfNeeded(db, campaignId, progressId);
      } else {
        await this.updateCampaignStatusIfNeeded(db, campaignId, null);
      }

      throw error;
    }
  }

  /**
   * Process template content with placeholders
   */
  processTemplateContent(content, subscriber, emailAccount, trackingContext = null) {
    const subscriberReplacements = {
      '[email]': subscriber.email || 'N/A',
      '[first_name]': subscriber.first_name || 'N/A',
      '[last_name]': subscriber.last_name || 'N/A',
      '[phone_number]': subscriber.phone_number || 'N/A',
      '[designation]': subscriber.designation || 'N/A',
      '[fax]': subscriber.fax || 'N/A',
      '[unsubscribe_link]': `${process.env.APP_URL || 'http://localhost:3000'}/unsubscribe/${subscriber.tracking_id || subscriber.id}`,
      '[postal_code]': subscriber.postal_code || 'N/A',
      '[address]': subscriber.address || 'N/A',
      '[tracking_id]': subscriber.tracking_id || subscriber.id || 'N/A'
    };

    const senderReplacements = {
      '[sender_email]': emailAccount.email || 'N/A',
      '[sender_first_name]': emailAccount.first_name || 'N/A',
      '[sender_last_name]': emailAccount.last_name || 'N/A',
      '[type]': emailAccount.type || 'N/A',
      '[status]': emailAccount.status || 'N/A',
      '[phone_number]': emailAccount.phone_number || 'N/A',
      '[designation]': emailAccount.designation || 'N/A',
      '[fax]': emailAccount.fax || 'N/A',
      '[postal_code]': emailAccount.postal_code || 'N/A',
      '[address]': emailAccount.address || 'N/A'
    };

    let processed = content;
    const replacements = { ...subscriberReplacements, ...senderReplacements };
    
    for (const [placeholder, value] of Object.entries(replacements)) {
      processed = processed.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    }

    // Clean content
    processed = this.cleanEmailContent(processed);

    // Inject open-tracking pixel
    if (trackingContext && trackingContext.trackingId) {
      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      const pixelUrl = `${appUrl}/api/track/open?tid=${encodeURIComponent(trackingContext.trackingId)}&cid=${encodeURIComponent(trackingContext.campaignId)}&sid=${encodeURIComponent(trackingContext.subscriberId)}`;
      const trackingPixel = `<img src="${pixelUrl}" width="1" height="1" style="display:none;border:0;" alt="" />`;

      if (processed.toLowerCase().includes('</body>')) {
        processed = processed.replace(/<\/body>/i, `${trackingPixel}</body>`);
      } else {
        processed += trackingPixel;
      }
    }
    
    return processed;
  }

  /**
   * Clean email content for consistent rendering
   */
  cleanEmailContent(content) {
    content = content.replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&apos;/g, "'");

    content = content
      .replace(/\u2018/g, "'")
      .replace(/\u2019/g, "'")
      .replace(/\u201C/g, '"')
      .replace(/\u201D/g, '"')
      .replace(/\u2013/g, '-')
      .replace(/\u2014/g, '-')
      .replace(/\u00A0/g, ' ');

    return content;
  }

  /**
   * Send email to subscriber
   */
  async sendEmailToSubscriber(account, subscriber, subject, content, messageIdHeader, campaignId, subscriberId) {
    const maxRetries = 3;
    let attempt = 0;
    let success = false;
    let errorMessage = null;
    let finalMessageId = messageIdHeader;
    let threadId = null;  // ITEM 9: Gmail thread ID for threading support
    
    // PERFORMANCE FIX: Wait for QPS slot FIRST (without holding concurrency lock),
    // then acquire concurrency lock and send immediately.
    // BEFORE: acquireLock → checkRateLimit (workers slept ~1s INSIDE lock = 50% waste)
    // AFTER:  checkRateLimit → acquireLock (workers sleep WITHOUT lock = 0% waste)
    await RedisRateLimiter.checkRateLimit(account.email);
    await RedisRateLimiter.acquireLock(account.email);
    
    try {

      while (attempt < maxRetries && !success) {
        try {
          if (account.type === 'google') {
            if (process.env.EMAIL_DEBUG === 'true') {
              const concurrency = await RedisRateLimiter.getConcurrency(account.email);
              console.log(`📤 Gmail (attempt ${attempt + 1}) ${account.email}, conc: ${concurrency}`);
            }
            
            // Get Google client with send scope
            const oauth2Client = GmailUtility.setupGoogleClient();
          oauth2Client.setCredentials({
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            expiry_date: account.token_expiry ? new Date(account.token_expiry).getTime() : null
          });

          // Check if token needs refresh
          if (account.token_expiry && new Date(account.token_expiry).getTime() <= Date.now()) {
            if (process.env.EMAIL_DEBUG === 'true') console.log(`🔄 Token refresh: ${account.email}`);
            const { credentials } = await oauth2Client.refreshAccessToken();
            oauth2Client.setCredentials(credentials);
            
            // Update token in database — ITEM 3: wrapped with retryOperation
            const db = await EmailDeliveryService.getDatabase();
            await EmailDeliveryService.retryOperation(() =>
              db.collection('email_accounts').updateOne(
                { email: account.email },
                {
                  $set: {
                    access_token: credentials.access_token,
                    token_expiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null
                  }
                }
              )
            );
          }

          const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
          
          const message = this.createGmailMessage(
            account.email,
            subscriber.email,
            subject,
            content,
            messageIdHeader,
            campaignId,
            subscriberId
          );

          // Send email (single API call to reduce rate limit hits)
          const sentMessage = await gmail.users.messages.send({
            userId: 'me',
            requestBody: message
          });

          const gmailMessageId = sentMessage.data.id;
          threadId = sentMessage.data.threadId || null;  // ITEM 9: Capture Gmail thread ID
          finalMessageId = messageIdHeader;
          
          if (process.env.EMAIL_DEBUG === 'true') console.log(`✅ Gmail sent: ${gmailMessageId}, thread: ${threadId}`);
        } else {
          // SMTP sending — V1 PRESERVED: pooled transporter (maxMessages=1000)
          if (process.env.EMAIL_DEBUG === 'true') console.log(`📤 SMTP (attempt ${attempt + 1}) ${account.email} → ${account.outgoing_host}:${account.outgoing_port}`);
          
          const transporter = EmailDeliveryService.getSmtpTransporter(account);

          // ITEM 7: Added Return-Path + List-Unsubscribe for SMTP
          const bounceEmail = process.env.BOUNCE_EMAIL || `bounce@${MessageIdService.getDomain()}`;
          const appUrl = process.env.APP_URL || 'http://localhost:3000';
          const unsubToken = subscriber.tracking_id || subscriber.id;

          // FIX: Mailcow (and most SMTP servers) reject envelope.from when the domain
          // doesn't match the authenticated user. Validate bounce domain matches account domain.
          // e.g. bounce@mail.localhost ≠ user@company.com → Mailcow returns 553 sender rejected
          const accountDomain = account.email.split('@')[1];
          const isValidBounce = bounceEmail 
            && bounceEmail.includes('@') 
            && bounceEmail.split('@')[1] === accountDomain;
          const envelopeFrom = isValidBounce ? bounceEmail : account.email;

          if (process.env.EMAIL_DEBUG === 'true') {
            console.log(`[SMTP DEBUG] account=${account.email}, bounceEmail=${bounceEmail}, envelopeFrom=${envelopeFrom}, domainMatch=${isValidBounce}`);
          }

          const mailOptions = {
            from: account.email,
            to: subscriber.email,
            subject: subject,
            html: content,
            // ITEM 7: Return-Path — uses validated envelope sender (falls back to account.email for Mailcow)
            envelope: {
              from: envelopeFrom,
              to: subscriber.email
            },
            headers: {
              'Message-ID': messageIdHeader,
              'X-Campaign-ID': String(campaignId),
              'X-Subscriber-ID': String(subscriberId),
              // ITEM 7: List-Unsubscribe — uses validated bounce email for mailto link
              'List-Unsubscribe': `<mailto:${envelopeFrom}?subject=unsubscribe>, <${appUrl}/api/unsubscribe-post?token=${encodeURIComponent(unsubToken)}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
            }
          };

          const info = await transporter.sendMail(mailOptions);
          finalMessageId = info.messageId || messageIdHeader;
          if (process.env.EMAIL_DEBUG === 'true') console.log(`✅ SMTP sent: ${info.messageId}`);
        }

        success = true;
      } catch (error) {
        attempt++;
        errorMessage = error.message || String(error);
        
        // ═══════════════════════════════════════════════════════════
        // AUTH SCOPE ERROR: Fail immediately — retrying will NEVER work.
        // This error means the OAuth token was created without gmail.send scope.
        // Only fix: re-authenticate the account through Google OAuth.
        // ═══════════════════════════════════════════════════════════
        const isAuthScopeError = errorMessage.includes('insufficient authentication scopes') ||
                                 errorMessage.includes('Insufficient Permission') ||
                                 errorMessage.includes('insufficientPermissions');
        if (isAuthScopeError) {
          console.error(`⛔ AUTH SCOPE ERROR for ${account.email}: Missing gmail.send scope. Account must be re-authenticated. No retry.`);
          // Break retry loop immediately — retrying won't fix a scope issue
          break;
        }
        
        // Enhanced error logging for authentication failures
        if (error.code === 'EAUTH' || error.responseCode === 535 || errorMessage.includes('authentication failed')) {
          console.error(`⚠️ Auth failed for ${account.email} (attempt ${attempt}): ${errorMessage}. Check password/host/port.`);
        }
        
        // Check for rate limit errors
        const isConcurrentRequestError = errorMessage.includes('Too many concurrent requests') ||
                                        errorMessage.includes('too many concurrent requests') ||
                                        errorMessage.toLowerCase().includes('concurrent');
        const isRateLimit = errorMessage.includes('Quota exceeded') || 
                          isConcurrentRequestError ||
                          errorMessage.includes('429') ||
                          errorMessage.includes('403') ||
                          errorMessage.includes('rate limit') ||
                          errorMessage.includes('Rate limit') ||
                          errorMessage.includes('RESOURCE_EXHAUSTED') ||
                          (error.code && (error.code === 429 || error.code === 403));
        
        if (process.env.EMAIL_DEBUG === 'true') console.warn(`⚠️ Attempt ${attempt} ${account.email}: ${errorMessage}`);
        
        if (attempt < maxRetries) {
          let delay = attempt * 2000;
          
          if (isConcurrentRequestError) {
            if (process.env.EMAIL_DEBUG === 'true') console.warn(`⏳ Concurrent limit hit: ${account.email}, waiting 30-60s`);
            await RedisRateLimiter.releaseLock(account.email);
            delay = 30000 + (Math.random() * 30000);
            await new Promise(resolve => setTimeout(resolve, delay));
            await RedisRateLimiter.checkRateLimit(account.email);
            await RedisRateLimiter.acquireLock(account.email);
          } else if (isRateLimit) {
            if (process.env.EMAIL_DEBUG === 'true') console.warn(`⏳ Rate limit: ${account.email}, waiting 20-40s`);
            await RedisRateLimiter.releaseLock(account.email);
            delay = 20000 + (Math.random() * 20000);
            await new Promise(resolve => setTimeout(resolve, delay));
            await RedisRateLimiter.checkRateLimit(account.email);
            await RedisRateLimiter.acquireLock(account.email);
          } else {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
    }

      if (!success) {
        throw new Error(`Failed to send email after ${maxRetries} attempts: ${errorMessage}`);
      }

      // ITEM 9: Return threadId along with messageId
      return { messageId: finalMessageId, threadId: threadId };
    } finally {
      // Always release lock
      await RedisRateLimiter.releaseLock(account.email);
    }
  }

  /**
   * Create Gmail message
   * ITEM 8: Added Return-Path + List-Unsubscribe headers
   */
  createGmailMessage(from, to, subject, content, messageIdHeader, campaignId, subscriberId) {
    const fromClean = from.replace(/[<>]/g, '').trim();
    const toClean = to.replace(/[<>]/g, '').trim();
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(toClean)) {
      throw new Error(`Invalid To header: ${toClean}`);
    }
    if (!emailRegex.test(fromClean)) {
      throw new Error(`Invalid From header: ${fromClean}`);
    }
    
    const boundary = `boundary_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const plainContent = this.convertHtmlToText(content);
    
    // ITEM 8: Bounce mailbox + List-Unsubscribe for Gmail path
    const bounceEmail = process.env.BOUNCE_EMAIL || `bounce@${MessageIdService.getDomain()}`;
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const unsubToken = subscriberId;
    
    let rawMessage = '';
    rawMessage += `From: ${fromClean}\r\n`;
    rawMessage += `To: ${toClean}\r\n`;
    rawMessage += `Subject: =?utf-8?B?${Buffer.from(subject).toString('base64')}?=\r\n`;
    rawMessage += `Message-ID: ${messageIdHeader}\r\n`;
    rawMessage += `Return-Path: ${bounceEmail}\r\n`;  // ITEM 8
    rawMessage += `MIME-Version: 1.0\r\n`;
    rawMessage += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n`;
    rawMessage += `X-Campaign-ID: ${campaignId}\r\n`;
    rawMessage += `X-Subscriber-ID: ${subscriberId}\r\n`;
    rawMessage += `List-Unsubscribe: <mailto:${bounceEmail}?subject=unsubscribe>, <${appUrl}/api/unsubscribe-post?token=${encodeURIComponent(unsubToken)}>\r\n`;  // ITEM 8
    rawMessage += `List-Unsubscribe-Post: List-Unsubscribe=One-Click\r\n\r\n`;  // ITEM 8
    rawMessage += `--${boundary}\r\n`;
    rawMessage += `Content-Type: text/plain; charset=UTF-8\r\n`;
    rawMessage += `Content-Transfer-Encoding: quoted-printable\r\n\r\n`;
    rawMessage += this.quotedPrintableEncode(plainContent) + '\r\n\r\n';
    rawMessage += `--${boundary}\r\n`;
    rawMessage += `Content-Type: text/html; charset=UTF-8\r\n`;
    rawMessage += `Content-Transfer-Encoding: quoted-printable\r\n\r\n`;
    rawMessage += this.quotedPrintableEncode(content) + '\r\n\r\n';
    rawMessage += `--${boundary}--`;

    const encoded = Buffer.from(rawMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    return { raw: encoded };
  }

  /**
   * Quoted-printable encoding with RFC 2045 soft line breaks
   */
  quotedPrintableEncode(str) {
    if (!str) return '';
    
    const normalize = str.replace(/\r\n/g, '\n');
    const lines = normalize.split('\n');
    const encodedLines = lines.map(line => {
      let encodedLine = '';
      let lineLength = 0;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const code = char.charCodeAt(0);
        let chunk;

        if (code === 61) { // '='
          chunk = '=3D';
        } else if (code === 9) { // tab
          chunk = '=09';
        } else if (code === 32) { // space
          chunk = '=20';
        } else if (code < 32 || code > 126) {
          chunk = `=${code.toString(16).toUpperCase().padStart(2, '0')}`;
        } else {
          chunk = char;
        }

        if (lineLength + chunk.length > 73) {
          encodedLine += '=\r\n';
          lineLength = 0;
        }

        encodedLine += chunk;
        lineLength += chunk.length;
      }

      return encodedLine;
    });

    return encodedLines.join('\r\n');
  }

  /**
   * Convert HTML content to plain text for multipart emails
   */
  convertHtmlToText(html) {
    if (!html) return '';
    let text = html;

    text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
    text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
    text = text
      .replace(/<\/(p|div|br|li|tr)>/gi, '\n')
      .replace(/<li>/gi, '• ')
      .replace(/<\/h\d>/gi, '\n');

    text = text.replace(/<[^>]+>/g, '');
    text = text
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>');

    return text
      .split('\n')
      .map(line => line.trimEnd())
      .join('\n')
      .trim();
  }

  /**
   * Generate tracking ID
   */
  generateTrackingId() {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Generate Message-ID
   * Uses MessageIdService for parseable IDs: <c{cid}.s{sid}.a{hash}.{ts}.{nonce}@domain>
   */
  generateMessageId(campaignId, subscriberId, fromEmail) {
    if (campaignId && subscriberId && fromEmail) {
      return MessageIdService.generate(campaignId, subscriberId, fromEmail);
    }
    const host = process.env.APP_URL ? new URL(process.env.APP_URL).hostname : 'localhost';
    return `<campaign_${Date.now()}_${Math.random().toString(36).substring(2, 15)}@${host}>`;
  }

  /**
   * Update log status — ITEM 3(3K): wrapped with retryOperation
   */
  async updateLogStatus(db, campaignId, subscriberId, progressId, status, errorMessage = null) {
    const update = {
      status,
      updated_at: new Date()
    };

    if (errorMessage) {
      update.error_message = errorMessage;
    }

    await EmailDeliveryService.retryOperation(() =>
      db.collection('email_campaign_logs').updateOne(
        {
          campaign_id: Long.fromNumber(Number(campaignId)),
          subscriber_id: Long.fromNumber(Number(subscriberId)),
          progress_id: progressId || { $exists: false }
        },
        { $set: update }
      )
    );
  }

  /**
   * Update campaign/campaign_progress status when counts change
   * ITEM 3(3H-3J): all DB calls wrapped with retryOperation
   * V1 PRESERVED: totalSubscribers completion check + throttled status checks
   */
   async updateCampaignStatusIfNeeded(db, campaignId, progressId) {
    try {
      // ITEM 3(3H): wrapped with retryOperation
      let progressDoc = null;
      if (progressId) {
        progressDoc = await EmailDeliveryService.retryOperation(() =>
          db.collection('campaign_progress').findOne({ progress_id: progressId })
        );
      } else {
        progressDoc = await EmailDeliveryService.retryOperation(() =>
          db.collection('campaign_progress').findOne({
            campaign_id: Long.fromNumber(Number(campaignId))
          })
        );
      }

      if (!progressDoc) {
        return;
      }

      const pending = progressDoc.pending_emails || 0;
      const sending = progressDoc.sending_emails || 0;
      const failed = progressDoc.failed_emails || 0;
      const sent = progressDoc.sent_emails || 0;
      // V1 PRESERVED: Use totalSubscribers for completion check
      const totalSubscribers = progressDoc.campaign_metadata?.total_subscribers || progressDoc.total_emails || 0;
      const logsProcessed = sent + failed;

      let newStatus = 'Sending';
      if (totalSubscribers > 0) {
        if (logsProcessed >= totalSubscribers) {
          newStatus = failed > 0 ? 'CompletedWithErrors' : 'Completed';
        } else if (sent === 0 && failed === 0 && pending <= 0 && sending <= 0) {
          newStatus = 'Pending';
        }
      } else {
        if (pending <= 0 && sending <= 0 && logsProcessed > 0) {
          newStatus = failed > 0 ? 'CompletedWithErrors' : 'Completed';
        } else if (sent === 0 && failed === 0) {
          newStatus = 'Pending';
        }
      }

      const readableStatus = newStatus === 'CompletedWithErrors' ? 'Completed (With Errors)' : newStatus;
      const isCompleting = (newStatus === 'Completed' || newStatus === 'CompletedWithErrors');

      // ─── ATOMIC COMPLETION: Only ONE worker can claim the transition ───
      let triggeredCompletion = false;

      if (isCompleting) {
        // Atomic: findOneAndUpdate with filter that status is NOT already completed.
        // Only the worker whose update succeeds (returns the old doc) wins the race.
        const atomicResult = await EmailDeliveryService.retryOperation(() =>
          db.collection('campaign_progress').findOneAndUpdate(
            {
              progress_id: progressDoc.progress_id,
              status: { $nin: ['Completed', 'Completed (With Errors)'] }
            },
            {
              $set: {
                status: readableStatus,
                completed_at: new Date(),
                updated_at: new Date()
              }
            },
            { returnDocument: 'before' }
          )
        );

        // MongoDB driver v6+ returns the document directly (not wrapped in {value: doc}).
        // v4/v5 returned {value: doc}. Handle both for safety.
        const resultDoc = atomicResult?.value ?? atomicResult;
        if (resultDoc && resultDoc.progress_id) {
          triggeredCompletion = true;
          console.log(`🏁 Campaign ${campaignId} completion CLAIMED by this worker (${sent} sent, ${failed} failed)`);
        } else {
          // Another worker already claimed completion, or filter didn't match
          console.log(`ℹ️ Campaign ${campaignId} completion already claimed by another worker`);
        }
      } else {
        // Non-completion status update (Sending, Pending) — normal updateOne
        await EmailDeliveryService.retryOperation(() =>
          db.collection('campaign_progress').updateOne(
            { progress_id: progressDoc.progress_id },
            { $set: { status: readableStatus, updated_at: new Date() } }
          )
        );
      }

      // Always update campaigns collection status
      await EmailDeliveryService.retryOperation(() =>
        db.collection('campaigns').updateOne(
          { id: Long.fromNumber(Number(campaignId)) },
          { $set: { status: readableStatus, updated_at: new Date() } }
        )
      );

      // ─── POST-CAMPAIGN TRIGGERS (only by the ONE winning worker) ───
      if (triggeredCompletion) {
        console.log(`🎯 Campaign ${campaignId} just completed — triggering post-campaign automation`);

        // Trigger AutoPostCampaign (sent-status, bounce-status, email-sync, open-sync)
        try {
          const AutoPostCampaignService = require('../../../services/AutoPostCampaignService');
          await AutoPostCampaignService.triggerPostCampaignJobs(db, campaignId, progressId);
          console.log(`✅ AutoPostCampaign triggered successfully for campaign ${campaignId}`);
        } catch (triggerErr) {
          console.error(`❌ AutoPostCampaign trigger FAILED for campaign ${campaignId}:`, triggerErr.message);
          console.error(triggerErr.stack);
        }
      }
    } catch (statusError) {
      console.error('Failed to update campaign status:', statusError);
    }
  }
}

module.exports = EmailDeliveryService;
