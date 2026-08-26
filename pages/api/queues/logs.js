/**
 * GET /api/queues/logs?queueId=...&lines=200
 * Returns last N lines of worker stdout log (from PM2).
 */

const ProcessController = require('../../../services/ProcessController');
const { getById } = require('../../../config/queueRegistry');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  try {
    const queueId = req.query?.queueId;
    const lines = Math.min(parseInt(req.query?.lines || '200', 10) || 200, 1000);
    if (!queueId) return res.status(400).json({ success: false, error: 'queueId is required' });
    if (!getById(queueId)) return res.status(400).json({ success: false, error: 'Unknown queue id' });
    const result = await ProcessController.getWorkerLogs(queueId, lines);
    if (result.error && result.logs.length === 0) {
      return res.status(200).json({ success: true, data: { logs: [], error: result.error } });
    }
    return res.status(200).json({ success: true, data: { logs: result.logs || [] } });
  } catch (err) {
    console.error('queues/logs error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
