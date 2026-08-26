/**
 * ProcessController - Start/stop queue worker processes via PM2.
 * Used by Queue Control Center API for "Start" / "Stop" actions.
 * If PM2 is not installed or not running, process control APIs return pm2Available: false.
 *
 * Worker script path: use process.cwd() so under PM2 (cwd set in ecosystem.config.cjs)
 * we resolve to the real project dir. __dirname-based getProjectRoot() can be wrong
 * when Next.js runs from .next/server (e.g. resolves to C:\ROOT).
 */

const path = require('path');
const fs = require('fs');
const { getById, getProjectRoot, getTriggerPm2Name } = require('../config/queueRegistry');

/** Project root for worker cwd/script: prefer process.cwd() (set by PM2), fallback to config */
function getWorkerProjectRoot() {
  const cwd = process.cwd();
  if (cwd && cwd !== '/' && cwd.length > 1) return cwd;
  return getProjectRoot();
}

let pm2 = null;
let pm2Available = false;

try {
  pm2 = require('pm2');
  pm2Available = true;
} catch (e) {
  // PM2 not installed
}

function isPm2Available() {
  return pm2Available;
}

function connectPm2() {
  return new Promise((resolve, reject) => {
    if (!pm2) {
      return resolve(false);
    }
    pm2.connect((err) => {
      if (err) {
        console.warn('ProcessController: pm2.connect failed', err.message);
        return resolve(false);
      }
      resolve(true);
    });
  });
}

const PM2_APP_PREFIX = 'queue-worker:';

function getPm2Name(queueId) {
  return PM2_APP_PREFIX + queueId;
}

async function listWorkers() {
  if (!pm2) return { pm2Available: false, processes: [] };
  const connected = await connectPm2();
  if (!connected) return { pm2Available: true, connected: false, processes: [] };

  return new Promise((resolve) => {
    pm2.list((err, list) => {
      if (err) {
        return resolve({ pm2Available: true, connected: true, error: err.message, processes: [] });
      }

      // Aggregate by queueId so multiple PM2 instances for the same worker
      // (e.g. queue-worker:email-delivery x 3) are represented as a single entry
      // with instanceCount / runningInstances.
      const byQueue = new Map();

      (list || [])
        .filter((p) => p.name && p.name.startsWith(PM2_APP_PREFIX))
        .forEach((p) => {
          const queueId = p.name.replace(PM2_APP_PREFIX, '');
          const status = p.pm2_env?.status || 'unknown';

          const existing = byQueue.get(queueId) || {
            name: p.name,
            queueId,
            instanceCount: 0,
            runningInstances: 0,
            status: 'stopped',
            pid: null,
            memory: null,
            cpu: null,
            uptime: 0,
          };

          existing.instanceCount += 1;
          if (status === 'online') {
            existing.runningInstances += 1;
            existing.status = 'online';
          }

          // Aggregate metrics across all instances (sum memory, max uptime)
          const procMemory = p.monit?.memory || 0;
          const procUptime = p.pm2_env?.pm_uptime ? Date.now() - p.pm2_env.pm_uptime : 0;
          existing.memory = (existing.memory || 0) + procMemory;
          existing.uptime = Math.max(existing.uptime || 0, procUptime);
          if (!existing.pid) {
            existing.pid = p.pid;
            existing.cpu = p.monit?.cpu;
          }

          byQueue.set(queueId, existing);
        });

      resolve({
        pm2Available: true,
        connected: true,
        processes: Array.from(byQueue.values()),
      });
    });
  });
}

async function getWorkerStatus(queueId) {
  const { processes } = await listWorkers();
  const proc = processes.find((p) => p.queueId === queueId);
  return proc
    ? {
        running: proc.status === 'online',
        pid: proc.pid,
        memory: proc.memory,
        cpu: proc.cpu,
        uptime: proc.uptime,
        instanceCount: proc.instanceCount || 0,
        runningInstances: proc.runningInstances || 0,
      }
    : { running: false, pid: null, instanceCount: 0, runningInstances: 0 };
}

async function startWorker(queueId, instancesRequested) {
  const entry = getById(queueId);
  if (!entry) return { success: false, error: 'Unknown queue id' };
  if (!pm2) return { success: false, error: 'PM2 is not installed. Install with: npm i -g pm2', pm2Available: false };

  const connected = await connectPm2();
  if (!connected) return { success: false, error: 'Could not connect to PM2 daemon. Run "pm2 start ecosystem.config.cjs" first to start the app with PM2, or run "pm2 kill" then "pm2 start ecosystem.config.cjs" to restart the daemon.', pm2Available: true };

  const root = getWorkerProjectRoot();
  const scriptPath = path.resolve(root, entry.workerFile);
  if (!fs.existsSync(scriptPath)) {
    return { success: false, error: `Worker file not found: ${entry.workerFile} at ${scriptPath}. (Project root used: ${root})` };
  }
  const name = getPm2Name(queueId);
  const maxInstances = typeof entry.maxInstances === 'number' && entry.maxInstances > 0 ? entry.maxInstances : 1;
  const defaultInstances =
    typeof entry.defaultInstances === 'number' && entry.defaultInstances > 0 ? entry.defaultInstances : 1;

  // Clamp requested instances between 1 and maxInstances
  let desiredInstances =
    typeof instancesRequested === 'number' && !Number.isNaN(instancesRequested) && instancesRequested > 0
      ? instancesRequested
      : defaultInstances;
  if (desiredInstances > maxInstances) desiredInstances = maxInstances;
  if (desiredInstances < 1) desiredInstances = 1;

  return new Promise((resolve) => {
    pm2.list((err, list) => {
      if (err) {
        const msg = err.message || err.errmsg || err.msg || 'Failed to list PM2 processes';
        return resolve({ success: false, error: msg });
      }

      const sameName = (list || []).filter((p) => p.name === name);
      const exists = sameName.length > 0;
      const anyOnline = sameName.some((p) => (p.pm2_env?.status || 'stopped') === 'online');

      const startFresh = () => {
        pm2.start(
          {
            name,
            script: scriptPath,
            cwd: root,
            interpreter: 'node',
            max_old_space_size: 8192,
            node_args: '--max-old-space-size=8192',
            exec_mode: 'fork',
            instances: desiredInstances,
            merge_logs: false, // Each instance gets its own log file
          },
          (startErr) => {
            if (startErr) {
              const msg = startErr.message || startErr.errmsg || startErr.msg || 'Failed to start worker';
              return resolve({ success: false, error: msg });
            }
            resolve({ success: true, instances: desiredInstances });
          }
        );
      };

      if (!exists) {
        // No app with this name yet → start it
        startFresh();
      } else if (!anyOnline) {
        // App exists but all instances are stopped → delete then start clean
        pm2.delete(name, (delErr) => {
          if (delErr) {
            const msg = delErr.message || delErr.errmsg || delErr.msg || 'Failed to reset stopped worker';
            return resolve({ success: false, error: msg });
          }
          startFresh();
        });
      } else {
        // Scale existing online app to desired number of instances
        pm2.scale(name, desiredInstances, (scaleErr) => {
          if (scaleErr) {
            const msg = scaleErr.message || scaleErr.errmsg || scaleErr.msg || 'Failed to scale worker';
            return resolve({ success: false, error: msg });
          }
          resolve({ success: true, instances: desiredInstances });
        });
      }
    });
  });
}

async function stopWorker(queueId) {
  if (!pm2) return { success: false, error: 'PM2 is not installed', pm2Available: false };
  const connected = await connectPm2();
  if (!connected) return { success: false, error: 'Could not connect to PM2 daemon', pm2Available: true };

  const name = getPm2Name(queueId);

  return new Promise((resolve) => {
    pm2.stop(name, (err) => {
      if (err) {
        return resolve({ success: false, error: err.message || 'Failed to stop worker' });
      }
      resolve({ success: true });
    });
  });
}

async function deleteWorker(queueId) {
  if (!pm2) return { success: false, error: 'PM2 is not installed', pm2Available: false };
  const connected = await connectPm2();
  if (!connected) return { success: false, error: 'Could not connect to PM2 daemon', pm2Available: true };

  const name = getPm2Name(queueId);
  return new Promise((resolve) => {
    pm2.delete(name, (err) => {
      if (err) {
        return resolve({ success: false, error: err.message || 'Failed to delete worker' });
      }
      resolve({ success: true });
    });
  });
}

// ---------- Trigger (job feeder) for queues like global-email-sync ----------
async function listTriggers() {
  if (!pm2) return { processes: [] };
  const connected = await connectPm2();
  if (!connected) return { processes: [] };
  const triggerPrefix = 'queue-trigger:';
  return new Promise((resolve) => {
    pm2.list((err, list) => {
      if (err) return resolve({ processes: [] });
      const processes = (list || [])
        .filter((p) => p.name && p.name.startsWith(triggerPrefix))
        .map((p) => ({
          name: p.name,
          queueId: p.name.replace(triggerPrefix, ''),
          pid: p.pid,
          status: p.pm2_env?.status || 'unknown',
        }));
      resolve({ processes });
    });
  });
}

async function startTrigger(queueId) {
  const entry = getById(queueId);
  if (!entry || !entry.triggerScript) return { success: false, error: 'Queue has no trigger or unknown queue' };
  if (!pm2) return { success: false, error: 'PM2 is not installed', pm2Available: false };
  const connected = await connectPm2();
  if (!connected) return { success: false, error: 'Could not connect to PM2 daemon', pm2Available: true };

  const root = getWorkerProjectRoot();
  const scriptPath = path.resolve(root, entry.triggerScript);
  if (!fs.existsSync(scriptPath)) {
    return { success: false, error: `Trigger script not found: ${entry.triggerScript} at ${scriptPath}` };
  }
  const name = getTriggerPm2Name(queueId);

  return new Promise((resolve) => {
    pm2.start(
      {
        name,
        script: scriptPath,
        args: entry.triggerArgs || [],
        cwd: root,
        interpreter: 'node',
      },
      (err) => {
        if (err) {
          return resolve({ success: false, error: err.message || err.errmsg || 'Failed to start trigger' });
        }
        resolve({ success: true });
      }
    );
  });
}

async function stopTrigger(queueId) {
  if (!pm2) return { success: false, error: 'PM2 is not installed', pm2Available: false };
  const connected = await connectPm2();
  if (!connected) return { success: false, error: 'Could not connect to PM2 daemon', pm2Available: true };
  const name = getTriggerPm2Name(queueId);
  return new Promise((resolve) => {
    pm2.stop(name, (err) => {
      if (err) return resolve({ success: false, error: err.message || 'Failed to stop trigger' });
      resolve({ success: true });
    });
  });
}

/** Get last N lines of worker stdout log from PM2 log path.
 * If multiple PM2 instances exist for the same queue (scaled workers),
 * we aggregate logs from all instances and annotate them with worker/pid.
 */
async function getWorkerLogs(queueId, lines = 200) {
  if (!pm2) return { error: 'PM2 not available', logs: [] };
  const connected = await connectPm2();
  if (!connected) return { error: 'PM2 daemon not connected', logs: [] };

  const name = getPm2Name(queueId);
  return new Promise((resolve) => {
    pm2.describe(name, (err, procList) => {
      if (err || !procList || procList.length === 0) {
        return resolve({ error: 'Process not found or not running', logs: [] });
      }

      // Filter only processes that have a log path
      const withLogs = procList
        .map((p, index) => {
          const pm2Env = p.pm2_env || {};
          const logPath = pm2Env.pm_out_log_path || pm2Env.pm_log_path;
          return {
            index: index + 1,
            pid: p.pid,
            status: pm2Env.status || 'unknown',
            logPath,
          };
        })
        .filter((p) => p.logPath && fs.existsSync(p.logPath));

      if (withLogs.length === 0) {
        return resolve({ error: 'Log file not found', logs: [] });
      }

      const perWorkerLines = Math.max(10, Math.floor(lines / withLogs.length));
      const aggregated = [];

      try {
        withLogs.forEach((proc) => {
          aggregated.push(
            `===== Worker #${proc.index} (pid ${proc.pid}, status ${proc.status}) — ${proc.logPath} =====`
          );
          const content = fs.readFileSync(proc.logPath, 'utf8');
          const allLines = content.split(/\r?\n/).filter(Boolean);
          const lastLines = allLines.slice(-Math.min(perWorkerLines, allLines.length));
          aggregated.push(...lastLines);
          aggregated.push(''); // blank separator
        });

        return resolve({ logs: aggregated });
      } catch (e) {
        return resolve({ error: e.message, logs: aggregated });
      }
    });
  });
}

/** Flush (truncate) PM2 log files for a worker so old logs are cleared */
async function flushWorkerLogs(queueId) {
  if (!pm2) return { success: false, error: 'PM2 not available' };
  const connected = await connectPm2();
  if (!connected) return { success: false, error: 'PM2 daemon not connected' };

  const name = getPm2Name(queueId);
  return new Promise((resolve) => {
    pm2.flush(name, (err) => {
      if (err) {
        return resolve({ success: false, error: err.message || 'Failed to flush logs' });
      }
      resolve({ success: true });
    });
  });
}

module.exports = {
  isPm2Available,
  listWorkers,
  getWorkerStatus,
  startWorker,
  stopWorker,
  deleteWorker,
  listTriggers,
  startTrigger,
  stopTrigger,
  getWorkerLogs,
  flushWorkerLogs,
};
