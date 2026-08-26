/**
 * GET /api/queues/config
 * Returns queue registry for UI (labels, ids, npm scripts).
 */

const { getRegistry } = require('../../../config/queueRegistry');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  try {
    const config = getRegistry().map((q) => ({
      id: q.id,
      queueName: q.queueName,
      label: q.label,
      workerFile: q.workerFile,
      npmScript: q.npmScript,
    }));
    return res.status(200).json({ success: true, data: config });
  } catch (err) {
    console.error('queues/config error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
