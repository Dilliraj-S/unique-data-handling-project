import { authMiddleware } from '../../../src/server/Http/Middleware/auth';
import importQueue from '../../../queues/importQueue';

/**
 * Import job progress endpoint
 * Returns Bull job state and progress for subscriber/CSV imports
 */
export default async function handler(req, res) {
  let user;
  try {
    user = await authMiddleware(req);
  } catch (error) {
    return res.status(401).json({
      status: false,
      message: error.message || 'Authentication required'
    });
  }

  const {
    query: { jobId }
  } = req;

  if (req.method !== 'GET') {
    return res.status(405).json({
      status: false,
      message: 'Method not allowed'
    });
  }

  if (!jobId) {
    return res.status(400).json({
      status: false,
      message: 'Job ID is required'
    });
  }

  try {
    const job = await importQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        status: false,
        message: 'Job not found'
      });
    }

    const state = await job.getState();
    const progress = job._progress || 0;
    const result = job.returnvalue || null;

    return res.status(200).json({
      status: true,
      jobId,
      state,
      progress,
      result
    });
  } catch (error) {
    console.error('Failed to fetch import job status:', error);
    return res.status(500).json({
      status: false,
      message: error.message || 'Failed to fetch job status'
    });
  }
}


