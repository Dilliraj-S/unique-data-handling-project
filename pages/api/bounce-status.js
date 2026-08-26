/**
 * Bounce Status Update API
 * 
 * POST /api/bounce-status — Start a background job to update dls_bounce_status
 * GET  /api/bounce-status?jobId=X — Get job progress
 * 
 * Request body (POST):
 * {
 *   database: string,       // Target database name
 *   collection: string,     // Target collection name
 *   batchSize: number       // Optional, default 5000
 * }
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

  // ─── GET: Job Progress ───
  if (req.method === 'GET') {
    try {
      const { jobId } = req.query;
      if (!jobId) {
        return res.status(400).json({ success: false, message: 'jobId is required' });
      }

      const bounceQueue = require('../../queues/bounceQueue');
      const job = await bounceQueue.getJob(jobId);

      if (!job) {
        return res.status(404).json({ success: false, message: 'Job not found' });
      }

      const state = await job.getState();
      const progress = job._progress || 0;
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
          batchSize: job.data.batchSize
        }
      });
    } catch (error) {
      console.error('Error checking bounce job progress:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // ─── POST: Start Update Job ───
  if (req.method === 'POST') {
    try {
      const { database, collection, batchSize = 5000, campaignId = null, campaignName = null } = req.body;

      // Validate inputs
      if (!database) {
        return res.status(400).json({ success: false, message: 'Database is required' });
      }
      if (!collection) {
        return res.status(400).json({ success: false, message: 'Collection is required' });
      }

      // Add job to queue
      const bounceQueue = require('../../queues/bounceQueue');
      const job = await bounceQueue.add('update-bounce-status', {
        database,
        collection,
        batchSize: Number(batchSize),
        campaignId: campaignId ? String(campaignId) : null,
        campaignName: campaignName || null
      }, {
        jobId: `bounce-status-${Date.now()}`
      });

      console.log(`✅ Bounce job ${job.id} queued for ${database}.${collection}`);

      return res.status(200).json({
        success: true,
        message: `Bounce status update job started for ${database}.${collection}`,
        jobId: job.id,
        database,
        collection,
        batchSize: Number(batchSize)
      });

    } catch (error) {
      console.error('Error starting bounce status update:', error);
      return res.status(500).json({ 
        success: false, 
        message: error.message || 'Failed to start bounce update job' 
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
