/**
 * GET /api/queues/failed?queueId=...&limit=50
 * Returns failed jobs for a queue.
 */

const QueueManagerService = require('../../../services/QueueManagerService');
const { getById } = require('../../../config/queueRegistry');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  try {
    const queueId = req.query?.queueId;
    const limit = Math.min(parseInt(req.query?.limit || '50', 10) || 50, 200);
    if (!queueId) {
      return res.status(400).json({ success: false, error: 'queueId is required' });
    }
    if (!getById(queueId)) {
      return res.status(400).json({ success: false, error: 'Unknown queue id' });
    }
    const result = await QueueManagerService.getFailedJobs(queueId, limit);
    if (result.error) {
      return res.status(400).json({ success: false, error: result.error });
    }
    return res.status(200).json({ success: true, data: { jobs: result.jobs } });
  } catch (err) {
    console.error('queues/failed error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
