/**
 * API: Deduplication
 * 
 * POST /api/deduplicate — Start a deduplicate job
 *   Body: { database, collection }
 *   Returns: { jobId }
 * 
 * GET /api/deduplicate?jobId=xxx — Poll job status
 *   Returns: { status, progress }
 */

import deduplicateQueue from '../../queues/deduplicateQueue';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    return handlePost(req, res);
  } else if (req.method === 'GET') {
    return handleGet(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handlePost(req, res) {
  try {
    const { database, collection, criteria } = req.body;

    if (!database || !collection) {
      return res.status(400).json({ error: 'database and collection are required' });
    }

    // criteria: array of strings like ['email', 'name_company', 'name_domain']
    // If empty or not provided, worker defaults to running all supported cases
    const validCriteria = (criteria || []).filter(c => ['email', 'name_company', 'name_domain'].includes(c));

    console.log(`🔍 Starting deduplicate job for ${database}.${collection} — criteria: ${validCriteria.join(', ') || 'all'}`);

    const job = await deduplicateQueue.add('deduplicate', {
      database,
      collection,
      criteria: validCriteria,
      startedAt: new Date().toISOString()
    }, {
      jobId: `dedup-${database}-${collection}-${Date.now()}`
    });

    console.log(`✅ Deduplicate job queued: ${job.id}`);

    return res.status(200).json({
      success: true,
      jobId: job.id,
      message: `Deduplicate job queued for ${database}.${collection}`
    });

  } catch (error) {
    console.error('❌ Error starting deduplicate job:', error.message);
    return res.status(500).json({ error: error.message });
  }
}

async function handleGet(req, res) {
  try {
    const { jobId } = req.query;

    if (!jobId) {
      return res.status(400).json({ error: 'jobId is required' });
    }

    const job = await deduplicateQueue.getJob(jobId);

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
    console.error('❌ Error polling deduplicate job:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
