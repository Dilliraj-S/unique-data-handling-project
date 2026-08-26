const Queue = require('bull');

/**
 * Email Sent Status Update Queue using Bull Queue
 * Uses same simple Redis config as working email-sync-worker.js
 * Optimized for large datasets (up to 10 crore records)
 */
const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10)
};

const emailSentStatusQueue = new Queue('Email Sent Status Update', {
  redis: REDIS_CONFIG,
  defaultJobOptions: {
    removeOnComplete: 20,
    removeOnFail: 50,
    attempts: 3,
    timeout: 0, // No timeout — large datasets can take hours
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
  },
  settings: {
    stalledInterval: 15 * 60 * 1000,  // 15 minutes
    maxStalledCount: 3,
    lockDuration: 60 * 60 * 1000,     // 1 hour lock for very large jobs
  }
});

emailSentStatusQueue.isReady().then(() => {
  console.log('✅ Email Sent Status Queue connected to Redis');
}).catch((error) => {
  console.error('❌ Email Sent Status Queue Redis connection failed:', error.message);
});

module.exports = emailSentStatusQueue;
