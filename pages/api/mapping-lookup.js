import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

// Disable Next.js default body parsing for multipart/form-data
export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  }
};

/**
 * Mapping Lookup API
 * 
 * POST /api/mapping-lookup
 *   - Upload CSV file + database + collection
 *   - Parses CSV, extracts unique li_company_name values
 *   - Queues a mapping-lookup job
 *   - Returns jobId
 * 
 * GET /api/mapping-lookup?jobId=X
 *   - Poll job progress
 * 
 * GET /api/mapping-lookup?jobId=X&download=true
 *   - Download result CSV file
 */
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ─── GET: Progress Polling or File Download ───
  if (req.method === 'GET') {
    try {
      const { jobId, download } = req.query;

      if (!jobId) {
        return res.status(400).json({ success: false, message: 'jobId is required' });
      }

      const mappingQueue = require('../../queues/mappingQueue');
      const job = await mappingQueue.getJob(jobId);

      if (!job) {
        return res.status(404).json({ success: false, message: 'Job not found' });
      }

      // ─── Download Result CSV (or ZIP if multi-part) ───
      if (download === 'true') {
        const state = await job.getState();
        if (state !== 'completed') {
          return res.status(400).json({ 
            success: false, 
            message: 'Job is not completed yet. Current state: ' + state 
          });
        }

        const result = job.returnvalue;
        if (!result) {
          return res.status(404).json({ success: false, message: 'Result not found' });
        }

        // Collect file paths — support both old single-file and new multi-file format
        const filePaths = result.outputFilePaths || (result.outputFilePath ? [result.outputFilePath] : []);
        
        // Validate all files exist
        const existingPaths = filePaths.filter(fp => fs.existsSync(fp));
        if (existingPaths.length === 0) {
          return res.status(404).json({ success: false, message: 'Result file(s) have been deleted' });
        }

        const baseName = `mapping_results_${result.database}_${result.collection}_${result.totalMatched}records`;

        // ─── Single file: stream CSV directly (backward compatible) ───
        if (existingPaths.length === 1) {
          const fileName = `${baseName}.csv`;
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
          const fileStream = fs.createReadStream(existingPaths[0]);
          fileStream.pipe(res);
          return;
        }

        // ─── Multiple parts: ZIP and stream ───
        const archiver = require('archiver');
        const fileName = `${baseName}.zip`;
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        const archive = archiver('zip', { zlib: { level: 1 } }); // Level 1 = fast compression
        
        archive.on('error', (err) => {
          console.error('Archive error:', err);
          if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Failed to create ZIP' });
          }
        });

        archive.pipe(res);

        for (const fp of existingPaths) {
          archive.file(fp, { name: path.basename(fp) });
        }

        await archive.finalize();
        return;
      }

      // ─── Progress Polling ───
      const state = await job.getState();
      const progress = job._progress || {};
      const result = job.returnvalue || null;
      const failedReason = job.failedReason || null;

      return res.status(200).json({
        success: true,
        jobId: job.id,
        state,
        progress,
        result,
        failedReason,
        data: {
          database: job.data.database,
          collection: job.data.collection,
          totalCompanies: job.data.matchValues?.length || job.data.companyNames?.length || 0
        }
      });
    } catch (error) {
      console.error('Error checking mapping job progress:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // ─── POST: Upload CSV & Queue Job ───
  if (req.method === 'POST') {
    try {
      // Ensure temp directory exists
      const uploadDir = path.join(process.cwd(), 'temp', 'mapping-uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Parse multipart form data
      const form = formidable({
        multiples: false,
        uploadDir,
        keepExtensions: true,
        maxFileSize: 500 * 1024 * 1024 // 500 MB max
      });

      const { fields, files } = await new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) return reject(err);
          resolve({ fields, files });
        });
      });

      // Normalize formidable v3 array values
      const getFieldValue = (obj, key) => {
        const value = obj?.[key];
        return Array.isArray(value) ? value[0] : value;
      };

      const getFirstFile = (fsObj, key) => {
        const value = fsObj?.[key];
        if (!value) return null;
        return Array.isArray(value) ? value[0] : value;
      };

      const database = getFieldValue(fields, 'database');
      const collection = getFieldValue(fields, 'collection');
      const matchField = getFieldValue(fields, 'matchField') || 'li_company_name';

      if (!database) {
        return res.status(400).json({ success: false, message: 'Database is required' });
      }
      if (!collection) {
        return res.status(400).json({ success: false, message: 'Collection is required' });
      }

      const file = getFirstFile(files, 'file') || Object.values(files || {})?.[0] || null;
      if (!file || !file.filepath) {
        return res.status(400).json({ success: false, message: 'CSV file is required' });
      }

      // ─── Parse CSV and extract company names ───
      console.log(`🗺️  Mapping lookup - Parsing CSV: ${file.originalFilename || 'unknown'}`);
      
      const csvContent = fs.readFileSync(file.filepath, 'utf-8');
      const lines = csvContent.split(/\r?\n/).filter(line => line.trim());

      if (lines.length < 2) {
        // Cleanup uploaded file
        try { fs.unlinkSync(file.filepath); } catch (e) { /* ignore */ }
        return res.status(400).json({ 
          success: false, 
          message: 'CSV file is empty or has no data rows' 
        });
      }

      // Parse header row
      const headers = parseCSVRow(lines[0]);
      const matchColIndex = headers.findIndex(
        h => h.trim().toLowerCase() === matchField.toLowerCase()
      );

      if (matchColIndex === -1) {
        // Cleanup uploaded file
        try { fs.unlinkSync(file.filepath); } catch (e) { /* ignore */ }
        return res.status(400).json({ 
          success: false, 
          message: `Column "${matchField}" not found in CSV. Available columns: ${headers.join(', ')}`,
          availableColumns: headers
        });
      }

      // Extract unique match values from the specified column
      const matchValueSet = new Set();
      let totalCsvRows = 0;

      for (let i = 1; i < lines.length; i++) {
        const row = parseCSVRow(lines[i]);
        if (row.length > matchColIndex) {
          const value = row[matchColIndex]?.trim();
          if (value) {
            matchValueSet.add(value);
          }
        }
        totalCsvRows++;
      }

      // Cleanup uploaded file — we've extracted what we need
      try { fs.unlinkSync(file.filepath); } catch (e) { /* ignore */ }

      const matchValues = Array.from(matchValueSet);

      if (matchValues.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: `No valid values found in column "${matchField}"` 
        });
      }

      console.log(`📊 Extracted ${matchValues.length} unique values from ${totalCsvRows} CSV rows (field: ${matchField})`);

      // ─── Queue the mapping job ───
      const mappingQueue = require('../../queues/mappingQueue');
      const jobId = `mapping-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

      const job = await mappingQueue.add('mapping-lookup', {
        matchValues,
        companyNames: matchValues, // Backward compat for running workers
        database,
        collection,
        matchField,
        totalCsvRows,
        originalFileName: file.originalFilename || 'unknown.csv'
      }, {
        jobId
      });

      console.log(`✅ Mapping job ${job.id} queued: ${matchValues.length} unique values → ${database}.${collection}`);

      return res.status(200).json({
        success: true,
        message: 'Mapping lookup job queued',
        jobId: job.id,
        totalCsvRows,
        totalUniqueValues: matchValues.length,
        totalUniqueCompanies: matchValues.length, // Backward compat for frontend
        database,
        collection,
        matchField
      });

    } catch (error) {
      console.error('Error starting mapping lookup:', error);
      return res.status(500).json({ 
        success: false, 
        message: error.message || 'Failed to start mapping lookup' 
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * Parse a single CSV row, handling quoted fields with commas
 */
function parseCSVRow(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // Skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  result.push(current);
  return result;
}
