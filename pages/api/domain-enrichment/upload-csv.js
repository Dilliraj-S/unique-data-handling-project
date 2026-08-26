import { authMiddleware } from '../../../src/server/Http/Middleware/auth';
import { getCollection } from '../../../src/lib/mongodb';
import { generateUniqueId } from '../../../src/utils/unique-generator';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

// Disable Next.js default body parsing for multipart/form-data
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Upload CSV file containing domains/SMTPs for bulk domain enrichment
 * 
 * CSV Format:
 *   - First row may be header (e.g., "SMTP") - will be skipped
 *   - Each subsequent row contains one domain/SMTP
 * 
 * Supports large files (10k-100k records) by processing in chunks
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: false, message: 'Method not allowed' });
  }

  try {
    let user;
    try {
      user = await authMiddleware(req);
    } catch (error) {
      return res.status(401).json({ status: false, message: error.message || 'Unauthorized' });
    }

    // Ensure temp directory exists
    const uploadDir = path.join(process.cwd(), 'temp', 'domain-enrichment');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Parse multipart/form-data
    const form = formidable({
      multiples: false,
      uploadDir,
      keepExtensions: true,
      maxFileSize: 200 * 1024 * 1024, // 200 MB
      filter: ({ mimetype }) => {
        return mimetype && (mimetype.includes('csv') || mimetype.includes('text') || mimetype.includes('excel'));
      },
    });

    const [fields, files] = await form.parse(req);

    if (!files.file || !files.file[0]) {
      return res.status(400).json({
        status: false,
        title: 'No File',
        message: 'Please upload a CSV file.',
      });
    }

    const file = files.file[0];
    const filePath = file.filepath;

    // Parse CSV and extract domains
    const domains = [];
    let isFirstRow = true;
    let headerSkipped = false;

    await new Promise((resolve, reject) => {
      const stream = fs.createReadStream(filePath);
      
      stream
        .pipe(csv({ headers: false, skipEmptyLines: true })) // No headers, read as arrays, skip empty lines
        .on('data', (row) => {
          // Get first column value (CSV may have single column or multiple)
          // csv-parser returns row as object with numeric keys when headers: false
          const firstValue = row['0'] || row[0] || Object.values(row)[0] || '';
          const domain = String(firstValue || '').trim();

          // Skip empty rows
          if (!domain || domain.length === 0) return;

          // Skip header row if it's "SMTP" or looks like a header
          if (isFirstRow) {
            isFirstRow = false;
            const lowerDomain = domain.toLowerCase();
            if (lowerDomain === 'smtp' || lowerDomain === 'domain' || lowerDomain === 'domains' || lowerDomain === 'email') {
              headerSkipped = true;
              return;
            }
          }

          // Normalize domain (remove http://, https://, www.)
          const normalized = domain
            .replace(/^https?:\/\//i, '')
            .replace(/^www\./i, '')
            .split('/')[0] // Remove paths
            .split('?')[0] // Remove query strings
            .split('#')[0] // Remove fragments
            .trim();

          // Basic validation: domain should have at least a dot (e.g., example.com)
          if (normalized && normalized.length > 0 && normalized.includes('.')) {
            domains.push(normalized);
          }
        })
        .on('end', () => {
          resolve();
        })
        .on('error', (err) => {
          reject(err);
        });
    });

    // Clean up temp file
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      console.warn('Failed to delete temp file:', e.message);
    }

    if (domains.length === 0) {
      return res.status(400).json({
        status: false,
        title: 'No Domains Found',
        message: 'CSV file is empty or contains no valid domains. Please ensure the file has at least one domain per row.',
      });
    }

    // Remove duplicates
    const uniqueDomains = [...new Set(domains)];

    if (uniqueDomains.length === 0) {
      return res.status(400).json({
        status: false,
        title: 'No Valid Domains',
        message: 'No valid domains found after processing CSV.',
      });
    }

    // Create batch
    const batchId = generateUniqueId('DEB', 8);
    const now = new Date();
    const userId = user.user_id || null;

    const jobsCollection = await getCollection('domain_enrichment_jobs', 'automation');

    // Process in chunks to handle large files efficiently
    const CHUNK_SIZE = 1000;
    let totalInserted = 0;
    const chunks = [];

    for (let i = 0; i < uniqueDomains.length; i += CHUNK_SIZE) {
      chunks.push(uniqueDomains.slice(i, i + CHUNK_SIZE));
    }

    // Insert chunks sequentially to avoid overwhelming MongoDB
    for (const chunk of chunks) {
      const docs = chunk.map((domain) => ({
        batch_id: batchId,
        job_id: generateUniqueId('DEJ', 10),
        domain: domain,
        status: 'pending',
        attempts: 0,
        error: null,
        created_at: now,
        updated_at: now,
        created_by: userId,
        updated_by: userId,
      }));

      await jobsCollection.insertMany(docs);
      totalInserted += docs.length;
    }

    return res.status(200).json({
      status: true,
      title: 'CSV Uploaded Successfully',
      message: `Processed ${uniqueDomains.length} unique domains from CSV (${domains.length} total rows${headerSkipped ? ', header skipped' : ''}). Created ${totalInserted} jobs in batch ${batchId}.`,
      batch_id: batchId,
      total_jobs: totalInserted,
      unique_domains: uniqueDomains.length,
      total_rows: domains.length,
      header_skipped: headerSkipped,
    });
  } catch (error) {
    console.error('CSV upload error:', error);
    return res.status(500).json({
      status: false,
      title: 'Upload Failed',
      message: error.message || 'Failed to process CSV file.',
    });
  }
}

