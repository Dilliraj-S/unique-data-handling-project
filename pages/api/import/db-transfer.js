import { getConnectionConfig } from '../../../src/config/database.js';

const Queue = require('bull');
const JobService = require('../../../services/JobService');

/**
 * Database-to-Database Transfer API
 * 
 * POST: Dispatches a db-transfer job to the dedicated Bull queue
 * The actual transfer is processed by dbtransfer-worker.js
 * 
 * This replaces the old fire-and-forget processTransfer() approach
 * with a proper queue-based architecture for 10 crore+ scale.
 */

const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || null,
  db: parseInt(process.env.REDIS_DB || '0', 10)
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let dbTransferQueue = null;

  try {
    const {
      baseDatabase,
      baseCollection,
      targetDatabase,
      targetCollection,
      mappedColumns,
      type = 'normal',
      transferId
    } = req.body;

    // ── Validation ──
    if (!baseDatabase || !baseCollection || !targetDatabase || !targetCollection) {
      return res.status(400).json({
        status: false,
        message: 'Missing required fields: baseDatabase, baseCollection, targetDatabase, targetCollection'
      });
    }

    if (!mappedColumns || Object.keys(mappedColumns).length === 0) {
      return res.status(400).json({
        status: false,
        message: 'At least one column mapping is required'
      });
    }

    const processId = transferId || Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

    // ── 1. Log process start (creates the process_logs record) ──
    const jobService = new JobService();
    await jobService.logProcessStart({
      process_id: processId,
      user_id: req.headers['x-user-id'] || 'system',
      file: `${targetDatabase}.${targetCollection}`,
      database: baseDatabase,
      table: baseCollection,
      type: 'db-transfer'
    });
    await jobService.disconnect();

    // ── 2. Dispatch to dedicated Bull queue ──
    dbTransferQueue = new Queue('DB Transfer Processing', {
      redis: REDIS_CONFIG
    });

    const job = await dbTransferQueue.add('db-transfer', {
      processId,
      baseDatabase,
      baseCollection,
      targetDatabase,
      targetCollection,
      mappedColumns,
      type
    }, {
      jobId: processId,           // Use processId as jobId for deduplication
      attempts: 2,                // Retry once on failure (resume from checkpoint)
      removeOnComplete: 10,       // Keep last 10 completed jobs
      removeOnFail: false,        // Keep failed jobs for debugging
      timeout: 0,                 // No timeout — large transfers can run for hours
      backoff: {
        type: 'fixed',
        delay: 5000               // 5 second delay before retry
      }
    });

    await dbTransferQueue.close();
    dbTransferQueue = null;

    console.log(`📋 DB transfer job dispatched: ${processId} (Bull Job ID: ${job.id})`);
    console.log(`   ${targetDatabase}.${targetCollection} → ${baseDatabase}.${baseCollection}`);

    // ── 3. Return immediately ──
    return res.status(200).json({
      status: true,
      message: 'Database transfer queued successfully',
      process_id: processId,
      job_id: job.id,
      transfer: {
        from: `${targetDatabase}.${targetCollection}`,
        to: `${baseDatabase}.${baseCollection}`,
        mappings: Object.keys(mappedColumns).length
      }
    });

  } catch (error) {
    console.error('Database transfer dispatch error:', error);

    // Clean up queue connection on error
    if (dbTransferQueue) {
      try { await dbTransferQueue.close(); } catch (e) { /* ignore */ }
    }

    return res.status(500).json({
      status: false,
      message: error.message || 'Failed to queue database transfer'
    });
  }
}
