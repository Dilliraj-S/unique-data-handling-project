/**
 * POST /api/queues/start-trigger
 * Body: { queueId }
 * Starts the job-feeder (trigger) process for queues that have one (e.g. global-email-sync = emails:init-sync:global:daemon).
 */

const ProcessController = require('../../../services/ProcessController');
const { getById } = require('../../../config/queueRegistry');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  try {
    const queueId = req.body?.queueId || req.query?.queueId;
    if (!queueId) return res.status(400).json({ success: false, error: 'queueId is required' });
    const entry = getById(queueId);
    if (!entry) return res.status(400).json({ success: false, error: 'Unknown queue id' });
    if (!entry.triggerScript) return res.status(400).json({ success: false, error: 'This queue has no trigger' });
    const result = await ProcessController.startTrigger(queueId);
    if (!result.success) return res.status(400).json({ success: false, error: result.error });
    return res.status(200).json({ success: true, message: 'Trigger started' });
  } catch (err) {
    console.error('queues/start-trigger error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
