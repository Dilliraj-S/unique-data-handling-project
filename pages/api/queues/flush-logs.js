/**
 * POST /api/queues/flush-logs
 * Body: { queueId }
 * Truncates PM2 log files for the specified worker (clears old logs).
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
    const result = await ProcessController.flushWorkerLogs(queueId);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    return res.status(200).json({ success: true, message: 'Logs flushed' });
  } catch (err) {
    console.error('queues/flush-logs error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
