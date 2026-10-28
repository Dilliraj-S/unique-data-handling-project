/**
 * Bounce Status Update Worker
 * Background worker for updating dls_bounce_status in target collections
 * by streaming the emails collection and extracting bounce_recipient.
 * 
 * Event-driven architecture:
 * - Filters by campaign time window when auto-triggered (no cross-campaign contamination)
 * - Reads bounce_recipient (the actual bounced email) NOT from_email (mailer-daemon)
 * - Inserts events into campaign_email_events (append-only audit log)
 * - Updates target with $set (latest) + $push (history) + $inc (count)
 * - Preserves full bounce and open history per contact
 * 
 * Architecture: Same as email-sent-status-worker.js
 * 
 * Usage: node bounce-status-worker.js
 */

require('dotenv').config();
const Queue = require('bull');
const { MongoClient } = require('mongodb');
const { getConnectionConfig } = require('../src/config/database.js');

const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10)
};

const bounceQueue = new Queue('Bounce Status Update', {
  redis: REDIS_CONFIG,
  settings: {
    stalledInterval: 15 * 60 * 1000,
    maxStalledCount: 3,
    lockDuration: 60 * 60 * 1000,
  }
});

console.log('🔄 Bounce Status Worker started');
console.log('⏹️  Press Ctrl+C to stop');

// ─── Email Extractor ───
// Handles: "Name <email@example.com>" → "email@example.com"
// Handles: "email@example.com" → "email@example.com"
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function extractEmail(value) {
  if (!value || typeof value !== 'string') return null;

  let email = value.trim();

  // Extract from angle brackets if present: "Name <email>" → "email"
  const angleMatch = email.match(/<([^>]+)>/);
  if (angleMatch) {
    email = angleMatch[1].trim();
  }

  email = email.toLowerCase().trim();

  // Validate
  if (!EMAIL_REGEX.test(email)) return null;

  return email;
}

// Bounce classification types to filter on
const BOUNCE_TYPES = ['hard_bounce', 'soft_bounce', 'ratelimit', 'spam_block', 'bounced'];

// ─── Get MongoDB Connection (matches email-sent-status-worker.js) ───
async function getMongoConnection(databaseName) {
  try {
    const connectionName = databaseName === 'nextjs_stu' ? 'central' : databaseName;
    const config = getConnectionConfig(connectionName);
    const client = new MongoClient(config.uri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 0,
    });
    await client.connect();
    return { client, db: client.db(databaseName) };
  } catch (error) {
    // Fallback to default URI
    const baseUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const client = new MongoClient(`${baseUri}/${databaseName}`, {
      maxPoolSize: 10,
      minPoolSize: 2,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 0,
    });
    await client.connect();
    return { client, db: client.db(databaseName) };
  }
}

/**
 * Main job processor
 * 
 * Job data:
 * - database: target database name
 * - collection: target collection name
 * - batchSize: number of records per bulkWrite batch (default 5000)
 */
bounceQueue.process('update-bounce-status', 1, async (job) => {
  const { database, collection, batchSize = 5000, campaignId, campaignName, campaignStartedAt, autoTriggered } = job.data;
  
  console.log(`\n🚀 ========== JOB ${job.id} STARTED ==========`);
  console.log(`📦 Target: ${database}.${collection}`);
  console.log(`📊 Batch size: ${batchSize}`);
  if (autoTriggered) console.log(`🤖 Auto-triggered for campaign: ${campaignId}`);

  let plutoClient = null;
  let targetClient = null;

  try {
    await job.progress(0);

    // Determine progress allocation based on whether Phase 3 will run
    // With Phase 3: Phase1=0-30%, Phase2=30-70%, Phase3=70-100%
    // Without Phase 3: Phase1=0-40%, Phase2=40-100%
    const hasPhase3 = !!campaignId;
    const P1_END = hasPhase3 ? 30 : 40;
    const P2_END = hasPhase3 ? 70 : 99;

    // ─── PHASE 1: Stream emails collection → build email→status Map ───
    console.log('\n📥 Phase 1: Streaming emails collection to build email→status map...');
    
    const plutoConnection = await getMongoConnection('pluto');
    plutoClient = plutoConnection.client;
    const plutoDb = plutoConnection.db;
    const emailsCollection = plutoDb.collection('emails');

    // Count total for progress calculation
    const totalEmails = await emailsCollection.countDocuments({});
    console.log(`📊 Total emails in source: ${totalEmails.toLocaleString()}`);

    if (totalEmails === 0 && !hasPhase3) {
      await job.progress(100);
      return {
        status: 'completed',
        database,
        collection,
        totalEmails: 0,
        validEmails: 0,
        totalUpdated: 0,
        totalSkipped: 0,
        totalInvalid: 0,
        totalOpenUpdated: 0,
        message: 'No emails found in source collection'
      };
    }

    // Stream with cursor — memory safe for 10+ crore records
    const emailStatusMap = new Map();
    let totalProcessedPhase1 = 0;
    let totalInvalid = 0;
    let totalSkipped = 0;

    if (totalEmails > 0) {
      // Build filter: only bounce emails + campaign time window filter
      const bounceFilter = {
        $or: [
          { classification: { $in: BOUNCE_TYPES } },
          { status: { $in: BOUNCE_TYPES } }
        ]
      };

      // When auto-triggered, only scan bounces received AFTER the campaign started
      if (autoTriggered && campaignStartedAt) {
        bounceFilter.received_at = { $gte: new Date(campaignStartedAt) };
        console.log(`  🔒 Campaign-filtered scan: only bounces received after ${new Date(campaignStartedAt).toISOString()}`);
      }

      console.log(`  🔍 Bounce filter:`, JSON.stringify(bounceFilter));

      const cursor = emailsCollection.find(bounceFilter, {
        projection: { bounce_recipient: 1, from_email: 1, in_reply_to: 1, classification: 1, status: 1 },
        batchSize: batchSize
      });

      // Track emails with null bounce_recipient for fallback lookup
      const needsFallbackLookup = [];

      while (await cursor.hasNext()) {
        const doc = await cursor.next();
        totalProcessedPhase1++;

        // Use classification (more accurate) or fall back to status
        const bounceType = (doc.classification || doc.status || '').toString().toLowerCase().trim();
        if (!bounceType) {
          totalSkipped++;
          continue;
        }

        // Extract email from bounce_recipient (the ACTUAL bounced email)
        const email = extractEmail(doc.bounce_recipient);
        if (email) {
          emailStatusMap.set(email, bounceType);
        } else {
          // bounce_recipient is null — save for fallback lookup via in_reply_to
          if (doc.in_reply_to) {
            needsFallbackLookup.push({
              inReplyTo: doc.in_reply_to,
              bounceType: bounceType
            });
          } else {
            totalInvalid++;
          }
        }

        // Update progress (Phase 1)
        if (totalProcessedPhase1 % 10000 === 0) {
          const phase1Progress = Math.min(P1_END, Math.round((totalProcessedPhase1 / totalEmails) * P1_END));
          await job.progress(phase1Progress);
          console.log(`  📧 Phase 1: ${totalProcessedPhase1.toLocaleString()} / ${totalEmails.toLocaleString()} processed (${emailStatusMap.size.toLocaleString()} unique bounce recipients)`);
        }
      }

      await cursor.close();

      // ─── Fallback: Lookup bounce_recipient from email_campaign_logs via in_reply_to ───
      if (needsFallbackLookup.length > 0) {
        console.log(`  🔄 Fallback: Looking up ${needsFallbackLookup.length} bounce recipients via in_reply_to → email_campaign_logs...`);
        const logsCollection = plutoDb.collection('email_campaign_logs');
        const LOOKUP_BATCH = 500;
        let fallbackFound = 0;

        for (let i = 0; i < needsFallbackLookup.length; i += LOOKUP_BATCH) {
          const batch = needsFallbackLookup.slice(i, i + LOOKUP_BATCH);
          const messageIds = batch.map(b => b.inReplyTo).filter(Boolean);

          // Lookup: find the original sent email by its message_id → get to_email
          const logs = await logsCollection.find(
            { message_id: { $in: messageIds } },
            { projection: { message_id: 1, to_email: 1 } }
          ).toArray();

          const messageIdToEmail = new Map();
          for (const log of logs) {
            if (log.message_id && log.to_email) {
              messageIdToEmail.set(log.message_id, log.to_email.toString().toLowerCase().trim());
            }
          }

          for (const item of batch) {
            const recipientEmail = messageIdToEmail.get(item.inReplyTo);
            if (recipientEmail) {
              emailStatusMap.set(recipientEmail, item.bounceType);
              fallbackFound++;
            }
          }
        }
        console.log(`  ✅ Fallback resolved: ${fallbackFound} / ${needsFallbackLookup.length} bounce recipients found via in_reply_to`);
        totalInvalid += (needsFallbackLookup.length - fallbackFound);
      }
    }

    await job.progress(P1_END);

    console.log(`\n✅ Phase 1 complete:`);
    console.log(`  📧 Total bounce emails processed: ${totalProcessedPhase1.toLocaleString()}`);
    console.log(`  ✅ Valid unique bounce recipients: ${emailStatusMap.size.toLocaleString()}`);
    console.log(`  ⏭️  Skipped (no status): ${totalSkipped.toLocaleString()}`);
    console.log(`  ❌ Invalid (no recipient found): ${totalInvalid.toLocaleString()}`);

    // ─── PHASE 2: Insert bounce events + update dls_bounce_status in target collection ───
    const targetConnection = await getMongoConnection(database);
    targetClient = targetConnection.client;
    const targetDb = targetConnection.db;
    const targetCollection = targetDb.collection(collection);

    let totalUpdated = 0;
    let totalProcessedPhase2 = 0;
    let totalErrors = 0;
    let totalBounceEventsInserted = 0;
    let totalBounceEventsDuplicate = 0;
    const now = new Date();
    const campaignIdNum = campaignId ? Number(campaignId) : null;

    if (emailStatusMap.size > 0) {
      console.log(`\n📝 Phase 2: Updating dls_bounce_status in ${database}.${collection} with history...`);

      const emailArray = Array.from(emailStatusMap.keys());
      const QUERY_CHUNK_SIZE = 50000;

      // Insert bounce events into campaign_email_events (if campaign-triggered)
      if (campaignIdNum) {
        console.log(`  📋 Inserting bounce events into campaign_email_events...`);
        const eventsCollection = plutoDb.collection('campaign_email_events');
        const EVENT_BATCH_SIZE = 5000;

        for (let i = 0; i < emailArray.length; i += EVENT_BATCH_SIZE) {
          const chunk = emailArray.slice(i, i + EVENT_BATCH_SIZE);
          const eventDocs = chunk.map(email => {
            const status = emailStatusMap.get(email);
            const isHard = status && (status.includes('hard') || status === 'bounced');
            return {
              campaign_id: campaignIdNum,
              email,
              source_database: database,
              source_collection: collection,
              event_type: 'bounce',
              event_subtype: isHard ? 'hard_bounce' : 'soft_bounce',
              provider_message_id: null,
              event_timestamp: now,
              metadata: { bounce_status: status, campaign_name: campaignName || null },
              created_at: now
            };
          });

          try {
            const result = await eventsCollection.insertMany(eventDocs, { ordered: false });
            totalBounceEventsInserted += result.insertedCount;
          } catch (bulkError) {
            if (bulkError.code === 11000 || bulkError.writeErrors) {
              const inserted = bulkError.result?.nInserted || bulkError.insertedCount || 0;
              totalBounceEventsInserted += inserted;
              totalBounceEventsDuplicate += (chunk.length - inserted);
            } else {
              console.error(`    ⚠️ Event insert error (non-fatal): ${bulkError.message}`);
            }
          }
        }
        console.log(`  ✅ Bounce events: ${totalBounceEventsInserted} inserted, ${totalBounceEventsDuplicate} duplicates skipped`);
      }

      for (let i = 0; i < emailArray.length; i += QUERY_CHUNK_SIZE) {
        const emailChunk = emailArray.slice(i, i + QUERY_CHUNK_SIZE);
        
        const chunkIndex = Math.floor(i / QUERY_CHUNK_SIZE) + 1;
        const totalChunks = Math.ceil(emailArray.length / QUERY_CHUNK_SIZE);
        console.log(`\n  📦 Processing chunk ${chunkIndex}/${totalChunks} (${emailChunk.length.toLocaleString()} emails)`);

        const targetCursor = targetCollection.find(
          { email: { $in: emailChunk } },
          { projection: { _id: 1, email: 1 }, batchSize: batchSize }
        );

        let bulkOps = [];

        while (await targetCursor.hasNext()) {
          const doc = await targetCursor.next();
          
          const docEmail = doc.email ? doc.email.toString().toLowerCase().trim() : '';
          const status = emailStatusMap.get(docEmail);

          if (status) {
            bulkOps.push({
              updateOne: {
                filter: { _id: doc._id },
                update: {
                  $set: {
                    dls_bounce_status: status,
                    dls_bounce_last_campaign_id: campaignIdNum,
                    dls_bounce_last_date: now
                  },
                  $push: {
                    dls_bounce_history: {
                      $each: [{
                        campaign_id: campaignIdNum,
                        campaign_name: campaignName || null,
                        bounce_type: status,
                        detected_at: now
                      }],
                      $slice: -50
                    }
                  },
                  $inc: { dls_bounce_count: 1 }
                }
              }
            });

            totalProcessedPhase2++;

            if (bulkOps.length >= batchSize) {
              try {
                const result = await targetCollection.bulkWrite(bulkOps, { ordered: false });
                totalUpdated += result.modifiedCount;
                console.log(`    ✏️  Batch: ${result.modifiedCount} updated (total: ${totalUpdated.toLocaleString()})`);
              } catch (bulkError) {
                if (bulkError.result) {
                  totalUpdated += bulkError.result.nModified || 0;
                  totalErrors += (bulkError.result.getWriteErrors?.()?.length || 0);
                }
                console.error(`    ⚠️  Batch partial failure: ${bulkError.message}`);
              }
              bulkOps = [];
            }
          }
        }

        if (bulkOps.length > 0) {
          try {
            const result = await targetCollection.bulkWrite(bulkOps, { ordered: false });
            totalUpdated += result.modifiedCount;
            console.log(`    ✏️  Final batch: ${result.modifiedCount} updated (total: ${totalUpdated.toLocaleString()})`);
          } catch (bulkError) {
            if (bulkError.result) {
              totalUpdated += bulkError.result.nModified || 0;
              totalErrors += (bulkError.result.getWriteErrors?.()?.length || 0);
            }
            console.error(`    ⚠️  Final batch partial failure: ${bulkError.message}`);
          }
          bulkOps = [];
        }

        await targetCursor.close();

        const phase2Progress = P1_END + Math.round(((i + emailChunk.length) / emailArray.length) * (P2_END - P1_END));
        await job.progress(Math.min(P2_END, phase2Progress));
      }
    } else {
      console.log('\n⏭️  Phase 2 skipped: No bounce emails to update');
    }

    await job.progress(P2_END);

    // ─── PHASE 3: Update dls_mailer_status + insert open events ───
    let totalOpenUpdated = 0;
    let totalOpenEventsInserted = 0;
    let totalOpenEventsDuplicate = 0;

    if (hasPhase3) {
      console.log(`\n📬 Phase 3: Updating dls_mailer_status for opened emails (campaign ${campaignId})...`);

      try {
        const { Long } = require('mongodb');
        const logsCollection = plutoDb.collection('email_campaign_logs');

        const campaignFilter = {
          $or: [
            { campaign_id: campaignIdNum },
            { campaign_id: Long.fromNumber(campaignIdNum) }
          ],
          status: 'sent',
          tracking_open: 1
        };

        const openedCount = await logsCollection.countDocuments(campaignFilter);
        console.log(`  📊 Opened emails for campaign ${campaignId}: ${openedCount.toLocaleString()}`);

        if (openedCount > 0) {
          const openedEmailSet = new Set();
          const openCursor = logsCollection.find(campaignFilter, {
            projection: { to_email: 1 },
            batchSize: 10000
          });

          while (await openCursor.hasNext()) {
            const doc = await openCursor.next();
            if (doc.to_email) {
              openedEmailSet.add(doc.to_email.toString().toLowerCase().trim());
            }
          }
          await openCursor.close();

          console.log(`  ✅ Unique opened emails: ${openedEmailSet.size.toLocaleString()}`);

          // Insert open events into campaign_email_events
          if (campaignIdNum) {
            console.log(`  📋 Inserting open events into campaign_email_events...`);
            const eventsCollection = plutoDb.collection('campaign_email_events');
            const openedArray = Array.from(openedEmailSet);
            const EVENT_BATCH_SIZE = 5000;

            for (let i = 0; i < openedArray.length; i += EVENT_BATCH_SIZE) {
              const chunk = openedArray.slice(i, i + EVENT_BATCH_SIZE);
              const eventDocs = chunk.map(email => ({
                campaign_id: campaignIdNum,
                email,
                source_database: database,
                source_collection: collection,
                event_type: 'open',
                event_subtype: null,
                provider_message_id: null,
                event_timestamp: now,
                metadata: { campaign_name: campaignName || null },
                created_at: now
              }));

              try {
                const result = await eventsCollection.insertMany(eventDocs, { ordered: false });
                totalOpenEventsInserted += result.insertedCount;
              } catch (bulkError) {
                if (bulkError.code === 11000 || bulkError.writeErrors) {
                  const inserted = bulkError.result?.nInserted || bulkError.insertedCount || 0;
                  totalOpenEventsInserted += inserted;
                  totalOpenEventsDuplicate += (chunk.length - inserted);
                } else {
                  console.error(`    ⚠️ Open event insert error (non-fatal): ${bulkError.message}`);
                }
              }
            }
            console.log(`  ✅ Open events: ${totalOpenEventsInserted} inserted, ${totalOpenEventsDuplicate} duplicates skipped`);
          }

          // Update dls_mailer_status with history in target collection
          const openedArray2 = Array.from(openedEmailSet);
          const OPEN_CHUNK_SIZE = 50000;

          for (let i = 0; i < openedArray2.length; i += OPEN_CHUNK_SIZE) {
            const emailChunk = openedArray2.slice(i, i + OPEN_CHUNK_SIZE);

            const chunkIndex = Math.floor(i / OPEN_CHUNK_SIZE) + 1;
            const totalChunks = Math.ceil(openedArray2.length / OPEN_CHUNK_SIZE);
            console.log(`  📦 Open-status chunk ${chunkIndex}/${totalChunks} (${emailChunk.length.toLocaleString()} emails)`);

            const openTargetCursor = targetCollection.find(
              { email: { $in: emailChunk } },
              { projection: { _id: 1 }, batchSize: batchSize }
            );

            let openBulkOps = [];

            while (await openTargetCursor.hasNext()) {
              const doc = await openTargetCursor.next();

              openBulkOps.push({
                updateOne: {
                  filter: { _id: doc._id },
                  update: {
                    $set: {
                      dls_mailer_status: 'open',
                      dls_mailer_last_campaign_id: campaignIdNum,
                      dls_mailer_last_open_date: now
                    },
                    $push: {
                      dls_mailer_history: {
                        $each: [{
                          campaign_id: campaignIdNum,
                          campaign_name: campaignName || null,
                          status: 'open',
                          opened_at: now
                        }],
                        $slice: -50
                      }
                    },
                    $inc: { dls_mailer_open_count: 1 }
                  }
                }
              });

              if (openBulkOps.length >= batchSize) {
                try {
                  const result = await targetCollection.bulkWrite(openBulkOps, { ordered: false });
                  totalOpenUpdated += result.modifiedCount;
                  console.log(`    ✏️  Open batch: ${result.modifiedCount} updated (total open: ${totalOpenUpdated.toLocaleString()})`);
                } catch (bulkError) {
                  if (bulkError.result) {
                    totalOpenUpdated += bulkError.result.nModified || 0;
                  }
                  console.error(`    ⚠️  Open batch partial failure: ${bulkError.message}`);
                }
                openBulkOps = [];
              }
            }

            if (openBulkOps.length > 0) {
              try {
                const result = await targetCollection.bulkWrite(openBulkOps, { ordered: false });
                totalOpenUpdated += result.modifiedCount;
                console.log(`    ✏️  Open final batch: ${result.modifiedCount} updated (total open: ${totalOpenUpdated.toLocaleString()})`);
              } catch (bulkError) {
                if (bulkError.result) {
                  totalOpenUpdated += bulkError.result.nModified || 0;
                }
                console.error(`    ⚠️  Open final batch partial failure: ${bulkError.message}`);
              }
              openBulkOps = [];
            }

            await openTargetCursor.close();

            const phase3Progress = P2_END + Math.round(((i + emailChunk.length) / openedArray2.length) * (100 - P2_END));
            await job.progress(Math.min(99, phase3Progress));
          }

          console.log(`  ✅ Phase 3 complete: ${totalOpenUpdated.toLocaleString()} records updated with dls_mailer_status + history`);
        } else {
          console.log('  ⏭️  Phase 3 skipped: No opened emails found for this campaign');
        }
      } catch (phase3Error) {
        // Phase 3 is best-effort — don't fail the entire job
        console.error(`  ⚠️  Phase 3 error (non-fatal): ${phase3Error.message}`);
      }
    }

    // ─── PHASE 4: OpenSearch batch sync (fire-and-forget) ───
    // Sync ALL updated records to OpenSearch in one batch AFTER all MongoDB writes complete.
    // This is architecturally safer than syncing inside the bulkWrite loop.
    if (process.env.OPENSEARCH_ENABLED === 'true' && (totalUpdated > 0 || totalOpenUpdated > 0)) {
      console.log(`\n🔄 Phase 4: Syncing updated records to OpenSearch...`);
      try {
        // Dynamic import() because this worker is CJS but OpenSearchService is ESM
        const osModule = await import('./src/services/OpenSearchService.js');
        const transformDocForOpenSearch = osModule.transformDocForOpenSearch;
        const getOpenSearchService = osModule.default;
        const osService = getOpenSearchService();
        const indexName = osService.getIndexName(collection);

        if (indexName) {
          // Collect ALL emails that were updated (bounce + open status)
          const allUpdatedEmails = Array.from(emailStatusMap.keys());
          const OS_BATCH_SIZE = 500;
          let osSynced = 0;

          for (let i = 0; i < allUpdatedEmails.length; i += OS_BATCH_SIZE) {
            const emailChunk = allUpdatedEmails.slice(i, i + OS_BATCH_SIZE);
            try {
              const docs = await targetCollection.find(
                { email: { $in: emailChunk } },
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
      database,
      collection,
      totalEmails: totalProcessedPhase1,
      validEmails: emailStatusMap.size,
      totalProcessed: totalProcessedPhase2,
      totalUpdated,
      totalSkipped,
      totalInvalid,
      totalErrors,
      totalOpenUpdated,
      totalBounceEventsInserted,
      totalBounceEventsDuplicate,
      totalOpenEventsInserted,
      totalOpenEventsDuplicate,
      campaignId: campaignId || null,
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
bounceQueue.on('completed', (job, result) => {
  console.log(`🎉 Job ${job.id} completed:`, {
    totalUpdated: result?.totalUpdated || 0,
    totalInvalid: result?.totalInvalid || 0
  });
});

bounceQueue.on('failed', (job, err) => {
  console.error(`❌ Job ${job.id} failed:`, err.message);
});

bounceQueue.on('stalled', (job) => {
  console.warn(`⚠️ Job ${job.id} stalled — will be reprocessed`);
});

bounceQueue.on('error', (error) => {
  console.error('Queue error:', error.message);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down bounce status worker...');
  await bounceQueue.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down bounce status worker...');
  await bounceQueue.close();
  process.exit(0);
});
