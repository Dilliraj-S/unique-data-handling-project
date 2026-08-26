#!/usr/bin/env node

/**
 * Drift Email Queue Worker
 * 
 * REWRITTEN to use Bull Queue - EXACTLY like email-delivery-worker.js
 * This eliminates the polling-based blocking that caused 7-14 minute pauses.
 * 
 * Architecture:
 * 1. Bull queue processes 'send-drift-email' jobs with high concurrency
 * 2. A separate poller adds pending logs to the queue
 * 3. Bull handles all concurrency, retries, and backpressure
 */

require('dotenv').config();
const Queue = require('bull');
const { MongoClient, ObjectId } = require('mongodb');
const SendDriftEmailJob = require('./services/DriftEmail/SendDriftEmailJob');
const TrackDriftRepliesJob = require('./services/DriftEmail/TrackDriftRepliesJob');

// Configuration - same as email-delivery-worker
const CONCURRENCY = parseInt(process.env.DRIFT_CONCURRENCY, 10) || 50;
const POLL_INTERVAL = 2000; // 2 seconds between polls
const BATCH_SIZE = 200; // Logs to fetch per poll

console.log('🚀 Starting Drift Email Queue Worker (Bull Queue Mode)...');
console.log(`📊 Concurrency: ${CONCURRENCY}`);
console.log(`📊 Rate limiter: MAX_CONCURRENT_PER_ACCOUNT=${process.env.MAX_CONCURRENT_PER_ACCOUNT || 10}`);

// Create Bull Queue - EXACTLY like email-delivery-worker
const driftQueue = new Queue('Drift Email', {
  redis: { host: process.env.REDIS_HOST || 'localhost', port: process.env.REDIS_PORT || 6379 },
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 500,
    attempts: 1,  // No Bull retries - we handle retry by keeping log PENDING
  },
  settings: {
    stalledInterval: 60 * 1000,
    maxStalledCount: 2
  }
});

// MongoDB connection
let mongoClient = null;
let db = null;

async function getDb() {
  if (db) return db;
  
  const uri = process.env.MONGODB_URI || process.env.AUTOMATION_MONGODB_URI;
  mongoClient = new MongoClient(uri);
  await mongoClient.connect();
  db = mongoClient.db('pluto');
  console.log('[DriftWorker] Connected to MongoDB (pluto)');
  return db;
}

// ============================================================
// BULL QUEUE PROCESSOR - Like email-delivery-worker
// ============================================================

driftQueue.process('send-drift-email', CONCURRENCY, async (job) => {
  const { logId } = job.data;
  
  console.log(`📧 Processing drift email job ${job.id} | Log: ${logId}`);
  
  const sender = new SendDriftEmailJob();
  
  try {
    await job.progress(0);
    
    const result = await sender.processLog(logId);
    
    await job.progress(100);
    
    if (result.success) {
      console.log(`✅ Drift email sent: ${logId} | ${result.message_id || 'N/A'}`);
      return { success: true, messageId: result.message_id };
    } else if (result.retryLater) {
      // Quota error - log stays PENDING, will be picked up by poller later
      console.log(`⏸️ Quota hit for ${result.accountEmail} - log ${logId} stays PENDING`);
      return { success: false, retryLater: true };
    } else {
      // Real failure
      console.log(`❌ Drift email failed: ${logId} | ${result.reason}`);
      return { success: false, reason: result.reason };
    }
  } catch (error) {
    console.error(`❌ Drift email error: ${logId} | ${error.message}`);
    // Don't throw - let the error be logged, job completes
    return { success: false, error: error.message };
  } finally {
    await sender.close();
  }
});

// Event handlers - exactly like email-delivery-worker
driftQueue.on('completed', (job, result) => {
  if (result?.success) {
    console.log(`🎉 Drift job ${job.id} completed:`, { logId: job.data.logId, messageId: result.messageId || 'N/A' });
  }
});

driftQueue.on('failed', (job, error) => {
  console.error(`💥 Drift job ${job.id} failed:`, { logId: job.data.logId, error: error.message });
});

driftQueue.on('active', (job) => {
  // Minimal logging to reduce noise
});

// ============================================================
// BACKGROUND POLLER - Adds pending logs to Bull queue
// ============================================================

async function pollAndEnqueue() {
  try {
    const database = await getDb();
    const logsCol = database.collection('drift_sequence_logs');
    const sequencesCol = database.collection('drift_sequences');
    const now = new Date();
    
    // Check queue size - don't add more if backed up
    const jobCounts = await driftQueue.getJobCounts();
    const queuedJobs = jobCounts.waiting + jobCounts.active + jobCounts.delayed;
    
    if (queuedJobs >= CONCURRENCY * 3) {
      // Queue has plenty of work
      return 0;
    }
    
    // Check for scheduled sequences that need dispatching
    const scheduledSequences = await sequencesCol.find({
      status: 'scheduled',
      scheduled_at: { $lte: now },
      deleted_at: null
    }).toArray();
    
    for (const seq of scheduledSequences) {
      try {
        if (seq.previous_sequence_id) {
          // Sequence 2+: Mark as 'running' BEFORE calling dispatch to prevent double dispatch
          // This is a belt-and-suspenders approach - DispatchDriftSequenceJob also does this
          await sequencesCol.updateOne(
            { _id: seq._id, status: 'scheduled' }, // Only update if still scheduled
            { $set: { status: 'dispatching', updated_at: now } }
          );
          
          const DispatchDriftSequenceJob = require('./services/DriftEmail/DispatchDriftSequenceJob');
          const dispatchJob = new DispatchDriftSequenceJob();
          await dispatchJob.dispatch(seq.previous_sequence_id.toString());
          await dispatchJob.close();
        } else {
          // Sequence 1: Directly create logs (no previous sequence)
          console.log(`[Poller] Dispatching Sequence 1: ${seq._id}`);
          await dispatchFirstSequence(database, seq);
        }
      } catch (err) {
        console.error(`[Poller] Error dispatching sequence ${seq._id}:`, err.message);
      }
    }
    
    // Find pending logs
    const logs = await logsCol.find({
      status: 'pending',
      $or: [
        { scheduled_at: { $lte: now } },
        { scheduled_at: null },
        { scheduled_at: { $exists: false } }
      ],
      deleted_at: null
    })
    .limit(BATCH_SIZE)
    .toArray();
    
    if (logs.length === 0) return 0;
    
    console.log(`[Poller] Found ${logs.length} pending logs, queue has ${queuedJobs} jobs`);
    
    // Add to Bull queue
    let addedCount = 0;
    for (const log of logs) {
      const logIdStr = log._id.toString();
      const jobId = `drift-${logIdStr}`;
      
      try {
        // Check if already in queue
        const existingJob = await driftQueue.getJob(jobId);
        if (existingJob) {
          const state = await existingJob.getState();
          if (['waiting', 'active', 'delayed'].includes(state)) {
            continue; // Already queued, skip
          }
          // Job is completed/failed - REMOVE it so we can re-add
          // This is needed because logs can go back to 'pending' after quota errors
          await existingJob.remove();
        }
        
        await driftQueue.add('send-drift-email', {
          logId: logIdStr,
          sequenceId: log.sequence_id?.toString(),
          toEmail: log.to_email
        }, {
          jobId: jobId
        });
        
        addedCount++;
      } catch (err) {
        // Log actual errors (not just "already exists")
        if (!err.message?.includes('already exists') && !err.message?.includes('Missing')) {
          console.error(`[Poller] Error adding job for log ${logIdStr}:`, err.message);
        }
      }
    }
    
    if (addedCount > 0) {
      console.log(`[Poller] Added ${addedCount} new jobs to queue`);
    }
    
    return addedCount;
    
  } catch (error) {
    console.error('[Poller] Error:', error.message);
    return 0;
  }
}

// Background reply tracking
async function trackReplies() {
  console.log('[DriftWorker] Starting reply tracking...');
  const tracker = new TrackDriftRepliesJob();
  try {
    await tracker.trackAllRunning();
    console.log('[DriftWorker] Reply tracking complete');
  } catch (error) {
    console.error('[DriftWorker] Error tracking replies:', error.message);
  } finally {
    await tracker.close();
  }
}

// ============================================================
// MAIN - Start poller and queue processor
// ============================================================

console.log('✅ Bull queue processor set up successfully');
console.log('🔄 Starting background poller...');

// ============================================================
// DISPATCH FIRST SEQUENCE - Handles scheduled Sequence 1
// ============================================================

async function dispatchFirstSequence(db, sequence) {
  const logsCol = db.collection('drift_sequence_logs');
  const sequencesCol = db.collection('drift_sequences');
  const subscribersCol = db.collection('subscribers');
  const emailAccountsCol = db.collection('email_accounts');
  const templatesCol = db.collection('templates');
  const { ObjectId, Long } = require('mongodb');
  const now = new Date();
  
  try {
    // CRITICAL: Update status to 'running' IMMEDIATELY to prevent double dispatch
    // The poller runs every second - if we don't update status first,
    // it will find this sequence again while we're still creating logs
    await sequencesCol.updateOne({ _id: sequence._id }, { 
      $set: { 
        status: 'running', 
        started_at: now, 
        updated_at: now 
      } 
    });
    console.log(`[DispatchFirst] Marked sequence ${sequence._id} as running to prevent double dispatch`);
    
    // Get audience_id
    const audienceId = sequence.audience_id;
    if (!audienceId) {
      console.error(`[DispatchFirst] No audience_id for sequence ${sequence._id}`);
      await sequencesCol.updateOne({ _id: sequence._id }, { $set: { status: 'failed', error_message: 'No audience selected' } });
      return;
    }
    
    // Find subscribers in audience (handle Long/Int/String ID)
    let subscribers = await subscribersCol.find({
      $or: [
        { audience_id: audienceId },
        { audience_id: String(audienceId) },
        { audience_id: parseInt(audienceId) },
        { audience_id: Long.fromNumber(Number(audienceId)) }
      ],
      status: 'subscribed',
      deleted_at: null
    }).toArray();
    
    if (subscribers.length === 0) {
      console.log(`[DispatchFirst] No subscribers found for audience ${audienceId}`);
      await sequencesCol.updateOne({ _id: sequence._id }, { $set: { status: 'failed', error_message: 'No subscribers in audience' } });
      return;
    }
    console.log(`[DispatchFirst] Found ${subscribers.length} subscribers`);
    
    // Get email accounts
    let fromEmails = sequence.from_emails || [];
    if (typeof fromEmails === 'string') {
      try { fromEmails = JSON.parse(fromEmails); } catch (e) { fromEmails = []; }
    }
    const uniqueFromEmails = [...new Set(fromEmails)];
    
    let emailAccountsRaw = await emailAccountsCol.find({
      email: { $in: uniqueFromEmails },
      status: 'active',
      deleted_at: null
    }).toArray();
    
    // CRITICAL: Deduplicate email accounts by email address
    // If the same email has multiple records, only use the first one
    const seenEmails = new Set();
    const emailAccounts = [];
    for (const account of emailAccountsRaw) {
      const emailLower = account.email.toLowerCase();
      if (!seenEmails.has(emailLower)) {
        seenEmails.add(emailLower);
        emailAccounts.push(account);
      }
    }
    
    if (emailAccountsRaw.length !== emailAccounts.length) {
      console.log(`[DispatchFirst] Deduplicated email accounts: ${emailAccountsRaw.length} -> ${emailAccounts.length}`);
    }
    
    if (emailAccounts.length === 0) {
      console.error(`[DispatchFirst] No active email accounts for sequence ${sequence._id}`);
      await sequencesCol.updateOne({ _id: sequence._id }, { $set: { status: 'failed', error_message: 'No active email accounts' } });
      return;
    }
    console.log(`[DispatchFirst] Found ${emailAccounts.length} unique email accounts`);
    
    // Resolve template ID
    const rawTemplateId = sequence.template_id;
    let resolvedTemplateId = null;
    
    let templateQuery = {};
    try {
      if (typeof rawTemplateId === 'string' && rawTemplateId.length === 24) {
        templateQuery = { _id: new ObjectId(rawTemplateId) };
      } else {
        templateQuery = {
          $or: [
            { id: rawTemplateId },
            { id: parseInt(rawTemplateId) },
            { id: Long.fromNumber(Number(rawTemplateId)) }
          ]
        };
      }
    } catch (e) {
      templateQuery = { id: rawTemplateId };
    }
    
    const templateDoc = await templatesCol.findOne(templateQuery);
    if (templateDoc) {
      resolvedTemplateId = templateDoc._id;
    } else {
      console.error(`[DispatchFirst] Template not found: ${rawTemplateId}`);
      await sequencesCol.updateOne({ _id: sequence._id }, { $set: { status: 'failed', error_message: `Template not found (ID: ${rawTemplateId})` } });
      return;
    }
    
    
    // Status already updated at start of function - no need to update again
    
    // Create logs with round-robin assignment
    const batchSize = sequence.batch_size || 999;
    const emailAccountCount = emailAccounts.length;
    const accountAssignments = new Array(emailAccountCount).fill(0);
    
    // Limit subscribers to batch_size * account_count
    const totalToSend = batchSize * emailAccountCount;
    const subscribersToProcess = subscribers.length > totalToSend ? subscribers.slice(0, totalToSend) : subscribers;
    
    let insertedCount = 0;
    let subscriberIndex = 0;
    
    for (const subscriber of subscribersToProcess) {
      let accountIndex = subscriberIndex % emailAccountCount;
      
      // Find account that hasn't exceeded batch_size
      if (accountAssignments[accountIndex] >= batchSize) {
        let found = false;
        for (let i = 0; i < emailAccountCount; i++) {
          const nextIndex = (accountIndex + i + 1) % emailAccountCount;
          if (accountAssignments[nextIndex] < batchSize) {
            accountIndex = nextIndex;
            found = true;
            break;
          }
        }
        if (!found) {
          subscriberIndex++;
          continue;
        }
      }
      
      const account = emailAccounts[accountIndex];
      accountAssignments[accountIndex]++;
      
      await logsCol.insertOne({
        sequence_id: sequence._id,
        set_id: sequence.set_id,
        subscriber_id: subscriber._id,
        email_account_id: account._id,
        template_id: resolvedTemplateId,
        status: 'pending',
        batch_size: batchSize,
        created_at: now,
        updated_at: now,
        deleted_at: null
      });
      
      insertedCount++;
      subscriberIndex++;
    }
    
    console.log(`[DispatchFirst] Created ${insertedCount} pending logs for sequence ${sequence._id}`);
    console.log(`[DispatchFirst] Account assignments:`, emailAccounts.map((acc, idx) => ({ email: acc.email, assigned: accountAssignments[idx] })));
    
  } catch (error) {
    console.error(`[DispatchFirst] Error:`, error);
    await sequencesCol.updateOne({ _id: sequence._id }, { $set: { status: 'failed', error_message: error.message } });
  }
}

// Start polling loop (non-blocking, runs in background)
let pollInterval = null;
let replyTrackInterval = null;

async function startPolling() {
  // Initial poll
  await pollAndEnqueue();
  
  // Regular polling
  pollInterval = setInterval(async () => {
    await pollAndEnqueue();
  }, POLL_INTERVAL);
  
  // Reply tracking every 5 minutes
  replyTrackInterval = setInterval(async () => {
    await trackReplies();
  }, 5 * 60 * 1000);
}

startPolling();

console.log('🔄 Waiting for drift email jobs...');

// Graceful shutdown
async function shutdown() {
  console.log('\n🛑 Shutting down drift worker...');
  
  if (pollInterval) clearInterval(pollInterval);
  if (replyTrackInterval) clearInterval(replyTrackInterval);
  
  await driftQueue.close();
  
  if (mongoClient) {
    await mongoClient.close();
  }
  
  console.log('✅ Drift worker shutdown complete');
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
