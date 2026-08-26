import { authMiddleware } from '../../../src/server/Http/Middleware/auth';
import { v4 as uuidv4 } from 'uuid';
// Note: Using audienceQueue for subscriber imports (handled by audience-queue-worker.js)
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

// Disable Next.js default body parsing for multipart/form-data
export const config = {
  api: {
    bodyParser: false
  }
};

/**
 * Upload CSV for subscriber import
 * - Saves file to temp directory
 * - Queues Bull "subscriber-import" job for background processing
 */
export default async function handler(req, res) {
  let user;
  try {
    user = await authMiddleware(req);
  } catch (error) {
    return res.status(401).json({
      status: false,
      message: error.message || 'Authentication required'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      status: false,
      message: 'Method not allowed'
    });
  }

  try {
    // Ensure temp directory exists
    const uploadDir = path.join(process.cwd(), 'temp', 'subscriber-imports');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Parse multipart/form-data with formidable (v3+ usage)
    const form = formidable({
      multiples: false,
      uploadDir,
      keepExtensions: true,
      maxFileSize: 200 * 1024 * 1024 // 200 MB
    });

    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve({ fields, files });
      });
    });

    // Formidable v3+ returns fields/files that may be arrays; normalize them
    const getFieldValue = (obj, key) => {
      const value = obj?.[key];
      if (Array.isArray(value)) {
        return value[0];
      }
      return value;
    };

    const getFirstFile = (fsObj, key) => {
      const value = fsObj?.[key];
      if (!value) return null;
      if (Array.isArray(value)) return value[0];
      return value;
    };

    const audienceId =
      getFieldValue(fields, 'audience_id') || getFieldValue(fields, 'audienceId');
    const format = getFieldValue(fields, 'format') || 'first-email';
    const sourceTable = getFieldValue(fields, 'source_table') || null;
    const sourceSystem = getFieldValue(fields, 'source_system') || null;

    let file =
      getFirstFile(files, 'file') ||
      getFirstFile(files, 'csv') ||
      Object.values(files || {})[0] ||
      null;

    if (!audienceId) {
      return res.status(400).json({
        status: false,
        message: 'Audience ID is required'
      });
    }

    if (!file || !file.filepath) {
      return res.status(400).json({
        status: false,
        message: 'CSV file is required'
      });
    }

    const filePath = file.filepath;

    // Queue subscriber-import job (audience queue)
    const audienceQueue = require('../../../queues/audienceQueue');
    const jobId = uuidv4();
    const userId = user.user_id || user.id || null;

    await audienceQueue.add(
      'subscriber-import',
      {
        jobId,
        audienceId: String(audienceId),
        filePath,
        userId,
        format,
        sourceTable,
        sourceSystem,
        chunkSize: 5000
      },
      {
        jobId,
        priority: 3, // Lower priority than CSV imports (5), higher than maintenance (1)
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      }
    );

    return res.status(202).json({
      status: true,
      message: 'CSV import queued for background processing',
      queued: true,
      jobId
    });
  } catch (error) {
    console.error('Failed to queue CSV subscriber import:', error);
    return res.status(500).json({
      status: false,
      message: error.message || 'Failed to queue CSV import'
    });
  }
}


