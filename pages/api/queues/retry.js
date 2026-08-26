/**
 * POST /api/queues/retry
 * Body: { queueId, jobId? }
 * If jobId omitted, retries all failed jobs in the queue.
 */

const QueueManagerService = require('../../../services/QueueManagerService');
const { getById } = require('../../../config/queueRegistry');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  try {
    const queueId = req.body?.queueId || req.query?.queueId;
    const jobId = req.body?.jobId ?? req.query?.jobId;
    if (!queueId) {
      return res.status(400).json({ success: false, error: 'queueId is required' });
    }
    if (!getById(queueId)) {
      return res.status(400).json({ success: false, error: 'Unknown queue id' });
    }
    const result = await QueueManagerService.retryFailed(queueId, jobId || null);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    return res.status(200).json({
      success: true,
      message: result.retried != null ? `Retried ${result.retried} job(s)` : 'Job retried',
      retried: result.retried,
    });
  } catch (err) {
    console.error('queues/retry error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
