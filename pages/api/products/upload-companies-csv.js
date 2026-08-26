import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { getCollection } from '../../../src/lib/mongodb';
const Queue = require('bull');

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Company fields available for CSV mapping.
 * li_smtp is required; all others are optional → stored as null if empty.
 */
const COMPANY_FIELDS = [
  'li_smtp',        // Required — company domain
  'company_name',   // Optional
  'location',       // Optional
  'industry',       // Optional
  'employee_size',  // Optional
  'revenue',        // Optional
  'website',        // Optional
  'country',        // Optional
  'summary',        // Optional
  'source'          // Optional
];

/**
 * API: Upload Companies CSV to link companies to a product
 * 
 * POST /api/products/upload-companies-csv
 * 
 * Two modes:
 *   action=upload  → Parse CSV, return headers for mapping
 *   action=insert  → Apply mapping, QUEUE insert into companies_products
 * 
 * CSV expected columns: Li_Smtp (required), Company_Name, Location, Industry,
 *   EmployeeSize, Revenue, Website, Country, Summary, Source (all optional)
 * 
 * Empty CSV values → stored as null in the database
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

  const uploadDir = path.join(process.cwd(), 'temp', 'company-imports');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const form = formidable({
    uploadDir,
    keepExtensions: true,
    maxFileSize: 50 * 1024 * 1024, // 50MB
    multiples: false,
  });

  return new Promise((resolve) => {
    form.parse(req, async (err, fields, files) => {
      if (err) {
        res.status(400).json({ status: false, message: 'File upload failed: ' + err.message });
        return resolve();
      }

      const action = Array.isArray(fields.action) ? fields.action[0] : fields.action;
      const productId = Array.isArray(fields.product_id) ? fields.product_id[0] : fields.product_id;
      const productSource = Array.isArray(fields.product_source) ? fields.product_source[0] : (fields.product_source || 'products');
      const productName = Array.isArray(fields.product_name) ? fields.product_name[0] : (fields.product_name || '');
      const productPpName = Array.isArray(fields.product_pp_name) ? fields.product_pp_name[0] : (fields.product_pp_name || '');

      // ── ACTION: UPLOAD (parse CSV, return headers for mapping) ──
      if (action === 'upload') {
        const file = files.file?.[0] || files.file;
        if (!file) {
          res.status(400).json({ status: false, message: 'No file uploaded' });
          return resolve();
        }

        const filePath = file.filepath || file.path;
        const transferId = `company_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const savedPath = path.join(uploadDir, `${transferId}.csv`);

        try {
          fs.copyFileSync(filePath, savedPath);

          // Parse CSV headers and count rows
          const headers = [];
          let totalRecords = 0;

          await new Promise((csvResolve, csvReject) => {
            fs.createReadStream(savedPath)
              .pipe(csv())
              .on('headers', (h) => { headers.push(...h); })
              .on('data', () => { totalRecords++; })
              .on('end', csvResolve)
              .on('error', csvReject);
          });

          res.status(200).json({
            status: true,
            transfer_id: transferId,
            csv_headers: headers,
            collection_fields: COMPANY_FIELDS,
            total_records: totalRecords,
            file_name: file.originalFilename || file.name || 'upload.csv'
          });
        } catch (parseErr) {
          console.error('CSV parse error:', parseErr);
          res.status(500).json({ status: false, message: 'Failed to parse CSV: ' + parseErr.message });
        } finally {
          try { fs.unlinkSync(filePath); } catch (e) {}
        }
        return resolve();
      }

      // ── ACTION: INSERT (queue-based — dispatch to Bull queue) ──
      if (action === 'insert') {
        const transferId = Array.isArray(fields.transfer_id) ? fields.transfer_id[0] : fields.transfer_id;
        const mappingStr = Array.isArray(fields.mapping) ? fields.mapping[0] : fields.mapping;

        if (!transferId || !mappingStr || !productId) {
          res.status(400).json({ status: false, message: 'transfer_id, product_id, and mapping are required' });
          return resolve();
        }

        let mapping;
        try {
          mapping = JSON.parse(mappingStr);
        } catch (e) {
          res.status(400).json({ status: false, message: 'Invalid mapping JSON' });
          return resolve();
        }

        // Validate: li_smtp must be mapped
        if (!mapping.li_smtp) {
          res.status(400).json({ status: false, message: 'li_smtp column must be mapped' });
          return resolve();
        }

        const csvPath = path.join(uploadDir, `${transferId}.csv`);
        if (!fs.existsSync(csvPath)) {
          res.status(400).json({ status: false, message: 'Upload session expired. Please re-upload the CSV.' });
          return resolve();
        }

        try {
          // Quick count for progress tracking
          let totalRecords = 0;
          await new Promise((csvResolve, csvReject) => {
            fs.createReadStream(csvPath)
              .pipe(csv())
              .on('data', () => { totalRecords++; })
              .on('end', csvResolve)
              .on('error', csvReject);
          });

          // Generate a unique job ID
          const jobId = `company_import_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

          // Create progress record for tracking
          const progressCollection = await getCollection('csv_import_progress', 'central');
          await progressCollection.insertOne({
            job_id: jobId,
            import_type: 'company-csv-import',
            transfer_id: transferId,
            product_id: productId,
            product_name: productName,
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

          // Dispatch to Bull queue
          const importQueue = new Queue('CSV Import Processing', {
            redis: {
              host: process.env.REDIS_HOST || 'localhost',
              port: process.env.REDIS_PORT || 6379
            }
          });

          await importQueue.add('company-csv-import', {
            jobId,
            transferId,
            csvPath,
            mapping,
            productId,
            productSource,
            productName,
            productPpName,
            totalRecords
          }, {
            attempts: 2,
            removeOnComplete: 10,
            removeOnFail: false,
            timeout: 0  // No timeout for large imports
          });

          await importQueue.close();

          console.log(`📋 Company CSV import queued: ${jobId} (${totalRecords} records)`);

          res.status(200).json({
            status: true,
            queued: true,
            job_id: jobId,
            message: `Import queued! ${totalRecords} companies will be processed in the background.`,
            total_records: totalRecords
          });

        } catch (insertErr) {
          console.error('❌ Company CSV queue error:', insertErr);
          res.status(500).json({ status: false, message: insertErr.message || 'Failed to queue import' });
        }
        return resolve();
      }

      res.status(400).json({ status: false, message: 'Invalid action. Use "upload" or "insert".' });
      return resolve();
    });
  });
}
