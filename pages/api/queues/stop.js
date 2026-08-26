/**
 * POST /api/queues/stop
 * Body: { queueId }
 * Stops the worker process via PM2.
 */

const ProcessController = require('../../../services/ProcessController');
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
    const result = await ProcessController.stopWorker(queueId);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        pm2Available: result.pm2Available,
      });
    }
    return res.status(200).json({ success: true, message: 'Worker stopped' });
  } catch (err) {
    console.error('queues/stop error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
