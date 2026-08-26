/**
 * GET /api/queues/status
 * Returns all queues with Bull stats, process status (PM2), trigger status, and active jobs.
 */

const QueueManagerService = require('../../../services/QueueManagerService');
const ProcessController = require('../../../services/ProcessController');
const { getRegistry } = require('../../../config/queueRegistry');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  try {
    const registry = getRegistry();
    const [processList, triggerList] = await Promise.all([
      ProcessController.listWorkers(),
      ProcessController.listTriggers(),
    ]);
    const processMap = new Map(
      (processList.processes || []).map((p) => [p.queueId, p])
    );
    const triggerMap = new Map(
      (triggerList.processes || []).map((p) => [p.queueId, p])
    );

    const queues = await Promise.all(
      registry.map(async (entry) => {
        const [stats, activeJobsResult] = await Promise.all([
          QueueManagerService.getQueueStats(entry.id),
          QueueManagerService.getActiveJobs(entry.id, 5),
        ]);
        const proc = processMap.get(entry.id) || null;
        const triggerProc = triggerMap.get(entry.id) || null;
        return {
          id: entry.id,
          label: entry.label,
          queueName: entry.queueName,
          npmScript: entry.npmScript,
          triggerScript: entry.triggerScript || null,
          triggerLabel: entry.triggerLabel || null,
          defaultInstances: entry.defaultInstances || 1,
          maxInstances: entry.maxInstances || 1,
          counts: stats.counts || { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
          total: stats.total != null ? stats.total : 0,
          isPaused: stats.isPaused || false,
          statsError: stats.error || null,
          activeJobs: (activeJobsResult.jobs || []).map((j) => ({
            id: j.id,
            progress: j.progress,
            name: j.name,
          })),
          process: proc
            ? {
                running: proc.status === 'online',
                pid: proc.pid,
                memory: proc.memory,
                cpu: proc.cpu,
                uptime: proc.uptime,
                instanceCount: proc.instanceCount || 0,
                runningInstances: proc.runningInstances || 0,
              }
            : { running: false, pid: null, memory: null, cpu: null, uptime: 0, instanceCount: 0, runningInstances: 0 },
          trigger: entry.triggerScript
            ? (triggerProc
                ? { running: triggerProc.status === 'online', pid: triggerProc.pid }
                : { running: false, pid: null })
            : null,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: {
        queues,
        pm2Available: ProcessController.isPm2Available(),
        pm2Connected: processList.connected === true,
      },
    });
  } catch (err) {
    console.error('queues/status error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
