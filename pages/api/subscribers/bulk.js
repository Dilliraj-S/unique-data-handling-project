import { authMiddleware } from '../../../src/server/Http/Middleware/auth';
import { getCollection } from '../../../src/lib/mongodb';
import { Long } from 'mongodb';
import { getNextNumericValue, sanitizeSubscriberPayload, toLong } from '../audiences/helpers';
// Note: Using audienceQueue for subscriber imports (handled by audience-queue-worker.js)
import SubscriberImportService from '../../../services/SubscriberImportService';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  let user;
  try {
    user = await authMiddleware(req);
    // Ensure user object has required fields
    if (!user || (!user.user_id && !user.id)) {
      console.error('❌ Invalid user object from authMiddleware:', user);
      return res.status(401).json({
        status: false,
        message: 'Invalid user authentication'
      });
    }
  } catch (error) {
    console.error('❌ Authentication error:', error.message);
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

  const { audience_id: audienceId, subscribers = [], file_path: filePath, source_table = null, source_system = null } = req.body || {};

  let numericAudienceId;
  try {
    numericAudienceId = toLong(audienceId);
  } catch (error) {
    return res.status(400).json({
      status: false,
      message: 'A valid audience identifier is required.'
    });
  }

  // Validate audience exists
  try {
    const audiencesCollection = await getCollection('audiences', 'pluto');
    const audience = await audiencesCollection.findOne({
      id: numericAudienceId,
      $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
    });

    if (!audience) {
      return res.status(404).json({
        status: false,
        message: 'Audience not found.'
      });
    }
  } catch (error) {
    console.error('Failed to validate audience:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to validate audience.'
    });
  }

  const userId = user.user_id || user.id;

  // If file path is provided, use queue-based processing (audience queue)
  if (filePath && fs.existsSync(filePath)) {
    try {
      const audienceQueue = require('../../../queues/audienceQueue');
      const jobId = uuidv4();
      await audienceQueue.add('subscriber-import', {
        jobId,
        audienceId: numericAudienceId.toString(),
        filePath,
        userId,
        sourceTable: source_table,
        sourceSystem: source_system,
        chunkSize: 5000
      }, {
        jobId,
        priority: 3, // Lower priority than CSV imports (5), higher than maintenance (1)
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      });

      return res.status(202).json({
        status: true,
        message: 'Subscriber import queued for processing.',
        jobId,
        queued: true
      });
    } catch (error) {
      console.error('Failed to queue subscriber import:', error);
      return res.status(500).json({
        status: false,
        message: error.message || 'Failed to queue import job.'
      });
    }
  }

  // Process subscribers array - always use queue (Bull/Redis), even for small batches
  const cleanedSubscribers = subscribers
    .map(sanitizeSubscriberPayload)
    .filter(Boolean);

  if (!cleanedSubscribers.length) {
    return res.status(422).json({
      status: false,
      message: 'At least one subscriber with a valid email is required.'
    });
  }

  try {
    // Save subscribers to temporary CSV file
    const tempDir = path.join(process.cwd(), 'temp', 'subscriber-imports');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const fileId = uuidv4();
    const tempFilePath = path.join(tempDir, `${fileId}.csv`);
    
    // Write CSV file compatible with SubscriberImportService.processCsvFile
    const csvContent = [
      'first_name,last_name,email',
      ...cleanedSubscribers.map(s => 
        `"${(s.first_name || '').replace(/"/g, '""')}","${(s.last_name || '').replace(/"/g, '""')}","${(s.email || '').replace(/"/g, '""')}"`
      )
    ].join('\n');

    fs.writeFileSync(tempFilePath, csvContent, 'utf8');

    const audienceQueue = require('../../../queues/audienceQueue');
    const jobId = uuidv4();
    await audienceQueue.add('subscriber-import', {
      jobId,
      audienceId: numericAudienceId.toString(),
      filePath: tempFilePath,
      userId,
      sourceTable: source_table,
      sourceSystem: source_system,
      chunkSize: 5000
    }, {
      jobId,
      priority: 3, // Lower priority than CSV imports (5), higher than maintenance (1)
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });

    return res.status(202).json({
      status: true,
      message: `Import (${cleanedSubscribers.length} subscribers) queued for background processing.`,
      jobId,
      queued: true,
      total: cleanedSubscribers.length
    });
  } catch (error) {
    console.error('Failed to queue subscriber import:', error);
    return res.status(500).json({
      status: false,
      message: error.message || 'Failed to queue import job.'
    });
  }
}

