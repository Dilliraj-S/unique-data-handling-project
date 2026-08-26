/**
 * API: Field Cleanup
 * 
 * POST /api/cleanup-fields — Start a cleanup job
 *   Body: { database, collection }
 *   Returns: { jobId }
 * 
 * GET /api/cleanup-fields?jobId=xxx — Poll job status
 *   Returns: { status, progress }
 */

import cleanupQueue from '../../queues/cleanupQueue';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    return handlePost(req, res);
  } else if (req.method === 'GET') {
    return handleGet(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * POST: Start a cleanup job
 */
async function handlePost(req, res) {
  try {
    const { database, collection } = req.body;

    if (!database || !collection) {
      return res.status(400).json({ error: 'database and collection are required' });
    }

    console.log(`🧹 Starting cleanup job for ${database}.${collection}`);

    // Add job to queue
    const job = await cleanupQueue.add('field-cleanup', {
      database,
      collection,
      startedAt: new Date().toISOString()
    }, {
      jobId: `cleanup-${database}-${collection}-${Date.now()}`
    });

    console.log(`✅ Cleanup job queued: ${job.id}`);

    return res.status(200).json({
      success: true,
      jobId: job.id,
      message: `Cleanup job queued for ${database}.${collection}`
    });

  } catch (error) {
    console.error('❌ Error starting cleanup job:', error.message);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * GET: Poll job status
 */
async function handleGet(req, res) {
  try {
    const { jobId } = req.query;

    if (!jobId) {
      return res.status(400).json({ error: 'jobId is required' });
    }

    const job = await cleanupQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const state = await job.getState();
    const progress = job.progress() || {};
    const result = job.returnvalue;
    const failedReason = job.failedReason;

    return res.status(200).json({
      jobId: job.id,
      status: state,
      progress,
      result: state === 'completed' ? result : null,
      error: state === 'failed' ? failedReason : null
    });

  } catch (error) {
    console.error('❌ Error polling cleanup job:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
