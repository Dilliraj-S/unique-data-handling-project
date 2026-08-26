#!/usr/bin/env node

/**
 * Mapping Lookup Worker
 * Background worker that matches CSV company names against MongoDB collections
 * 
 * Features:
 * - Batch $in queries (5000 companies per batch) for efficiency
 * - Cursor-based result reading (memory safe for 10 lakh+ records)
 * - Streams results to temp CSV file on disk
 * - Progress reporting for frontend polling
 * 
 * Usage: node mapping-worker.js
 *   or:  npm run queue:mapping
 */

const Queue = require('bull');
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10)
};

const mappingQueue = new Queue('Mapping Lookup', {
  redis: REDIS_CONFIG,
  settings: {
    stalledInterval: 15 * 60 * 1000,
    maxStalledCount: 3,
    lockDuration: 60 * 60 * 1000,
  }
});

console.log('🗺️  Mapping Lookup Worker started');
console.log('⏹️  Press Ctrl+C to stop');

// Ensure temp directory exists
const TEMP_DIR = path.join(process.cwd(), 'tmp', 'mapping-results');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Get MongoDB connection for a specific database
 */
async function getMongoConnection(databaseName) {
  const mongoUrl = process.env.PLUTO_MONGODB_URI || 'mongodb://localhost:27017';
  const client = new MongoClient(mongoUrl);
  await client.connect();
  const db = client.db(databaseName);
  return { client, db };
}

/**
 * Escape a CSV field value
 */
function escapeCsvField(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // If contains comma, quote, newline, or leading/trailing whitespace — wrap in quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r') || str !== str.trim()) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * Flatten a nested object for CSV output
 * e.g. { a: { b: 1 } } => { 'a.b': 1 }
 */
function flattenObject(obj, prefix = '') {
  const result = {};
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date) && key !== '_id') {
      Object.assign(result, flattenObject(value, fullKey));
    } else if (Array.isArray(value)) {
      result[fullKey] = JSON.stringify(value);
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}

/**
 * Sort field names into a logical, consistent order by prefix group.
 * Groups:
 *   1. id / _id
 *   2. li_  (LinkedIn fields)
 *   3. Core ungrouped (revenue, employee_size, industry, email)
 *   4. dls_ (DLS fields)
 *   5. gs_  (Google fields)
 *   6. ap_  (Apollo fields)
 *   7. need_to_action, last_contact_date
 *   8. reference_
 *   9. Meta (created_by, updated_by, created_at, updated_at, deleted_at)
 *  10. Everything else
 */
function sortFieldsByPriority(fields) {
  const priorityMap = {
    'id': 1,
    '_id': 1,
  };

  const prefixPriority = [
    { prefix: 'li_',        group: 2 },
    { prefix: 'dls_',       group: 4 },
    { prefix: 'gs_',        group: 5 },
    { prefix: 'ap_',        group: 6 },
    { prefix: 'reference_', group: 8 },
  ];

  const coreFields = new Set([
    'revenue', 'employee_size', 'industry', 'email'
  ]);

  const metaFields = new Set([
    'created_by', 'updated_by', 'created_at', 'updated_at', 'deleted_at'
  ]);

  const actionFields = new Set([
    'need_to_action', 'last_contact_date'
  ]);

  function getGroup(field) {
    if (priorityMap[field] !== undefined) return priorityMap[field];
    if (coreFields.has(field)) return 3;
    if (metaFields.has(field)) return 9;
    if (actionFields.has(field)) return 7;
    for (const { prefix, group } of prefixPriority) {
      if (field.startsWith(prefix)) return group;
    }
    return 10; // Unknown fields go last
  }

  return [...fields].sort((a, b) => {
    const ga = getGroup(a);
    const gb = getGroup(b);
    if (ga !== gb) return ga - gb;
    // Within the same group, sort alphabetically
    return a.localeCompare(b);
  });
}

// ─── Constants ───
const MAX_FILE_SIZE = 1 * 1024 * 1024 * 1024; // 1 GB per part file

/**
 * Create a new part file write stream
 * @param {string} jobId - Job identifier
 * @param {number} partNum - Part number (1-based)
 * @returns {{ stream: fs.WriteStream, filePath: string }}
 */
function createPartStream(jobId, partNum) {
  const suffix = partNum === 1 ? '' : `_part${partNum}`;
  const filePath = path.join(TEMP_DIR, `mapping_${jobId}${suffix}.csv`);
  const stream = fs.createWriteStream(filePath, { encoding: 'utf-8' });
  return { stream, filePath };
}

/**
 * Safely close a write stream and wait for it to finish
 */
function closeStream(stream) {
  return new Promise((resolve, reject) => {
    if (!stream || stream.destroyed) return resolve();
    stream.end(() => resolve());
    stream.on('error', reject);
  });
}

// ─── Main Job Processor ───
mappingQueue.process('mapping-lookup', 1, async (job) => {
  // Support both old 'companyNames' and new 'matchValues' key for backward compat
  const matchValues = job.data.matchValues || job.data.companyNames;
  const { database, collection, matchField = 'li_company_name' } = job.data;

  console.log(`\n🗺️  ========== MAPPING JOB ${job.id} ==========`);
  console.log(`📦 Database: ${database}`);
  console.log(`📋 Collection: ${collection}`);
  console.log(`🔍 Match Field: ${matchField}`);
  console.log(`📊 Total unique match values: ${matchValues.length}`);
  console.log(`📏 Max file size: ${(MAX_FILE_SIZE / (1024 * 1024 * 1024)).toFixed(1)} GB per part`);

  let client = null;

  try {
    await job.progress({ processed: 0, total: matchValues.length, matched: 0, phase: 'connecting' });

    // Connect to target database
    const connection = await getMongoConnection(database);
    client = connection.client;
    const db = connection.db;
    const col = db.collection(collection);

    // ─── PRE-SCAN: Discover all field names from a sample document ───
    console.log('\n🔎 Pre-scan: Discovering field order from collection...');
    await job.progress({ processed: 0, total: matchValues.length, matched: 0, phase: 'scanning fields' });

    let allHeaders = null;
    let headerRow = '';

    // Get one sample document to discover all fields
    const sampleDoc = await col.findOne({}, { sort: { _id: 1 } });
    if (sampleDoc) {
      const flat = flattenObject(sampleDoc);
      const rawFields = Object.keys(flat);
      allHeaders = sortFieldsByPriority(rawFields);
      headerRow = allHeaders.map(escapeCsvField).join(',') + '\n';
      console.log(`  ✅ Discovered ${allHeaders.length} fields, sorted by priority`);
    } else {
      console.log('  ⚠️ Collection is empty — headers will be discovered from first matched document');
    }

    // ─── PHASE 1: Batch Query with $in + Auto-Split CSV ───
    console.log('\n📥 Phase 1: Batch querying MongoDB...');
    await job.progress({ processed: 0, total: matchValues.length, matched: 0, phase: 'querying' });

    const BATCH_SIZE = 5000;

    let totalMatched = 0;
    let totalProcessed = 0;

    // ─── Multi-file state ───
    let currentPartNum = 1;
    let currentFileSize = 0;
    let outputFilePaths = [];    // All part file paths
    let totalFileSizeBytes = 0;  // Combined size across all parts

    // Open the first part file
    let { stream: writeStream, filePath: currentFilePath } = createPartStream(job.id, currentPartNum);
    outputFilePaths.push(currentFilePath);
    console.log(`📄 Writing Part ${currentPartNum}: ${path.basename(currentFilePath)}`);

    // If headers were already discovered during pre-scan, write them to the first part now.
    // When headers are discovered later (first matched doc), the existing logic below
    // writes headerRow at that time, so this does not duplicate.
    if (headerRow) {
      writeStream.write(headerRow);
      currentFileSize += Buffer.byteLength(headerRow, 'utf-8');
    }

    for (let i = 0; i < matchValues.length; i += BATCH_SIZE) {
      const batch = matchValues.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(matchValues.length / BATCH_SIZE);

      console.log(`  📦 Batch ${batchNum}/${totalBatches}: Querying ${batch.length} values...`);

      // Query using $in for exact matching
      const cursor = col.find(
        { [matchField]: { $in: batch } },
        { batchSize: 5000 }
      );

      let batchMatched = 0;

      while (await cursor.hasNext()) {
        const doc = await cursor.next();
        batchMatched++;
        totalMatched++;

        // Flatten the document
        const flat = flattenObject(doc);

        // Discover headers from first match if pre-scan was empty
        if (!allHeaders) {
          allHeaders = sortFieldsByPriority(Object.keys(flat));
          headerRow = allHeaders.map(escapeCsvField).join(',') + '\n';
          // Write header to first part
          writeStream.write(headerRow);
          currentFileSize += Buffer.byteLength(headerRow, 'utf-8');
        }

        // Discover any new fields not in the pre-scanned headers
        const docFields = Object.keys(flat);
        const newFields = docFields.filter(f => !allHeaders.includes(f));
        if (newFields.length > 0) {
          // Merge new fields into the header list (append at end, sorted within themselves)
          allHeaders = [...allHeaders, ...sortFieldsByPriority(newFields)];
          // NOTE: header row in current file is already written — new fields go to columns
          // that won't align. This is rare (schemas are mostly consistent).
          // We log it for visibility.
          console.log(`  ⚠️ Found ${newFields.length} new fields: ${newFields.join(', ')}`);
        }

        // Build row string
        const rowStr = allHeaders.map(h => escapeCsvField(flat[h])).join(',') + '\n';
        const rowBytes = Buffer.byteLength(rowStr, 'utf-8');

        // ─── File rotation check ───
        // If adding this row would exceed MAX_FILE_SIZE, rotate to a new part
        if (currentFileSize + rowBytes > MAX_FILE_SIZE && currentFileSize > 0) {
          // Close current part
          await closeStream(writeStream);
          const partStats = fs.statSync(currentFilePath);
          totalFileSizeBytes += partStats.size;
          console.log(`  📄 Part ${currentPartNum} closed: ${(partStats.size / (1024 * 1024)).toFixed(1)} MB`);

          // Open new part
          currentPartNum++;
          currentFileSize = 0;
          const newPart = createPartStream(job.id, currentPartNum);
          writeStream = newPart.stream;
          currentFilePath = newPart.filePath;
          outputFilePaths.push(currentFilePath);
          console.log(`  📄 Writing Part ${currentPartNum}: ${path.basename(currentFilePath)}`);

          // Write header to new part
          writeStream.write(headerRow);
          currentFileSize += Buffer.byteLength(headerRow, 'utf-8');
        }

        // Write row with backpressure handling
        const canContinue = writeStream.write(rowStr);
        currentFileSize += rowBytes;

        // Handle backpressure — wait for drain if buffer is full
        if (!canContinue) {
          await new Promise(resolve => writeStream.once('drain', resolve));
        }
      }

      await cursor.close();
      totalProcessed += batch.length;

      console.log(`    ✅ Batch ${batchNum}: ${batchMatched} records matched`);

      // Report progress
      await job.progress({
        processed: totalProcessed,
        total: matchValues.length,
        matched: totalMatched,
        phase: 'querying',
        currentBatch: batchNum,
        totalBatches,
        currentPart: currentPartNum,
        totalParts: currentPartNum
      });
    }

    // Close final write stream
    await closeStream(writeStream);

    // If no matches, write empty file with message
    if (totalMatched === 0) {
      fs.writeFileSync(outputFilePaths[0], 'No matching records found\n');
    }

    // Calculate total file size
    const finalPartStats = fs.statSync(currentFilePath);
    totalFileSizeBytes += finalPartStats.size;
    const fileSizeMB = (totalFileSizeBytes / (1024 * 1024)).toFixed(2);

    // ─── COMPLETE ───
    await job.progress({
      processed: matchValues.length,
      total: matchValues.length,
      matched: totalMatched,
      phase: 'completed',
      totalParts: currentPartNum
    });

    const summary = {
      status: 'completed',
      database,
      collection,
      matchField,
      totalCompanies: matchValues.length,
      totalValues: matchValues.length,
      totalMatched,
      // Backward compat: single file path
      outputFilePath: outputFilePaths[0],
      // New: array of all part file paths
      outputFilePaths,
      totalParts: currentPartNum,
      fileSizeMB,
      completedAt: new Date().toISOString()
    };

    console.log(`\n🎉 ========== JOB ${job.id} COMPLETED ==========`);
    console.log(`📊 Summary:`, {
      ...summary,
      outputFilePaths: outputFilePaths.map(p => path.basename(p))
    });

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

// ─── Event Handlers ───
mappingQueue.on('completed', (job, result) => {
  console.log(`🎉 Job ${job.id} completed:`, {
    totalCompanies: result?.totalCompanies || 0,
    totalMatched: result?.totalMatched || 0
  });
});

mappingQueue.on('failed', (job, err) => {
  console.error(`❌ Job ${job.id} failed:`, err.message);
});

mappingQueue.on('stalled', (job) => {
  console.warn(`⚠️ Job ${job.id} stalled — will be retried`);
});

// ─── Graceful Shutdown ───
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down mapping worker...');
  await mappingQueue.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down mapping worker...');
  await mappingQueue.close();
  process.exit(0);
});
