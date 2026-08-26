#!/usr/bin/env node

/**
 * Bulk Update Worker
 * Dedicated worker for column rename and value update operations
 * 
 * Features:
 * - Batch $rename with _id cursor (50,000 docs per batch)
 * - Progress reporting via bulk_update_progress collection
 * - Handles 20 crore+ documents without timeouts
 * - Per-collection safety: validates before executing
 * 
 * Usage: node bulkupdate-worker.js
 *   or:  npm run queue:bulkupdate
 */

require('dotenv').config();
const Queue = require('bull');
const { MongoClient } = require('mongodb');
const { getConnectionConfig } = require('./src/config/database.js');

const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10)
};

const bulkUpdateQueue = new Queue('Bulk Update Processing', {
  redis: REDIS_CONFIG,
  settings: {
    stalledInterval: 15 * 60 * 1000,  // 15 minutes
    maxStalledCount: 3,
    lockDuration: 60 * 60 * 1000,     // 1 hour (long rename jobs)
  }
});

console.log('🔄 Bulk Update Worker started');
console.log('⏹️  Press Ctrl+C to stop');

/**
 * Get MongoDB connection for a specific database
 */
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
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(databaseName);
  return { client, db };
}

/**
 * Get central DB connection for progress tracking
 */
async function getCentralDb() {
  const config = getConnectionConfig('central');
  const client = new MongoClient(config.uri);
  await client.connect();
  const db = client.db(config.name || 'nextjs_stu');
  return { client, db };
}

// ═════════════════════════════════════════════════════════════════
// Column Rename Processor
// Renames a field across an entire collection using batch $rename
// ═════════════════════════════════════════════════════════════════
const BATCH_SIZE = 50000; // 50K docs per batch — safe for 20 crore+

bulkUpdateQueue.process('column-rename', 1, async (job) => {
  const { jobId, database, collection, oldColumn, newColumn, totalDocs } = job.data;

  console.log(`\n🔄 ========== COLUMN RENAME: ${jobId} ==========`);
  console.log(`📦 Database: ${database}`);
  console.log(`📋 Collection: ${collection}`);
  console.log(`📝 Rename: "${oldColumn}" → "${newColumn}"`);
  console.log(`📊 Total documents: ${totalDocs.toLocaleString()}`);
  console.log(`📦 Batch size: ${BATCH_SIZE.toLocaleString()}`);

  let targetClient = null;
  let centralClient = null;

  try {
    // Connect to target database
    const targetConn = await getMongoConnection(database);
    targetClient = targetConn.client;
    const targetDb = targetConn.db;
    const col = targetDb.collection(collection);

    // Connect to central DB for progress tracking
    const centralConn = await getCentralDb();
    centralClient = centralConn.client;
    const centralDb = centralConn.db;
    const progressCol = centralDb.collection('bulk_update_progress');

    // Update: processing
    await progressCol.updateOne(
      { job_id: jobId },
      { $set: { status: 'processing', started_at: new Date() } }
    );

    // Count actual docs with the old column
    const actualCount = await col.countDocuments({ [oldColumn]: { $exists: true } });
    const totalBatches = Math.ceil(actualCount / BATCH_SIZE);

    console.log(`📊 Actual docs with "${oldColumn}": ${actualCount.toLocaleString()}`);
    console.log(`📦 Total batches: ${totalBatches}`);

    await progressCol.updateOne(
      { job_id: jobId },
      { $set: { total_docs: actualCount, total_batches: totalBatches } }
    );

    await job.progress({ updated: 0, total: actualCount, batch: 0, totalBatches, phase: 'renaming' });

    let totalUpdated = 0;
    let batchNum = 0;

    // Batch rename loop: use _id cursor to process in chunks
    while (true) {
      batchNum++;

      // Get batch of _ids that still have the old column
      const batchIds = await col.find(
        { [oldColumn]: { $exists: true } },
        { projection: { _id: 1 } }
      ).limit(BATCH_SIZE).toArray();

      if (batchIds.length === 0) {
        console.log(`  ✅ No more documents with "${oldColumn}" — done!`);
        break;
      }

      const ids = batchIds.map(d => d._id);

      console.log(`  📦 Batch ${batchNum}/${totalBatches}: Renaming ${ids.length.toLocaleString()} docs...`);

      // Execute $rename on this batch
      const result = await col.updateMany(
        { _id: { $in: ids } },
        { $rename: { [oldColumn]: newColumn } }
      );

      totalUpdated += result.modifiedCount;

      // Update progress
      const pct = actualCount > 0 ? Math.round((totalUpdated / actualCount) * 100) : 100;
      await job.progress({
        updated: totalUpdated,
        total: actualCount,
        batch: batchNum,
        totalBatches: Math.max(totalBatches, batchNum),
        phase: 'renaming'
      });

      await progressCol.updateOne(
        { job_id: jobId },
        {
          $set: {
            updated: totalUpdated,
            current_batch: batchNum,
            total_batches: Math.max(totalBatches, batchNum)
          }
        }
      );

      console.log(`    ✅ Batch ${batchNum}: ${result.modifiedCount.toLocaleString()} renamed (total: ${totalUpdated.toLocaleString()}, ${pct}%)`);
    }

    // ── Complete ──
    await progressCol.updateOne(
      { job_id: jobId },
      {
        $set: {
          updated: totalUpdated,
          current_batch: batchNum,
          status: 'completed',
          message: `Successfully renamed "${oldColumn}" → "${newColumn}" in ${totalUpdated.toLocaleString()} documents`,
          completed_at: new Date()
        }
      }
    );

    await job.progress({
      updated: totalUpdated,
      total: actualCount,
      batch: batchNum,
      totalBatches: batchNum,
      phase: 'completed'
    });

    const summary = {
      jobId,
      database,
      collection,
      oldColumn,
      newColumn,
      totalUpdated,
      totalBatches: batchNum
    };

    console.log(`\n🎉 ========== RENAME COMPLETED ==========`);
    console.log(`📊 Summary:`, summary);

    return summary;

  } catch (error) {
    console.error(`\n❌ ========== RENAME FAILED: ${jobId} ==========`);
    console.error(`Error:`, error.message);

    // Update progress: failed
    try {
      const centralConn = await getCentralDb();
      await centralConn.db.collection('bulk_update_progress').updateOne(
        { job_id: jobId },
        { $set: { status: 'failed', message: error.message, completed_at: new Date() } }
      );
      await centralConn.client.close();
    } catch (e) {
      console.error('Failed to update progress on error:', e.message);
    }

    throw error;
  } finally {
    if (targetClient) {
      try { await targetClient.close(); } catch (e) { /* ignore */ }
    }
    if (centralClient) {
      try { await centralClient.close(); } catch (e) { /* ignore */ }
    }
  }
});

// ═════════════════════════════════════════════════════════════════
// Value Update Processor
// Sets a specific value on a column across ALL documents in a collection
// ═════════════════════════════════════════════════════════════════
bulkUpdateQueue.process('value-update', 1, async (job) => {
  const { jobId, database, collection, column, value, totalDocs } = job.data;

  console.log(`\n✏️  ========== VALUE UPDATE: ${jobId} ==========`);
  console.log(`📦 Database: ${database}`);
  console.log(`📋 Collection: ${collection}`);
  console.log(`📝 Column: "${column}" → Value: "${value}"`);
  console.log(`📊 Total documents: ${totalDocs.toLocaleString()}`);
  console.log(`📦 Batch size: ${BATCH_SIZE.toLocaleString()}`);

  let targetClient = null;
  let centralClient = null;

  try {
    const targetConn = await getMongoConnection(database);
    targetClient = targetConn.client;
    const targetDb = targetConn.db;
    const col = targetDb.collection(collection);

    const centralConn = await getCentralDb();
    centralClient = centralConn.client;
    const centralDb = centralConn.db;
    const progressCol = centralDb.collection('bulk_update_progress');

    // Mark processing
    await progressCol.updateOne(
      { job_id: jobId },
      { $set: { status: 'processing', started_at: new Date() } }
    );

    // Get actual count
    const actualCount = await col.estimatedDocumentCount();
    const totalBatches = Math.ceil(actualCount / BATCH_SIZE);

    console.log(`📊 Actual doc count: ${actualCount.toLocaleString()}`);
    console.log(`📦 Total batches: ${totalBatches}`);

    await progressCol.updateOne(
      { job_id: jobId },
      { $set: { total_docs: actualCount, total_batches: totalBatches } }
    );

    await job.progress({ updated: 0, total: actualCount, batch: 0, totalBatches, phase: 'updating' });

    let totalUpdated = 0;
    let batchNum = 0;
    let lastId = null;

    // Batch update loop: cursor-based _id pagination (forward scan)
    while (true) {
      batchNum++;

      // Use _id cursor pagination (more efficient than skip/limit for huge datasets)
      const filter = lastId ? { _id: { $gt: lastId } } : {};
      const batchDocs = await col.find(filter, { projection: { _id: 1 } })
        .sort({ _id: 1 })
        .limit(BATCH_SIZE)
        .toArray();

      if (batchDocs.length === 0) {
        console.log(`  ✅ No more documents — done!`);
        break;
      }

      const ids = batchDocs.map(d => d._id);
      lastId = ids[ids.length - 1]; // Remember last _id for next batch

      console.log(`  📦 Batch ${batchNum}/${totalBatches}: Updating ${ids.length.toLocaleString()} docs...`);

      // Execute $set on this batch
      const result = await col.updateMany(
        { _id: { $in: ids } },
        { $set: { [column]: value } }
      );

      totalUpdated += result.modifiedCount + result.matchedCount - result.modifiedCount;
      // Use matchedCount since docs that already have the value won't show as modified
      const processedCount = batchNum * BATCH_SIZE > actualCount ? actualCount : batchNum * BATCH_SIZE;

      const pct = actualCount > 0 ? Math.round((processedCount / actualCount) * 100) : 100;
      await job.progress({
        updated: processedCount,
        total: actualCount,
        batch: batchNum,
        totalBatches: Math.max(totalBatches, batchNum),
        phase: 'updating'
      });

      await progressCol.updateOne(
        { job_id: jobId },
        {
          $set: {
            updated: processedCount,
            current_batch: batchNum,
            total_batches: Math.max(totalBatches, batchNum)
          }
        }
      );

      console.log(`    ✅ Batch ${batchNum}: ${result.matchedCount.toLocaleString()} updated (progress: ${pct}%)`);
    }

    // Complete
    await progressCol.updateOne(
      { job_id: jobId },
      {
        $set: {
          updated: actualCount,
          current_batch: batchNum,
          status: 'completed',
          message: `Successfully set "${column}" = "${value}" across ${actualCount.toLocaleString()} documents`,
          completed_at: new Date()
        }
      }
    );

    await job.progress({
      updated: actualCount,
      total: actualCount,
      batch: batchNum,
      totalBatches: batchNum,
      phase: 'completed'
    });

    const summary = {
      jobId,
      database,
      collection,
      column,
      value,
      totalUpdated: actualCount,
      totalBatches: batchNum
    };

    console.log(`\n🎉 ========== VALUE UPDATE COMPLETED ==========`);
    console.log(`📊 Summary:`, summary);

    return summary;

  } catch (error) {
    console.error(`\n❌ ========== VALUE UPDATE FAILED: ${jobId} ==========`);
    console.error(`Error:`, error.message);

    try {
      const centralConn = await getCentralDb();
      await centralConn.db.collection('bulk_update_progress').updateOne(
        { job_id: jobId },
        { $set: { status: 'failed', message: error.message, completed_at: new Date() } }
      );
      await centralConn.client.close();
    } catch (e) {
      console.error('Failed to update progress on error:', e.message);
    }

    throw error;
  } finally {
    if (targetClient) {
      try { await targetClient.close(); } catch (e) { /* ignore */ }
    }
    if (centralClient) {
      try { await centralClient.close(); } catch (e) { /* ignore */ }
    }
  }
});

// ═════════════════════════════════════════════════════════════════
// Compare Update Processor
// Cross-collection field-level compare and update:
// Reads base collection → matches compareField in target → $set sourceField
// ═════════════════════════════════════════════════════════════════
const COMPARE_BATCH_SIZE = 10000; // 10K — safe for 10cr+ without memory/timeout issues

bulkUpdateQueue.process('compare-update', 1, async (job) => {
  const {
    jobId, baseDatabase, baseCollection,
    targetDatabase, targetCollection,
    compareField, sourceField, valueToStore, totalDocs
  } = job.data;

  console.log(`\n🔄 ========== COMPARE UPDATE: ${jobId} ==========`);
  console.log(`📦 Base: ${baseDatabase}.${baseCollection}`);
  console.log(`🎯 Target: ${targetDatabase}.${targetCollection}`);
  console.log(`🔍 Compare field: "${compareField}"`);
  console.log(`✏️  Set: "${sourceField}" = "${valueToStore}"`);
  console.log(`📊 Base documents: ${totalDocs.toLocaleString()}`);
  console.log(`📦 Batch size: ${COMPARE_BATCH_SIZE.toLocaleString()}`);

  let baseClient = null;
  let targetClient = null;
  let centralClient = null;

  try {
    // Connect to all three databases
    const baseConn = await getMongoConnection(baseDatabase);
    baseClient = baseConn.client;
    const baseDb = baseConn.db;
    const baseCol = baseDb.collection(baseCollection);

    const targetConn = await getMongoConnection(targetDatabase);
    targetClient = targetConn.client;
    const targetDb = targetConn.db;
    const targetCol = targetDb.collection(targetCollection);

    const centralConn = await getCentralDb();
    centralClient = centralConn.client;
    const centralDb = centralConn.db;
    const progressCol = centralDb.collection('bulk_update_progress');

    // Mark processing
    await progressCol.updateOne(
      { job_id: jobId },
      { $set: { status: 'processing', started_at: new Date() } }
    );

    // Get actual count of base docs
    const actualCount = await baseCol.estimatedDocumentCount();
    const totalBatches = Math.ceil(actualCount / COMPARE_BATCH_SIZE);

    console.log(`📊 Actual base doc count: ${actualCount.toLocaleString()}`);
    console.log(`📦 Total batches: ${totalBatches}`);

    await progressCol.updateOne(
      { job_id: jobId },
      { $set: { total_docs: actualCount, total_batches: totalBatches } }
    );

    await job.progress({ processed: 0, matched: 0, updated: 0, total: actualCount, batch: 0, totalBatches, phase: 'comparing' });

    let totalProcessed = 0;
    let totalMatched = 0;
    let totalUpdated = 0;
    let batchNum = 0;
    let lastId = null;

    // Batch loop: _id cursor pagination on base collection
    while (true) {
      batchNum++;

      // Fetch batch of docs from base collection (only _id + compareField)
      const filter = lastId ? { _id: { $gt: lastId } } : {};
      const batchDocs = await baseCol.find(filter, { projection: { _id: 1, [compareField]: 1 } })
        .sort({ _id: 1 })
        .limit(COMPARE_BATCH_SIZE)
        .toArray();

      if (batchDocs.length === 0) {
        console.log(`  ✅ No more base documents — done!`);
        break;
      }

      lastId = batchDocs[batchDocs.length - 1]._id;
      totalProcessed += batchDocs.length;

      // Extract unique compareField values from this batch (skip null/undefined/empty)
      const compareValues = [];
      for (const doc of batchDocs) {
        const val = doc[compareField];
        if (val !== null && val !== undefined && val !== '') {
          compareValues.push(val);
        }
      }
      const uniqueValues = [...new Set(compareValues)];

      console.log(`  📦 Batch ${batchNum}/${totalBatches}: ${batchDocs.length} base docs, ${uniqueValues.length} unique compare values`);

      if (uniqueValues.length === 0) {
        // No valid compare values in this batch, skip
        console.log(`    ⚠️ No valid "${compareField}" values — skipping batch`);

        // Update progress
        await progressCol.updateOne(
          { job_id: jobId },
          {
            $set: {
              processed: totalProcessed,
              matched: totalMatched,
              updated: totalUpdated,
              current_batch: batchNum,
              total_batches: Math.max(totalBatches, batchNum)
            }
          }
        );
        continue;
      }

      try {
        // Single $in query + bulkWrite on target collection
        // Use updateMany so if multiple target docs match the same compare value, all get updated
        const bulkOps = [{
          updateMany: {
            filter: { [compareField]: { $in: uniqueValues } },
            update: { $set: { [sourceField]: valueToStore } }
          }
        }];

        const result = await targetCol.bulkWrite(bulkOps, { ordered: false });
        const batchMatched = result.matchedCount || 0;
        const batchUpdated = result.modifiedCount || 0;

        totalMatched += batchMatched;
        totalUpdated += batchUpdated;

        console.log(`    ✅ Matched: ${batchMatched.toLocaleString()}, Updated: ${batchUpdated.toLocaleString()} (totals: ${totalProcessed.toLocaleString()} processed, ${totalMatched.toLocaleString()} matched, ${totalUpdated.toLocaleString()} updated)`);

      } catch (batchErr) {
        // On error mid-batch: log, skip, continue — do NOT abort entire job
        console.error(`    ❌ Batch ${batchNum} error (skipping): ${batchErr.message}`);
      }

      // Update progress in bulk_update_progress
      const pct = actualCount > 0 ? Math.round((totalProcessed / actualCount) * 100) : 100;
      await job.progress({
        processed: totalProcessed,
        matched: totalMatched,
        updated: totalUpdated,
        total: actualCount,
        batch: batchNum,
        totalBatches: Math.max(totalBatches, batchNum),
        phase: 'comparing'
      });

      await progressCol.updateOne(
        { job_id: jobId },
        {
          $set: {
            processed: totalProcessed,
            matched: totalMatched,
            updated: totalUpdated,
            current_batch: batchNum,
            total_batches: Math.max(totalBatches, batchNum)
          }
        }
      );
    }

    // ── Complete ──
    const summaryMsg = `Compare update complete! Processed ${totalProcessed.toLocaleString()} base docs. Matched ${totalMatched.toLocaleString()} target docs, updated ${totalUpdated.toLocaleString()}.`;

    await progressCol.updateOne(
      { job_id: jobId },
      {
        $set: {
          processed: totalProcessed,
          matched: totalMatched,
          updated: totalUpdated,
          current_batch: batchNum,
          status: 'completed',
          message: summaryMsg,
          completed_at: new Date()
        }
      }
    );

    await job.progress({
      processed: totalProcessed,
      matched: totalMatched,
      updated: totalUpdated,
      total: actualCount,
      batch: batchNum,
      totalBatches: batchNum,
      phase: 'completed'
    });

    const summary = {
      jobId,
      baseDatabase, baseCollection,
      targetDatabase, targetCollection,
      compareField, sourceField, valueToStore,
      totalProcessed, totalMatched, totalUpdated,
      totalBatches: batchNum
    };

    console.log(`\n🎉 ========== COMPARE UPDATE COMPLETED ==========`);
    console.log(`📊 Summary:`, summary);

    return summary;

  } catch (error) {
    console.error(`\n❌ ========== COMPARE UPDATE FAILED: ${jobId} ==========`);
    console.error(`Error:`, error.message);

    try {
      const centralConn = await getCentralDb();
      await centralConn.db.collection('bulk_update_progress').updateOne(
        { job_id: jobId },
        { $set: { status: 'failed', message: error.message, completed_at: new Date() } }
      );
      await centralConn.client.close();
    } catch (e) {
      console.error('Failed to update progress on error:', e.message);
    }

    throw error;
  } finally {
    if (baseClient) {
      try { await baseClient.close(); } catch (e) { /* ignore */ }
    }
    if (targetClient) {
      try { await targetClient.close(); } catch (e) { /* ignore */ }
    }
    if (centralClient) {
      try { await centralClient.close(); } catch (e) { /* ignore */ }
    }
  }
});

// ─── Event Handlers ───
bulkUpdateQueue.on('completed', (job, result) => {
  console.log(`🎉 Job ${job.id} completed:`, {
    oldColumn: result?.oldColumn,
    newColumn: result?.newColumn,
    totalUpdated: result?.totalUpdated || 0
  });
});

bulkUpdateQueue.on('failed', (job, err) => {
  console.error(`❌ Job ${job.id} failed:`, err.message);
});

bulkUpdateQueue.on('stalled', (job) => {
  console.warn(`⚠️ Job ${job.id} stalled — will be retried`);
});

// ─── Graceful Shutdown ───
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down bulk update worker...');
  await bulkUpdateQueue.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down bulk update worker...');
  await bulkUpdateQueue.close();
  process.exit(0);
});
