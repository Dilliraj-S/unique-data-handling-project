/**
 * API: Clean up stale Bull queue jobs from Redis
 * 
 * POST /api/queues/cleanup-stale-jobs
 * Body: { queueName?: string }  (default: "Global Email Sync")
 * 
 * Removes completed/stale job data keys that accumulate over time.
 * Safe to run anytime — only deletes job data, not queue metadata.
 */

const RedisRateLimiter = require('../../../services/RedisRateLimiter');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { queueName = 'Global Email Sync' } = req.body || {};
    
    console.log(`🧹 Cleanup requested for queue: "${queueName}"`);
    
    const deletedCount = await RedisRateLimiter.cleanStaleJobs(queueName);

    return res.status(200).json({
      success: true,
      queueName,
      deletedCount,
      message: `Cleaned ${deletedCount} stale job keys from Redis`
    });
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
