/**
 * QueueManagerService - Central service for Bull queue control.
 * Used by Queue Control Center API: stats, pause, resume, clear, retry.
 * Does not start/stop processes (handled by ProcessController/PM2).
 *
 * IMPORTANT: Uses static require() paths so Next.js/turbopack can bundle them.
 * Dynamic require(path.join(...)) fails with "expression is too dynamic".
 */

const Queue = require('bull');
const { getById, getRegistry } = require('../config/queueRegistry');

let redisConfig;
try {
  const { redisConfig: config } = require('../config/redis');
  redisConfig = config;
} catch (e) {
  redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  };
}

const queueInstances = new Map();

/** Static queue loader - literal paths so bundler can resolve them (services/ is one level up from queues/) */
function loadQueueModule(queueId) {
  switch (queueId) {
    case 'csv-import':
      return require('../queues/importQueue.js');
    case 'audience':
      return require('../queues/audienceQueue.js');
    case 'maintenance':
      return require('../queues/maintenanceQueue.js');
    case 'mapping':
      return require('../queues/mappingQueue.js');
    case 'cleanup':
      return require('../queues/cleanupQueue.js');
    case 'deduplicate':
      return require('../queues/deduplicateQueue.js');
    case 'open-sync':
      return require('../queues/openStatusSyncQueue.js');
    case 'filter-export':
      return require('../queues/exportQueue.js');
    case 'gmail-pubsub':
      return require('../queues/gmailPubsubQueue.js');
    case 'email-sent-status':
      return require('../queues/emailSentStatusQueue.js');
    case 'bounce-status':
      return require('../queues/bounceQueue.js');
    default:
      return null;
  }
}

function getQueue(queueId) {
  const entry = getById(queueId);
  if (!entry) return { error: 'Unknown queue id', queue: null };

  const cached = queueInstances.get(queueId);
  if (cached) return { queue: cached, entry };

  let queue = loadQueueModule(queueId);
  if (!queue) {
    try {
      queue = new Queue(entry.queueName, {
        redis: { ...redisConfig },
        createClient: undefined,
      });
    } catch (err) {
      console.warn(`QueueManagerService: create Queue(${entry.queueName}) failed`, err.message);
      return { error: err.message, queue: null, entry };
    }
  }
  queueInstances.set(queueId, queue);
  return { queue, entry };
}

async function getQueueStats(queueId) {
  const { queue, error } = getQueue(queueId);
  if (error || !queue) {
    return { error: error || 'Queue not available', counts: null, isPaused: false };
  }
  try {
    const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
      queue.isPaused(),
    ]);
    return {
      counts: { waiting, active, completed, failed, delayed },
      isPaused: paused,
      total: waiting + active + completed + failed + delayed,
    };
  } catch (err) {
    return { error: err.message, counts: null, isPaused: false };
  }
}

/** Get currently active jobs for real-time progress (id, progress %, data summary) */
async function getActiveJobs(queueId, limit = 10) {
  const { queue, error } = getQueue(queueId);
  if (error || !queue) return { error: error || 'Queue not available', jobs: [] };
  try {
    const active = await queue.getActive();
    const jobs = active.slice(0, limit).map((j) => ({
      id: j.id,
      progress: typeof j.progress === 'function' ? j.progress() : j.progress,
      data: j.data,
      name: j.name,
    }));
    return { jobs };
  } catch (err) {
    return { error: err.message, jobs: [] };
  }
}

async function pauseQueue(queueId) {
  const { queue, error } = getQueue(queueId);
  if (error || !queue) return { success: false, error: error || 'Queue not available' };
  try {
    await queue.pause();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function resumeQueue(queueId) {
  const { queue, error } = getQueue(queueId);
  if (error || !queue) return { success: false, error: error || 'Queue not available' };
  try {
    await queue.resume();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function clearQueue(queueId, type = 'waiting') {
  const { queue, error } = getQueue(queueId);
  if (error || !queue) return { success: false, error: error || 'Queue not available' };
  try {
    if (type === 'all') {
      await queue.obliterate({ force: true });
    } else {
      const bullType = type === 'waiting' ? 'wait' : type;
      await queue.clean(0, bullType);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function retryFailed(queueId, jobId = null) {
  const { queue, error } = getQueue(queueId);
  if (error || !queue) return { success: false, error: error || 'Queue not available' };
  try {
    if (jobId) {
      const job = await queue.getJob(jobId);
      if (!job) return { success: false, error: 'Job not found' };
      await job.retry();
      return { success: true, retried: 1 };
    }
    const failed = await queue.getFailed();
    for (const job of failed) {
      await job.retry();
    }
    return { success: true, retried: failed.length };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function getFailedJobs(queueId, limit = 50) {
  const { queue, error } = getQueue(queueId);
  if (error || !queue) return { error: error || 'Queue not available', jobs: [] };
  try {
    const failed = await queue.getFailed(0, limit - 1);
    const jobs = failed.map((j) => ({
      id: j.id,
      data: j.data,
      failedReason: j.failedReason,
      timestamp: j.timestamp,
      processedOn: j.processedOn,
      finishedOn: j.finishedOn,
    }));
    return { jobs };
  } catch (err) {
    return { error: err.message, jobs: [] };
  }
}

function getAllQueuesConfig() {
  return getRegistry();
}

module.exports = {
  getQueue,
  getQueueStats,
  getActiveJobs,
  pauseQueue,
  resumeQueue,
  clearQueue,
  retryFailed,
  getFailedJobs,
  getAllQueuesConfig,
};
