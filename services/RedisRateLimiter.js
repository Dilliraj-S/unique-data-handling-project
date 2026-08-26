/**
 * RedisRateLimiter - Distributed Rate Limiting for Multiple Workers
 * Replaces in-memory AccountRateLimiter to support multiple worker processes
 * 
 * Features:
 * - Distributed concurrency tracking (Redis atomic INCR/DECR)
 * - Distributed rate limiting (Redis expiry)
 * - Thread-safe coordination across workers
 */

const Queue = require('bull');
const Redis = require('ioredis');

class RedisRateLimiter {
  static redis = null;
  static options = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    maxRetriesPerRequest: 3
  };

  // Configuration
  // CRITICAL: Gmail API has a "Queries per minute per user" quota of ~250-300
  // If you exceed this, you get "Quota exceeded" errors and must wait 60 seconds
  // Safe defaults for high-volume Gmail / Workspace sending:
  // - MAX_CONCURRENT_PER_ACCOUNT: at most this many parallel sends per account (5 = safe)
  // - MAX_REQUESTS_PER_SECOND: per-account QPS cap (2 = 120/minute, safely under Gmail limit)
  static MAX_CONCURRENT_PER_ACCOUNT = parseInt(process.env.MAX_CONCURRENT_PER_ACCOUNT, 10) || 5;
  static MAX_REQUESTS_PER_SECOND = parseInt(process.env.MAX_REQUESTS_PER_SECOND, 10) || 2;

  // ─── Email Sync Pause/Resume (REMOVED — sync now runs continuously) ───

  /** @deprecated Email sync is no longer paused during campaigns */
  static async pauseEmailSync() { /* no-op */ }

  /** @deprecated Email sync is no longer paused during campaigns */
  static async resumeEmailSync() { /* no-op */ }

  /** @deprecated Email sync is no longer paused during campaigns */
  static async isEmailSyncPaused() { return false; }

  /**
   * Clean up stale Bull queue jobs (completed/failed) for a given queue name.
   * @param {string} queueName - e.g. 'Global Email Sync'
   * @returns {number} Number of keys deleted
   */
  static async cleanStaleJobs(queueName = 'Global Email Sync') {
    try {
      const redis = this.getRedis();
      const pattern = `bull:${queueName}:*`;
      let cursor = '0';
      let totalDeleted = 0;

      do {
        const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 1000);
        cursor = nextCursor;
        if (keys.length > 0) {
          // Only delete job data keys (numeric IDs), not queue metadata
          const jobKeys = keys.filter(k => /:\d+$/.test(k));
          if (jobKeys.length > 0) {
            await redis.del(...jobKeys);
            totalDeleted += jobKeys.length;
          }
        }
      } while (cursor !== '0');

      console.log(`🧹 Cleaned ${totalDeleted} stale "${queueName}" job keys from Redis`);
      return totalDeleted;
    } catch (err) {
      console.error('❌ Failed to clean stale jobs:', err.message);
      return 0;
    }
  }
  /**
   * Initialize Redis connection
   */
  static getRedis() {
    if (!this.redis) {
      this.redis = new Redis(this.options);
      
      this.redis.on('error', (err) => {
        console.error('❌ Redis Rate Limiter Error:', err);
        // If Redis is in MISCONF state, try to fix it
        if (err.message && err.message.includes('MISCONF')) {
          console.error('⚠️ Redis MISCONF error detected. Redis cannot write to disk.');
          console.error('💡 Run: redis-cli CONFIG SET save "" to temporarily disable RDB persistence');
          console.error('💡 Or fix disk space/permissions issue. See REDIS_FIX_INSTRUCTIONS.md');
        }
      });
    }
    return this.redis;
  }

  /**
   * Acquire lock for account
   * Increments counter in Redis. If > MAX, decrements and waits.
   * Optimized for high concurrency with exponential backoff.
   */
  static async acquireLock(email) {
    try {
      const redis = this.getRedis();
      const key = `rate_limit:concurrency:${email}`;
      
      let acquired = false;
      let attempts = 0;
      const maxAttempts = 30; // ~9 seconds max (30 × 300ms). Fail fast → Bull retries in 2s → faster recovery
      let waitTime = 50;

      while (!acquired && attempts < maxAttempts) {
        try {
          // Atomic increment with expiry check
          const current = await redis.incr(key);
          
          if (current <= this.MAX_CONCURRENT_PER_ACCOUNT) {
            // Set expiry ONLY on first slot — prevents deadlocks if all workers crash.
            // Previously, expire() was called on EVERY acquire, which meant active
            // workers kept resetting the TTL. If one worker crashed without releaseLock(),
            // the counter stayed permanently inflated (other workers refreshed TTL forever).
            // Now: TTL is set once when first slot is taken. The key expires naturally
            // after 60s if all workers crash, self-healing the counter to 0.
            if (current === 1) {
              await redis.expire(key, 60); // 1 minute TTL — only on first slot
            }
            acquired = true;
          } else {
            // Too many concurrent, decrement and wait
            await redis.decr(key);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            // Exponential backoff: 50ms → 75ms → 112ms → ... → 300ms max
            waitTime = Math.min(waitTime * 1.5, 300); // Cap at 300ms
            attempts++;
          }
        } catch (redisError) {
          // Handle Redis errors (e.g., MISCONF)
          if (redisError.message && redisError.message.includes('MISCONF')) {
            console.error(`❌ Redis MISCONF error for ${email}. Skipping rate limit check.`);
            // Proceed without rate limiting if Redis is misconfigured
            acquired = true;
            break;
          }
          throw redisError;
        }
      }
      
      if (!acquired) {
        console.warn(`⚠️ Could not acquire lock for ${email} after ${attempts} attempts (${attempts * waitTime}ms total wait)`);
        throw new Error(`Local concurrency lock timeout for ${email} (preventing Gmail 429 API blocks)`);
      }
    } catch (error) {
      if (error.message.includes('Local concurrency lock timeout')) {
        throw error; // Bubble up to Bull for clean retry
      }
      console.error(`❌ Error acquiring lock for ${email}:`, error.message);
      // Proceed without rate limiting on Redis networking error
    }
  }

  /**
   * Release lock for account
   */
  static async releaseLock(email) {
    try {
      const redis = this.getRedis();
      const key = `rate_limit:concurrency:${email}`;
      
      // Atomic decrement
      const current = await redis.decr(key);
      
      // Safety check: never go below 0
      // FIX: Preserve TTL when resetting to 0 (bare SET removes TTL, creating immortal key)
      if (current < 0) {
        const ttl = await redis.ttl(key);
        if (ttl > 0) {
          await redis.set(key, 0, 'EX', ttl);
        } else {
          await redis.del(key); // No TTL → just remove entirely
        }
      }
    } catch (error) {
      // Silently handle errors to avoid blocking email delivery
      console.error(`❌ Error releasing lock for ${email}:`, error.message);
    }
  }

  /**
   * Check and enforce rate limit (requests per second)
   * Uses Redis key with 1 second expiry
   */
  static async checkRateLimit(email) {
    try {
      const redis = this.getRedis();
      let acquired = false;
      
      // Keep looping until we secure a slot in a valid 1-second window
      // This prevents 50 workers from bypassing limit and hitting Gmail 429 at the exact same time
      while (!acquired) {
        const now = Math.floor(Date.now() / 1000);
        const key = `rate_limit:rps:${email}:${now}`;
        
        const count = await redis.incr(key);
        
        if (count === 1) {
          await redis.expire(key, 2); // 2 seconds TTL (safety margin)
        }
        
        if (count <= this.MAX_REQUESTS_PER_SECOND) {
          acquired = true;
        } else {
          // Release slot we incorrectly took
          await redis.decr(key);
          // Wait for the exact start of the next second
          const delay = 1000 - (Date.now() % 1000) + 10;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    } catch (error) {
      // Handle Redis errors gracefully
      if (error.message && error.message.includes('MISCONF')) {
        console.error(`❌ Redis MISCONF error for ${email}. Skipping rate limit check.`);
      } else {
        console.error(`❌ Error checking rate limit for ${email}:`, error.message);
      }
      // Proceed without rate limiting on error
    }
  }

  /**
   * Add delay between emails from same account
   * Uses Redis to track last request time across workers
   * 
   * NOTE: 1000ms delay = 60 emails/min per account (safely under Gmail's 250/min quota)
   */
  static async addAccountDelay(email, baseDelay = 200) {
    const redis = this.getRedis();
    const key = `rate_limit:last_req:${email}`;
    
    const lastReq = await redis.get(key);
    const now = Date.now();
    
    if (lastReq) {
      const timeSince = now - parseInt(lastReq);
      if (timeSince < baseDelay) {
        await new Promise(resolve => setTimeout(resolve, baseDelay - timeSince));
      }
    }
    
    await redis.set(key, Date.now(), 'PX', 5000); // 5s TTL
  }

  /**
   * Get current concurrency (for logging)
   */
  static async getConcurrency(email) {
    const redis = this.getRedis();
    const key = `rate_limit:concurrency:${email}`;
    const val = await redis.get(key);
    return parseInt(val) || 0;
  }
}

module.exports = RedisRateLimiter;
