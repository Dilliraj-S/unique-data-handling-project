const Queue = require('bull');

/**
 * Sync Action Queue
 * Processes post-classification actions (suppression, campaign stats, subscriber updates)
 * Fed by email-classify-worker after SmartClassifier runs
 */
const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10)
};

const syncActionQueue = new Queue('Sync Action', {
  redis: REDIS_CONFIG,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 100,
    attempts: 3,
    timeout: 30000, // 30s per action job
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
  settings: {
    stalledInterval: 5 * 60 * 1000,
    maxStalledCount: 3,
    lockDuration: 5 * 60 * 1000,
  }
});

syncActionQueue.isReady().then(() => {
  console.log('✅ Sync Action Queue connected to Redis');
}).catch((error) => {
  console.error('❌ Sync Action Queue Redis connection failed:', error.message);
});

module.exports = syncActionQueue;
