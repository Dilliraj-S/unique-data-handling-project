const Queue = require('bull');

/**
 * Email Classify Queue
 * Processes unclassified emails through SmartClassifier
 * Takes emails from the sync (EmailSyncService) and runs classification
 */
const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10)
};

const emailClassifyQueue = new Queue('Email Classify', {
  redis: REDIS_CONFIG,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 100,
    attempts: 3,
    timeout: 60000, // 60s per classification job
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
  settings: {
    stalledInterval: 5 * 60 * 1000,  // 5 minutes
    maxStalledCount: 3,
    lockDuration: 5 * 60 * 1000,     // 5 minutes
  }
});

emailClassifyQueue.isReady().then(() => {
  console.log('✅ Email Classify Queue connected to Redis');
}).catch((error) => {
  console.error('❌ Email Classify Queue Redis connection failed:', error.message);
});

module.exports = emailClassifyQueue;
