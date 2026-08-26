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
 * Maintenance Queue using Bull Queue
 * Handles heavy maintenance operations like duplicate removal
 * Lowest priority - runs when system is less busy
 * Optimized for very large datasets (1 crore+ records)
 */

// Create maintenance queue with Redis configuration
let maintenanceQueue;
try {
  const queueRedisConfig = {
    ...redisConfig,
    connectTimeout: 5000,
    lazyConnect: true,
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxRetriesPerRequest: 3
  };

  maintenanceQueue = new Queue('Maintenance Operations', {
    redis: queueRedisConfig,
    defaultJobOptions: {
      removeOnComplete: 10,
      removeOnFail: 50,
      attempts: 1, // NO retry — no checkpoint/resume logic. Retry re-runs from record 1.
      backoff: {
        type: 'exponential',
        delay: 10000, // Longer delay for very heavy jobs
      },
      priority: 1, // Lowest priority - runs when system is idle
    },
    settings: {
      lockDuration: 600000,          // 10 minutes — heavy dedup jobs need long lock windows
      lockRenewTime: 300000,         // Renew lock every 5 minutes (must be < lockDuration)
      stalledInterval: 600 * 1000,   // 10 minutes — large dedup jobs can take 30min+ without progress
      maxStalledCount: 0,            // Never auto-retry stalled jobs (prevents double processing)
    }
  });

  maintenanceQueue.isReady().then(() => {
    console.log('✅ Maintenance Queue initialized and connected to Redis');
  }).catch((error) => {
    console.error('❌ Maintenance Queue Redis connection failed:', error.message);
  });

} catch (error) {
  console.error('❌ Failed to initialize Maintenance Queue:', error.message);
  
  maintenanceQueue = {
    add: async () => {
      throw new Error(`Redis connection failed: ${error.message}. Please start Redis server first.`);
    },
    process: null,
    on: () => {},
    close: () => Promise.resolve(),
    isReady: () => Promise.reject(error)
  };
}

console.log('📦 MaintenanceQueue module loaded - processing handled by maintenance-queue-worker.js');

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down maintenance queue...');
  await maintenanceQueue.close();
  process.exit(0);
});

module.exports = maintenanceQueue;

