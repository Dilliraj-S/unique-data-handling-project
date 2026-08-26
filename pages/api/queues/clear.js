/**
 * POST /api/queues/clear
 * Body: { queueId, type }
 * type: 'waiting' | 'completed' | 'failed' | 'delayed' | 'all'
 */

const QueueManagerService = require('../../../services/QueueManagerService');
const { getById } = require('../../../config/queueRegistry');

const ALLOWED_TYPES = ['waiting', 'completed', 'failed', 'delayed', 'all'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  try {
    const queueId = req.body?.queueId || req.query?.queueId;
    let type = req.body?.type ?? req.query?.type ?? 'waiting';
    if (!queueId) {
      return res.status(400).json({ success: false, error: 'queueId is required' });
    }
    if (!ALLOWED_TYPES.includes(type)) {
      return res.status(400).json({ success: false, error: `type must be one of: ${ALLOWED_TYPES.join(', ')}` });
    }
    if (!getById(queueId)) {
      return res.status(400).json({ success: false, error: 'Unknown queue id' });
    }
    const result = await QueueManagerService.clearQueue(queueId, type);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    return res.status(200).json({ success: true, message: `Cleared ${type} jobs` });
  } catch (err) {
    console.error('queues/clear error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
