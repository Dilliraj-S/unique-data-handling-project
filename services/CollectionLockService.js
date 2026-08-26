/**
 * Collection Lock Service
 * Provides per-collection locking for sequential CSV import processing.
 * 
 * Purpose: Ensure only one import job runs at a time per collection,
 * while still allowing parallel imports to different collections.
 * 
 * Uses Redis for distributed locking (works across multiple workers).
 */

const Redis = require('ioredis');

class CollectionLockService {
  constructor() {
    this.redis = null;
    this.lockPrefix = 'csv_import_lock:';
    this.waitingPrefix = 'csv_import_waiting:';
    this.lockTTL = 5 * 60 * 1000; // 5 minutes — heartbeat refreshes every 30s, so 5 min means the process is dead
    this.pollInterval = 1000; // Check lock every 1 second
  }

  /**
   * Initialize Redis connection
   */
  async connect() {
    if (this.redis) return;

    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    };

    this.redis = new Redis(redisConfig);
    
    this.redis.on('error', (err) => {
      console.error('CollectionLock Redis error:', err.message);
    });

    await this.redis.connect();
    console.log('🔒 CollectionLockService connected to Redis');
  }

  /**
   * Generate lock key for a collection
   * @param {string} database - Database name
   * @param {string} table - Collection/table name
   * @returns {string} Lock key
   */
  getLockKey(database, table) {
    return `${this.lockPrefix}${database}:${table}`;
  }

  /**
   * Acquire a lock for a collection
   * Blocks until the lock is available (other job finishes)
   * 
   * @param {string} database - Database name
   * @param {string} table - Collection/table name  
   * @param {string} jobId - Unique job identifier
   * @param {number} maxWaitTime - Maximum time to wait in ms (default 4 hours)
   * @returns {Promise<boolean>} True if lock acquired
   */
  async acquireLock(database, table, jobId, maxWaitTime = 4 * 60 * 60 * 1000) {
    await this.connect();
    
    const lockKey = this.getLockKey(database, table);
    const lockValue = `${jobId}:${Date.now()}`;
    const startTime = Date.now();

    console.log(`🔒 [${jobId}] Attempting to acquire lock for ${database}.${table}`);

    while (true) {
      // Try to acquire lock using SETNX (atomic set-if-not-exists)
      // PX = expiry in ms, NX = set only if not exists
      const acquired = await this.redis.set(
        lockKey, 
        lockValue, 
        'PX', 
        this.lockTTL, 
        'NX'
      );

      if (acquired === 'OK') {
        console.log(`✅ [${jobId}] Lock acquired for ${database}.${table}`);
        return true;
      }

      // Lock is held by someone - check who
      const currentHolder = await this.redis.get(lockKey);
      
      if (!currentHolder) {
        // Lock was just released, try again immediately
        continue;
      }

      const [holderId, holderTimestamp] = currentHolder.split(':');

      // STALE LOCK DETECTION: If the lock holder's timestamp is older than 2x TTL,
      // the holder is dead (crashed without releasing). Force-release and take the lock.
      const lockAge = Date.now() - parseInt(holderTimestamp || '0');
      if (lockAge > this.lockTTL * 2) {
        console.warn(`🔓 [${jobId}] Stale lock detected on ${database}.${table} — held by ${holderId} for ${Math.round(lockAge / 1000)}s (TTL=${Math.round(this.lockTTL / 1000)}s). Auto-releasing...`);
        await this.redis.del(lockKey);
        // Loop back to try acquiring
        continue;
      }

      // CRITICAL FIX: Handle re-entrant locking / crash recovery
      // If WE already hold the lock (e.g. from previous attempt that crashed),
      // we should reclaim it and proceed.
      if (holderId === jobId) {
        console.warn(`♻️ [${jobId}] Lock already held by this job (recovery/retry) - reclaiming lock`);
        
        // Refresh the lock (update TTL and timestamp)
        await this.redis.set(
          lockKey, 
          lockValue, 
          'PX', 
          this.lockTTL
        );
        return true;
      }
      
      // Check if we've been waiting too long
      const waitedTime = Date.now() - startTime;
      if (waitedTime >= maxWaitTime) {
        console.error(`⏰ [${jobId}] Timeout waiting for lock on ${database}.${table} after ${Math.round(waitedTime / 1000)}s`);
        throw new Error(`Lock acquisition timeout for ${database}.${table}`);
      }

      // Log waiting status (throttled)
      if (waitedTime % 10000 < this.pollInterval) { // Every ~10 seconds
        console.log(`⏳ [${jobId}] Waiting for ${database}.${table} lock (held by ${holderId}, waited ${Math.round(waitedTime / 1000)}s)`);
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, this.pollInterval));
    }
  }

  /**
   * Release a lock for a collection
   * Only releases if the lock is held by the specified job (safety check)
   * 
   * @param {string} database - Database name
   * @param {string} table - Collection/table name
   * @param {string} jobId - Job identifier that should hold the lock
   * @returns {Promise<boolean>} True if lock was released
   */
  async releaseLock(database, table, jobId) {
    await this.connect();
    
    const lockKey = this.getLockKey(database, table);
    
    // Get current lock holder
    const currentHolder = await this.redis.get(lockKey);
    
    if (!currentHolder) {
      console.warn(`⚠️ [${jobId}] Lock for ${database}.${table} already released`);
      return true;
    }

    const [holderId] = currentHolder.split(':');
    
    // Only release if we own the lock
    if (holderId !== jobId) {
      console.warn(`⚠️ [${jobId}] Cannot release lock for ${database}.${table} - owned by ${holderId}`);
      return false;
    }

    // Delete the lock
    await this.redis.del(lockKey);
    console.log(`🔓 [${jobId}] Released lock for ${database}.${table}`);
    
    return true;
  }

  /**
   * Refresh the lock TTL (called by worker heartbeat to keep lock alive)
   * Only refreshes if the lock is still held by the specified job
   * 
   * @param {string} database - Database name
   * @param {string} table - Collection/table name
   * @param {string} jobId - Job identifier that should hold the lock
   * @returns {Promise<boolean>} True if lock was refreshed
   */
  async refreshLock(database, table, jobId) {
    try {
      await this.connect();
      
      const lockKey = this.getLockKey(database, table);
      const currentHolder = await this.redis.get(lockKey);
      
      if (!currentHolder) return false;
      
      const [holderId] = currentHolder.split(':');
      
      if (holderId !== jobId) return false;
      
      // Refresh: update timestamp and reset TTL
      const newValue = `${jobId}:${Date.now()}`;
      await this.redis.set(lockKey, newValue, 'PX', this.lockTTL);
      
      return true;
    } catch (error) {
      // Non-fatal — don't crash the import if refresh fails once
      return false;
    }
  }

  /**
   * Force release a lock (admin/recovery only)
   * Use with caution - can cause race conditions if another job is active
   * 
   * @param {string} database - Database name
   * @param {string} table - Collection/table name
   */
  async forceReleaseLock(database, table) {
    await this.connect();
    
    const lockKey = this.getLockKey(database, table);
    const currentHolder = await this.redis.get(lockKey);
    
    if (currentHolder) {
      await this.redis.del(lockKey);
      console.log(`🔓 Force released lock for ${database}.${table} (was held by ${currentHolder})`);
    }
  }

  /**
   * Check if a collection is currently locked
   * 
   * @param {string} database - Database name
   * @param {string} table - Collection/table name
   * @returns {Promise<{locked: boolean, holder?: string, since?: Date}>}
   */
  async getLockStatus(database, table) {
    await this.connect();
    
    const lockKey = this.getLockKey(database, table);
    const currentHolder = await this.redis.get(lockKey);
    
    if (!currentHolder) {
      return { locked: false };
    }

    const [holderId, timestamp] = currentHolder.split(':');
    return {
      locked: true,
      holder: holderId,
      since: new Date(parseInt(timestamp))
    };
  }

  /**
   * Get all current locks (for monitoring)
   * @returns {Promise<Array<{database: string, table: string, holder: string, since: Date}>>}
   */
  async getAllLocks() {
    await this.connect();
    
    const keys = await this.redis.keys(`${this.lockPrefix}*`);
    const locks = [];

    for (const key of keys) {
      const value = await this.redis.get(key);
      if (value) {
        const [database, table] = key.replace(this.lockPrefix, '').split(':');
        const [holderId, timestamp] = value.split(':');
        locks.push({
          database,
          table,
          holder: holderId,
          since: new Date(parseInt(timestamp))
        });
      }
    }

    return locks;
  }

  /**
   * Disconnect from Redis
   */
  async disconnect() {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }
  }
}

// Export singleton instance
const collectionLockService = new CollectionLockService();

module.exports = {
  CollectionLockService,
  collectionLockService
};
