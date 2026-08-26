/**
 * Process Logs API
 * View import process logs (like BV project)
 */

const JobService = require('../../../services/JobService');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id, limit = 10 } = req.query;
    const jobService = new JobService();

    let processes;
    if (user_id) {
      processes = await jobService.getUserProcesses(user_id, parseInt(limit));
    } else {
      // Get all processes (admin view)
      await jobService.connect();
      processes = await jobService.db.collection('process_logs')
        .find({})
        .sort({ created_at: -1 })
        .limit(parseInt(limit))
        .toArray();
    }

    // Get job statistics
    const stats = await jobService.getJobStats();
    
    await jobService.disconnect();

    return res.status(200).json({
      success: true,
      processes,
      stats,
      total: processes.length
    });

  } catch (error) {
    console.error('Process logs API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch process logs',
      message: error.message
    });
  }
}
