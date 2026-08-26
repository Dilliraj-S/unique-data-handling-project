/**
 * Download File API
 * Serves files from public/uploads/ and public/exports/ directories.
 * 
 * This is needed because Next.js in production mode (next start / PM2)
 * does NOT serve files from public/ that were created AFTER `npm run build`.
 * Export/upload files are generated at runtime by workers, so they need
 * to be served via this API route instead of relying on static file serving.
 * 
 * Usage: /api/download-file?path=exports/flow/export_123.csv
 */

import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    responseLimit: false, // Allow large file downloads
  },
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ status: false, message: 'Method not allowed' });
  }

  const filePath = req.query.path;

  if (!filePath) {
    return res.status(400).json({ status: false, message: 'Missing "path" query parameter' });
  }

  // Security: prevent directory traversal attacks
  const normalizedPath = path.normalize(filePath).replace(/\\/g, '/');
  if (normalizedPath.includes('..') || normalizedPath.startsWith('/') || normalizedPath.startsWith('\\')) {
    return res.status(403).json({ status: false, message: 'Invalid file path' });
  }

  // Only allow files from uploads/ and exports/ directories
  if (!normalizedPath.startsWith('uploads/') && !normalizedPath.startsWith('exports/')) {
    return res.status(403).json({ status: false, message: 'Access denied. Only uploads/ and exports/ files are allowed.' });
  }

  const absolutePath = path.join(process.cwd(), 'public', normalizedPath);

  // Verify file exists
  if (!fs.existsSync(absolutePath)) {
    console.error(`❌ Download file not found: ${absolutePath}`);
    return res.status(404).json({ status: false, message: 'File not found' });
  }

  // Verify it's a file (not a directory)
  const stats = fs.statSync(absolutePath);
  if (!stats.isFile()) {
    return res.status(400).json({ status: false, message: 'Path is not a file' });
  }

  // Determine content type based on extension
  const ext = path.extname(absolutePath).toLowerCase();
  const contentTypes = {
    '.csv': 'text/csv',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xls': 'application/vnd.ms-excel',
    '.zip': 'application/zip',
    '.json': 'application/json',
    '.txt': 'text/plain',
  };

  const contentType = contentTypes[ext] || 'application/octet-stream';
  const fileName = path.basename(absolutePath);

  // Set headers for file download
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-Length', stats.size);

  // Stream the file to the response
  const fileStream = fs.createReadStream(absolutePath);
  fileStream.pipe(res);

  fileStream.on('error', (err) => {
    console.error(`❌ Error streaming file: ${err.message}`);
    if (!res.headersSent) {
      res.status(500).json({ status: false, message: 'Error reading file' });
    }
  });
}
