import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
const Queue = require('bull');
const { MongoClient } = require('mongodb');

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Get database URI (products always in nextjs_stu / central)
 */
function getMongoUri() {
  return process.env.MONGODB_URI || 'mongodb://localhost:27017/nextjs_stu';
}

/**
 * Product collection fields for mapping display
 */
const PRODUCT_FIELDS = [
  'product_name',
  'description',
  'source_description',
  'pp_name',
  'category',
  'vendor'
];

/**
 * Valid target collections
 */
const VALID_COLLECTIONS = ['products', 'apolloproduct', 'g2product', 'linkedinprodcut', 'MSSPsproduct', 'MSPsproduct'];

/**
 * API: Product CSV Upload & Insert (Queue-Based)
 * 
 * POST /api/products/upload-csv
 * 
 * Two modes:
 *   action=upload  → Parse CSV, return headers + collection fields for mapping
 *   action=insert  → Apply mapping, QUEUE bulk insert via Bull
 * 
 * Uses Bull queue for background processing (handles lakh+ records)
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ status: false, message: 'Method not allowed' });
  }

  const uploadDir = path.join(process.cwd(), 'temp', 'product-imports');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const form = formidable({
    uploadDir,
    keepExtensions: true,
    maxFileSize: 100 * 1024 * 1024, // 100MB
    filter: ({ mimetype }) => {
      return mimetype && (mimetype.includes('csv') || mimetype.includes('text'));
    },
  });

  try {
    const [fields, files] = await form.parse(req);
    const action = fields.action?.[0] || 'upload';
    const collection = fields.collection?.[0];

    if (!collection || !VALID_COLLECTIONS.includes(collection)) {
      return res.status(400).json({
        status: false,
        message: `Invalid collection. Must be one of: ${VALID_COLLECTIONS.join(', ')}`
      });
    }

    // ─── MODE 1: Upload CSV & return headers for mapping ─────────────────
    if (action === 'upload') {
      if (!files.file || !files.file[0]) {
        return res.status(400).json({ status: false, message: 'No file uploaded' });
      }

      const file = files.file[0];
      const transferId = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
      const newFilePath = path.join(uploadDir, `${transferId}.csv`);

      fs.renameSync(file.filepath, newFilePath);

      // Read CSV headers and count rows
      const headers = [];
      let totalRecords = 0;
      const sampleRows = [];

      await new Promise((resolve, reject) => {
        fs.createReadStream(newFilePath)
          .pipe(csv())
          .on('headers', (parsedHeaders) => {
            headers.splice(0, headers.length, ...parsedHeaders.map(h => h.replace(/"/g, '').trim()));
          })
          .on('data', (row) => {
            totalRecords++;
            if (sampleRows.length < 3) {
              sampleRows.push(row);
            }
          })
          .on('end', resolve)
          .on('error', reject);
      });

      if (!headers.length) {
        fs.unlinkSync(newFilePath);
        return res.status(400).json({ status: false, message: 'Empty or invalid CSV file' });
      }

      return res.status(200).json({
        status: true,
        transfer_id: transferId,
        csv_headers: headers,
        collection_fields: PRODUCT_FIELDS,
        total_records: totalRecords,
        sample_data: sampleRows,
        file_name: file.originalFilename
      });
    }

    // ─── MODE 2: Queue-based product insert ────────────────────────────
    if (action === 'insert') {
      const transferId = fields.transfer_id?.[0];
      const mappingJson = fields.mapping?.[0];

      if (!transferId || !mappingJson) {
        return res.status(400).json({
          status: false,
          message: 'Missing transfer_id or mapping'
        });
      }

      const mapping = JSON.parse(mappingJson);
      const filePath = path.join(uploadDir, `${transferId}.csv`);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ status: false, message: 'CSV file not found. Please re-upload.' });
      }

      // Quick count for progress tracking
      let totalRecords = 0;
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', () => { totalRecords++; })
          .on('end', resolve)
          .on('error', reject);
      });

      // Generate unique job ID
      const jobId = `product_import_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      // Create progress record
      const client = new MongoClient(getMongoUri());
      await client.connect();
      const uri = getMongoUri();
      const dbName = uri.split('/').pop().split('?')[0] || 'nextjs_stu';
      const db = client.db(dbName);

      await db.collection('csv_import_progress').insertOne({
        job_id: jobId,
        import_type: 'product-csv-import',
        transfer_id: transferId,
        collection: collection,
        total_records: totalRecords,
        inserted: 0,
        skipped: 0,
        failed: 0,
        status: 'queued',
        message: null,
        created_at: new Date(),
        started_at: null,
        completed_at: null
      });

      await client.close();

      // Dispatch to Bull queue
      const importQueue = new Queue('CSV Import Processing', {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379
        }
      });

      await importQueue.add('product-csv-import', {
        jobId,
        transferId,
        csvPath: filePath,
        mapping,
        collection,
        totalRecords
      }, {
        attempts: 2,
        removeOnComplete: 10,
        removeOnFail: false,
        timeout: 0
      });

      await importQueue.close();

      console.log(`📋 Product CSV import queued: ${jobId} (${totalRecords} records → ${collection})`);

      return res.status(200).json({
        status: true,
        queued: true,
        job_id: jobId,
        message: `Import queued! ${totalRecords} products will be inserted into ${collection} in the background.`,
        total_records: totalRecords
      });
    }

    return res.status(400).json({ status: false, message: 'Invalid action. Use "upload" or "insert"' });

  } catch (error) {
    console.error('❌ Product CSV upload error:', error);
    return res.status(500).json({
      status: false,
      message: error.message || 'Upload failed'
    });
  }
}
