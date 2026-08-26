const Queue = require('bull');

/**
 * Mapping Lookup Queue using Bull Queue
 * Handles CSV company name matching against MongoDB collections
 * Optimized for large datasets (10 lakh+ rows)
 */
const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10)
};

const mappingQueue = new Queue('Mapping Lookup', {
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
    stalledInterval: 15 * 60 * 1000,  // 15 minutes
    maxStalledCount: 3,
    lockDuration: 60 * 60 * 1000,     // 1 hour lock for very large jobs
  }
});

mappingQueue.isReady().then(() => {
  console.log('✅ Mapping Lookup Queue connected to Redis');
}).catch((error) => {
  console.error('❌ Mapping Lookup Queue Redis connection failed:', error.message);
});

module.exports = mappingQueue;
