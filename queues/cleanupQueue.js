/**
 * Cleanup Queue - Bull queue for field cleanup jobs
 * Restores mutated fields (id, email) and removes *_original fields
 * 
 * Pattern: Same as emailSentStatusQueue.js / mappingQueue.js
 */

const Queue = require('bull');

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

const cleanupQueue = new Queue('field-cleanup', {
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 50,
    timeout: 0, // No timeout — cleanup on 10cr+ records can take hours
    attempts: 1,
  },
  settings: {
    stalledInterval: 120000, // 2 minutes
    maxStalledCount: 3,
  },
});

cleanupQueue.on('error', (error) => {
  console.error('❌ Cleanup Queue error:', error.message);
});

module.exports = cleanupQueue;
