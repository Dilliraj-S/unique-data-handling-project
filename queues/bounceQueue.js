const Queue = require('bull');

/**
 * Bounce Status Update Queue using Bull Queue
 * Same architecture as emailSentStatusQueue.js
 * Streams emails collection and updates dls_bounce_status in target collection
 */
const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10)
};

const bounceQueue = new Queue('Bounce Status Update', {
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

bounceQueue.isReady().then(() => {
  console.log('✅ Bounce Status Update Queue connected to Redis');
}).catch((error) => {
  console.error('❌ Bounce Status Update Queue Redis connection failed:', error.message);
});

module.exports = bounceQueue;
