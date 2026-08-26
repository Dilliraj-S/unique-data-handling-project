// PM2 COMMANDS:
// pm2 start scripts/opensearch-sync.js --name "sync-leads"      -- master_leads
// pm2 start scripts/opensearch-sync.js --name "sync-templeads"  -- temp_master_leads
// pm2 start scripts/opensearch-sync.js --name "sync-accounts"   -- master_accounts
//
// Resume: If sync stops mid-way, just re-run — it resumes from last checkpoint.
// Progress: ./sync-progress/{collection}.json
// Errors:   ./sync-errors/{collection}-errors.log

/**
 * Bulk sync a MongoDB collection into OpenSearch.
 *
 * Usage:
 *   node scripts/opensearch-sync.js master_leads
 *   node scripts/opensearch-sync.js temp_master_leads
 *   node scripts/opensearch-sync.js master_accounts
 *
 * Features:
 *   - Cursor-based pagination (no skip/limit — O(1) per batch, not O(n))
 *   - Resume support via checkpoint file
 *   - Error logging without stopping
 *   - Memory-safe for 4 Crore+ records
 */

require('dotenv').config();
const { ObjectId } = require('mongodb');
const fs = require('fs');
const path = require('path');

// OpenSearchService is ESM — must be dynamically imported inside run()
// getCollection is also ESM — same treatment

const BATCH_SIZE = 500;

const VALID_COLLECTIONS = [
  // Leads & Accounts (sun database)
  'master_leads', 'temp_master_leads', 'master_accounts',
  // Products (central database)
  'products', 'apolloproduct', 'g2product', 'linkedinprodcut', 'MSPsproduct', 'MSSPsproduct'
];

const INDEX_MAP = {
  master_leads: process.env.OPENSEARCH_INDEX_LEADS || 'sun_master_leads',
  temp_master_leads: process.env.OPENSEARCH_INDEX_TEMP_LEADS || 'sun_temp_master_leads',
  master_accounts: process.env.OPENSEARCH_INDEX_ACCOUNTS || 'sun_master_accounts',
  products:        process.env.OPENSEARCH_INDEX_PRODUCTS || 'central_products',
  apolloproduct:   process.env.OPENSEARCH_INDEX_APOLLO || 'central_apolloproduct',
  g2product:       process.env.OPENSEARCH_INDEX_G2 || 'central_g2product',
  linkedinprodcut: process.env.OPENSEARCH_INDEX_LINKEDIN || 'central_linkedinprodcut',
  MSPsproduct:     process.env.OPENSEARCH_INDEX_MSPS || 'central_mspsproduct',
  MSSPsproduct:    process.env.OPENSEARCH_INDEX_MSSPS || 'central_msspsproduct',
};

const DB_MAP = {
  master_leads: 'sun', temp_master_leads: 'sun', master_accounts: 'sun',
  products: 'central', apolloproduct: 'central', g2product: 'central',
  linkedinprodcut: 'central', MSPsproduct: 'central', MSSPsproduct: 'central'
};

// ─── Progress & Error tracking ───
const PROGRESS_DIR = path.resolve('./sync-progress');
const ERROR_DIR = path.resolve('./sync-errors');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadProgress(collectionName) {
  ensureDir(PROGRESS_DIR);
  const filePath = path.join(PROGRESS_DIR, `${collectionName}.json`);
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return data;
    } catch {
      return null;
    }
  }
  return null;
}

function saveProgress(collectionName, lastId, indexed, total) {
  ensureDir(PROGRESS_DIR);
  const filePath = path.join(PROGRESS_DIR, `${collectionName}.json`);
  fs.writeFileSync(filePath, JSON.stringify({
    lastId: lastId.toString(),
    indexed,
    total,
    updatedAt: new Date().toISOString()
  }, null, 2));
}

function logError(collectionName, batchStart, error, sampleDocId) {
  ensureDir(ERROR_DIR);
  const filePath = path.join(ERROR_DIR, `${collectionName}-errors.log`);
  const entry = `[${new Date().toISOString()}] Batch at _id>${batchStart} | Doc: ${sampleDocId || 'unknown'} | Error: ${error}\n`;
  fs.appendFileSync(filePath, entry);
}

async function run() {
  const collectionArg = process.argv[2];
  if (!collectionArg || !VALID_COLLECTIONS.includes(collectionArg)) {
    console.error(`Usage: node scripts/opensearch-sync.js [${VALID_COLLECTIONS.join('|')}]`);
    process.exit(1);
  }

  if (process.env.OPENSEARCH_ENABLED !== 'true') {
    console.error('OPENSEARCH_ENABLED is not true. Set it in .env before running.');
    process.exit(1);
  }

  // Dynamic import ESM modules (this script is CJS, OpenSearchService & mongodb lib are ESM)
  const mongoLib = await import('../src/lib/mongodb.js');
  const getCollection = mongoLib.getCollection;
  const osModule = await import('../src/services/OpenSearchService.js');
  const getOpenSearchService = osModule.default;
  const transformDocForOpenSearch = osModule.transformDocForOpenSearch;

  const osService = getOpenSearchService();
  if (!osService.isEnabledFor(collectionArg)) {
    console.error(`OpenSearch is not enabled for ${collectionArg}. Check index mappings/env.`);
    process.exit(1);
  }

  // Resolve database name from DB_MAP
  const dbName = DB_MAP[collectionArg] || 'sun';
  const collection = await getCollection(collectionArg, dbName);
  const total = await collection.estimatedDocumentCount();
  console.log(`🚀 Syncing ~${total.toLocaleString()} documents from ${collectionArg} (db: ${dbName}) to OpenSearch (index: ${INDEX_MAP[collectionArg]})...`);

  // ─── Resume support ───
  let resumeId = null;
  let indexed = 0;
  const progress = loadProgress(collectionArg);
  if (progress && progress.lastId) {
    resumeId = new ObjectId(progress.lastId);
    indexed = progress.indexed || 0;
    console.log(`📂 Resuming from checkpoint: _id > ${resumeId} (${indexed.toLocaleString()} already indexed)`);
  }

  // ─── Cursor-based pagination ───
  // Uses { _id: { $gt: lastId } } instead of skip/limit for O(1) performance
  let query = {};
  if (resumeId) {
    query = { _id: { $gt: resumeId } };
  }

  const cursor = collection
    .find(query)
    .sort({ _id: 1 })
    .batchSize(BATCH_SIZE);

  let batchDocs = [];
  let batchErrors = 0;
  let lastId = resumeId;
  const startTime = Date.now();

  for await (const doc of cursor) {
    // Transform document for OpenSearch
    const transformed = transformDocForOpenSearch(doc);

    // Use doc.id (numeric) as OpenSearch _id when available, fallback to _id.toString()
    const docId = (doc.id !== undefined && doc.id !== null)
      ? String(doc.id)
      : doc._id.toString();

    batchDocs.push({ index: { _id: docId } });
    batchDocs.push(transformed);
    lastId = doc._id;

    // Flush batch
    if (batchDocs.length >= BATCH_SIZE * 2) {
      try {
        await osService.bulkIndex(collectionArg, batchDocs, { refresh: false });
        indexed += batchDocs.length / 2;
      } catch (error) {
        batchErrors++;
        const errorMsg = error.message || String(error);
        console.error(`❌ Batch error at _id>${lastId}: ${errorMsg.substring(0, 200)}`);
        logError(collectionArg, lastId.toString(), errorMsg.substring(0, 500), docId);
        // DO NOT stop — continue with next batch
        indexed += batchDocs.length / 2; // approximate (some may have succeeded)
      }

      // Save checkpoint after every batch
      saveProgress(collectionArg, lastId, indexed, total);

      // Log progress every 10,000 docs
      if (indexed % 10000 < BATCH_SIZE) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const rate = (indexed / (elapsed || 1)).toFixed(0);
        console.log(`[${collectionArg}] Progress: ${indexed.toLocaleString()} / ~${total.toLocaleString()} (${elapsed}s, ${rate} docs/s)`);
      }

      batchDocs = [];
    }
  }

  // Flush remaining docs
  if (batchDocs.length > 0) {
    try {
      await osService.bulkIndex(collectionArg, batchDocs, { refresh: false });
      indexed += batchDocs.length / 2;
    } catch (error) {
      batchErrors++;
      logError(collectionArg, lastId?.toString() || 'final', error.message?.substring(0, 500) || 'unknown');
      indexed += batchDocs.length / 2;
    }
    if (lastId) saveProgress(collectionArg, lastId, indexed, total);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ Completed. Indexed ${indexed.toLocaleString()} documents to ${collectionArg} in ${elapsed}s.`);
  if (batchErrors > 0) {
    console.warn(`⚠️ ${batchErrors} batch(es) had errors. Check: ${path.join(ERROR_DIR, `${collectionArg}-errors.log`)}`);
  }

  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Sync failed:', err);
  process.exit(1);
});
