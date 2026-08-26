import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { MongoClient } from 'mongodb';
import readline from 'readline';

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

/**
 * Chunked Upload API for Large CSV Files (300MB - 2GB)
 * 
 * This endpoint receives file chunks individually and:
 * 1. Appends each chunk to a temp file on disk
 * 2. On final chunk: extracts headers (first line only)
 * 3. Estimates row count from file size (no full file scan)
 * 4. Returns response for column mapping
 * 
 * POST /api/import/upload-chunked
 */

/**
 * Get database URI based on database name
 */
function getMongoUri(database) {
  switch(database) {
    case 'sun':
      return process.env.SUN_MONGODB_URI || 'mongodb://localhost:27017/sun';
    case 'moon':
      return process.env.MOON_MONGODB_URI || 'mongodb://localhost:27017/moon';
    case 'pluto':
      return process.env.PLUTO_MONGODB_URI || 'mongodb://localhost:27017/pluto';
    case 'unique':
      return process.env.UNIQUE_MONGODB_URI || 'mongodb://localhost:27017/unique';
    case 'testing':
      return process.env.TESTING_MONGODB_URI || 'mongodb://localhost:27017/testing';
    default:
      return process.env.MONGODB_URI || 'mongodb://localhost:27017/nextjs_stu';
  }
}

/**
 * Read only the first line of a CSV file to get headers (streaming)
 */
async function getCSVHeadersStreaming(filePath) {
  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: readStream });
    
    rl.on('line', (line) => {
      // Parse first line as CSV headers
      const headers = line.split(',').map(h => h.replace(/^"|"$/g, '').trim());
      rl.close();
      readStream.close();
      resolve(headers);
    });
    
    rl.on('error', reject);
    readStream.on('error', reject);
  });
}

/**
 * Estimate row count from file size without reading entire file
 * Uses first 100 lines to calculate average row size
 */
async function estimateRowCount(filePath) {
  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: readStream });
    
    let lineCount = 0;
    let totalBytes = 0;
    const maxLinesToSample = 100;
    
    rl.on('line', (line) => {
      lineCount++;
      totalBytes += Buffer.byteLength(line, 'utf8') + 1; // +1 for newline
      
      if (lineCount >= maxLinesToSample) {
        rl.close();
        readStream.close();
      }
    });
    
    rl.on('close', () => {
      if (lineCount === 0) {
        resolve(0);
        return;
      }
      
      const avgRowSize = totalBytes / lineCount;
      const stats = fs.statSync(filePath);
      const estimatedRows = Math.floor(stats.size / avgRowSize);
      
      console.log(`📊 Estimated ${estimatedRows} rows (avg row size: ${avgRowSize.toFixed(0)} bytes, file: ${(stats.size / (1024 * 1024)).toFixed(2)} MB)`);
      resolve(estimatedRows);
    });
    
    rl.on('error', reject);
    readStream.on('error', reject);
  });
}

/**
 * Dynamically get table columns from MongoDB collection schema
 * Samples MULTIPLE documents to capture all fields in schemaless collections
 */
async function getDynamicTableColumns(database, table) {
  let client;
  try {
    const mongoUri = getMongoUri(database);
    client = new MongoClient(mongoUri);
    await client.connect();
    
    const db = client.db(database);
    const collection = db.collection(table);
    let fields = new Set();
    
    // Method 1: Try to get collection validator schema
    try {
      const collectionInfo = await db.listCollections({ name: table }).toArray();
      if (collectionInfo.length > 0 && collectionInfo[0].options?.validator?.$jsonSchema?.properties) {
        const properties = collectionInfo[0].options.validator.$jsonSchema.properties;
        Object.keys(properties).filter(field => field !== '_id').forEach(field => fields.add(field));
        console.log(`📋 Schema fields for ${database}.${table}:`, fields.size);
      }
    } catch (schemaError) {
      console.log(`⚠️  No validator schema found for ${database}.${table}`);
    }
    
    // Method 2: Sample MULTIPLE documents to capture all fields (schemaless DB support)
    // This is essential because different documents may have different fields
    const sampleSize = 100; // Sample 100 documents for comprehensive field discovery
    const sampleDocs = await collection.find({}).limit(sampleSize).toArray();
    
    if (sampleDocs.length > 0) {
      // Aggregate all unique field names across all sampled documents
      sampleDocs.forEach(doc => {
        Object.keys(doc).filter(field => field !== '_id').forEach(field => fields.add(field));
      });
      console.log(`📋 Aggregated fields from ${sampleDocs.length} documents for ${database}.${table}:`, fields.size);
    }
    
    // Convert Set to sorted array
    const fieldArray = Array.from(fields).sort();
    console.log(`📋 Total unique fields for ${database}.${table}:`, fieldArray.length);
    
    return fieldArray;
    
  } catch (error) {
    console.error(`❌ Error fetching schema for ${database}.${table}:`, error.message);
    return [];
  } finally {
    if (client) {
      await client.close();
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const uploadDir = path.join(process.cwd(), 'temp', 'imports');
    const chunksDir = path.join(process.cwd(), 'temp', 'chunks');
    
    // Ensure directories exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    if (!fs.existsSync(chunksDir)) {
      fs.mkdirSync(chunksDir, { recursive: true });
    }

    // Parse the incoming chunk
    const form = formidable({
      uploadDir: chunksDir,
      keepExtensions: true,
      maxFileSize: 15 * 1024 * 1024, // 15MB per chunk (buffer for 10MB chunks)
    });

    const [fields, files] = await form.parse(req);

    // Extract chunk metadata
    const chunkIndex = parseInt(fields.chunkIndex?.[0] || '0');
    const totalChunks = parseInt(fields.totalChunks?.[0] || '1');
    const uploadId = fields.uploadId?.[0];
    const fileName = fields.fileName?.[0];
    const fileSize = parseInt(fields.fileSize?.[0] || '0');
    const database = fields.database?.[0];
    const table = fields.table?.[0];

    if (!uploadId || !files.chunk || !files.chunk[0]) {
      return res.status(400).json({ error: 'Missing chunk or uploadId' });
    }

    const chunkFile = files.chunk[0];
    const finalFilePath = path.join(uploadDir, `${uploadId}.csv`);
    
    console.log(`📦 Receiving chunk ${chunkIndex + 1}/${totalChunks} for upload ${uploadId}`);

    // Append chunk to final file
    const chunkBuffer = fs.readFileSync(chunkFile.filepath);
    fs.appendFileSync(finalFilePath, chunkBuffer);
    
    // Clean up chunk temp file
    fs.unlinkSync(chunkFile.filepath);

    // Check if this is the last chunk
    const isLastChunk = (chunkIndex + 1) >= totalChunks;

    if (!isLastChunk) {
      // Not the last chunk, just acknowledge
      return res.status(200).json({
        success: true,
        chunkIndex,
        totalChunks,
        uploadId,
        complete: false,
        message: `Chunk ${chunkIndex + 1}/${totalChunks} received`
      });
    }

    // ============================================
    // LAST CHUNK - Finalize and process file
    // ============================================
    console.log(`✅ All ${totalChunks} chunks received for ${uploadId}, finalizing...`);

    // Verify file size matches expected
    const finalStats = fs.statSync(finalFilePath);
    console.log(`📊 Final file size: ${(finalStats.size / (1024 * 1024)).toFixed(2)} MB (expected: ${(fileSize / (1024 * 1024)).toFixed(2)} MB)`);

    // Extract headers using streaming (first line only)
    const headers = await getCSVHeadersStreaming(finalFilePath);
    
    if (!headers || headers.length === 0) {
      fs.unlinkSync(finalFilePath);
      return res.status(400).json({ error: 'Failed to parse CSV headers' });
    }

    // Estimate row count without reading entire file
    const estimatedRecords = await estimateRowCount(finalFilePath);

    // Get table columns dynamically
    let tableColumns = [];
    if (database && table) {
      tableColumns = await getDynamicTableColumns(database, table);
    }

    console.log(`✅ Upload finalized: ${headers.length} headers, ~${estimatedRecords} records estimated`);

    return res.status(200).json({
      success: true,
      complete: true,
      transfer_id: uploadId,
      csv_headers: headers,
      table_columns: tableColumns,
      estimated_records: estimatedRecords,
      total_records: estimatedRecords, // For compatibility
      file_name: fileName,
      file_size: finalStats.size,
      message: `Upload complete. ${headers.length} headers, ~${estimatedRecords} records`
    });

  } catch (error) {
    console.error('Chunked upload error:', error);
    return res.status(500).json({
      error: 'Chunked upload failed',
      details: error.message
    });
  }
}
