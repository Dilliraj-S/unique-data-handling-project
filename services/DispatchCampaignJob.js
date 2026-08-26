/**
 * DispatchCampaignJob - High-Performance Campaign Dispatcher
 * Producer component that reads subscribers in chunks and dispatches email jobs
 * 
 * Features:
 * - Cursor-based reading (memory safe for 300k+ subscribers)
 * - Smart resume (duplicate protection)
 * - Smart account rotation (global quota awareness)
 * - High-speed job dispatching
 */

const { MongoClient, Long } = require('mongodb');
const Queue = require('bull');
// Suppression list: skip bounced/spam/unsubscribed at dispatch time (zero wasted jobs)
const SuppressionService = require('../src/application/Services/SuppressionService');
const RedisRateLimiter = require('./RedisRateLimiter');

const DEFAULT_DAILY_SEND_LIMIT = parseInt(process.env.DEFAULT_DAILY_SEND_LIMIT, 10) || 500;

class DispatchCampaignJob {
  constructor() {
    this.client = null;
    this.db = null;
    this.emailDeliveryQueue = null;
  }

  /**
   * Initialize database connection
   */
  async connectToDatabase() {
    if (this.db) return this.db;

    const mongoUrl = process.env.PLUTO_MONGODB_URI || 'mongodb://localhost:27017/pluto';
    // ADD 1: MongoDB production pool config (from V2)
    // socketTimeoutMS=60s critical for large cursor reads on 85k+ subscriber collections
    this.client = new MongoClient(mongoUrl, {
      maxPoolSize: 50,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 60000,
      connectTimeoutMS: 10000,
      retryWrites: true,
      retryReads: true,
    });
    await this.client.connect();
    this.db = this.client.db('pluto');
    return this.db;
  }

  /**
   * Initialize queue
   */
  initializeQueue() {
    if (this.emailDeliveryQueue) return this.emailDeliveryQueue;
    
    this.emailDeliveryQueue = new Queue('Email Delivery', {
      redis: { host: 'localhost', port: 6379 }
    });
    return this.emailDeliveryQueue;
  }

  /**
   * Close connections
   */
  async closeConnections() {
    if (this.emailDeliveryQueue) {
      await this.emailDeliveryQueue.close();
      this.emailDeliveryQueue = null;
    }
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
  }

  /**
   * Get available accounts with global quota check
   */
  async getAvailableAccounts(fromEmails, campaignId) {
    const db = await this.connectToDatabase();
    const emailAccountsCollection = db.collection('email_accounts');
    const emailCampaignLogsCollection = db.collection('email_campaign_logs');
    
    // Get all accounts
    const accounts = await emailAccountsCollection.find({
      email: { $in: fromEmails },
      status: 'active'
    }).toArray();

    if (accounts.length === 0) {
      throw new Error('No active email accounts found');
    }

    // Use 24-hour rolling window for daily limit check (prevents rapid re-sending)
    // This ensures true 24-hour spacing: if limit reached at 11:59 PM, must wait until 11:59 PM next day
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Check global quota for each account (across ALL campaigns)
    const accountCapacity = await Promise.all(accounts.map(async (acc) => {
      const dailyLimit = acc.daily_send_limit || DEFAULT_DAILY_SEND_LIMIT;
      
      // Count emails sent in last 24 hours (global, across all campaigns)
      const sentToday = await emailCampaignLogsCollection.countDocuments({
        from_email: acc.email,
        status: 'sent',
        sent_at: { $gte: twentyFourHoursAgo }
      });
      
      const available = Math.max(0, dailyLimit - sentToday);
      
      return {
        email: acc.email,
        account: acc,
        dailyLimit,
        sentToday,
        available
      };
    }));

    // IMPORTANT: Do NOT drop accounts that hit daily limit.
    // We still return all active accounts so dispatcher can queue work for multi-day sending.
    // EmailDeliveryService will enforce daily limit and defer sends beyond the limit.
    const availableAccounts = accounts; // include all active accounts regardless of remaining daily capacity

    console.log(`📊 Accounts: ${accounts.length} active, ${accountCapacity.filter(acc => acc.available <= 0).length} exhausted`);

    if (availableAccounts.length === 0) {
      throw new Error('No active email accounts found after capacity check');
    }

    return {
      accounts: availableAccounts,
      capacity: accountCapacity
    };
  }

  /**
   * Check if subscriber email was already sent (duplicate protection)
   */
  async isDuplicate(campaignId, subscriberId) {
    const db = await this.connectToDatabase();
    const emailCampaignLogsCollection = db.collection('email_campaign_logs');
    
    const existing = await emailCampaignLogsCollection.findOne({
      campaign_id: Long.fromNumber(Number(campaignId)),
      subscriber_id: subscriberId instanceof Long ? subscriberId : Long.fromNumber(Number(subscriberId)),
      status: { $in: ['sent', 'pending', 'sending'] }
    });

    return !!existing;
  }

  /**
   * Dispatch campaign - Main entry point
   */
  async dispatchCampaign(jobData) {
    const {
      campaign_id,
      from_emails,
      subject,
      progress_id,
      assignment_mode = 'batch_size',
      batch_size = 2000,  
      manual_assignments = {}
    } = jobData;

    console.log(`\n🚀 DISPATCH campaign ${campaign_id}: ${from_emails.length} accounts, batch=${batch_size}, mode=${assignment_mode}`);

    const db = await this.connectToDatabase();
    this.initializeQueue();

    try {
      // Get campaign and template
      const campaignsCollection = db.collection('campaigns');
      const campaign = await campaignsCollection.findOne({
        id: Long.fromNumber(Number(campaign_id))
      });

      if (!campaign) {
        throw new Error(`Campaign not found: ${campaign_id}`);
      }

      const templatesCollection = db.collection('templates');
      const template = await templatesCollection.findOne({
        id: campaign.template_id
      });

      if (!template) {
        throw new Error(`Template not found: ${campaign.template_id}`);
      }

      // Get available accounts with global quota check
      const { accounts: availableAccounts, capacity: accountCapacity } = 
        await this.getAvailableAccounts(from_emails, campaign_id);

      // CRITICAL: Check if accounts have already reached batch_size for this campaign
      // This prevents duplicate dispatches from creating 2x the batch_size
      const emailCampaignLogsCollection = db.collection('email_campaign_logs');
      const batchSizeLimit = assignment_mode === 'batch_size' ? Number(batch_size) : null;
      let accountBatchCounts = null; // Store for later use in accountUsage initialization
      
      if (batchSizeLimit && batchSizeLimit > 0) {
        if (process.env.EMAIL_DEBUG === 'true') console.log(`🔍 Checking batch_size (${batchSizeLimit}) for campaign ${campaign_id}...`);
        
        // Check each account to see if it has already dispatched batch_size emails
        // CRITICAL FIX: Filter by progress_id to only count emails from THIS dispatch
        // This prevents counting emails from previous dispatches of the same campaign
        accountBatchCounts = await Promise.all(
          availableAccounts.map(async (acc) => {
            // Count emails dispatched (sent + sending + pending) for this account, campaign, and progress_id
            // Only count emails from THIS specific dispatch (progress_id)
            const count = await emailCampaignLogsCollection.countDocuments({
              from_email: acc.email,
              campaign_id: Long.fromNumber(Number(campaign_id)),
              progress_id: progress_id || { $exists: false },
              status: { $in: ['sent', 'sending', 'pending'] }
            });
            
            return {
              email: acc.email,
              account: acc,
              alreadyDispatched: count,
              batchSizeLimit: batchSizeLimit,
              canDispatchMore: count < batchSizeLimit,
              remaining: Math.max(0, batchSizeLimit - count)
            };
          })
        );
        
        // Filter out accounts that have already reached batch_size
        const accountsThatCanDispatch = accountBatchCounts.filter(acc => acc.canDispatchMore);
        
        if (accountsThatCanDispatch.length === 0) {
          console.log(`⚠️ All accounts have already reached batch_size (${batchSizeLimit}) for campaign ${campaign_id}. Skipping dispatch.`);
          return {
            success: true,
            totalSubscribers: 0,
            dispatchedCount: 0,
            duplicateCount: 0,
            skippedCount: 0,
            chunkCount: 0,
            message: 'All accounts have already reached batch_size limit for this campaign'
          };
        }
        
        if (accountsThatCanDispatch.length < availableAccounts.length) {
          const exhaustedAccounts = accountBatchCounts.filter(acc => !acc.canDispatchMore);
          console.log(`⚠️ ${exhaustedAccounts.length} account(s) have already reached batch_size and will be skipped:`, 
            exhaustedAccounts.map(a => `${a.email} (${a.alreadyDispatched}/${a.batchSizeLimit})`).join(', '));
        }
        
        // Update availableAccounts to only include accounts that can dispatch more
        const accountsToUse = accountsThatCanDispatch.map(acc => acc.account);
        const capacityToUse = accountCapacity.filter(cap => 
          accountsToUse.some(acc => acc.email === cap.email)
        );
        
        if (process.env.EMAIL_DEBUG === 'true') {
          console.log(`📊 Account batch status:`, accountBatchCounts.map(acc => ({
            email: acc.email,
            alreadyDispatched: acc.alreadyDispatched,
            batchSizeLimit: acc.batchSizeLimit,
            canDispatchMore: acc.canDispatchMore,
            remaining: acc.remaining
          })));
        }
        
        // Replace availableAccounts and accountCapacity with filtered versions
        availableAccounts.length = 0;
        availableAccounts.push(...accountsToUse);
        accountCapacity.length = 0;
        accountCapacity.push(...capacityToUse);
      }

      // Load suppression list ONCE before dispatch (O(1) lookup per subscriber)
      let suppressedSet = new Set();
      try {
        const redis = RedisRateLimiter.getRedis();
        const suppressionSvc = new SuppressionService(db, redis);
        suppressedSet = await suppressionSvc.loadSuppressedSet();
        console.log(`🚫 Loaded ${suppressedSet.size} suppressed emails for filtering`);
      } catch (suppressionErr) {
        console.warn('⚠️ Could not load suppression list, proceeding without:', suppressionErr.message);
      }

      // ADD 4: Warm Redis cache for per-email suppression checks in EmailDeliveryService (fire-and-forget)
      try {
        const Redis = require('ioredis');
        const redisForWarming = new Redis({ host: 'localhost', port: 6379, lazyConnect: true });
        await redisForWarming.connect();
        const warmingService = new SuppressionService(db, redisForWarming);
        warmingService.warmRedisCache(suppressedSet).then(() => {
          redisForWarming.disconnect();
        }).catch(err => {
          console.warn('⚠️ Redis cache warming failed (non-fatal):', err.message);
          redisForWarming.disconnect();
        });
      } catch (redisErr) {
        console.warn('⚠️ Redis not available for cache warming (non-fatal):', redisErr.message);
      }

      // Get subscribers using cursor (memory safe)
      const subscribersCollection = db.collection('subscribers');
      const cursor = subscribersCollection.find({
        audience_id: campaign.audience_id,
        status: { $in: ['subscribed', 'active'] }
      }).batchSize(1000); // Read in chunks of 1000

      // Statistics
      let totalSubscribers = 0;
      let dispatchedCount = 0;
      let duplicateCount = 0;
      let skippedCount = 0;
      let suppressedCount = 0;
      let chunkCount = 0;

      // Account rotation tracking
      // Initialize accountUsage - if batch_size check was done, account for already dispatched emails
      const accountUsage = accountCapacity.map(cap => {
        // If batch_size check was done, use the already dispatched count
        if (accountBatchCounts) {
          const batchInfo = accountBatchCounts.find(b => b.email === cap.email);
          return {
            email: cap.email,
            account: availableAccounts.find(a => a.email === cap.email),
            batchUsed: batchInfo ? batchInfo.alreadyDispatched : 0,
            totalUsed: batchInfo ? batchInfo.alreadyDispatched : 0,
            available: cap.available,
            dailyLimit: cap.dailyLimit,
            lastRefreshHour: new Date().getHours()
          };
        } else {
          // No batch_size check, initialize normally
          return {
            email: cap.email,
            account: availableAccounts.find(a => a.email === cap.email),
            batchUsed: 0,
            totalUsed: 0,
            available: cap.available,
            dailyLimit: cap.dailyLimit,
            lastRefreshHour: new Date().getHours() // Track hour for midnight crossover detection
          };
        }
      });

      let currentAccountIndex = 0;
      // emailCampaignLogsCollection already declared above for batch_size check

      // Atomic counter collection for O(1) ID generation (replaces findOne+sort full-scan)
      const countersCollection = db.collection('counters');

      if (process.env.EMAIL_DEBUG === 'true') console.log(`\n📖 Starting cursor-based subscriber reading...`);

      // ADD 2: Pre-load existing subscriber IDs into memory Set
      // CAMPAIGN-WIDE DEDUP: Loads subscribers across ALL dispatches (not just current progress_id)
      // This prevents re-sending to subscribers already sent in previous multi-day dispatches.
      // For single-dispatch campaigns, this Set is empty → zero overhead.
      const existingSubscriberIds = new Set();
      const existingCursor = emailCampaignLogsCollection.find(
        {
          campaign_id: Long.fromNumber(Number(campaign_id)),
          // NO progress_id filter → catches ALL previous dispatches
          status: { $in: ['sent', 'pending', 'sending'] }
        },
        { projection: { subscriber_id: 1 } }
      );
      await existingCursor.forEach((doc) => {
        if (!doc || !doc.subscriber_id) return;
        const idVal =
          doc.subscriber_id instanceof Long
            ? doc.subscriber_id.toNumber()
            : Number(doc.subscriber_id);
        if (!Number.isNaN(idVal)) {
          existingSubscriberIds.add(idVal);
        }
      });
      if (existingSubscriberIds.size > 0) {
        console.log(`📋 Pre-loaded ${existingSubscriberIds.size} existing subscriber IDs across ALL dispatches for campaign ${campaign_id} (campaign-wide dedup)`);
      }

      // Process subscribers in chunks
      while (await cursor.hasNext()) {
        chunkCount++;
        const chunkStart = Date.now();
        let chunkDispatched = 0;
        let chunkDuplicates = 0;

        // Refresh available accounts (check quota again)
        // IMPORTANT: Get fresh capacity data to account for emails sent by other campaigns
        const { accounts: refreshedAccounts, capacity: refreshedCapacity } = await this.getAvailableAccounts(from_emails, campaign_id);
        
        // Detect midnight crossover for logging
        const currentHour = new Date().getHours();
        const crossedMidnight = accountUsage.some(usage => usage.lastRefreshHour === 23 && currentHour === 0);
        
        if (crossedMidnight) {
          console.log(`🕛 Campaign ${campaign_id} crossed midnight. Daily limit reset detected. Refreshing capacity for new day.`);
        }
        
        // Update account usage with refreshed accounts and fresh capacity data
        accountUsage.forEach(usage => {
          const refreshed = refreshedAccounts.find(a => a.email === usage.email);
          if (!refreshed) {
            // Account exhausted, mark as unavailable
            usage.available = 0;
          } else {
            // Update available capacity using FRESH capacity data (not stale initial data)
            const freshCapacity = refreshedCapacity.find(c => c.email === usage.email);
            if (freshCapacity) {
              // Available = fresh available capacity minus what we've already dispatched in THIS campaign
              const oldAvailable = usage.available;
              usage.available = Math.max(0, freshCapacity.available - usage.totalUsed);
              usage.dailyLimit = freshCapacity.dailyLimit;
              usage.lastRefreshHour = currentHour;
              
              // Log if capacity increased significantly (midnight reset)
              if (crossedMidnight && usage.available > oldAvailable + 100) {
                console.log(`🔄 Account ${usage.email}: Capacity refreshed after midnight. Old: ${oldAvailable}, New: ${usage.available}, Dispatched in this campaign: ${usage.totalUsed}`);
              }
            } else {
              // Fallback: mark as unavailable if capacity data missing
              usage.available = 0;
            }
          }
        });

        // NOTE: Do NOT filter out accounts with zero daily capacity.
        // We allow queuing beyond today's quota so workers can defer to next day.
        const activeAccounts = accountUsage; // all accounts remain eligible

        // For batch_size mode: Check if all accounts have reached batch_size limit
        // CRITICAL FIX: Use batchUsed (dispatch-time counter) NOT totalUsed (which was
        // polluted by daily limit refreshes). Daily limits are enforced at SEND TIME
        // by EmailDeliveryService.sendEmail() — not here.
        if (assignment_mode === 'batch_size') {
          const batchSizeLimit = Number(batch_size);
          const allAccountsAtBatchLimit = activeAccounts.every(acc => {
            return acc.batchUsed >= batchSizeLimit;
          });
          
          if (allAccountsAtBatchLimit) {
            console.log(`✅ Batch size limit reached for all accounts (${batchSizeLimit} per account). Stopping dispatch.`);
            break; // Stop the outer loop
          }
        }

        // Process chunk (up to 1000 subscribers)
        const chunkPromises = [];
        let chunkProcessed = 0;
        const maxChunkSize = 1000;

        // PERF FIX: Batch-reserve IDs for the entire chunk in ONE DB call
        // instead of one findOneAndUpdate per subscriber (saves 2ms × chunkSize)
        const batchCounterDoc = await countersCollection.findOneAndUpdate(
          { _id: 'email_campaign_logs' },
          { $inc: { seq: Long.fromNumber(maxChunkSize) } },
          { upsert: true, returnDocument: 'after' }
        );
        const batchEndSeq = batchCounterDoc.seq instanceof Long
          ? batchCounterDoc.seq.toNumber()
          : Number(batchCounterDoc.seq);
        const batchStartSeq = batchEndSeq - maxChunkSize + 1;
        let chunkIdOffset = 0; // Tracks how many IDs from the batch we've used

        while (await cursor.hasNext() && chunkProcessed < maxChunkSize) {
          const subscriber = await cursor.next();
          totalSubscribers++;
          chunkProcessed++;

          // Validate email address before processing (prevents wasted API calls)
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!subscriber.email || !emailRegex.test(subscriber.email)) {
            if (process.env.EMAIL_DEBUG === 'true') console.warn(`⚠️ Invalid email skipped: ${subscriber.email || 'empty'}`);
            skippedCount++;
            continue;
          }

          // Check suppression list (bounced/spam/unsubscribed — O(1) Set lookup)
          if (suppressedSet.has(subscriber.email.toLowerCase().trim())) {
            if (process.env.EMAIL_DEBUG === 'true') console.log(`🚫 Skipping suppressed: ${subscriber.email}`);
            suppressedCount++;
            skippedCount++;
            continue;
          }

          // ADD 2: Check duplicate using preloaded in-memory Set (O(1), no DB query)
          const subscriberNumericId =
            subscriber.id instanceof Long
              ? subscriber.id.toNumber()
              : Number(subscriber.id);
          if (!Number.isNaN(subscriberNumericId) &&
              existingSubscriberIds.has(subscriberNumericId)) {
            duplicateCount++;
            chunkDuplicates++;
            continue;
          }

          // Assign to account (smart rotation)
          let account = null;
          let assigned = false;

          if (assignment_mode === 'batch_size') {
            const batchSizeLimit = Number(batch_size);
            let attempts = 0;
            const maxAttempts = activeAccounts.length * 2;

            while (attempts < maxAttempts && !assigned) {
              const accIndex = currentAccountIndex % activeAccounts.length;
              const accUsage = activeAccounts[accIndex];

              // CRITICAL FIX: Use batchUsed for batch limit check, NOT totalUsed.
              // totalUsed was being reduced by daily_send_limit refreshes, causing
              // the dispatcher to stop at ~16k instead of dispatching all 82k+.
              // Daily limit is enforced at SEND TIME by EmailDeliveryService.
              const batchRemaining = batchSizeLimit - accUsage.batchUsed;
              
              // Allow queuing full batch; worker will snooze past daily limit.
              const canSendMore = batchRemaining > 0;

              if (canSendMore) {
                account = accUsage.account;
                // Increment batchUsed (dispatch-time batch counter)
                accUsage.batchUsed = Math.min(accUsage.batchUsed + 1, batchSizeLimit);
                accUsage.totalUsed++;
                assigned = true;
                currentAccountIndex = (currentAccountIndex + 1) % activeAccounts.length;
                break;
              } else {
                // Log why this account can't send more (for debugging)
                if (batchRemaining <= 0) {
                  if (process.env.EMAIL_DEBUG === 'true') console.log(`⚠️ Account ${accUsage.email} batch full: ${accUsage.batchUsed}/${batchSizeLimit}`);
                }
                currentAccountIndex = (currentAccountIndex + 1) % activeAccounts.length;
                attempts++;
              }
            }

            // For batch_size mode: batch_size is a HARD LIMIT per account
            // Don't reset and continue - stop when batch_size is reached
            // This ensures if batch_size=100, only 100 emails are dispatched per account
            if (!assigned) {
              // Check if any account has reached batch_size limit
              const allAccountsAtBatchLimit = activeAccounts.every(acc => {
                return acc.batchUsed >= batchSizeLimit;
              });
              
              if (allAccountsAtBatchLimit) {
                // All accounts have reached batch_size limit - stop dispatching
                console.log(`✅ Batch size limit reached for all accounts (${batchSizeLimit} per account). Stopping dispatch.`);
                // Break the outer loop to stop reading subscribers
                break; 
              }
              
              // Some accounts might still have capacity, but we've tried all - skip
              skippedCount++;
              continue;
            }
          } else {
            // Manual assignment mode
            for (let i = 0; i < activeAccounts.length; i++) {
              const accUsage = activeAccounts[i];
              const acc = accUsage.account;
              const maxCount = manual_assignments[acc.email] || 0;

              // Allow queuing up to manual assignment count; daily limit enforced later.
              if (accUsage.totalUsed < maxCount) {
                account = acc;
                accUsage.totalUsed++;
                assigned = true;
                break;
              }
            }
          }

          // If not assigned because batch_size exhausted, do NOT create logs (prevents off-by-one)
          if (!assigned || !account) {
            skippedCount++;
            continue;
          }

          // Use batch-reserved ID (O(1), no DB call)
          const trackingId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
          const nextLogId = Long.fromNumber(batchStartSeq + chunkIdOffset);
          chunkIdOffset++;

          const logEntry = {
            id: nextLogId,
            progress_id: progress_id,
            campaign_id: Long.fromNumber(Number(campaign_id)),
            subscriber_id: subscriber.id instanceof Long ? subscriber.id : Long.fromNumber(Number(subscriber.id)),
            from_email: account.email,
            to_email: subscriber.email,
            region: account.region || null,
            timezone: null,
            batch_size: batch_size ? String(batch_size) : null,
            status: 'pending',
            tracking_id: trackingId,
            tracking_open: 0,
            open_synced: false,
            tracking_clicks: null,
            message_id: null,
            original_message_id: null,  // ADD 6: Set by EmailDeliveryService when sending (bounce attribution)
            retry_attempts: 0,
            error_message: null,
            sent_at: null,
            sent_method: 'sent_immediately',
            created_at: new Date(),
            updated_at: new Date()
          };

          // Dispatch email job (no delay for high speed)
          // ADD 3: Include pre-loaded subscriber + account data to skip 2 DB queries per worker email
          const emailJobData = {
            campaignId: campaign_id,
            fromEmail: account.email,
            subject: subject,
            templateContent: template.content,
            subscriberId: subscriber.id instanceof Long ? subscriber.id.toNumber() : subscriber.id,
            region: account.region || null,
            timezone: null,
            progressId: progress_id,
            batchSize: batch_size,
            toEmail: subscriber.email,
            // P2: Pre-loaded subscriber data (avoids findOne in worker)
            subscriberData: {
              email: subscriber.email,
              first_name: subscriber.first_name || null,
              last_name: subscriber.last_name || null,
              phone_number: subscriber.phone_number || null,
              designation: subscriber.designation || null,
              fax: subscriber.fax || null,
              postal_code: subscriber.postal_code || null,
              address: subscriber.address || null,
              tracking_id: subscriber.tracking_id || null,
              id: subscriber.id instanceof Long ? subscriber.id.toNumber() : subscriber.id
            },
            // P2: Pre-loaded account data (avoids findOne in worker)
            accountData: {
              email: account.email,
              type: account.type,
              status: account.status,
              region: account.region || null,
              first_name: account.first_name || null,
              last_name: account.last_name || null,
              phone_number: account.phone_number || null,
              designation: account.designation || null,
              fax: account.fax || null,
              postal_code: account.postal_code || null,
              address: account.address || null,
              daily_send_limit: account.daily_send_limit || null,
              outgoing_host: account.outgoing_host || null,
              outgoing_port: account.outgoing_port || null,
              outgoing_encryption: account.outgoing_encryption || null,
              password: account.password || null,
              access_token: account.access_token || null,
              refresh_token: account.refresh_token || null,
              token_expiry: account.token_expiry || null
            }
          };

          // Add job to queue (no delay - Redis rate limiter handles concurrency)
          // Rate limiter will enforce 200ms delay between emails from same account
          chunkPromises.push(
            emailCampaignLogsCollection.insertOne(logEntry).then(() => {
              // ADD 5: Mark subscriber as dispatched for future chunk duplicate checks
              if (!Number.isNaN(subscriberNumericId)) {
                existingSubscriberIds.add(subscriberNumericId);
              }
              return this.emailDeliveryQueue.add('send-email', emailJobData, {
                attempts: 3,
                backoff: {
                  type: 'exponential',
                  delay: 2000
                },
                delay: 0 // No delay - rate limiter handles it
              });
            })
          );

          dispatchedCount++;
          chunkDispatched++;
        }

        // Wait for chunk to complete
        await Promise.all(chunkPromises);

        const chunkTime = Date.now() - chunkStart;
        console.log(`📦 Chunk ${chunkCount}: ${chunkDispatched} dispatched, ${chunkDuplicates} duplicates, ${chunkTime}ms`);

        // Small delay between chunks to prevent overwhelming Redis
        if (await cursor.hasNext()) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`\n✅ Campaign dispatch completed!`);
      console.log(`📊 Statistics:`);
      console.log(`   - Total Subscribers: ${totalSubscribers}`);
      console.log(`   - Dispatched: ${dispatchedCount}`);
      console.log(`   - Duplicates Skipped: ${duplicateCount}`);
      console.log(`   - Suppressed (bounce/spam): ${suppressedCount}`);
      console.log(`   - Skipped (no account): ${skippedCount}`);
      console.log(`   - Chunks Processed: ${chunkCount}`);

      // CRITICAL: Update campaign_progress with actual dispatch results.
      // This ensures the system knows exactly how many emails were dispatched
      // and can detect incomplete dispatches (e.g., batch_size cap reached).
      const campaignProgressCollection = db.collection('campaign_progress');
      const dispatchUpdate = {
        pending_emails: dispatchedCount, // All dispatched start as pending
        updated_at: new Date(),
        'campaign_metadata.dispatched_count': dispatchedCount,
        'campaign_metadata.duplicate_count': duplicateCount,
        'campaign_metadata.skipped_count': skippedCount,
        'campaign_metadata.total_subscribers_read': totalSubscribers,
        'campaign_metadata.dispatch_completed_at': new Date(),
        'campaign_metadata.dispatch_complete': true
      };

      // If not all subscribers were dispatched, log a warning
      if (dispatchedCount < totalSubscribers) {
        const gap = totalSubscribers - dispatchedCount - duplicateCount - skippedCount;
        console.warn(`⚠️ Dispatch gap detected: ${totalSubscribers} subscribers, ${dispatchedCount} dispatched, ${duplicateCount} duplicates, ${skippedCount} skipped, ${gap} unaccounted`);
        dispatchUpdate['campaign_metadata.dispatch_gap'] = totalSubscribers - dispatchedCount;
        dispatchUpdate['campaign_metadata.dispatch_gap_reason'] = 
          `batch_size cap: ${batch_size} per account × ${accountUsage.length} accounts = ${Number(batch_size) * accountUsage.length} max`;
      }

      await campaignProgressCollection.updateOne(
        { progress_id: progress_id },
        { $set: dispatchUpdate }
      );

      console.log(`📊 Updated campaign_progress: pending_emails=${dispatchedCount}, dispatch_complete=true`);

      return {
        success: true,
        totalSubscribers,
        dispatchedCount,
        duplicateCount,
        skippedCount,
        chunkCount
      };

    } catch (error) {
      console.error(`❌ Campaign dispatch failed:`, error);
      throw error;
    }
  }
}

module.exports = DispatchCampaignJob;

