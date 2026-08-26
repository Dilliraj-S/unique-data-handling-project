import { redis } from '../../../config/redis';

/**
 * Import Progress API
 * Returns progress data for ongoing imports
 * Compatible with Bull Queue, Redis storage, and process_logs (like BV project)
 */

const JobService = require('../../../services/JobService');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { process_id } = req.query;

  if (!process_id) {
    return res.status(400).json({
      error: 'Missing process_id parameter'
    });
  }

  try {
    const jobService = new JobService();
    let progressData = null;
    
    // Try to get progress from process_logs first (like BV project)
    const processStatus = await jobService.getProcessStatus(process_id);
    
    if (processStatus) {
      progressData = {
        processed: processStatus.progress.inserted_count + processStatus.progress.rejected_count + (processStatus.progress.removed_count || 0) || 0,
        total: processStatus.progress.total || 0,
        inserted_rows: processStatus.progress.inserted_count || 0,
        rejected_rows: processStatus.progress.rejected_count || 0,
        removed_count: processStatus.progress.removed_count || 0,
        percentage: processStatus.progress.percentage || 0,
        message: `Status: ${processStatus.status}`,
        status: processStatus.status,
        rejected_file_path: processStatus.progress.rejected_file_path || null,
        created_at: processStatus.created_at,
        updated_at: processStatus.updated_at
      };
    } else {
      // Fallback to Redis if available
      if (global.redis) {
        const redisData = await global.redis.get(`import_progress:${process_id}`);
        if (redisData) {
          progressData = JSON.parse(redisData);
        }
      }
    }

    // CRITICAL FIX: If no data found, check if process_logs exists with 'pending' status
    // This handles case where job is queued but worker hasn't started yet
    if (!progressData) {
      // Re-check process_logs (might have been created after initial check)
      const pendingProcess = await jobService.getProcessStatus(process_id);
      
      if (pendingProcess && pendingProcess.status === 'pending') {
        // Job is queued, return pending status (don't return 'unknown')
        progressData = {
          processed: 0,
          total: 0,
          inserted_rows: 0,
          rejected_rows: 0,
          removed_count: 0,
          percentage: 0,
          message: 'Job queued, waiting to start...',
          status: 'pending'
        };
      } else {
        // Truly unknown or completed
      progressData = {
        processed: 0,
        total: 0,
        inserted_rows: 0,
        rejected_rows: 0,
          removed_count: 0,
        percentage: 0,
        message: 'Import not found or completed',
        status: 'unknown'
      };
      }
    }

    await jobService.disconnect();

    return res.status(200).json({
      success: true,
      process_id,
      progress: progressData,
      source: processStatus ? 'process_logs' : 'redis'
    });

  } catch (error) {
    console.error('Progress check error:', error);
    return res.status(500).json({ 
      error: 'Failed to get progress', 
      details: error.message 
    });
  }
}
