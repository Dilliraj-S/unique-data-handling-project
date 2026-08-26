#!/usr/bin/env node

/**
 * Cleanup Worker - Restores mutated fields and removes *_original fields
 * 
 * Processes cleanup jobs from cleanupQueue:
 * 1. Scans collection for documents with *_original fields
 * 2. Restores original values: id = id_original, email = email_original
 * 3. Removes *_original fields
 * 4. Uses bulkWrite with batch processing for 10 crore+ scale
 * 
 * Usage: node cleanup-worker.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const { MongoClient } = require('mongodb');
const cleanupQueue = require('./queues/cleanupQueue');

// Batch size for bulkWrite operations
// 5000 is optimal: large enough for throughput, small enough for memory
const BATCH_SIZE = 5000;

// Progress update interval (every N batches)
const PROGRESS_UPDATE_INTERVAL = 2;

/**
 * Get MongoDB connection for a given database name
 */
async function getMongoConnection(databaseName) {
  // Use shared config if available
  let mongoUrl, dbName;
  try {
    const { getConnectionConfig } = require('./config/database');
    const connectionName = databaseName === 'nextjs_stu' ? 'central' : databaseName;
    const config = getConnectionConfig(connectionName);
    mongoUrl = config.uri;
    dbName = config.database || databaseName;
  } catch (e) {
    const baseUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    mongoUrl = `${baseUri}/${databaseName}`;
    dbName = databaseName;
  }

  const client = new MongoClient(mongoUrl, {
    maxPoolSize: 10,
    minPoolSize: 2,
    socketTimeoutMS: 0,        // No timeout for long operations
    connectTimeoutMS: 30000,
    heartbeatFrequencyMS: 10000,
  });

  await client.connect();
  const db = client.db(dbName);
  return { client, db };
}

/**
 * Main cleanup job processor
 */
cleanupQueue.process('field-cleanup', 1, async (job) => {
  const { database, collection } = job.data;

  console.log(`\n🧹 ========== CLEANUP JOB ${job.id} ==========`);
  console.log(`📦 Database: ${database}`);
  console.log(`📋 Collection: ${collection}`);

  let client = null;

  try {
    // ─── Phase 1: Connect ───
    await job.progress({
      phase: 'connecting',
      processed: 0,
      total: 0,
      restored: 0,
      cleaned: 0,
      message: 'Connecting to database...'
    });

    const connection = await getMongoConnection(database);
    client = connection.client;
    const db = connection.db;
    const col = db.collection(collection);

    // ─── Phase 2: Count affected documents ───
    await job.progress({
      phase: 'counting',
      processed: 0,
      total: 0,
      restored: 0,
      cleaned: 0,
      message: 'Counting affected documents...'
    });

    // Count docs that have id_original OR email_original
    const affectedCount = await col.countDocuments({
      $or: [
        { id_original: { $exists: true } },
        { email_original: { $exists: true } }
      ]
    });

    console.log(`📊 Affected documents: ${affectedCount.toLocaleString()}`);

    if (affectedCount === 0) {
      console.log('✅ No cleanup needed — no *_original fields found');
      await job.progress({
        phase: 'completed',
        processed: 0,
        total: 0,
        restored: 0,
        cleaned: 0,
        message: 'No cleanup needed — collection is clean!'
      });
      return {
        status: 'completed',
        database,
        collection,
        affected: 0,
        restored: 0,
        cleaned: 0,
        message: 'No cleanup needed'
      };
    }

    // ─── Phase 3: Batch cleanup using cursor + bulkWrite ───
    console.log('\n🔄 Phase 3: Batch cleanup...');
    await job.progress({
      phase: 'cleaning',
      processed: 0,
      total: affectedCount,
      restored: 0,
      cleaned: 0,
      message: `Starting cleanup of ${affectedCount.toLocaleString()} documents...`
    });

    let totalProcessed = 0;
    let totalRestored = 0;
    let totalCleaned = 0;
    let totalDuplicatesDeleted = 0;
    let batchCount = 0;

    // Use cursor to stream through affected documents
    const cursor = col.find({
      $or: [
        { id_original: { $exists: true } },
        { email_original: { $exists: true } }
      ]
    }, {
      projection: { _id: 1, id_original: 1, email_original: 1 },
      batchSize: BATCH_SIZE
    });

    let bulkOps = [];

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      
      const updateSet = {};
      const updateUnset = {};
      let restoredFields = 0;

      // Restore id from id_original
      if (doc.id_original !== undefined && doc.id_original !== null) {
        updateSet.id = doc.id_original;
        updateUnset.id_original = '';
        restoredFields++;
      }

      // Restore email from email_original
      if (doc.email_original !== undefined && doc.email_original !== null) {
        updateSet.email = doc.email_original;
        updateUnset.email_original = '';
        restoredFields++;
      }

      // Build update operation
      const updateOp = {};
      if (Object.keys(updateSet).length > 0) updateOp.$set = updateSet;
      if (Object.keys(updateUnset).length > 0) updateOp.$unset = updateUnset;

      if (Object.keys(updateOp).length > 0) {
        bulkOps.push({
          updateOne: {
            filter: { _id: doc._id },
            update: updateOp
          }
        });
        totalRestored += restoredFields;
      }

      // Execute batch when full
      if (bulkOps.length >= BATCH_SIZE) {
        try {
          const result = await col.bulkWrite(bulkOps, { ordered: false, bypassDocumentValidation: true });
          totalProcessed += bulkOps.length;
          totalCleaned += result.modifiedCount || 0;
        } catch (bulkError) {
          // Handle partial success — ordered: false means some ops succeed even if others fail
          if (bulkError.result) {
            totalCleaned += bulkError.result.nModified || 0;
          }
          totalProcessed += bulkOps.length;
          
          // Collect duplicate key errors (E11000) — DELETE these duplicate documents
          if (bulkError.writeErrors) {
            const dupErrors = bulkError.writeErrors.filter(e => e.code === 11000);
            if (dupErrors.length > 0) {
              // Get the _ids of failed ops from the original bulkOps array
              const dupIds = dupErrors.map(e => bulkOps[e.index]?.updateOne?.filter?._id).filter(Boolean);
              if (dupIds.length > 0) {
                const delResult = await col.deleteMany({ _id: { $in: dupIds } });
                totalDuplicatesDeleted += delResult.deletedCount || 0;
                console.log(`  🗑️ Deleted ${delResult.deletedCount} duplicate documents`);
              }
            }
            const nonDupErrors = bulkError.writeErrors.filter(e => e.code !== 11000);
            if (nonDupErrors.length > 0) {
              console.warn(`  ⚠️ ${nonDupErrors.length} non-duplicate errors in batch ${batchCount + 1}`);
            }
          }
        }
        batchCount++;
        bulkOps = [];

        // Update progress
        if (batchCount % PROGRESS_UPDATE_INTERVAL === 0) {
          const percent = Math.round((totalProcessed / affectedCount) * 100);
          console.log(`  📦 Batch ${batchCount}: ${totalProcessed.toLocaleString()}/${affectedCount.toLocaleString()} (${percent}%) — ${totalCleaned.toLocaleString()} cleaned, ${totalDuplicatesDeleted} dups deleted`);
          
          await job.progress({
            phase: 'cleaning',
            processed: totalProcessed,
            total: affectedCount,
            restored: totalRestored,
            cleaned: totalCleaned,
            duplicatesDeleted: totalDuplicatesDeleted,
            percentage: percent,
            currentBatch: batchCount,
            message: `Cleaned ${totalProcessed.toLocaleString()} of ${affectedCount.toLocaleString()} documents (${percent}%)${totalDuplicatesDeleted > 0 ? ` — ${totalDuplicatesDeleted} duplicates deleted` : ''}`
          });
        }
      }
    }

    // Process remaining documents
    if (bulkOps.length > 0) {
      try {
        const result = await col.bulkWrite(bulkOps, { ordered: false, bypassDocumentValidation: true });
        totalProcessed += bulkOps.length;
        totalCleaned += result.modifiedCount || 0;
      } catch (bulkError) {
        if (bulkError.result) {
          totalCleaned += bulkError.result.nModified || 0;
        }
        totalProcessed += bulkOps.length;
        if (bulkError.writeErrors) {
          const dupErrors = bulkError.writeErrors.filter(e => e.code === 11000);
          if (dupErrors.length > 0) {
            const dupIds = dupErrors.map(e => bulkOps[e.index]?.updateOne?.filter?._id).filter(Boolean);
            if (dupIds.length > 0) {
              const delResult = await col.deleteMany({ _id: { $in: dupIds } });
              totalDuplicatesDeleted += delResult.deletedCount || 0;
              console.log(`  🗑️ Deleted ${delResult.deletedCount} duplicate documents`);
            }
          }
        }
      }
      batchCount++;
    }

    await cursor.close();

    // ─── Phase 4: Complete ───
    const summary = {
      status: 'completed',
      database,
      collection,
      affected: affectedCount,
      processed: totalProcessed,
      restored: totalRestored,
      cleaned: totalCleaned,
      duplicatesDeleted: totalDuplicatesDeleted,
      batches: batchCount,
      completedAt: new Date().toISOString()
    };

    await job.progress({
      phase: 'completed',
      processed: totalProcessed,
      total: affectedCount,
      restored: totalRestored,
      cleaned: totalCleaned,
      percentage: 100,
      message: `Cleanup complete! ${totalCleaned.toLocaleString()} documents cleaned.`
    });

    console.log(`\n🎉 ========== JOB ${job.id} COMPLETED ==========`);
    console.log(`📊 Summary:`, summary);

    return summary;

  } catch (error) {
    console.error(`\n❌ ========== JOB ${job.id} FAILED ==========`);
    console.error(`Error:`, error.message);
    throw error;
  } finally {
    if (client) {
      try { await client.close(); } catch (e) { /* ignore */ }
    }
  }
});

// ─── Worker Lifecycle ───
console.log('🧹 Cleanup Worker started, waiting for jobs...');

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⚠️  Received SIGINT, shutting down cleanup worker...');
  await cleanupQueue.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⚠️  Received SIGTERM, shutting down cleanup worker...');
  await cleanupQueue.close();
  process.exit(0);
});
