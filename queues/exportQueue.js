const Queue = require('bull');

/**
 * Export CSV Queue using Bull Queue
 * Handles server-side CSV export for large datasets (2L–2Cr records)
 * Uses cursor-based streaming to avoid memory overflow
 */
const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10)
};

const exportQueue = new Queue('CSV Export', {
  redis: REDIS_CONFIG,
  defaultJobOptions: {
    removeOnComplete: 50,   // Keep last 50 completed jobs for download
    removeOnFail: 50,
    attempts: 2,
    timeout: 0,             // No timeout — large exports can take long
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
  settings: {
    stalledInterval: 15 * 60 * 1000,  // 15 minutes
    maxStalledCount: 2,
    lockDuration: 2 * 60 * 60 * 1000, // 2 hour lock for very large exports
  }
});

exportQueue.isReady().then(() => {
  console.log('✅ CSV Export Queue connected to Redis');
}).catch((error) => {
  console.error('❌ CSV Export Queue Redis connection failed:', error.message);
});

module.exports = exportQueue;
