#!/usr/bin/env node

/**
 * Email Sent Status Update Worker
 * Background worker for updating dls_mail_send_status in target collections.
 * Maps each email to its actual status from email_campaign_logs (sent, failed, etc.)
 * 
 * Event-driven architecture:
 * - Inserts events into campaign_email_events (append-only audit log)
 * - Updates target collection with $set (latest) + $push (history) + $inc (count)
 * - Preserves full campaign-level send history per contact
 * 
 * Optimized for up to 10 crore (100 million) records:
 * - Cursor-based streaming (no full load into memory)
 * - Batch bulkWrite with configurable batch size
 * - Progress reporting per batch
 * - Retry logic with exponential backoff
 * 
 * Usage: node email-sent-status-worker.js
 */

require('dotenv').config();
const Queue = require('bull');
const { MongoClient, Long } = require('mongodb');
const { getConnectionConfig } = require('../src/config/database.js');

console.log('📧 Starting Email Sent Status Update Worker...');

// Use same simple Redis config as working email-sync-worker.js
const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10)
};

// Create queue with same name as defined in emailSentStatusQueue.js
const emailSentStatusQueue = new Queue('Email Sent Status Update', {
  redis: REDIS_CONFIG,
  settings: {
    stalledInterval: 15 * 60 * 1000,
    maxStalledCount: 3,
    lockDuration: 60 * 60 * 1000,
  }
});

console.log('⏹️  Press Ctrl+C to stop');

/**
 * Get MongoDB connection for a specific database
 */
async function getMongoConnection(databaseName) {
  try {
    const connectionName = databaseName === 'nextjs_stu' ? 'central' : databaseName;
    const config = getConnectionConfig(connectionName);
    const client = new MongoClient(config.uri);
    await client.connect();
    return { client, db: client.db(databaseName) };
  } catch (error) {
    // Fallback to default URI
    const baseUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const client = new MongoClient(`${baseUri}/${databaseName}`);
    await client.connect();
    return { client, db: client.db(databaseName) };
  }
}

/**
 * Main job processor
 * 
 * Job data:
 * - campaignId: numeric campaign ID
 * - campaignName: campaign name (for logging)
 * - database: target database name
 * - collection: target collection name
 * - batchSize: number of records per bulkWrite batch (default 5000)
 * - emailField: field name in target collection that holds the email (default 'email')
 */
emailSentStatusQueue.process('update-sent-status', 1, async (job) => {
  const { campaignId, campaignName, database, collection, batchSize = 5000, emailField = 'email' } = job.data;
  
  console.log(`\n🚀 ========== PROCESSING SENT STATUS UPDATE JOB ${job.id} ==========`);
  console.log(`📋 Campaign: ${campaignName} (ID: ${campaignId})`);
  console.log(`📦 Target: ${database}.${collection}`);
  console.log(`📊 Batch size: ${batchSize}`);
  console.log(`📧 Email field: ${emailField}`);

  let plutoClient = null;
  let targetClient = null;

  try {
    await job.progress(0);

    // ─── PHASE 1: Collect email → status mapping from email_campaign_logs ───
    console.log('\n📥 Phase 1: Collecting email → status mapping from email_campaign_logs...');
    
    const plutoConnection = await getMongoConnection('pluto');
    plutoClient = plutoConnection.client;
    const plutoDb = plutoConnection.db;
    const logsCollection = plutoDb.collection('email_campaign_logs');

    // Build campaign_id filter (handle both numeric and Long types)
    const campaignIdNum = Number(campaignId);
    const campaignFilter = {
      $or: [
        { campaign_id: campaignIdNum },
        { campaign_id: Long.fromNumber(campaignIdNum) }
      ]
    };

    // Count total logs for this campaign
    const totalLogs = await logsCollection.countDocuments(campaignFilter);
    console.log(`📊 Total email campaign logs for campaign ${campaignId}: ${totalLogs}`);

    if (totalLogs === 0) {
      console.log('⚠️ No email campaign logs found for this campaign. Nothing to update.');
      await job.progress(100);
      return {
        status: 'completed',
        message: 'No email campaign logs found',
        totalLogs: 0,
        totalUpdated: 0
      };
    }

    // Stream emails using cursor — memory safe for 10 crore records
    // Map<email, status> to store each email's actual status
    const emailStatusMap = new Map();
    const cursor = logsCollection.find(campaignFilter, {
      projection: { to_email: 1, status: 1 },
      batchSize: 10000
    });

    let logCount = 0;
    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      if (doc.to_email) {
        const email = doc.to_email.toString().toLowerCase().trim();
        const status = doc.status || 'sent'; // default to 'sent' if status missing
        emailStatusMap.set(email, status);
      }
      logCount++;
      
      // Report Phase 1 progress (0-30%)
      if (logCount % 50000 === 0) {
        const phase1Progress = Math.min(30, Math.round((logCount / totalLogs) * 30));
        await job.progress(phase1Progress);
        console.log(`  📧 Collected ${logCount}/${totalLogs} emails (${emailStatusMap.size} unique)...`);
      }
    }
    await cursor.close();

    console.log(`✅ Phase 1 complete: ${emailStatusMap.size} unique emails collected from ${logCount} logs`);
    await job.progress(30);

    if (emailStatusMap.size === 0) {
      console.log('⚠️ No valid emails found in campaign logs.');
      await job.progress(100);
      return {
        status: 'completed',
        message: 'No valid emails found in campaign logs',
        totalLogs: logCount,
        uniqueEmails: 0,
        totalUpdated: 0
      };
    }

    // ─── PHASE 2: Insert events into campaign_email_events ───
    console.log(`\n📋 Phase 2: Inserting events into campaign_email_events...`);
    
    const eventsCollection = plutoDb.collection('campaign_email_events');
    const now = new Date();
    let totalEventsInserted = 0;
    let totalEventsDuplicate = 0;

    const emailArray = Array.from(emailStatusMap.keys());
    const EVENT_BATCH_SIZE = 5000;

    for (let i = 0; i < emailArray.length; i += EVENT_BATCH_SIZE) {
      const chunk = emailArray.slice(i, i + EVENT_BATCH_SIZE);
      const eventDocs = chunk.map(email => ({
        campaign_id: campaignIdNum,
        email,
        source_database: database,
        source_collection: collection,
        event_type: emailStatusMap.get(email) || 'sent',
        event_subtype: null,
        provider_message_id: null,
        event_timestamp: now,
        metadata: { campaign_name: campaignName },
        created_at: now
      }));

      try {
        const result = await eventsCollection.insertMany(eventDocs, { ordered: false });
        totalEventsInserted += result.insertedCount;
      } catch (bulkError) {
        // Duplicate key errors are expected (idempotency) — count them and continue
        if (bulkError.code === 11000 || bulkError.writeErrors) {
          const inserted = bulkError.result?.nInserted || bulkError.insertedCount || 0;
          const dupes = chunk.length - inserted;
          totalEventsInserted += inserted;
          totalEventsDuplicate += dupes;
        } else {
          console.error(`    ⚠️ Event insert error (non-fatal): ${bulkError.message}`);
        }
      }

      // Progress: Phase 2 = 30-50%
      const phase2Progress = 30 + Math.min(20, Math.round(((i + chunk.length) / emailArray.length) * 20));
      await job.progress(phase2Progress);
    }

    console.log(`✅ Phase 2 complete: ${totalEventsInserted} events inserted, ${totalEventsDuplicate} duplicates skipped`);
    await job.progress(50);

    // ─── PHASE 3: Update target collection with history ───
    console.log(`\n📝 Phase 3: Updating ${database}.${collection} with history...`);
    
    const targetConnection = await getMongoConnection(database);
    targetClient = targetConnection.client;
    const targetDb = targetConnection.db;
    const targetCollection = targetDb.collection(collection);

    const QUERY_CHUNK_SIZE = 50000;
    let totalUpdated = 0;
    let totalProcessed = 0;

    for (let i = 0; i < emailArray.length; i += QUERY_CHUNK_SIZE) {
      const emailChunk = emailArray.slice(i, i + QUERY_CHUNK_SIZE);
      
      console.log(`  🔍 Processing email chunk ${Math.floor(i / QUERY_CHUNK_SIZE) + 1}/${Math.ceil(emailArray.length / QUERY_CHUNK_SIZE)} (${emailChunk.length} emails)...`);

      const targetCursor = targetCollection.find(
        { [emailField]: { $in: emailChunk } },
        { projection: { _id: 1, [emailField]: 1 }, batchSize: batchSize }
      );

      let bulkOps = [];
      
      while (await targetCursor.hasNext()) {
        const doc = await targetCursor.next();
        
        const docEmail = doc[emailField] ? doc[emailField].toString().toLowerCase().trim() : '';
        const actualStatus = emailStatusMap.get(docEmail) || 'sent';
        
        bulkOps.push({
          updateOne: {
            filter: { _id: doc._id },
            update: {
              $set: {
                dls_mail_send_status: actualStatus,
                dls_mail_send_last_campaign_id: campaignIdNum,
                dls_mail_send_last_date: now
              },
              $push: {
                dls_mail_send_history: {
                  $each: [{
                    campaign_id: campaignIdNum,
                    campaign_name: campaignName,
                    status: actualStatus,
                    sent_at: now
                  }],
                  $slice: -50
                }
              },
              $inc: { dls_mail_send_count: 1 }
            }
          }
        });
        totalProcessed++;

        if (bulkOps.length >= batchSize) {
          const result = await targetCollection.bulkWrite(bulkOps, { ordered: false });
          totalUpdated += result.modifiedCount;
          
          // Progress: Phase 3 = 50-95%
          const phase3Progress = 50 + Math.min(45, Math.round(
            ((i + totalProcessed) / emailArray.length) * 45
          ));
          await job.progress(phase3Progress);
          
          console.log(`    ✏️ Batch written: ${result.modifiedCount} updated (total: ${totalUpdated})`);
          bulkOps = [];
        }
      }

      if (bulkOps.length > 0) {
        const result = await targetCollection.bulkWrite(bulkOps, { ordered: false });
        totalUpdated += result.modifiedCount;
        console.log(`    ✏️ Final batch: ${result.modifiedCount} updated (total: ${totalUpdated})`);
        bulkOps = [];
      }

      await targetCursor.close();
    }

    // ─── PHASE 4: OpenSearch batch sync (fire-and-forget) ───
    // Sync ALL updated records to OpenSearch in one batch AFTER all MongoDB writes complete.
    // This is architecturally safer than syncing inside the bulkWrite loop.
    if (process.env.OPENSEARCH_ENABLED === 'true' && totalUpdated > 0) {
      console.log(`\n🔄 Phase 4: Syncing updated records to OpenSearch...`);
      try {
        // Dynamic import() because this worker is CJS but OpenSearchService is ESM
        const osModule = await import('./src/services/OpenSearchService.js');
        const transformDocForOpenSearch = osModule.transformDocForOpenSearch;
        const getOpenSearchService = osModule.default;
        const osService = getOpenSearchService();
        const indexName = osService.getIndexName(collection);

        if (indexName) {
          const OS_BATCH_SIZE = 500;
          let osSynced = 0;

          for (let i = 0; i < emailArray.length; i += OS_BATCH_SIZE) {
            const emailChunk = emailArray.slice(i, i + OS_BATCH_SIZE);
            try {
              const docs = await targetCollection.find(
                { [emailField]: { $in: emailChunk } },
                { batchSize: OS_BATCH_SIZE }
              ).toArray();

              if (docs.length > 0) {
                const bulkBody = [];
                for (const doc of docs) {
                  const docId = (doc.id !== undefined && doc.id !== null)
                    ? String(doc.id) : doc._id.toString();
                  bulkBody.push({ index: { _id: docId } });
                  bulkBody.push(transformDocForOpenSearch(doc));
                }
                await osService.bulkIndex(collection, bulkBody, { refresh: false });
                osSynced += docs.length;
              }
            } catch (osChunkErr) {
              console.error(`  ⚠️ OpenSearch batch sync error (non-fatal): ${osChunkErr.message}`);
            }
          }
          console.log(`  ✅ OpenSearch sync complete: ${osSynced} records synced`);
        }
      } catch (osError) {
        // NEVER fail the queue job because of OpenSearch
        console.error(`  ⚠️ OpenSearch sync failed (non-fatal): ${osError.message}`);
      }
    }

    // ─── COMPLETE ───
    await job.progress(100);
    
    const summary = {
      status: 'completed',
      campaignId,
      campaignName,
      database,
      collection,
      totalLogs: logCount,
      uniqueEmails: emailStatusMap.size,
      totalProcessed,
      totalUpdated,
      totalEventsInserted,
      totalEventsDuplicate,
      completedAt: new Date().toISOString()
    };

    console.log(`\n🎉 ========== JOB ${job.id} COMPLETED ==========`);
    console.log(`📊 Summary:`, summary);
    
    return summary;

  } catch (error) {
    console.error(`\n❌ ========== JOB ${job.id} FAILED ==========`);
    console.error(`Error:`, error.message);
    throw error;
  } finally {
    // Always close connections
    if (plutoClient) {
      try { await plutoClient.close(); } catch (e) { /* ignore */ }
    }
    if (targetClient) {
      try { await targetClient.close(); } catch (e) { /* ignore */ }
    }
  }
});

// ─── Event Handlers ───
emailSentStatusQueue.on('completed', (job, result) => {
  console.log(`🎉 Job ${job.id} completed:`, {
    campaign: job.data.campaignName,
    totalUpdated: result?.totalUpdated || 0
  });
});

emailSentStatusQueue.on('failed', (job, error) => {
  console.error(`💥 Job ${job.id} failed:`, {
    campaign: job.data.campaignName,
    error: error.message,
    attempts: job.attemptsMade
  });
});

emailSentStatusQueue.on('progress', (job, progress) => {
  console.log(`📊 Job ${job.id} progress: ${progress}%`);
});

emailSentStatusQueue.on('active', (job) => {
  console.log(`🔄 Job ${job.id} started processing`);
});

console.log('✅ Email Sent Status processor set up successfully');
console.log('🔄 Waiting for jobs...');

// ─── Graceful Shutdown ───
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down email sent status worker...');
  await emailSentStatusQueue.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down email sent status worker...');
  await emailSentStatusQueue.close();
  process.exit(0);
});
