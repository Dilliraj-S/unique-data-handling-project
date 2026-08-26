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

const ImportService = require('../services/ImportService');

/**
 * Import Queue using Bull Queue
 * Handles CSV import processing in background with Redis persistence
 * Optimized for large datasets (1 crore+ records)
 */

// Create import queue with Redis configuration and error handling
let importQueue;
try {
  // Add connection timeout and lazy connection
  const queueRedisConfig = {
    ...redisConfig,
    connectTimeout: 5000,
    lazyConnect: true,
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxRetriesPerRequest: 3
  };

  importQueue = new Queue('CSV Import Processing', {
    redis: queueRedisConfig,
    defaultJobOptions: {
      removeOnComplete: 10, // Keep only 10 completed jobs
      removeOnFail: 50,     // Keep 50 failed jobs for debugging
      attempts: 3,          // Retry failed jobs 3 times
      priority: 5,          // Higher priority than audience (3) and maintenance (1)
      // CRITICAL FIX: No job timeout for large imports (1 crore records can take hours)
      timeout: 0,           // 0 = no timeout (jobs can run indefinitely)
      backoff: {
        type: 'exponential',
        delay: 2000,        // Start with 2 second delay
      },
    },
    settings: {
      // CRITICAL FIX: Extended stalled interval for large imports
      // Large imports processing 5000 records per batch can take several minutes per batch
      // Set to 10 minutes to prevent false stalled detection
      stalledInterval: 10 * 60 * 1000,  // 10 minutes (was 30 seconds)
      maxStalledCount: 3,                // Allow 3 stalled detections before failing (was 1)
      // Add lock duration for long-running jobs
      lockDuration: 30 * 60 * 1000,     // 30 minutes lock duration (prevents other workers from taking job)
    }
  });

  // Test connection asynchronously
  importQueue.isReady().then(() => {
    console.log('✅ Bull Queue initialized and connected to Redis');
  }).catch((error) => {
    console.error('❌ Bull Queue Redis connection failed:', error.message);
  });

} catch (error) {
  console.error('❌ Failed to initialize Bull Queue:', error.message);
  console.log('💡 Make sure Redis is running on localhost:6379');
  
  // Create a stub queue that will fail gracefully
  importQueue = {
    add: async () => {
      throw new Error(`Redis connection failed: ${error.message}. Please start Redis server first.`);
    },
    process: null, // Set to null to prevent processing setup
    on: () => {},
    close: () => Promise.resolve(),
    isReady: () => Promise.reject(error)
  };
}

// Note: Job processing is now handled in queue-worker.js to avoid duplicate handlers
console.log('📦 ImportQueue module loaded - processing handled by worker');

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down import queue...');
  await importQueue.close();
  process.exit(0);
});

module.exports = importQueue;
