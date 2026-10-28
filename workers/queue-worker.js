#!/usr/bin/env node

/**
 * CSV Import Queue Worker
 * Dedicated worker for CSV import jobs only
 * 
 * CRITICAL: Per-collection serialization
 * - Only ONE import runs per collection at a time
 * - Multiple collections can be imported in parallel
 * - Uses Redis-based locking to prevent duplicate key errors
 * 
 * Concurrency: 3 (can process 3 CSV imports to DIFFERENT collections simultaneously)
 */

require('dotenv').config();
const Queue = require('bull');
const ImportService = require('../services/ImportService');
const { collectionLockService } = require('../services/CollectionLockService');
const { createLogger } = require('../services/Logger');

const logger = createLogger('QueueWorker');

// Startup logs (only once)
logger.start('worker', { 
  concurrency: 3, 
  queue: 'CSV Import Processing',
  pid: process.pid,
  feature: 'per-collection-serialization'
});

// PREVIOUS WORKING VERSION: Create import queue directly in worker
// This ensures worker has full control over queue initialization
// Both API and worker use same queue name "CSV Import Processing" so they share Redis queue
const importQueue = new Queue('CSV Import Processing', {
  redis: { 
    host: process.env.REDIS_HOST || 'localhost', 
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || null,
    db: process.env.REDIS_DB || 0
  },
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 50,
    attempts: 3,
    priority: 5,
    timeout: 0,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
  settings: {
    stalledInterval: 10 * 60 * 1000,  // 10 minutes
    maxStalledCount: 3,
    lockDuration: 30 * 60 * 1000,     // 30 minutes
  }
});

// Wait for queue to be ready before setting up processor
importQueue.isReady().then(() => {
  console.log('✅ Worker queue connected to Redis');
}).catch((error) => {
  console.error('❌ Worker queue connection failed:', error.message);
});

// Set up processor with concurrency 3 for CSV imports
// Note: Even with concurrency 3, per-collection lock ensures only 1 job per collection
importQueue.process('csv-import', 3, async (job) => {
  const { 
    transferId, 
    filePath, 
    mappedColumns, 
    database, 
    table, 
    type, 
    userId,
    chunkSize,
    originalFileName
  } = job.data;

  // CRITICAL: Acquire per-collection lock before processing
  // This ensures only one import runs per collection at a time
  // Other jobs for the same collection will wait until this one completes
  const lockKey = `${database}:${table}`;
  let lockAcquired = false;

  console.log(`📋 [Job ${job.id}] Queued for ${lockKey}, attempting to acquire lock...`);

  // CRITICAL FIX: Set up heartbeat to prevent job from being marked as stalled
  // This must run BEFORE acquiring lock since lock acquisition can block
  // Heartbeat updates job progress every 30 seconds to keep job alive
  // This prevents false "stalled" detection during long batch operations
  const heartbeatInterval = setInterval(async () => {
    try {
      const currentProgress = job.progress() || 0;
      await job.progress(currentProgress);
      // Also update job data to touch the job timestamp
      await job.update({ ...job.data });
      // Refresh collection lock TTL (keeps lock alive while job is running)
      if (lockAcquired) {
        await collectionLockService.refreshLock(database, table, transferId);
      }
    } catch (error) {
      // Ignore heartbeat errors - don't fail import if heartbeat fails
      console.warn(`⚠️ Heartbeat error (non-fatal): ${error.message}`);
    }
  }, 30 * 1000); // 30 seconds - matches stalledInterval / 20 for safety margin

  try {
    // Acquire lock - this blocks until the collection is available
    await collectionLockService.acquireLock(database, table, transferId);
    lockAcquired = true;
    
    console.log(`🚀 [Job ${job.id}] Lock acquired, starting import for ${lockKey}`);

    // Update job progress
    await job.progress(0);
    
    // Create import service instance
    const importService = new ImportService({
      transferId,
      filePath,
      mappedColumns,
      database,
      table,
      type,
      userId,
      chunkSize: chunkSize || 5000,
      job,
      originalFileName: originalFileName || require('path').basename(filePath)
    });

    // Process the import
    const result = await importService.processImport();
    
    // Clear heartbeat interval
    clearInterval(heartbeatInterval);
    
    // Update final progress
    await job.progress(100);
    
    return result;
    
  } catch (error) {
    // Clear heartbeat interval on error
    clearInterval(heartbeatInterval);
    
    logger.error(`CSV import failed: ${transferId}`, { error: error.message });
    throw error;
    
  } finally {
    // CRITICAL: Always release the lock, even on error
    if (lockAcquired) {
      try {
        await collectionLockService.releaseLock(database, table, transferId);
        console.log(`🔓 [Job ${job.id}] Lock released for ${lockKey}`);
      } catch (releaseError) {
        console.error(`⚠️ [Job ${job.id}] Failed to release lock:`, releaseError.message);
      }
    }
  }
});

// ═════════════════════════════════════════════════════════════════════
// Product CSV Import Processor
// Handles: 'product-csv-import' jobs from upload-csv.js
// ═════════════════════════════════════════════════════════════════════
const { MongoClient, Long } = require('mongodb');
const csvParser = require('csv-parser');
const fsNode = require('fs');

function getMongoUri() {
  return process.env.MONGODB_URI || 'mongodb://localhost:27017/nextjs_stu';
}

function generateProductId(collectionName) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  // Use collection-specific prefix (matching msps.js / mssps.js)
  let prefix = 'PROD';
  if (collectionName === 'MSPsproduct') prefix = 'MSPSPROD';
  else if (collectionName === 'MSSPsproduct') prefix = 'MSSPSPROD';
  let result = prefix;
  for (let i = 0; i < 6; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

function generatePpId() {
  return String(Math.floor(1000000 + Math.random() * 9000000));
}

importQueue.process('product-csv-import', 2, async (job) => {
  const { jobId, transferId, csvPath, mapping, collection: collName, totalRecords } = job.data;
  console.log(`\n📦 ========== PRODUCT CSV IMPORT: ${jobId} ==========`);
  console.log(`📋 Collection: ${collName}, Records: ${totalRecords}`);

  const client = new MongoClient(getMongoUri());
  await client.connect();
  const uri = getMongoUri();
  const dbName = uri.split('/').pop().split('?')[0] || 'nextjs_stu';
  const db = client.db(dbName);

  try {
    // Update progress: processing
    await db.collection('csv_import_progress').updateOne(
      { job_id: jobId },
      { $set: { status: 'processing', started_at: new Date() } }
    );

    const col = db.collection(collName);

    // Get max id for auto-increment
    const maxDoc = await col.find({}).sort({ id: -1 }).limit(1).toArray();
    let nextId = 1;
    if (maxDoc.length > 0 && maxDoc[0].id != null) {
      const maxId = typeof maxDoc[0].id === 'object' && maxDoc[0].id.toNumber
        ? maxDoc[0].id.toNumber() : Number(maxDoc[0].id);
      nextId = (isNaN(maxId) ? 0 : maxId) + 1;
    }

    // Read CSV and build documents
    const documents = [];
    const now = new Date();

    await new Promise((resolve, reject) => {
      fsNode.createReadStream(csvPath)
        .pipe(csvParser())
        .on('data', (row) => {
          const doc = {
            id: Long.fromNumber(nextId++),
            product_id: generateProductId(collName),
            pp_id: generatePpId(),
            companies: '',
            contacts: '',
            companies_count: 0,
            contacts_count: 0,
            created_at: now,
            updated_at: now,
            deleted_at: null,
            created_by: 'admin',
            updated_by: null
          };

          for (const [collField, csvHeader] of Object.entries(mapping)) {
            const value = row[csvHeader];
            doc[collField] = value !== undefined && value !== '' ? value.trim() : null;
          }

          if (!doc.pp_name && doc.product_name) {
            doc.pp_name = doc.product_name;
          }

          documents.push(doc);
        })
        .on('end', resolve)
        .on('error', reject);
    });

    if (documents.length === 0) {
      await db.collection('csv_import_progress').updateOne(
        { job_id: jobId },
        { $set: { status: 'completed', message: 'No valid rows in CSV', completed_at: new Date() } }
      );
      return { inserted: 0, total: 0 };
    }

    // Batch insert in chunks of 1000
    let inserted = 0;
    for (let i = 0; i < documents.length; i += 1000) {
      const chunk = documents.slice(i, i + 1000);
      const result = await col.insertMany(chunk, { ordered: false });
      inserted += result.insertedCount;

      // Update progress
      const pct = Math.round(((i + chunk.length) / documents.length) * 100);
      await job.progress(pct);
      await db.collection('csv_import_progress').updateOne(
        { job_id: jobId },
        { $set: { inserted, status: 'processing' } }
      );
      console.log(`  📊 Product import progress: ${inserted}/${documents.length} (${pct}%)`);
    }

    // Cleanup
    try { fsNode.unlinkSync(csvPath); } catch (e) {}

    // Update progress: completed
    await db.collection('csv_import_progress').updateOne(
      { job_id: jobId },
      { $set: { inserted, status: 'completed', message: `Inserted ${inserted} products into ${collName}`, completed_at: new Date() } }
    );

    console.log(`✅ Product CSV import complete: ${inserted}/${documents.length}`);
    return { inserted, total: documents.length };

  } catch (error) {
    await db.collection('csv_import_progress').updateOne(
      { job_id: jobId },
      { $set: { status: 'failed', message: error.message, completed_at: new Date() } }
    );
    throw error;
  } finally {
    await client.close();
  }
});

// ═════════════════════════════════════════════════════════════════════
// Company CSV Import Processor
// Handles: 'company-csv-import' jobs from upload-companies-csv.js
// ═════════════════════════════════════════════════════════════════════
importQueue.process('company-csv-import', 2, async (job) => {
  const { jobId, transferId, csvPath, mapping, productId, productSource, productName, productPpName, totalRecords } = job.data;
  console.log(`\n🏢 ========== COMPANY CSV IMPORT: ${jobId} ==========`);
  console.log(`📋 Product: ${productName || productId}, Records: ${totalRecords}`);

  const client = new MongoClient(getMongoUri());
  await client.connect();
  const uri = getMongoUri();
  const dbName = uri.split('/').pop().split('?')[0] || 'nextjs_stu';
  const db = client.db(dbName);

  // Also connect to sun DB for master_accounts
  const sunDbName = process.env.SUN_DB_NAME || 'sun';
  const sunDb = client.db(sunDbName);

  try {
    // Update progress: processing
    await db.collection('csv_import_progress').updateOne(
      { job_id: jobId },
      { $set: { status: 'processing', started_at: new Date() } }
    );

    // Parse CSV rows with mapping (empty → null)
    const rows = [];
    await new Promise((resolve, reject) => {
      fsNode.createReadStream(csvPath)
        .pipe(csvParser())
        .on('data', (row) => {
          const mapped = {};
          for (const [field, csvHeader] of Object.entries(mapping)) {
            if (csvHeader && row[csvHeader] !== undefined) {
              const value = String(row[csvHeader]).trim();
              mapped[field] = value === '' ? null : value;
            } else {
              mapped[field] = null;
            }
          }
          if (mapped.li_smtp) {
            rows.push(mapped);
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    if (rows.length === 0) {
      await db.collection('csv_import_progress').updateOne(
        { job_id: jobId },
        { $set: { status: 'completed', message: 'No valid rows (li_smtp required)', completed_at: new Date() } }
      );
      return { inserted: 0, skipped: 0, total: 0 };
    }

    // Deduplicate by li_smtp
    const smtpSet = new Set();
    const uniqueRows = [];
    for (const row of rows) {
      const smtp = row.li_smtp.toLowerCase();
      if (!smtpSet.has(smtp)) {
        smtpSet.add(smtp);
        uniqueRows.push({ ...row, li_smtp: smtp });
      }
    }

    // Lookup company names from master_accounts
    const smtps = uniqueRows.map(r => r.li_smtp);
    const accounts = await sunDb.collection('master_accounts').find({
      li_smtp: { $in: smtps }
    }).project({ li_smtp: 1, li_company_name: 1 }).toArray();

    const nameMap = {};
    accounts.forEach(acc => {
      if (acc.li_smtp) nameMap[acc.li_smtp] = acc.li_company_name || acc.li_smtp;
    });

    // Check existing links
    const bridgeCollection = db.collection('companies_products');
    const existing = await bridgeCollection.find({
      product_id: productId,
      company_li_smtp: { $in: smtps },
      deleted_at: null
    }).project({ company_li_smtp: 1 }).toArray();

    const existingSmtps = new Set(existing.map(e => e.company_li_smtp));
    const newRows = uniqueRows.filter(r => !existingSmtps.has(r.li_smtp));
    const skipped = uniqueRows.length - newRows.length;

    if (newRows.length === 0) {
      try { fsNode.unlinkSync(csvPath); } catch (e) {}
      await db.collection('csv_import_progress').updateOne(
        { job_id: jobId },
        { $set: { skipped, status: 'completed', message: 'All companies already linked', completed_at: new Date() } }
      );
      return { inserted: 0, skipped, total: uniqueRows.length };
    }

    // Get next auto-increment id
    const lastDoc = await bridgeCollection.findOne({}, { sort: { id: -1 } });
    let nextId = (lastDoc?.id || 0) + 1;
    const now = new Date();

    // Build documents with all 10 fields
    const docsToInsert = newRows.map(row => ({
      id: nextId++,
      product_id: productId,
      product_source: productSource,
      product_name: productName,
      product_pp_name: productPpName,
      company_li_smtp: row.li_smtp,
      company_name: row.company_name || nameMap[row.li_smtp] || row.li_smtp,
      location: row.location || null,
      industry: row.industry || null,
      employee_size: row.employee_size || null,
      revenue: row.revenue || null,
      website: row.website || null,
      country: row.country || null,
      summary: row.summary || null,
      source: row.source || null,
      created_at: now,
      created_by: 'csv_upload',
      deleted_at: null
    }));

    // Batch insert in chunks of 1000
    let inserted = 0;
    for (let i = 0; i < docsToInsert.length; i += 1000) {
      const chunk = docsToInsert.slice(i, i + 1000);
      const result = await bridgeCollection.insertMany(chunk, { ordered: false });
      inserted += result.insertedCount;

      const pct = Math.round(((i + chunk.length) / docsToInsert.length) * 100);
      await job.progress(pct);
      await db.collection('csv_import_progress').updateOne(
        { job_id: jobId },
        { $set: { inserted, skipped, status: 'processing' } }
      );
      console.log(`  📊 Company import progress: ${inserted}/${docsToInsert.length} (${pct}%)`);
    }

    // Ensure indexes
    try {
      await bridgeCollection.createIndex({ product_id: 1, deleted_at: 1 });
      await bridgeCollection.createIndex({ company_li_smtp: 1, deleted_at: 1 });
    } catch (e) {}

    // Cleanup
    try { fsNode.unlinkSync(csvPath); } catch (e) {}

    // Update progress: completed
    await db.collection('csv_import_progress').updateOne(
      { job_id: jobId },
      { $set: { inserted, skipped, status: 'completed', message: `Inserted ${inserted} companies for "${productName || productId}"`, completed_at: new Date() } }
    );

    console.log(`✅ Company CSV import complete: ${inserted} inserted, ${skipped} skipped`);
    return { inserted, skipped, total: uniqueRows.length };

  } catch (error) {
    await db.collection('csv_import_progress').updateOne(
      { job_id: jobId },
      { $set: { status: 'failed', message: error.message, completed_at: new Date() } }
    );
    throw error;
  } finally {
    await client.close();
  }
});

// Explicitly ignore other job types - they should be processed by dedicated workers
importQueue.process('bulk-audience-assignment', 0, async (job) => {
  console.warn(`⚠️  Bulk audience assignment job ${job.id} received in CSV import worker - ignoring. This job should be processed by audience-queue-worker.js`);
  return { skipped: true, reason: 'Should be processed by audience-queue-worker.js' };
});

importQueue.process('subscriber-import', 0, async (job) => {
  console.warn(`⚠️  Subscriber import job ${job.id} received in CSV import worker - ignoring. This job should be processed by audience-queue-worker.js`);
  return { skipped: true, reason: 'Should be processed by audience-queue-worker.js' };
});

importQueue.process('duplicate-removal', 0, async (job) => {
  console.warn(`⚠️  Duplicate removal job ${job.id} received in CSV import worker - ignoring. This job should be processed by maintenance-queue-worker.js`);
  return { skipped: true, reason: 'Should be processed by maintenance-queue-worker.js' };
});

// Email Sync Processor - MOVED TO email-sync-worker.js
importQueue.process('email-sync', 0, async (job) => {
  console.warn(`⚠️  Email-sync job ${job.id} received in CSV import worker - ignoring. This job should be processed by email-sync-worker.js`);
  return { skipped: true, reason: 'Should be processed by email-sync-worker.js' };
});

// Event handlers
importQueue.on('completed', (job, result) => {
  console.log(`🎉 Job ${job.id} completed:`, {
    transferId: job.data.transferId,
    inserted: result.inserted_rows || 0,
    rejected: result.rejected_rows || 0
  });
});

importQueue.on('failed', (job, error) => {
  console.error(`💥 Job ${job.id} failed:`, {
    transferId: job.data.transferId,
    error: error.message
  });
});

importQueue.on('active', (job) => {
  console.log(`🔄 Job ${job.id} started processing`);
});

// Wait for queue to be ready, then log success
importQueue.isReady().then(() => {
  console.log('✅ CSV import processor set up successfully');
  console.log('🔄 Waiting for CSV import jobs...');
  console.log('💡 Note: Other job types (audience, maintenance) are handled by dedicated workers');
  
  // Debug: Check for waiting jobs
  importQueue.getWaiting().then(jobs => {
    if (jobs.length > 0) {
      console.log(`📋 Found ${jobs.length} waiting job(s) in queue`);
    }
  }).catch(err => console.warn('⚠️ Could not check waiting jobs:', err.message));
}).catch((error) => {
  console.error('❌ Queue not ready:', error.message);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down worker...');
  await importQueue.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down worker...');
  await importQueue.close();
  process.exit(0);
});
