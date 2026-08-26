const Queue = require('bull');
const path = require('path');

// Load Redis config with error handling
let redisConfig;
try {
  const { redisConfig: config } = require('../config/redis');
  redisConfig = config;
} catch (error) {
  console.warn('⚠️ Redis config not found, using default settings');
  redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || null,
    db: process.env.REDIS_DB || 0,
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
    lazyConnect: true
  };
}

/**
 * Audience Queue using Bull Queue
 * Handles bulk audience assignment processing in background
 * Optimized for large datasets (10M to 50M records)
 * Lower priority than CSV imports, higher than maintenance
 */

// Create audience queue with Redis configuration
let audienceQueue;
try {
  const queueRedisConfig = {
    ...redisConfig,
    connectTimeout: 5000,
    lazyConnect: true,
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxRetriesPerRequest: 3
  };

  audienceQueue = new Queue('Bulk Audience Assignment', {
    redis: queueRedisConfig,
    defaultJobOptions: {
      removeOnComplete: 10,
      removeOnFail: 50,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000, // Longer delay for heavy jobs
      },
      priority: 3, // Lower priority than CSV imports (5), higher than maintenance (1)
    },
    settings: {
      stalledInterval: 60 * 1000,    // 60 seconds for heavy jobs
      maxStalledCount: 1,
    }
  });

  audienceQueue.isReady().then(() => {
    console.log('✅ Audience Queue initialized and connected to Redis');
  }).catch((error) => {
    console.error('❌ Audience Queue Redis connection failed:', error.message);
  });

} catch (error) {
  console.error('❌ Failed to initialize Audience Queue:', error.message);
  
  audienceQueue = {
    add: async () => {
      throw new Error(`Redis connection failed: ${error.message}. Please start Redis server first.`);
    },
    process: null,
    on: () => {},
    close: () => Promise.resolve(),
    isReady: () => Promise.reject(error)
  };
}

console.log('📦 AudienceQueue module loaded - processing handled by audience-queue-worker.js');

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down audience queue...');
  await audienceQueue.close();
  process.exit(0);
});

module.exports = audienceQueue;

