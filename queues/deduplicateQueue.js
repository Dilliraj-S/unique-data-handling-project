/**
 * Deduplicate Queue - Bull queue for deduplication jobs
 * Removes duplicate records within a single collection
 * 
 * Pattern: Same as cleanupQueue.js
 */

const Queue = require('bull');

const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

const deduplicateQueue = new Queue('deduplication', {
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 50,
    timeout: 0,
    attempts: 1,
  },
  settings: {
    stalledInterval: 120000,
    maxStalledCount: 3,
  },
});

deduplicateQueue.on('error', (error) => {
  console.error('❌ Deduplicate Queue error:', error.message);
});

module.exports = deduplicateQueue;
