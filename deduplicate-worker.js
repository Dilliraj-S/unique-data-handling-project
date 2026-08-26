#!/usr/bin/env node

/**
 * Deduplicate Worker - Optimized for 100M-200M+ records
 * 
 * Uses sorted cursor streaming with collation indexes — O(1) memory, single-pass.
 * 
 * Supported criteria (selectable via UI checkboxes):
 *   - "email": Deduplicate by email field (case-insensitive)
 *   - "name_company": Deduplicate by li_full_name + li_company_name combo
 *   - "name_domain": Deduplicate by li_full_name + li_smtp (domain) combo
 * 
 * Strategy:
 *   1. Stream through collection sorted by the dedup field(s) + _id
 *   2. Compare each document to the previous one
 *   3. If duplicate → collect _id for deletion (keep oldest = first _id)
 *   4. Batch delete every 5000 IDs
 *   5. Single pass, O(1) memory, index-backed sort
 * 
 * Usage: node deduplicate-worker.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const { MongoClient } = require('mongodb');
const deduplicateQueue = require('./queues/deduplicateQueue');

const DELETE_BATCH_SIZE = 5000;
const PROGRESS_INTERVAL = 50000; // Report every 50K docs processed
const COLLATION = { locale: 'en', strength: 2 }; // Case-insensitive

/**
 * Get MongoDB connection for a given database name
 */
async function getMongoConnection(databaseName) {
  let mongoUrl, dbName;
  try {
    const { getConnectionConfig } = require('./src/config/database');
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
    socketTimeoutMS: 0,
    connectTimeoutMS: 30000,
    heartbeatFrequencyMS: 10000,
  });

  await client.connect();
  const db = client.db(dbName);
  return { client, db };
}

/**
 * Ensure collation indexes exist for dedup fields
 */
async function ensureDeduplicationIndexes(col) {
  const indexOps = [];

  try {
    // Case-insensitive index for email dedup
    indexOps.push(
      col.createIndex(
        { email: 1, _id: 1 },
        { name: 'idx_dedup_email_ci', collation: COLLATION, background: true }
      ).catch(e => console.log('  ℹ️ Email index note:', e.message))
    );

    // Case-insensitive compound index for name+company dedup
    indexOps.push(
      col.createIndex(
        { li_full_name: 1, li_company_name: 1, _id: 1 },
        { name: 'idx_dedup_name_company_ci', collation: COLLATION, background: true }
      ).catch(e => console.log('  ℹ️ Name+Company index note:', e.message))
    );

    // Case-insensitive compound index for name+domain (li_smtp) dedup
    indexOps.push(
      col.createIndex(
        { li_full_name: 1, li_smtp: 1, _id: 1 },
        { name: 'idx_dedup_name_domain_ci', collation: COLLATION, background: true }
      ).catch(e => console.log('  ℹ️ Name+Domain index note:', e.message))
    );

    await Promise.all(indexOps);
    console.log('  ✅ Deduplication indexes verified');
  } catch (e) {
    console.log('  ℹ️ Index creation note:', e.message);
  }
}

/**
 * Case 1: Deduplicate by email using sorted cursor streaming
 * Single-pass, O(1) memory, index-backed sort
 */
async function deduplicateByEmail(col, job, totalDocs) {
  console.log('\n🔍 Case 1: Deduplicate by email (sorted cursor streaming)...');

  await job.progress({
    phase: 'scanning',
    currentCase: 'Case 1: email',
    processed: 0,
    deleted: 0,
    percentage: 0,
    message: 'Case 1: Streaming sorted cursor for email duplicates...'
  });

  // Stream through all docs with non-null email, sorted by email + _id (oldest first)
  const cursor = col.find(
    { email: { $exists: true, $ne: null, $nin: ['', ' '] } },
    {
      projection: { _id: 1, email: 1 },
      sort: { email: 1, _id: 1 },
      batchSize: 10000
    }
  ).collation(COLLATION);

  let lastEmailNorm = null; // Normalized: trimmed + lowered (stored once)
  let deleteBuffer = [];
  let totalDeleted = 0;
  let totalScanned = 0;

  for await (const doc of cursor) {
    totalScanned++;

    const rawEmail = doc.email;
    if (!rawEmail || typeof rawEmail !== 'string') continue;

    // Normalize ONCE per document — no redundant calls
    const emailNorm = rawEmail.trim().toLowerCase();
    if (!emailNorm) continue;

    if (lastEmailNorm === emailNorm) {
      // Duplicate — mark for deletion (keep first = oldest _id)
      deleteBuffer.push(doc._id);
    } else {
      // New email group
      lastEmailNorm = emailNorm;
    }

    // Batch delete when buffer is full
    if (deleteBuffer.length >= DELETE_BATCH_SIZE) {
      const delResult = await col.deleteMany({ _id: { $in: deleteBuffer } });
      totalDeleted += delResult.deletedCount || 0;
      deleteBuffer = [];
    }

    // Progress update
    if (totalScanned % PROGRESS_INTERVAL === 0) {
      const percent = Math.min(49, Math.round((totalScanned / totalDocs) * 50));
      console.log(`  📦 [email] Scanned ${totalScanned.toLocaleString()} — ${totalDeleted.toLocaleString()} deleted`);
      await job.progress({
        phase: 'deleting',
        currentCase: 'Case 1: email',
        processed: totalScanned,
        deleted: totalDeleted,
        percentage: percent,
        message: `[email] Scanned ${totalScanned.toLocaleString()} / ~${totalDocs.toLocaleString()} — ${totalDeleted.toLocaleString()} deleted`
      });
    }
  }

  // Flush remaining
  if (deleteBuffer.length > 0) {
    const delResult = await col.deleteMany({ _id: { $in: deleteBuffer } });
    totalDeleted += delResult.deletedCount || 0;
  }

  console.log(`  ✅ Case 1 complete: Scanned ${totalScanned.toLocaleString()}, deleted ${totalDeleted.toLocaleString()}`);
  return { scanned: totalScanned, deleted: totalDeleted };
}

/**
 * Case 2: Deduplicate by li_full_name + li_company_name using sorted cursor streaming
 * Only processes records where email is null/empty
 */
async function deduplicateByNameCompany(col, job, totalDocs, prevDeleted) {
  console.log('\n🔍 Case 2: Deduplicate by li_full_name + li_company_name (sorted cursor streaming)...');

  await job.progress({
    phase: 'scanning',
    currentCase: 'Case 2: name + company',
    processed: 0,
    deleted: prevDeleted,
    percentage: 50,
    message: 'Case 2: Streaming sorted cursor for name+company duplicates...'
  });

  // Stream through docs where email is null/empty, sorted by name+company+_id
  const cursor = col.find(
    {
      $or: [
        { email: null },
        { email: '' },
        { email: { $exists: false } }
      ],
      li_full_name: { $exists: true, $ne: null, $nin: ['', ' '] },
      li_company_name: { $exists: true, $ne: null, $nin: ['', ' '] }
    },
    {
      projection: { _id: 1, li_full_name: 1, li_company_name: 1 },
      sort: { li_full_name: 1, li_company_name: 1, _id: 1 },
      batchSize: 10000
    }
  ).collation(COLLATION);

  let lastKeyNorm = null; // Normalized composite key
  let deleteBuffer = [];
  let totalDeleted = 0;
  let totalScanned = 0;

  for await (const doc of cursor) {
    totalScanned++;

    const rawName = doc.li_full_name;
    const rawCompany = doc.li_company_name;
    if (!rawName || typeof rawName !== 'string' || !rawCompany || typeof rawCompany !== 'string') continue;

    // Normalize ONCE per document
    const nameNorm = rawName.trim().toLowerCase();
    const companyNorm = rawCompany.trim().toLowerCase();
    if (!nameNorm || !companyNorm) continue;

    const currentKeyNorm = `${nameNorm}|||${companyNorm}`;

    if (lastKeyNorm === currentKeyNorm) {
      // Duplicate — mark for deletion
      deleteBuffer.push(doc._id);
    } else {
      // New group
      lastKeyNorm = currentKeyNorm;
    }

    // Batch delete
    if (deleteBuffer.length >= DELETE_BATCH_SIZE) {
      const delResult = await col.deleteMany({ _id: { $in: deleteBuffer } });
      totalDeleted += delResult.deletedCount || 0;
      deleteBuffer = [];
    }

    // Progress update
    if (totalScanned % PROGRESS_INTERVAL === 0) {
      const percent = 50 + Math.min(49, Math.round((totalScanned / totalDocs) * 50));
      console.log(`  📦 [name+company] Scanned ${totalScanned.toLocaleString()} — ${totalDeleted.toLocaleString()} deleted`);
      await job.progress({
        phase: 'deleting',
        currentCase: 'Case 2: name + company',
        processed: totalScanned,
        deleted: prevDeleted + totalDeleted,
        percentage: percent,
        message: `[name+company] Scanned ${totalScanned.toLocaleString()} — ${totalDeleted.toLocaleString()} deleted`
      });
    }
  }

  // Flush remaining
  if (deleteBuffer.length > 0) {
    const delResult = await col.deleteMany({ _id: { $in: deleteBuffer } });
    totalDeleted += delResult.deletedCount || 0;
  }

  console.log(`  ✅ Case 2 complete: Scanned ${totalScanned.toLocaleString()}, deleted ${totalDeleted.toLocaleString()}`);
  return { scanned: totalScanned, deleted: totalDeleted };
}

/**
 * Case 3: Deduplicate by li_full_name + li_smtp (domain) using sorted cursor streaming
 */
async function deduplicateByNameDomain(col, job, totalDocs, prevDeleted) {
  console.log('\n🔍 Case 3: Deduplicate by li_full_name + li_smtp (name + domain)...');

  await job.progress({
    phase: 'scanning',
    currentCase: 'Case 3: name + domain',
    processed: 0,
    deleted: prevDeleted,
    percentage: 70,
    message: 'Case 3: Streaming sorted cursor for name+domain duplicates...'
  });

  const cursor = col.find(
    {
      li_full_name: { $exists: true, $ne: null, $nin: ['', ' '] },
      li_smtp: { $exists: true, $ne: null, $nin: ['', ' '] }
    },
    {
      projection: { _id: 1, li_full_name: 1, li_smtp: 1 },
      sort: { li_full_name: 1, li_smtp: 1, _id: 1 },
      batchSize: 10000
    }
  ).collation(COLLATION);

  let lastKeyNorm = null;
  let deleteBuffer = [];
  let totalDeleted = 0;
  let totalScanned = 0;

  for await (const doc of cursor) {
    totalScanned++;

    const rawName = doc.li_full_name;
    const rawDomain = doc.li_smtp;
    if (!rawName || typeof rawName !== 'string' || !rawDomain || typeof rawDomain !== 'string') continue;

    const nameNorm = rawName.trim().toLowerCase();
    const domainNorm = rawDomain.trim().toLowerCase();
    if (!nameNorm || !domainNorm) continue;

    const currentKeyNorm = `${nameNorm}|||${domainNorm}`;

    if (lastKeyNorm === currentKeyNorm) {
      deleteBuffer.push(doc._id);
    } else {
      lastKeyNorm = currentKeyNorm;
    }

    if (deleteBuffer.length >= DELETE_BATCH_SIZE) {
      const delResult = await col.deleteMany({ _id: { $in: deleteBuffer } });
      totalDeleted += delResult.deletedCount || 0;
      deleteBuffer = [];
    }

    if (totalScanned % PROGRESS_INTERVAL === 0) {
      const percent = 70 + Math.min(29, Math.round((totalScanned / totalDocs) * 30));
      console.log(`  📦 [name+domain] Scanned ${totalScanned.toLocaleString()} — ${totalDeleted.toLocaleString()} deleted`);
      await job.progress({
        phase: 'deleting',
        currentCase: 'Case 3: name + domain',
        processed: totalScanned,
        deleted: prevDeleted + totalDeleted,
        percentage: percent,
        message: `[name+domain] Scanned ${totalScanned.toLocaleString()} — ${totalDeleted.toLocaleString()} deleted`
      });
    }
  }

  if (deleteBuffer.length > 0) {
    const delResult = await col.deleteMany({ _id: { $in: deleteBuffer } });
    totalDeleted += delResult.deletedCount || 0;
  }

  console.log(`  ✅ Case 3 complete: Scanned ${totalScanned.toLocaleString()}, deleted ${totalDeleted.toLocaleString()}`);
  return { scanned: totalScanned, deleted: totalDeleted };
}

/**
 * Main deduplication job processor
 */
deduplicateQueue.process('deduplicate', 1, async (job) => {
  const { database, collection, criteria } = job.data;

  // Default: run all cases if no criteria specified
  const runEmail = !criteria || criteria.length === 0 || criteria.includes('email');
  const runNameCompany = !criteria || criteria.length === 0 || criteria.includes('name_company');
  const runNameDomain = !criteria || criteria.length === 0 || criteria.includes('name_domain');

  console.log(`\n🔍 ========== DEDUPLICATE JOB ${job.id} ==========`);
  console.log(`📦 Database: ${database}`);
  console.log(`📋 Collection: ${collection}`);
  console.log(`📋 Criteria: ${[
    runEmail ? 'email' : null,
    runNameCompany ? 'name+company' : null,
    runNameDomain ? 'name+domain' : null
  ].filter(Boolean).join(' + ') || 'none'}`);

  let client = null;

  try {
    // ─── Phase 0: Connect & Setup ───
    await job.progress({
      phase: 'connecting',
      currentCase: '',
      processed: 0,
      deleted: 0,
      percentage: 0,
      message: 'Connecting to database...'
    });

    const connection = await getMongoConnection(database);
    client = connection.client;
    const db = connection.db;
    const col = db.collection(collection);

    const totalDocs = await col.countDocuments();
    console.log(`📊 Total documents: ${totalDocs.toLocaleString()}`);

    // Ensure indexes exist
    console.log('📊 Verifying deduplication indexes...');
    await ensureDeduplicationIndexes(col);

    // ─── Run selected cases ───
    let case1Result = { scanned: 0, deleted: 0 };
    let case2Result = { scanned: 0, deleted: 0 };
    let case3Result = { scanned: 0, deleted: 0 };

    if (runEmail) {
      case1Result = await deduplicateByEmail(col, job, totalDocs);
    } else {
      console.log('\n⏭️ Case 1 (email): Skipped — not selected');
    }

    if (runNameCompany) {
      case2Result = await deduplicateByNameCompany(col, job, totalDocs, case1Result.deleted);
    } else {
      console.log('\n⏭️ Case 2 (name+company): Skipped — not selected');
    }

    if (runNameDomain) {
      case3Result = await deduplicateByNameDomain(col, job, totalDocs, case1Result.deleted + case2Result.deleted);
    } else {
      console.log('\n⏭️ Case 3 (name+domain): Skipped — not selected');
    }

    // ─── Complete ───
    const totalDeleted = case1Result.deleted + case2Result.deleted + case3Result.deleted;
    const finalCount = await col.countDocuments();

    const summary = {
      status: 'completed',
      database,
      collection,
      criteria: { email: runEmail, name_company: runNameCompany, name_domain: runNameDomain },
      totalDocsBefore: totalDocs,
      totalDocsAfter: finalCount,
      case1: { scanned: case1Result.scanned, deleted: case1Result.deleted },
      case2: { scanned: case2Result.scanned, deleted: case2Result.deleted },
      case3: { scanned: case3Result.scanned, deleted: case3Result.deleted },
      deleted: totalDeleted,
      completedAt: new Date().toISOString()
    };

    await job.progress({
      phase: 'completed',
      currentCase: 'All cases',
      processed: case1Result.scanned + case2Result.scanned,
      totalDuplicateGroups: 0,
      totalDuplicateRecords: totalDeleted,
      deleted: totalDeleted,
      percentage: 100,
      totalDocsBefore: totalDocs,
      totalDocsAfter: finalCount,
      case1Deleted: case1Result.deleted,
      case2Deleted: case2Result.deleted,
      case3Deleted: case3Result.deleted,
      case1Groups: 0,
      case2Groups: 0,
      case3Groups: 0,
      message: `Deduplication complete! ${totalDeleted.toLocaleString()} duplicates deleted (${case1Result.deleted.toLocaleString()} by email + ${case2Result.deleted.toLocaleString()} by name+company + ${case3Result.deleted.toLocaleString()} by name+domain). Collection: ${totalDocs.toLocaleString()} → ${finalCount.toLocaleString()}`
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
console.log('🔍 Deduplicate Worker started, waiting for jobs...');

process.on('SIGINT', async () => {
  console.log('\n⚠️  Received SIGINT, shutting down deduplicate worker...');
  await deduplicateQueue.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⚠️  Received SIGTERM, shutting down deduplicate worker...');
  await deduplicateQueue.close();
  process.exit(0);
});
