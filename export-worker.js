#!/usr/bin/env node

/**
 * CSV Export Worker
 * Background worker that exports large MongoDB datasets to CSV files
 * 
 * Features:
 * - Cursor-based streaming (memory safe for 2 crore+ records)
 * - Auto-splits files at 1 GB boundary → multiple CSV parts
 * - Progress reporting for frontend polling
 * - Uses same DataService filter logic for query consistency
 * - Backpressure-aware writing
 * 
 * Usage: node export-worker.js
 *   or:  npm run queue:export
 */

const Queue = require('bull');
const { MongoClient, ObjectId, Long } = require('mongodb');
const fs = require('fs');
const path = require('path');

const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10)
};

const exportQueue = new Queue('CSV Export', {
  redis: REDIS_CONFIG,
  settings: {
    stalledInterval: 15 * 60 * 1000,
    maxStalledCount: 2,
    lockDuration: 2 * 60 * 60 * 1000,
  }
});

console.log('📤 CSV Export Worker started');
console.log('⏹️  Press Ctrl+C to stop');

// Ensure temp directory exists
const TEMP_DIR = path.join(process.cwd(), 'tmp', 'export-results');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// ─── Constants ───
const MAX_FILE_SIZE = 1 * 1024 * 1024 * 1024; // 1 GB per part file
const BATCH_LOG_INTERVAL = 10000; // Log every 10k records

/**
 * Get MongoDB connection using same config as the application
 * Uses database.js connection config to resolve the correct URI + database name
 * This ensures the worker connects to the exact same DB as the Next.js app
 */
async function getMongoConnection(connectionName) {
  // Load database config (same as the app uses)
  const dotenv = require('dotenv');
  dotenv.config();

  // Connection configs — mirrors src/config/database.js
  const connectionConfigs = {
    central: {
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/nextjs_stu',
      database: process.env.CENTRAL_DATABASE || 'nextjs_stu',
    },
    pluto: {
      uri: process.env.PLUTO_MONGODB_URI || (process.env.MONGODB_URI ? process.env.MONGODB_URI.replace(/\/[^\/]+$/, '/pluto') : 'mongodb://localhost:27017/pluto'),
      database: process.env.PLUTO_DATABASE || 'pluto',
    },
    sun: {
      uri: process.env.SUN_MONGODB_URI || (process.env.MONGODB_URI ? process.env.MONGODB_URI.replace(/\/[^\/]+$/, '/sun') : 'mongodb://localhost:27017/sun'),
      database: process.env.SUN_DATABASE || 'sun',
    },
    moon: {
      uri: process.env.MOON_MONGODB_URI || (process.env.MONGODB_URI ? process.env.MONGODB_URI.replace(/\/[^\/]+$/, '/moon') : 'mongodb://localhost:27017/moon'),
      database: process.env.MOON_DATABASE || 'moon',
    },
    mars: {
      uri: process.env.MARS_MONGODB_URI || (process.env.MONGODB_URI ? process.env.MONGODB_URI.replace(/\/[^\/]+$/, '/mars') : 'mongodb://localhost:27017/mars'),
      database: process.env.MARS_DATABASE || 'mars',
    },
    jupiter: {
      uri: process.env.JUPITER_MONGODB_URI || (process.env.MONGODB_URI ? process.env.MONGODB_URI.replace(/\/[^\/]+$/, '/jupiter') : 'mongodb://localhost:27017/jupiter'),
      database: process.env.JUPITER_DATABASE || 'jupiter',
    },
    earth: {
      uri: process.env.EARTH_MONGODB_URI || (process.env.MONGODB_URI ? process.env.MONGODB_URI.replace(/\/[^\/]+$/, '/earth') : 'mongodb://localhost:27017/earth'),
      database: process.env.EARTH_DATABASE || 'earth',
    },
  };

  const config = connectionConfigs[connectionName];
  if (!config) {
    throw new Error(`Unknown connection: "${connectionName}". Available: ${Object.keys(connectionConfigs).join(', ')}`);
  }

  const mongoUrl = config.uri;
  const client = new MongoClient(mongoUrl);
  await client.connect();

  // Extract DB name from URI (same logic as lib/mongodb.js line 43)
  const dbName = mongoUrl.split('/').pop().split('?')[0] || config.database;
  const db = client.db(dbName);

  console.log(`  🔗 Connected to MongoDB: ${connectionName} → database "${dbName}"`);

  return { client, db };
}

/**
 * Escape a CSV field value
 */
function escapeCsvField(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r') || str !== str.trim()) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * Create a new part file write stream
 */
function createPartStream(jobId, partNum) {
  const suffix = partNum === 1 ? '' : `_part${partNum}`;
  const filePath = path.join(TEMP_DIR, `export_${jobId}${suffix}.csv`);
  const stream = fs.createWriteStream(filePath, { encoding: 'utf-8' });
  return { stream, filePath };
}

/**
 * Close a write stream and wait for it to finish
 */
function closeStream(stream) {
  return new Promise((resolve, reject) => {
    if (!stream || stream.destroyed) return resolve();
    stream.end(() => resolve());
    stream.on('error', reject);
  });
}

/**
 * Product collection names (for search field selection)
 */
const PRODUCT_COLLECTIONS = ['products', 'apolloproduct', 'g2product', 'linkedinprodcut', 'MSSPsproduct', 'MSPsproduct'];

/**
 * Build MongoDB query from filters (same logic as DataService.filter)
 * Reconstructs the query that the frontend would pass through skeleton-action
 * @param {Object} filters - Filter object
 * @param {Object} options - { selectedIds, table }
 */
function buildMongoQuery(filters = {}, options = {}) {
  const queryConditions = [];

  // Soft delete filter
  queryConditions.push({
    $or: [
      { deleted_at: null },
      { deleted_at: { $exists: false } }
    ]
  });

  // Column filters
  if (filters.columns && typeof filters.columns === 'object') {
    const filterType = filters.FilterType || filters.filterType || {};
    
    Object.keys(filters.columns).forEach(column => {
      const filter = filters.columns[column];
      const values = Array.isArray(filter.search?.value)
        ? filter.search.value
        : (filter.search?.value ? String(filter.search.value).split(',').map(v => v.trim()) : []);

      if (values.length > 0) {
        const type = filterType[column] || 'strict';

        // Special handling: audience_id → Long
        if (column === 'audience_id' && type === 'strict') {
          const longValues = values.map(v => {
            try {
              const num = Number(String(v).trim());
              if (!isNaN(num) && Number.isFinite(num)) return Long.fromNumber(num);
            } catch (e) {}
            return null;
          }).filter(v => v !== null);
          if (longValues.length === 1) {
            queryConditions.push({ [column]: longValues[0] });
          } else if (longValues.length > 1) {
            queryConditions.push({ [column]: { $in: longValues } });
          }
          return;
        }

        // Special handling: status with other_status
        if (column === 'status' && type === 'other_status') {
          const conditions = [];
          const hasNull = values.includes('__NULL__') || values.includes('null');
          const hasUndefined = values.includes('__UNDEFINED__') || values.includes('undefined');
          const otherValues = values.filter(v => 
            v !== '__NULL__' && v !== '__UNDEFINED__' && v !== 'null' && v !== 'undefined' && String(v).trim() !== ''
          );
          if (hasNull || hasUndefined) {
            conditions.push({ [column]: null }, { [column]: { $exists: false } });
          }
          if (otherValues.length > 0) {
            conditions.push({ [column]: { $in: otherValues } });
          }
          if (conditions.length > 0) {
            queryConditions.push(conditions.length === 1 ? conditions[0] : { $or: conditions });
          }
          return;
        }

        // Standard filter types
        const condition = applyFilter(column, values, type);
        if (condition) {
          queryConditions.push(condition);
        }
      }
    });
  }

  // Date range filters
  if (filters.dateRange && typeof filters.dateRange === 'object') {
    Object.keys(filters.dateRange).forEach(column => {
      if (column === 'column') return;
      const range = filters.dateRange[column];
      if (range && range.from && range.to) {
        let fromDate, toDate;
        if (typeof range.from === 'string' && range.from.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, day] = range.from.split('-').map(Number);
          fromDate = new Date(year, month - 1, day, 0, 0, 0, 0);
        } else {
          fromDate = new Date(range.from);
          fromDate.setHours(0, 0, 0, 0);
        }
        if (typeof range.to === 'string' && range.to.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, day] = range.to.split('-').map(Number);
          toDate = new Date(year, month - 1, day, 23, 59, 59, 999);
        } else {
          toDate = new Date(range.to);
          toDate.setHours(23, 59, 59, 999);
        }
        if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime()) && fromDate <= toDate) {
          queryConditions.push({ [column]: { $gte: fromDate, $lte: toDate } });
        }
      }
    });
  }

  // Global search (accept string or { value: string })
  const searchVal = filters.search;
  const searchValue = typeof searchVal === 'string' ? searchVal.trim() : (searchVal?.value ? String(searchVal.value).trim() : '');
  if (searchValue) {
    const searchRegex = { $regex: searchValue, $options: 'i' };
    const isProductTable = PRODUCT_COLLECTIONS.includes(options.table || '');
    const searchFields = isProductTable
      ? ['product_name', 'product_id', 'description', 'pp_name', 'category', 'vendor', 'Companyname', 'Category']
      : [
          'li_company_name', 'li_full_name', 'email', 'li_smtp',
          'li_job_title', 'dls_designation', 'ap_company_name',
          'li_first_name', 'li_last_name', 'ap_full_name'
        ];
    const searchConditions = searchFields.map(f => ({ [f]: searchRegex }));
    queryConditions.push({ $or: searchConditions });
  }

  // Selected IDs filter (products: export only specific records)
  const selectedIds = options.selectedIds;
  if (selectedIds && Array.isArray(selectedIds) && selectedIds.length > 0) {
    const idSet = selectedIds.map(id => String(id).trim()).filter(Boolean);
    if (idSet.length > 0) {
      const idConditions = [];
      const numericIds = idSet.filter(id => /^\d+$/.test(id)).map(id => parseInt(id, 10));
      const objectIdIds = idSet.filter(id => /^[a-fA-F0-9]{24}$/.test(id));
      if (numericIds.length > 0) {
        idConditions.push({ id: { $in: numericIds } });
      }
      idConditions.push({ product_id: { $in: idSet } });
      if (objectIdIds.length > 0) {
        try {
          idConditions.push({ _id: { $in: objectIdIds.map(oid => new ObjectId(oid)) } });
        } catch (e) {
          /* ignore invalid ObjectIds */
        }
      }
      if (idConditions.length === 0) {
        idConditions.push({ id: { $in: idSet } });
      }
      queryConditions.push(idConditions.length > 1 ? { $or: idConditions } : idConditions[0]);
    }
  }

  return queryConditions.length > 0 ? { $and: queryConditions } : {};
}

/**
 * Apply filter (mirrors DataService.applyFilter)
 */
function applyFilter(column, values, filterType) {
  if (!values || values.length === 0) return null;
  const conditions = [];
  values.forEach(value => {
    const trimmed = String(value).trim();
    if (!trimmed) return;
    switch (filterType) {
      case 'strict':
        conditions.push({ [column]: trimmed });
        break;
      case 'partial':
        conditions.push({ [column]: { $regex: trimmed, $options: 'i' } });
        break;
      case 'starts_with':
        conditions.push({ [column]: { $regex: `^${trimmed}`, $options: 'i' } });
        break;
      case 'ends_with':
        conditions.push({ [column]: { $regex: `${trimmed}$`, $options: 'i' } });
        break;
      case 'greater_than':
        const num = Number(trimmed);
        if (!isNaN(num)) conditions.push({ [column]: { $gt: num } });
        break;
      case 'less_than':
        const num2 = Number(trimmed);
        if (!isNaN(num2)) conditions.push({ [column]: { $lt: num2 } });
        break;
      case 'not':
        conditions.push({ [column]: { $ne: trimmed } });
        break;
      default:
        conditions.push({ [column]: trimmed });
    }
  });
  return conditions.length > 0 ? { $or: conditions } : null;
}

// ─── Main Job Processor ───
exportQueue.process('csv-export', 1, async (job) => {
  const { system, table, filters, exportColumns, excludedIds, selectedIds, totalExpected } = job.data;

  console.log(`\n📤 ========== EXPORT JOB ${job.id} ==========`);
  console.log(`📦 System: ${system}, Table: ${table}`);
  console.log(`📋 Columns to export: ${exportColumns?.length || 'all'}`);
  console.log(`📊 Expected records: ~${(totalExpected || 0).toLocaleString()}`);
  if (selectedIds?.length) console.log(`📌 Selected IDs: ${selectedIds.length}`);

  let client = null;

  try {
    await job.progress({ processed: 0, total: totalExpected || 0, phase: 'connecting' });

    // Connect to database
    const connection = await getMongoConnection(system);
    client = connection.client;
    const db = connection.db;
    const col = db.collection(table);

    // Build query from filters (pass selectedIds for products export)
    console.log('🔍 Incoming filters:', JSON.stringify({
      search: filters?.search,
      columns: filters?.columns ? Object.keys(filters.columns) : [],
      FilterType: filters?.FilterType,
      dateRange: filters?.dateRange,
      where: filters?.where,
      selectedIds: selectedIds?.length || 0
    }));
    const query = buildMongoQuery(filters, { selectedIds, table });
    console.log('🔍 Query:', JSON.stringify(query).substring(0, 1000));

    // Get total count — graceful fallback if countDocuments times out on large collections
    await job.progress({ processed: 0, total: totalExpected || 0, phase: 'counting' });
    let totalRecords = totalExpected || 0;
    try {
      totalRecords = await col.countDocuments(query, { maxTimeMS: 120000 });
      console.log(`📊 Actual records to export: ${totalRecords.toLocaleString()}`);
    } catch (countErr) {
      // Error code 50 = ExceededTimeLimit
      if (countErr.code === 50 || (countErr.message && countErr.message.includes('time limit'))) {
        console.warn(`⚠️ countDocuments timed out on ${system}.${table}, using frontend estimate: ${totalExpected}`);
        // Fall back to estimatedDocumentCount (instant, uses collection metadata) or frontend estimate
        if (!totalRecords || totalRecords === 0) {
          try {
            totalRecords = await col.estimatedDocumentCount();
            console.log(`📊 Using estimatedDocumentCount: ${totalRecords.toLocaleString()}`);
          } catch (estErr) {
            totalRecords = totalExpected || 0;
            console.log(`📊 Using frontend estimate: ${totalRecords.toLocaleString()}`);
          }
        }
      } else {
        throw countErr; // Re-throw non-timeout errors
      }
    }

    if (totalRecords === 0) {
      await job.progress({ processed: 0, total: 0, phase: 'completed' });
      const emptyFilePath = path.join(TEMP_DIR, `export_${job.id}.csv`);
      fs.writeFileSync(emptyFilePath, 'No records found\n');
      return {
        status: 'completed',
        system,
        table,
        totalRecords: 0,
        outputFilePath: emptyFilePath,
        outputFilePaths: [emptyFilePath],
        totalParts: 1,
        fileSizeMB: '0',
        completedAt: new Date().toISOString()
      };
    }

    // Determine projection (only requested columns)
    let projection = {};
    if (exportColumns && exportColumns.length > 0) {
      exportColumns.forEach(col => { projection[col] = 1; });
      // Always include _id for consistency
      projection._id = 1;
    }

    // Build excluded IDs set
    const excludedSet = new Set();
    if (excludedIds && excludedIds.length > 0) {
      excludedIds.forEach(id => excludedSet.add(String(id)));
    }

    // Create cursor with streaming
    await job.progress({ processed: 0, total: totalRecords, phase: 'exporting' });

    let cursor = col.find(query, { batchSize: 500 });
    if (Object.keys(projection).length > 0) {
      cursor = cursor.project(projection);
    }

    // Sort by _id for consistent export
    cursor = cursor.sort({ _id: 1 });

    // Write CSV headers
    const headers = exportColumns && exportColumns.length > 0
      ? exportColumns
      : null; // Discover from first document

    let allHeaders = headers;
    let headerRow = headers ? headers.map(escapeCsvField).join(',') + '\n' : '';

    // Multi-file state
    let currentPartNum = 1;
    let currentFileSize = 0;
    let outputFilePaths = [];
    let totalFileSizeBytes = 0;
    let totalProcessed = 0;
    let totalSkipped = 0;

    // Open first part file
    let { stream: writeStream, filePath: currentFilePath } = createPartStream(job.id, currentPartNum);
    outputFilePaths.push(currentFilePath);

    if (headerRow) {
      writeStream.write(headerRow);
      currentFileSize += Buffer.byteLength(headerRow, 'utf-8');
    }

    console.log(`📄 Writing Part ${currentPartNum}: ${path.basename(currentFilePath)}`);

    while (await cursor.hasNext()) {
      const doc = await cursor.next();

      // Skip excluded IDs
      const docId = doc._id ? doc._id.toString() : '';
      const docNumericId = doc.id !== undefined ? String(doc.id) : '';
      if (excludedSet.has(docId) || excludedSet.has(docNumericId)) {
        totalSkipped++;
        continue;
      }

      // Discover headers from first document if not preset
      if (!allHeaders) {
        allHeaders = Object.keys(doc).filter(k => k !== '__v');
        headerRow = allHeaders.map(escapeCsvField).join(',') + '\n';
        writeStream.write(headerRow);
        currentFileSize += Buffer.byteLength(headerRow, 'utf-8');
      }

      // Build row
      const rowStr = allHeaders.map(h => {
        let val = doc[h];
        if (val === undefined || val === null) return '';
        if (typeof val === 'object') {
          if (val instanceof ObjectId) return val.toString();
          if (val instanceof Date) return val.toISOString();
          if (val instanceof Long) return val.toString();
          return JSON.stringify(val);
        }
        return escapeCsvField(val);
      }).join(',') + '\n';

      const rowBytes = Buffer.byteLength(rowStr, 'utf-8');

      // File rotation at 1 GB
      if (currentFileSize + rowBytes > MAX_FILE_SIZE && currentFileSize > 0) {
        await closeStream(writeStream);
        const partStats = fs.statSync(currentFilePath);
        totalFileSizeBytes += partStats.size;
        console.log(`  📄 Part ${currentPartNum} closed: ${(partStats.size / (1024 * 1024)).toFixed(1)} MB`);

        currentPartNum++;
        currentFileSize = 0;
        const newPart = createPartStream(job.id, currentPartNum);
        writeStream = newPart.stream;
        currentFilePath = newPart.filePath;
        outputFilePaths.push(currentFilePath);

        // Write header to new part
        writeStream.write(headerRow);
        currentFileSize += Buffer.byteLength(headerRow, 'utf-8');
        console.log(`  📄 Writing Part ${currentPartNum}: ${path.basename(currentFilePath)}`);
      }

      // Write row with backpressure handling
      const canContinue = writeStream.write(rowStr);
      currentFileSize += rowBytes;

      if (!canContinue) {
        await new Promise(resolve => writeStream.once('drain', resolve));
      }

      totalProcessed++;

      // Report progress periodically
      if (totalProcessed % BATCH_LOG_INTERVAL === 0) {
        await job.progress({
          processed: totalProcessed,
          total: totalRecords,
          phase: 'exporting',
          currentPart: currentPartNum,
          totalParts: currentPartNum,
          skipped: totalSkipped
        });
        console.log(`  📊 Progress: ${totalProcessed.toLocaleString()} / ${totalRecords.toLocaleString()} exported`);
      }
    }

    await cursor.close();
    await closeStream(writeStream);

    // Calculate final file size
    const finalPartStats = fs.statSync(currentFilePath);
    totalFileSizeBytes += finalPartStats.size;
    const fileSizeMB = (totalFileSizeBytes / (1024 * 1024)).toFixed(2);

    // Final progress
    await job.progress({
      processed: totalProcessed,
      total: totalRecords,
      phase: 'completed',
      totalParts: currentPartNum,
      skipped: totalSkipped
    });

    const summary = {
      status: 'completed',
      system,
      table,
      totalRecords: totalProcessed,
      totalSkipped,
      outputFilePath: outputFilePaths[0],
      outputFilePaths,
      totalParts: currentPartNum,
      fileSizeMB,
      completedAt: new Date().toISOString()
    };

    console.log(`\n🎉 ========== EXPORT JOB ${job.id} COMPLETED ==========`);
    console.log(`📊 Summary:`, {
      ...summary,
      outputFilePaths: outputFilePaths.map(p => path.basename(p))
    });

    return summary;

  } catch (error) {
    console.error(`\n❌ ========== EXPORT JOB ${job.id} FAILED ==========`);
    console.error(`Error:`, error.message);
    throw error;
  } finally {
    if (client) {
      try { await client.close(); } catch (e) { /* ignore */ }
    }
  }
});

// ─── Event Handlers ───
exportQueue.on('completed', (job, result) => {
  console.log(`🎉 Export Job ${job.id} completed:`, {
    totalRecords: result?.totalRecords || 0,
    fileSizeMB: result?.fileSizeMB || '0'
  });
});

exportQueue.on('failed', (job, err) => {
  console.error(`❌ Export Job ${job.id} failed:`, err.message);
});

exportQueue.on('stalled', (job) => {
  console.warn(`⚠️ Export Job ${job.id} stalled — will be retried`);
});

// ─── Graceful Shutdown ───
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down export worker...');
  await exportQueue.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down export worker...');
  await exportQueue.close();
  process.exit(0);
});
