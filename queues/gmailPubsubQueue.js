const Queue = require('bull');

// Load Redis config (same pattern as exportQueue, audienceQueue)
let redisConfig;
try {
  const { redisConfig: config } = require('../config/redis');
  redisConfig = config;
} catch (error) {
  console.warn('⚠️ Redis config not found for Gmail PubSub queue, using default');
  redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || null,
    db: process.env.REDIS_DB || 0,
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
    lazyConnect: true,
  };
}

/**
 * Gmail Pub/Sub Queue
 * Processes Gmail push notifications from Pub/Sub.
 * Each job represents a notification for one Gmail account.
 */
const gmailPubsubQueue = new Queue('Gmail PubSub', {
  redis: { ...redisConfig },
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 200,
    attempts: 3,
    timeout: 120000, // 2 minutes (history.list + message fetch)
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
  },
  settings: {
    stalledInterval: 5 * 60 * 1000,
    maxStalledCount: 3,
    lockDuration: 5 * 60 * 1000,
  }
});

gmailPubsubQueue.isReady().then(() => {
  console.log('✅ Gmail PubSub Queue connected to Redis');
}).catch((error) => {
  console.error('❌ Gmail PubSub Queue Redis connection failed:', error.message);
});

module.exports = gmailPubsubQueue;
