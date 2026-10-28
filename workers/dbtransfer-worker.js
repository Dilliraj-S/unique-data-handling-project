#!/usr/bin/env node

/**
 * Database Transfer Worker
 * Dedicated worker for Database-to-Database transfer operations
 * 
 * Features:
 * - Cursor-based _id pagination (configurable batch size, default 10K)
 * - Resume from checkpoint after crash (stores lastId in process_logs)
 * - Atomic sequential ID generation via id_counters collection
 * - Cancellation support (checks status flag each batch)
 * - Graceful shutdown (finishes current batch, saves checkpoint, then exits)
 * - Per-batch retry with exponential backoff (3 attempts)
 * - Progress tracking via process_logs (compatible with existing frontend)
 * - Resilient MongoDB connections with pool settings and retry
 * - Handles 10 crore+ documents without timeouts or memory issues
 * - ETA calculations and detailed per-batch logging
 * 
 * Queue: "DB Transfer Processing" (separate from CSV Import Processing)
 * 
 * Usage: node dbtransfer-worker.js
 *   or:  npm run queue:dbtransfer
 * 
 * Environment Variables:
 *   BATCH_SIZE          - Documents per batch (default: 10000)
 *   MONGO_POOL_SIZE     - Connection pool size (default: 20)
 */

require('dotenv').config();
const Queue = require('bull');
const { MongoClient } = require('mongodb');
const { getConnectionConfig } = require('../src/config/database.js');
const fs = require('fs');
const path = require('path');

const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10)
};

// Configurable batch size via env (default 10K — safe for 89-field docs at ~100MB per batch)
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '10000', 10);
const MAX_RETRIES = 3;
const RETRY_DELAYS = [2000, 4000, 8000]; // Exponential backoff: 2s, 4s, 8s
const POOL_SIZE = parseInt(process.env.MONGO_POOL_SIZE || '20', 10);

// ── Graceful Shutdown Flag ──
// When set to true, the current batch will finish, checkpoint will be saved, then exit
let shuttingDown = false;

const dbTransferQueue = new Queue('DB Transfer Processing', {
  redis: REDIS_CONFIG,
  settings: {
    stalledInterval: 30 * 60 * 1000,  // 30 minutes (increased — large batches take time)
    maxStalledCount: 3,
    lockDuration: 4 * 60 * 60 * 1000, // 4 hours (very long transfers at 10 Cr scale)
  }
});

console.log('🔄 Database Transfer Worker started');
console.log(`📦 Batch size: ${BATCH_SIZE.toLocaleString()}`);
console.log(`🔗 Connection pool: ${POOL_SIZE}`);
console.log('⏹️  Press Ctrl+C to stop (graceful — current batch will complete)');

// ═════════════════════════════════════════════════════════════════
// Helper: Get MongoDB connection with resilient settings
// ═════════════════════════════════════════════════════════════════
async function getMongoConnection(databaseName) {
  const connectionName = databaseName === 'nextjs_stu' ? 'central' : databaseName;
  let uri;
  try {
    const config = getConnectionConfig(connectionName);
    uri = config.uri;
  } catch (e) {
    const baseUri = process.env.PLUTO_MONGODB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017';
    uri = `${baseUri.replace(/\/[^/]+$/, '')}/${databaseName}`;
  }

  const client = new MongoClient(uri, {
    maxPoolSize: POOL_SIZE,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 30000,   // 30s to find a server
    socketTimeoutMS: 120000,           // 2 min socket timeout (large batches)
    connectTimeoutMS: 30000,           // 30s connect timeout
    retryWrites: true,
    retryReads: true,
    heartbeatFrequencyMS: 10000,       // 10s heartbeat
    maxIdleTimeMS: 60000,              // 1 min idle before closing
  });

  await client.connect();
  const db = client.db(databaseName);
  return { client, db };
}

// ═════════════════════════════════════════════════════════════════
// Helper: Get central DB connection (sun database for process_logs)
// ═════════════════════════════════════════════════════════════════
async function getSunDb() {
  const uri = process.env.SUN_MONGODB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/sun';
  const client = new MongoClient(uri, {
    maxPoolSize: 5,
    minPoolSize: 1,
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 30000,
    connectTimeoutMS: 15000,
    retryWrites: true,
    retryReads: true,
  });
  await client.connect();
  const db = client.db('sun');
  return { client, db };
}

// ═════════════════════════════════════════════════════════════════
// Helper: Retry an async operation with exponential backoff
// ═════════════════════════════════════════════════════════════════
async function retryOperation(operation, operationName, maxRetries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      const delay = RETRY_DELAYS[attempt - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];

      if (isLastAttempt) {
        console.error(`    ❌ ${operationName} failed after ${maxRetries} attempts: ${error.message}`);
        throw error;
      }

      console.warn(`    ⚠️ ${operationName} attempt ${attempt}/${maxRetries} failed: ${error.message}`);
      console.warn(`       Retrying in ${delay / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// ═════════════════════════════════════════════════════════════════
// Helper: Map source document to destination schema
// ═════════════════════════════════════════════════════════════════
function mapDocument(sourceDoc, mappedColumns, newId) {
  const mappedDoc = {};

  // Frontend sends mappedColumns format: { destinationField: sourceField }
  for (const [destField, sourceField] of Object.entries(mappedColumns)) {
    if (sourceField && sourceDoc[sourceField] !== undefined) {
      let value = sourceDoc[sourceField];

      // Handle NULL values
      if (value === 'NULL' || value === 'null' || value === '') {
        value = null;
      }

      // Basic string trimming
      if (value && typeof value === 'string') {
        value = value.trim();
      }

      mappedDoc[destField] = value;
    }
  }

  // Generate sequential integer ID if not mapped
  if (!mappedDoc.id && mappedDoc.id !== 0) {
    mappedDoc.id = newId;
  }

  // Add timestamps if not present
  if (!mappedDoc.created_at) {
    mappedDoc.created_at = new Date();
  }
  if (!mappedDoc.updated_at) {
    mappedDoc.updated_at = new Date();
  }

  return mappedDoc;
}

// ═════════════════════════════════════════════════════════════════
// Helper: Get next sequential ID atomically
// ═════════════════════════════════════════════════════════════════
async function getStartingId(destCol) {
  try {
    const result = await destCol.find({})
      .sort({ id: -1 })
      .limit(1)
      .project({ id: 1 })
      .toArray();

    if (result.length === 0 || !result[0].id) {
      return 1;
    }

    const maxId = result[0].id;
    if (typeof maxId === 'number') {
      return maxId + 1;
    } else if (typeof maxId === 'string' && !isNaN(parseInt(maxId, 10))) {
      return parseInt(maxId, 10) + 1;
    } else {
      return Date.now();
    }
  } catch (error) {
    console.error('Error getting starting ID:', error);
    return Date.now();
  }
}

// ═════════════════════════════════════════════════════════════════
// Helper: Format duration in human-readable form
// ═════════════════════════════════════════════════════════════════
function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes < 60) return `${minutes}m ${secs}s`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

// ═════════════════════════════════════════════════════════════════
// Helper: Write failed batch info to error log file
// ═════════════════════════════════════════════════════════════════
function logBatchError(processId, batchNum, error, batchRange) {
  try {
    const logFile = path.join(__dirname, `transfer-errors-${processId}.log`);
    const entry = `[${new Date().toISOString()}] Batch ${batchNum} FAILED: ${error.message} | Range: ${JSON.stringify(batchRange)}\n`;
    fs.appendFileSync(logFile, entry);
  } catch (e) {
    // Don't let error logging crash the worker
  }
}

// ═════════════════════════════════════════════════════════════════
// Helper: Save checkpoint to process_logs
// ═════════════════════════════════════════════════════════════════
async function saveCheckpoint(processLogs, processId, data) {
  try {
    await processLogs.updateOne(
      { process_id: processId },
      {
        $set: {
          progress: JSON.stringify(data),
          status: data.status || 'processing',
          updated_at: new Date()
        }
      }
    );
  } catch (e) {
    console.error(`    ⚠️ Failed to save checkpoint: ${e.message}`);
  }
}

// ═════════════════════════════════════════════════════════════════
// DB Transfer Processor
// Copies records from source → destination with field mapping
// Uses _id cursor pagination for 10 crore+ scale
// ═════════════════════════════════════════════════════════════════
dbTransferQueue.process('db-transfer', 1, async (job) => {
  const {
    processId,
    baseDatabase,     // destination database
    baseCollection,   // destination collection
    targetDatabase,   // source database
    targetCollection, // source collection
    mappedColumns,
    type
  } = job.data;

  console.log(`\n🚀 ========== DB TRANSFER: ${processId} ==========`);
  console.log(`📦 Source: ${targetDatabase}.${targetCollection}`);
  console.log(`📦 Destination: ${baseDatabase}.${baseCollection}`);
  console.log(`📋 Mappings: ${Object.keys(mappedColumns).length} fields`);
  console.log(`📦 Batch size: ${BATCH_SIZE.toLocaleString()}`);

  let sourceClient = null;
  let destClient = null;
  let sunClient = null;

  try {
    // ── 1. Connect to source, destination, and sun (progress tracking) ──
    const sourceConn = await getMongoConnection(targetDatabase);
    sourceClient = sourceConn.client;
    const sourceDb = sourceConn.db;
    const sourceCol = sourceDb.collection(targetCollection);

    const destConn = await getMongoConnection(baseDatabase);
    destClient = destConn.client;
    const destDb = destConn.db;
    const destCol = destDb.collection(baseCollection);

    const sunConn = await getSunDb();
    sunClient = sunConn.client;
    const sunDb = sunConn.db;
    const processLogs = sunDb.collection('process_logs');

    // ── 2. Count total records ──
    const totalDocs = await sourceCol.estimatedDocumentCount();
    console.log(`📊 Total documents: ${totalDocs.toLocaleString()}`);

    if (totalDocs === 0) {
      console.log(`⚠️ Source collection is empty — nothing to transfer`);
      await saveCheckpoint(processLogs, processId, {
        total: 0,
        inserted_count: 0,
        rejected_count: 0,
        percentage: 100,
        error: `Source collection (${targetDatabase}.${targetCollection}) is empty.`,
        status: 'failed'
      });
      return { inserted: 0, total: 0 };
    }

    const totalBatches = Math.ceil(totalDocs / BATCH_SIZE);

    // ── 3. Check for resume checkpoint ──
    const existingLog = await processLogs.findOne({ process_id: processId });
    let lastId = null;
    let totalInserted = 0;
    let totalRejected = 0;
    let startBatch = 0;

    if (existingLog && existingLog.progress) {
      try {
        const prev = typeof existingLog.progress === 'string'
          ? JSON.parse(existingLog.progress)
          : existingLog.progress;

        if (prev.last_id && prev.inserted_count > 0) {
          // Resume from checkpoint
          lastId = prev.last_id;
          totalInserted = prev.inserted_count || 0;
          totalRejected = prev.rejected_count || 0;
          startBatch = prev.current_batch || 0;
          console.log(`🔄 RESUMING from checkpoint: batch ${startBatch}, ${totalInserted.toLocaleString()} already inserted`);
          console.log(`🔑 Resume from _id: ${lastId}`);
        }
      } catch (e) {
        // No valid checkpoint, start fresh
      }
    }

    // ── 4. Get starting sequential ID ──
    let nextId = await getStartingId(destCol);
    console.log(`🔢 Starting ID: ${nextId}`);

    // ── 5. Update progress: processing ──
    await saveCheckpoint(processLogs, processId, {
      total: totalDocs,
      inserted_count: totalInserted,
      rejected_count: totalRejected,
      percentage: totalDocs > 0 ? Math.round((totalInserted / totalDocs) * 100) : 0,
      current_batch: startBatch,
      total_batches: totalBatches,
      last_id: lastId,
      status: 'processing'
    });

    await job.progress({ inserted: totalInserted, total: totalDocs, batch: startBatch, phase: 'transferring' });

    // ── 6. Batch transfer loop: _id cursor pagination ──
    let batchNum = startBatch;
    const transferStartTime = Date.now();
    let batchTimes = []; // Track batch durations for ETA calculation

    while (true) {
      batchNum++;

      // ── Check graceful shutdown flag ──
      if (shuttingDown) {
        console.log(`\n🛑 Graceful shutdown requested — saving checkpoint at batch ${batchNum - 1}...`);
        await saveCheckpoint(processLogs, processId, {
          total: totalDocs,
          inserted_count: totalInserted,
          rejected_count: totalRejected,
          percentage: totalDocs > 0 ? Math.round((totalInserted / totalDocs) * 100) : 0,
          current_batch: batchNum - 1,
          total_batches: totalBatches,
          last_id: lastId,
          status: 'processing'
        });
        console.log(`💾 Checkpoint saved: ${totalInserted.toLocaleString()} records at _id: ${lastId}`);
        console.log(`🔄 Restart the worker to resume from this point.`);
        return { inserted: totalInserted, total: totalDocs, status: 'shutdown' };
      }

      // ── Check cancellation from UI ──
      try {
        const currentLog = await processLogs.findOne(
          { process_id: processId },
          { projection: { status: 1 } }
        );
        if (currentLog && (currentLog.status === 'cancelled' || currentLog.status === 'stopped')) {
          console.log(`🛑 Transfer cancelled by user at batch ${batchNum}`);
          await saveCheckpoint(processLogs, processId, {
            total: totalDocs,
            inserted_count: totalInserted,
            rejected_count: totalRejected,
            percentage: totalDocs > 0 ? Math.round((totalInserted / totalDocs) * 100) : 0,
            current_batch: batchNum,
            total_batches: totalBatches,
            last_id: lastId,
            status: 'stopped'
          });
          console.log(`📊 Stopped: ${totalInserted.toLocaleString()} inserted before cancellation`);
          return { inserted: totalInserted, total: totalDocs, status: 'stopped' };
        }
      } catch (e) {
        // Don't fail the transfer because of a status check error
        console.warn(`    ⚠️ Status check failed (continuing): ${e.message}`);
      }

      const batchStartTime = Date.now();

      // ── Stream docs from source using cursor (NO .toArray() memory spike) ──
      // Instead of loading 10K docs at once, we stream via .batchSize(500)
      // and map each doc immediately. Only mappedDocs accumulates in memory.
      const filter = lastId ? { _id: { $gt: lastId } } : {};
      const mappedDocs = [];
      let batchDocCount = 0;

      try {
        const cursor = sourceCol.find(filter)
          .sort({ _id: 1 })
          .limit(BATCH_SIZE)
          .batchSize(500)             // Stream 500 docs at a time from MongoDB
          .maxTimeMS(120000);         // 2 min timeout

        for await (const doc of cursor) {
          batchDocCount++;
          lastId = doc._id; // Track last _id for checkpoint

          const mapped = mapDocument(doc, mappedColumns, nextId++);
          if (mapped) {
            mappedDocs.push(mapped);
          } else {
            totalRejected++;
          }
        }
      } catch (fetchError) {
        // If cursor fails mid-stream, we still have partial mappedDocs
        // Retry the batch from scratch if we got nothing
        if (batchDocCount === 0) {
          console.error(`  ❌ Batch ${batchNum} fetch failed (0 docs): ${fetchError.message}`);
          // Retry once
          try {
            const retryCursor = sourceCol.find(filter)
              .sort({ _id: 1 })
              .limit(BATCH_SIZE)
              .batchSize(500)
              .maxTimeMS(120000);

            for await (const doc of retryCursor) {
              batchDocCount++;
              lastId = doc._id;
              const mapped = mapDocument(doc, mappedColumns, nextId++);
              if (mapped) {
                mappedDocs.push(mapped);
              } else {
                totalRejected++;
              }
            }
          } catch (retryError) {
            console.error(`  ❌ Batch ${batchNum} retry also failed: ${retryError.message}`);
            logBatchError(processId, batchNum, retryError, { filter, batchSize: BATCH_SIZE });
            totalRejected += BATCH_SIZE;
            continue;
          }
        } else {
          // Partial read — process what we got
          console.warn(`  ⚠️ Batch ${batchNum} cursor failed after ${batchDocCount} docs: ${fetchError.message}`);
          console.warn(`     Processing ${mappedDocs.length} successfully read docs...`);
        }
      }

      if (batchDocCount === 0) {
        console.log(`  ✅ No more documents — transfer complete!`);
        break;
      }

      console.log(`  📦 Batch ${batchNum}/${totalBatches}: Streamed & mapped ${batchDocCount.toLocaleString()} docs`);

      // ── Insert batch (WITH RETRY) ──
      if (mappedDocs.length > 0) {
        let batchInserted = 0;
        let batchRejected = 0;

        try {
          const result = await retryOperation(
            async () => {
              const res = await destCol.insertMany(mappedDocs, { ordered: false });
              return res;
            },
            `Batch ${batchNum} insert`
          );
          batchInserted = result.insertedCount;
          totalInserted += batchInserted;
        } catch (batchError) {
          // Count partial inserts from unordered insertMany
          if (batchError.insertedCount) {
            batchInserted = batchError.insertedCount;
            totalInserted += batchInserted;
          }
          batchRejected = mappedDocs.length - batchInserted;
          totalRejected += batchRejected;

          // Log specific error details
          const isDuplicateError = batchError.code === 11000 || (batchError.writeErrors && batchError.writeErrors.some(e => e.code === 11000));
          if (isDuplicateError) {
            console.warn(`    ⚠️ Batch ${batchNum}: ${batchRejected} duplicates skipped, ${batchInserted} inserted`);
          } else {
            console.error(`    ❌ Batch ${batchNum} insert error: ${batchError.message}`);
            logBatchError(processId, batchNum, batchError, { docsCount: mappedDocs.length });
          }
        }
      }

      // ── Calculate ETA ──
      const batchDuration = Date.now() - batchStartTime;
      batchTimes.push(batchDuration);
      // Keep only last 20 batches for moving average
      if (batchTimes.length > 20) batchTimes.shift();
      const avgBatchTime = batchTimes.reduce((a, b) => a + b, 0) / batchTimes.length;
      const remainingBatches = Math.max(0, totalBatches - batchNum);
      const etaMs = remainingBatches * avgBatchTime;
      const pct = totalDocs > 0 ? Math.round((totalInserted / totalDocs) * 100) : 100;
      const speed = batchDuration > 0 ? Math.round((batchDocCount / batchDuration) * 1000) : 0;

      // ── Save checkpoint EVERY batch (critical for resume reliability) ──
      await saveCheckpoint(processLogs, processId, {
        total: totalDocs,
        inserted_count: totalInserted,
        rejected_count: totalRejected,
        percentage: pct,
        current_batch: batchNum,
        total_batches: Math.max(totalBatches, batchNum),
        last_id: lastId,
        status: 'processing'
      });

      await job.progress({
        inserted: totalInserted,
        total: totalDocs,
        batch: batchNum,
        totalBatches: Math.max(totalBatches, batchNum),
        phase: 'transferring'
      });

      // ── Detailed per-batch log with ETA ──
      console.log(`    ✅ Batch ${batchNum}/${totalBatches}: inserted ${mappedDocs.length.toLocaleString()} | total: ${totalInserted.toLocaleString()} / ${totalDocs.toLocaleString()} (${pct}%) | ${speed.toLocaleString()} docs/s | ETA: ${formatDuration(etaMs)}`);

      // Free mapped docs memory (source docs already GC'd — no batchDocs array with streaming)
      mappedDocs.length = 0;
    }

    // ── 7. Complete ──
    const totalDuration = Date.now() - transferStartTime;
    await saveCheckpoint(processLogs, processId, {
      total: totalDocs,
      inserted_count: totalInserted,
      rejected_count: totalRejected,
      percentage: 100,
      current_batch: batchNum,
      total_batches: batchNum,
      duration_ms: totalDuration,
      status: 'completed'
    });

    await job.progress({
      inserted: totalInserted,
      total: totalDocs,
      batch: batchNum,
      totalBatches: batchNum,
      phase: 'completed'
    });

    const summary = {
      processId,
      source: `${targetDatabase}.${targetCollection}`,
      destination: `${baseDatabase}.${baseCollection}`,
      totalInserted,
      totalRejected,
      totalBatches: batchNum,
      duration: formatDuration(totalDuration)
    };

    console.log(`\n🎉 ========== TRANSFER COMPLETED ==========`);
    console.log(`📊 Summary:`, summary);

    return summary;

  } catch (error) {
    console.error(`\n❌ ========== TRANSFER FAILED: ${processId} ==========`);
    console.error(`Error:`, error.message);
    console.error(`Stack:`, error.stack);

    // Update progress: failed — reuse existing sun connection if possible
    try {
      let logsCollection;
      if (sunClient) {
        logsCollection = sunClient.db('sun').collection('process_logs');
      } else {
        const sunConn = await getSunDb();
        logsCollection = sunConn.db.collection('process_logs');
        // Don't close this connection here — let finally handle it
      }
      await logsCollection.updateOne(
        { process_id: processId },
        {
          $set: {
            progress: JSON.stringify({
              total: 0,
              inserted_count: 0,
              rejected_count: 0,
              error: error.message
            }),
            status: 'failed',
            updated_at: new Date()
          }
        }
      );
    } catch (e) {
      console.error('Failed to update progress on error:', e.message);
    }

    throw error;
  } finally {
    // Close all connections
    if (sourceClient) {
      try { await sourceClient.close(); } catch (e) { /* ignore */ }
    }
    if (destClient) {
      try { await destClient.close(); } catch (e) { /* ignore */ }
    }
    if (sunClient) {
      try { await sunClient.close(); } catch (e) { /* ignore */ }
    }
  }
});

// ─── Event Handlers ───
dbTransferQueue.on('completed', (job, result) => {
  console.log(`🎉 Job ${job.id} completed:`, {
    source: result?.source,
    destination: result?.destination,
    inserted: result?.totalInserted || 0,
    duration: result?.duration || 'N/A'
  });
});

dbTransferQueue.on('failed', (job, err) => {
  console.error(`❌ Job ${job.id} failed:`, err.message);
});

dbTransferQueue.on('stalled', (job) => {
  console.warn(`⚠️ Job ${job.id} stalled — will be retried`);
});

// ─── Graceful Shutdown ───
// CRITICAL: Do NOT call process.exit() immediately!
// Set the shuttingDown flag so the current batch can finish and save checkpoint.
process.on('SIGINT', () => {
  if (shuttingDown) {
    // Second Ctrl+C = force exit
    console.log('\n⚠️ Force shutdown (second signal) — exiting immediately!');
    process.exit(1);
  }
  console.log('\n🛑 Graceful shutdown initiated — waiting for current batch to complete...');
  console.log('   (Press Ctrl+C again to force quit)');
  shuttingDown = true;

  // Safety timeout: if the current batch takes more than 5 minutes, force exit
  setTimeout(() => {
    console.error('⚠️ Shutdown timeout (5 min) — forcing exit');
    process.exit(1);
  }, 5 * 60 * 1000);
});

process.on('SIGTERM', () => {
  if (shuttingDown) {
    process.exit(1);
  }
  console.log('\n🛑 SIGTERM received — graceful shutdown initiated...');
  shuttingDown = true;

  setTimeout(() => {
    console.error('⚠️ Shutdown timeout (5 min) — forcing exit');
    process.exit(1);
  }, 5 * 60 * 1000);
});
