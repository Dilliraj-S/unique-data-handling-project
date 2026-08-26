const Queue = require('bull');

/**
 * Open Status Sync Queue using Bull Queue
 * Periodically syncs email opens from email_campaign_logs → source collections
 * Catches opens that happen hours/days after campaign completes
 */
const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10)
};

const openStatusSyncQueue = new Queue('Open Status Sync', {
  redis: REDIS_CONFIG,
  defaultJobOptions: {
    removeOnComplete: 20,
    removeOnFail: 50,
    attempts: 3,
    timeout: 0,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
  },
  settings: {
    stalledInterval: 15 * 60 * 1000,
    maxStalledCount: 3,
    lockDuration: 60 * 60 * 1000,
  }
});

openStatusSyncQueue.isReady().then(() => {
  console.log('✅ Open Status Sync Queue connected to Redis');
}).catch((error) => {
  console.error('❌ Open Status Sync Queue Redis connection failed:', error.message);
});

module.exports = openStatusSyncQueue;
