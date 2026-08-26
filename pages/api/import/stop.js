import { redis } from '../../../config/redis';

/**
 * Stop/Cancel import process - Bull Queue version
 * POST /api/import/stop
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { transfer_id } = req.body;

    if (!transfer_id) {
      return res.status(400).json({ 
        error: 'Missing transfer_id parameter' 
      });
    }

    // Get progress from Redis
    const progressData = await redis.get(`import_progress:${transfer_id}`);
    
    if (!progressData) {
      return res.status(404).json({ 
        error: 'Transfer not found' 
      });
    }

    const progress = JSON.parse(progressData);

    if (progress.status !== 'processing') {
      return res.status(400).json({ 
        error: 'Import is not currently running' 
      });
    }

    // Get Bull Queue and find the job
    const importQueue = require('../../../queues/importQueue');
    
    // Find and remove the job
    const jobs = await importQueue.getJobs(['active', 'waiting', 'delayed']);
    const job = jobs.find(j => j.data.transferId === transfer_id);
    
    if (job) {
      await job.remove();
      console.log(`🛑 Cancelled job: ${job.id} for transfer: ${transfer_id}`);
    }

    // Update progress status in Redis
    const updatedProgress = {
      ...progress,
      status: 'stopped',
      completed_at: new Date().toISOString(),
      message: 'Import cancelled by user'
    };

    await redis.setex(
      `import_progress:${transfer_id}`, 
      3600, 
      JSON.stringify(updatedProgress)
    );

    return res.status(200).json({
      status: true,
      message: 'Import stopped successfully',
      transfer_id
    });

  } catch (error) {
    console.error('Stop import error:', error);
    return res.status(500).json({ 
      error: 'Failed to stop import', 
      details: error.message 
    });
  }
}
