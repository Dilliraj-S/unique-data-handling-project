#!/usr/bin/env node

/**
 * Open Status Sync Worker
 * 
 * Periodically syncs email open events from email_campaign_logs → source collections.
 * This catches opens that happen hours, days, or weeks after a campaign completes.
 * 
 * How it works:
 * 1. Self-schedules a repeatable job every 6 hours
 * 2. Queries email_campaign_logs for tracking_open=1 AND open_synced != true
 * 3. Joins with subscribers to find source_table + source_system
 * 4. Updates dls_mailer_status='opened' in each source collection
 * 5. Marks logs as open_synced=true to avoid re-processing
 * 6. Inserts campaign_email_events for UI tracking
 * 
 * Usage: npm run queue:open-sync
 */

require('dotenv').config();
const Queue = require('bull');
const { MongoClient, Long } = require('mongodb');

const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10)
};

const MONGODB_URI = process.env.PLUTO_MONGODB_URI || 'mongodb://localhost:27017';

console.log('🚀 Starting Open Status Sync Worker...');
console.log('⏹️  Press Ctrl+C to stop');

const openStatusSyncQueue = new Queue('Open Status Sync', {
  redis: REDIS_CONFIG,
  settings: {
    stalledInterval: 15 * 60 * 1000,
    maxStalledCount: 3,
    lockDuration: 60 * 60 * 1000,
  }
});

// ─── Get MongoDB Connection ───
async function getMongoConnection(databaseName) {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  return { client, db: client.db(databaseName) };
}

// ─── Schedule repeatable job every 6 hours ───
async function setupRepeatable() {
  // Remove old repeatable jobs first (prevents duplicates on restart)
  const existing = await openStatusSyncQueue.getRepeatableJobs();
  for (const job of existing) {
    await openStatusSyncQueue.removeRepeatableByKey(job.key);
  }

  // Add new repeatable job: every 6 hours
  await openStatusSyncQueue.add('sync-open-status', {}, {
    repeat: { cron: '0 */6 * * *' }, // Every 6 hours: 00:00, 06:00, 12:00, 18:00
    jobId: 'open-status-sync-repeatable'
  });

  console.log('⏰ Repeatable job scheduled: Every 6 hours (0 */6 * * *)');

  // Also run once immediately on startup
  await openStatusSyncQueue.add('sync-open-status', { immediate: true }, {
    jobId: `open-status-sync-immediate-${Date.now()}`
  });
  console.log('🔄 Immediate sync job queued');
}

// ─── Main Processor ───
openStatusSyncQueue.process('sync-open-status', 1, async (job) => {
  console.log(`\n📬 ========== OPEN STATUS SYNC JOB ${job.id} STARTED ==========`);
  console.log(`⏰ Time: ${new Date().toISOString()}`);

  let plutoClient = null;
  const targetClients = new Map();

  try {
    await job.progress(0);

    // Connect to pluto
    const plutoConnection = await getMongoConnection('pluto');
    plutoClient = plutoConnection.client;
    const plutoDb = plutoConnection.db;

    const logsCollection = plutoDb.collection('email_campaign_logs');
    const subscribersCollection = plutoDb.collection('subscribers');
    const eventsCollection = plutoDb.collection('campaign_email_events');

    // ─── PHASE 1: Find unsynced opens ───
    console.log('\n📥 Phase 1: Finding unsynced email opens...');

    const unsyncedFilter = {
      tracking_open: 1,
      open_synced: { $ne: true }
    };

    const unsyncedCount = await logsCollection.countDocuments(unsyncedFilter);
    console.log(`📊 Unsynced opens found: ${unsyncedCount.toLocaleString()}`);

    if (unsyncedCount === 0) {
      console.log('✅ No new opens to sync. Done.');
      await job.progress(100);
      return {
        status: 'completed',
        unsyncedOpens: 0,
        totalUpdated: 0,
        message: 'No new opens to sync'
      };
    }

    await job.progress(10);

    // ─── PHASE 2: Collect opens with subscriber source info ───
    console.log('\n🔗 Phase 2: Collecting opens with subscriber source info...');

    // Process in batches to avoid memory issues
    const BATCH_SIZE = 5000;
    let totalProcessed = 0;
    let totalUpdated = 0;
    let totalEventsInserted = 0;
    let totalEventsDuplicate = 0;
    let totalNoSource = 0;
    const now = new Date();

    // Group opens by source_system::source_table for batch updates
    // Map<"system::table", Map<email, { campaignId, openedAt }>>
    const sourceGroups = new Map();

    const cursor = logsCollection.find(unsyncedFilter, {
      projection: {
        _id: 1,
        to_email: 1,
        campaign_id: 1,
        subscriber_id: 1,
        tracking_opened_at: 1
      },
      batchSize: BATCH_SIZE
    });

    const logIds = []; // Track log IDs to mark as synced

    while (await cursor.hasNext()) {
      const log = await cursor.next();
      totalProcessed++;
      logIds.push(log._id);

      const email = log.to_email ? log.to_email.toString().toLowerCase().trim() : '';
      if (!email) continue;

      // Find subscriber to get source info
      const subscriberFilter = {
        $or: [
          { id: log.subscriber_id },
        ],
        email: email
      };

      // Use a simple lookup — subscriber_id is the primary key
      const subscriber = await subscribersCollection.findOne(
        { id: log.subscriber_id },
        { projection: { source_table: 1, source_system: 1 } }
      );

      if (!subscriber || !subscriber.source_table || !subscriber.source_system) {
        totalNoSource++;
        continue;
      }

      const key = `${subscriber.source_system}::${subscriber.source_table}`;
      if (!sourceGroups.has(key)) {
        sourceGroups.set(key, new Map());
      }

      sourceGroups.get(key).set(email, {
        campaignId: log.campaign_id instanceof Long ? log.campaign_id.toNumber() : Number(log.campaign_id),
        openedAt: log.tracking_opened_at || now
      });

      // Progress update
      if (totalProcessed % 5000 === 0) {
        const progress = 10 + Math.round((totalProcessed / unsyncedCount) * 40);
        await job.progress(Math.min(50, progress));
        console.log(`  📧 Phase 2: ${totalProcessed.toLocaleString()} / ${unsyncedCount.toLocaleString()} processed`);
      }
    }
    await cursor.close();

    console.log(`\n✅ Phase 2 complete:`);
    console.log(`  📧 Total processed: ${totalProcessed.toLocaleString()}`);
    console.log(`  📂 Source groups: ${sourceGroups.size}`);
    console.log(`  ⏭️  No source info: ${totalNoSource.toLocaleString()}`);

    await job.progress(50);

    // ─── PHASE 3: Update source collections ───
    console.log('\n📝 Phase 3: Updating source collections...');

    let groupIndex = 0;
    for (const [key, emailMap] of sourceGroups) {
      groupIndex++;
      const [sourceSystem, sourceTable] = key.split('::');

      console.log(`\n  📂 Group ${groupIndex}/${sourceGroups.size}: ${sourceSystem}.${sourceTable} (${emailMap.size} emails)`);

      // Get target connection
      let targetConnection;
      if (targetClients.has(sourceSystem)) {
        targetConnection = targetClients.get(sourceSystem);
      } else {
        targetConnection = await getMongoConnection(sourceSystem);
        targetClients.set(sourceSystem, targetConnection);
      }

      const targetCollection = targetConnection.db.collection(sourceTable);
      const emails = Array.from(emailMap.keys());

      // Process in chunks
      const QUERY_CHUNK_SIZE = 50000;
      for (let i = 0; i < emails.length; i += QUERY_CHUNK_SIZE) {
        const emailChunk = emails.slice(i, i + QUERY_CHUNK_SIZE);

        const targetCursor = targetCollection.find(
          { email: { $in: emailChunk } },
          { projection: { _id: 1, email: 1 }, batchSize: 5000 }
        );

        let bulkOps = [];

        while (await targetCursor.hasNext()) {
          const doc = await targetCursor.next();
          const docEmail = doc.email ? doc.email.toString().toLowerCase().trim() : '';
          const openInfo = emailMap.get(docEmail);

          if (openInfo) {
            bulkOps.push({
              updateOne: {
                filter: { _id: doc._id },
                update: {
                  $set: {
                    dls_mailer_status: 'opened',
                    dls_mailer_status_updated_at: now
                  },
                  $push: {
                    dls_mailer_status_history: {
                      $each: [{
                        status: 'opened',
                        campaign_id: openInfo.campaignId,
                        opened_at: openInfo.openedAt,
                        synced_at: now
                      }],
                      $slice: -50
                    }
                  },
                  $inc: { dls_mailer_open_count: 1 }
                }
              }
            });

            if (bulkOps.length >= 5000) {
              const result = await targetCollection.bulkWrite(bulkOps, { ordered: false });
              totalUpdated += result.modifiedCount;
              console.log(`    ✏️ Batch: ${result.modifiedCount} updated (total: ${totalUpdated})`);
              bulkOps = [];
            }
          }
        }

        if (bulkOps.length > 0) {
          const result = await targetCollection.bulkWrite(bulkOps, { ordered: false });
          totalUpdated += result.modifiedCount;
          console.log(`    ✏️ Final batch: ${result.modifiedCount} updated (total: ${totalUpdated})`);
        }

        await targetCursor.close();
      }

      // Insert open events into campaign_email_events
      const eventDocs = [];
      for (const [email, openInfo] of emailMap) {
        eventDocs.push({
          campaign_id: openInfo.campaignId,
          email,
          source_database: sourceSystem,
          source_collection: sourceTable,
          event_type: 'open',
          status: 'opened',
          occurred_at: openInfo.openedAt,
          synced_at: now,
          synced_by: 'open-status-sync-worker'
        });
      }

      // Insert events in batches
      for (let i = 0; i < eventDocs.length; i += 5000) {
        const chunk = eventDocs.slice(i, i + 5000);
        try {
          await eventsCollection.insertMany(chunk, { ordered: false });
          totalEventsInserted += chunk.length;
        } catch (insertErr) {
          if (insertErr.code === 11000) {
            const inserted = insertErr.result?.nInserted || 0;
            totalEventsInserted += inserted;
            totalEventsDuplicate += (chunk.length - inserted);
          } else {
            console.error(`    ⚠️ Event insert error (non-fatal): ${insertErr.message}`);
          }
        }
      }

      const groupProgress = 50 + Math.round((groupIndex / sourceGroups.size) * 40);
      await job.progress(Math.min(90, groupProgress));
    }

    // ─── PHASE 4: Mark logs as synced ───
    console.log('\n📌 Phase 4: Marking logs as synced...');

    // Batch update log IDs
    const LOG_UPDATE_BATCH = 10000;
    for (let i = 0; i < logIds.length; i += LOG_UPDATE_BATCH) {
      const batch = logIds.slice(i, i + LOG_UPDATE_BATCH);
      await logsCollection.updateMany(
        { _id: { $in: batch } },
        { $set: { open_synced: true, open_synced_at: now } }
      );
    }

    console.log(`  ✅ Marked ${logIds.length.toLocaleString()} logs as synced`);

    // ─── COMPLETE ───
    await job.progress(100);

    const summary = {
      status: 'completed',
      unsyncedOpens: unsyncedCount,
      totalProcessed,
      totalUpdated,
      totalNoSource,
      totalEventsInserted,
      totalEventsDuplicate,
      sourceGroups: sourceGroups.size,
      completedAt: new Date().toISOString()
    };

    console.log(`\n🎉 ========== OPEN STATUS SYNC COMPLETED ==========`);
    console.log(`📊 Summary:`, summary);

    return summary;

  } catch (error) {
    console.error(`\n❌ ========== OPEN STATUS SYNC FAILED ==========`);
    console.error(`Error:`, error.message);
    throw error;
  } finally {
    if (plutoClient) {
      try { await plutoClient.close(); } catch (e) { /* ignore */ }
    }
    for (const [, conn] of targetClients) {
      try { await conn.client.close(); } catch (e) { /* ignore */ }
    }
  }
});

// ─── Event Handlers ───
openStatusSyncQueue.on('completed', (job, result) => {
  console.log(`🎉 Open sync job ${job.id} completed:`, {
    totalUpdated: result?.totalUpdated || 0,
    unsyncedOpens: result?.unsyncedOpens || 0
  });
});

openStatusSyncQueue.on('failed', (job, err) => {
  console.error(`❌ Open sync job ${job.id} failed:`, err.message);
});

openStatusSyncQueue.on('active', (job) => {
  console.log(`🔄 Open sync job ${job.id} started processing`);
});

// Setup repeatable job on start
setupRepeatable().then(() => {
  console.log('✅ Open Status Sync Worker ready');
  console.log('🔄 Waiting for sync jobs...');
}).catch(err => {
  console.error('❌ Failed to setup repeatable job:', err.message);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down open status sync worker...');
  await openStatusSyncQueue.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down open status sync worker...');
  await openStatusSyncQueue.close();
  process.exit(0);
});
