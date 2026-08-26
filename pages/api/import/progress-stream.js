/**
 * Import Progress Stream API (Server-Sent Events)
 * 
 * Provides real-time progress updates for ongoing imports using SSE.
 * Use this instead of polling for better performance and instant updates.
 * 
 * Usage: GET /api/import/progress-stream?process_id=<id>
 */

const JobService = require('../../../services/JobService');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { process_id } = req.query;

  if (!process_id) {
    return res.status(400).json({ error: 'Missing process_id parameter' });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.flushHeaders();

  const jobService = new JobService();
  let isClientConnected = true;
  let lastStatus = null;
  let updateCount = 0;

  // Handle client disconnect
  req.on('close', () => {
    isClientConnected = false;
    console.log(`[SSE] Client disconnected: ${process_id}`);
  });

  // Send initial connection event
  res.write(`event: connected\ndata: {"process_id": "${process_id}"}\n\n`);

  // Poll MongoDB and push updates
  const sendUpdate = async () => {
    if (!isClientConnected) return false;
    
    try {
      const processStatus = await jobService.getProcessStatus(process_id);
      
      let progressData;
      if (processStatus) {
        progressData = {
          processed: processStatus.progress.inserted_count + processStatus.progress.rejected_count + (processStatus.progress.removed_count || 0) || 0,
          total: processStatus.progress.total || 0,
          inserted_rows: processStatus.progress.inserted_count || 0,
          rejected_rows: processStatus.progress.rejected_count || 0,
          percentage: processStatus.progress.percentage || 0,
          status: processStatus.status,
          message: `Status: ${processStatus.status}`,
          updated_at: processStatus.updated_at
        };
      } else {
        progressData = {
          processed: 0,
          total: 0,
          percentage: 0,
          status: 'unknown',
          message: 'Import not found'
        };
      }

      // Only send if status changed or first update
      const currentStatus = JSON.stringify(progressData);
      if (currentStatus !== lastStatus || updateCount === 0) {
        res.write(`data: ${currentStatus}\n\n`);
        lastStatus = currentStatus;
        updateCount++;
      }

      // Check if completed
      if (progressData.status === 'completed' || 
          progressData.status === 'failed' || 
          progressData.status === 'cancelled' ||
          progressData.status === 'unknown') {
        // Send final event
        res.write(`event: done\ndata: ${currentStatus}\n\n`);
        return false; // Stop polling
      }

      return true; // Continue polling
    } catch (error) {
      console.error(`[SSE] Error fetching progress for ${process_id}:`, error.message);
      res.write(`event: error\ndata: {"error": "${error.message}"}\n\n`);
      return false;
    }
  };

  // Polling loop - 500ms interval for real-time feel
  const pollInterval = 500;
  const maxDuration = 30 * 60 * 1000; // 30 minute max connection
  const startTime = Date.now();

  while (isClientConnected && (Date.now() - startTime) < maxDuration) {
    const shouldContinue = await sendUpdate();
    if (!shouldContinue) break;
    await new Promise(r => setTimeout(r, pollInterval));
  }

  // Cleanup
  await jobService.disconnect();
  res.end();
}

// Disable body parsing for SSE
export const config = {
  api: {
    bodyParser: false,
  },
};
