/**
 * POST /api/queues/pause
 * Body: { queueId }
 * Pauses the Bull queue (stops processing new jobs).
 */

const QueueManagerService = require('../../../services/QueueManagerService');
const { getById } = require('../../../config/queueRegistry');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  try {
    const queueId = req.body?.queueId || req.query?.queueId;
    if (!queueId) {
      return res.status(400).json({ success: false, error: 'queueId is required' });
    }
    if (!getById(queueId)) {
      return res.status(400).json({ success: false, error: 'Unknown queue id' });
    }
    const result = await QueueManagerService.pauseQueue(queueId);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    return res.status(200).json({ success: true, message: 'Queue paused' });
  } catch (err) {
    console.error('queues/pause error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
