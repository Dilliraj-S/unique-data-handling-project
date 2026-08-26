/**
 * Simple Queue Status API
 * Shows queue statistics without full Bull Board
 */

export default async function handler(req, res) {
  try {
    // Import queue with error handling
    let importQueue;
    try {
      importQueue = require('../../../queues/importQueue');
    } catch (error) {
      return res.status(500).json({
        error: 'Queue not available',
        message: 'Redis connection failed. Please start Redis server.',
        details: error.message
      });
    }

    // Get queue statistics
    const waiting = await importQueue.getWaiting();
    const active = await importQueue.getActive();
    const completed = await importQueue.getCompleted();
    const failed = await importQueue.getFailed();
    const delayed = await importQueue.getDelayed();

    const stats = {
      name: 'CSV Import Processing',
      counts: {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        total: waiting.length + active.length + completed.length + failed.length + delayed.length
      },
      jobs: {
        active: active.map(job => ({
          id: job.id,
          data: {
            transferId: job.data.transferId,
            table: job.data.table,
            database: job.data.database
          },
          progress: job.progress(),
          processedOn: job.processedOn,
          timestamp: job.timestamp
        })),
        recent_completed: completed.slice(-5).map(job => ({
          id: job.id,
          data: {
            transferId: job.data.transferId,
            table: job.data.table,
            database: job.data.database
          },
          finishedOn: job.finishedOn,
          returnvalue: job.returnvalue
        })),
        recent_failed: failed.slice(-5).map(job => ({
          id: job.id,
          data: {
            transferId: job.data.transferId,
            table: job.data.table,
            database: job.data.database
          },
          failedReason: job.failedReason,
          finishedOn: job.finishedOn
        }))
      }
    };

    res.status(200).json({
      success: true,
      queue_status: 'connected',
      redis_status: 'connected',
      stats
    });

  } catch (error) {
    console.error('Queue status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get queue status',
      message: error.message
    });
  }
}
