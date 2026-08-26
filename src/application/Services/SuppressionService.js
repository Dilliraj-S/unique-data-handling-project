/**
 * SuppressionService
 * 
 * Manages the email suppression list to prevent sending to:
 * - Hard bounced addresses
 * - Spam complainers
 * - Unsubscribed users
 * - Spam-blocked addresses
 * - Left-company auto-replies
 * - "No longer interested" replies
 * 
 * Three-tier lookup strategy:
 * 1. Bulk warmup Set (in-memory, for campaign dispatch) — O(1), zero network
 * 2. Redis cache `suppressed:{email}` with 24hr TTL — for per-email checks
 * 3. MongoDB `suppressed_emails` collection — source of truth, fallback
 */

const { Long } = require('mongodb');

class SuppressionService {

  /**
   * @param {Object} db - MongoDB database connection (pluto)
   * @param {Object} redis - Redis client (ioredis instance) - optional
   */
  constructor(db, redis = null) {
    this.db = db;
    this.redis = redis;
    this.collection = db.collection('suppressed_emails');
  }

  // ─── SUPPRESSION CHECK ─────────────────────────────────────────────

  /**
   * Check if an email is suppressed (per-email, uses Redis → MongoDB fallback)
   * For bulk dispatch, use loadSuppressedSet() instead.
   * 
   * @param {string} email - Email to check
   * @returns {Promise<boolean>} true if suppressed
   */
  async isSuppressed(email) {
    const normalized = SuppressionService.normalizeEmail(email);
    if (!normalized) return false;

    // Tier 2: Redis cache
    if (this.redis) {
      try {
        const cached = await this.redis.get(`suppressed:${normalized}`);
        if (cached === '1') return true;
        if (cached === '0') return false;
        // Cache miss — fall through to MongoDB
      } catch (redisErr) {
        console.warn('[SuppressionService] Redis error, falling back to MongoDB:', redisErr.message);
      }
    }

    // Tier 3: MongoDB (source of truth)
    const doc = await this.collection.findOne(
      { email: normalized, active: true },
      { projection: { _id: 1 } }
    );

    const result = !!doc;

    // Cache result in Redis for next time (24hr TTL)
    if (this.redis) {
      try {
        await this.redis.set(`suppressed:${normalized}`, result ? '1' : '0', 'EX', 86400);
      } catch (cacheErr) {
        // Non-fatal
      }
    }

    return result;
  }

  // ─── BULK WARMUP (for campaign dispatch) ───────────────────────────

  /**
   * Load the entire suppression list into an in-memory Set.
   * Call this ONCE before the DispatchCampaignJob cursor loop.
   * 
   * Memory: ~50 bytes/email × 10k = 500KB; 100k = 5MB
   * 
   * @returns {Promise<Set<string>>} Set of suppressed emails (lowercase)
   */
  async loadSuppressedSet() {
    const suppressedSet = new Set();
    const startTime = Date.now();

    const cursor = this.collection.find(
      { active: true },
      { projection: { email: 1 }, batchSize: 10000 }
    );

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      if (doc.email) {
        suppressedSet.add(doc.email.toLowerCase().trim());
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`[SuppressionService] Loaded ${suppressedSet.size} suppressed emails in ${elapsed}ms`);

    return suppressedSet;
  }

  /**
   * Warm the Redis cache from the suppression Set (fire-and-forget).
   * Call after loadSuppressedSet() to prepare Redis for per-email checks
   * by EmailDeliveryService.
   * 
   * @param {Set<string>} suppressedSet - Set from loadSuppressedSet()
   */
  async warmRedisCache(suppressedSet) {
    if (!this.redis) return;

    const startTime = Date.now();
    const pipeline = this.redis.pipeline();
    let count = 0;

    for (const email of suppressedSet) {
      pipeline.set(`suppressed:${email}`, '1', 'EX', 86400); // 24hr TTL
      count++;

      // Flush pipeline every 5000 entries to avoid memory buildup
      if (count % 5000 === 0) {
        await pipeline.exec();
        // Start a new pipeline (ioredis pipelines are single-use)
        // Actually ioredis pipelines can be reused, but let's be safe
      }
    }

    // Flush remaining
    if (count % 5000 !== 0) {
      await pipeline.exec();
    }

    const elapsed = Date.now() - startTime;
    console.log(`[SuppressionService] Warmed Redis cache with ${count} entries in ${elapsed}ms`);
  }

  // ─── SUPPRESS / UNSUPPRESS ─────────────────────────────────────────

  /**
   * Suppress an email address
   * 
   * @param {string} email - Email to suppress
   * @param {string} reason - One of: hard_bounce, spam_complaint, unsubscribe, spam_block, left_company, no_longer
   * @param {Object} context - Additional context
   * @param {string|number} context.campaignId - Campaign that triggered suppression
   * @param {string|number} context.subscriberId - Subscriber ID
   * @param {string} context.dsnCode - SMTP code (for bounces)
   * @param {string} context.dsnStatus - DSN status (for bounces)
   * @returns {Promise<Object>} The suppression document
   */
  async suppress(email, reason, context = {}) {
    const normalized = SuppressionService.normalizeEmail(email);
    if (!normalized) {
      console.warn('[SuppressionService] Cannot suppress empty email');
      return null;
    }

    const VALID_REASONS = ['hard_bounce', 'spam_complaint', 'unsubscribe', 'spam_block', 'left_company', 'no_longer'];
    if (!VALID_REASONS.includes(reason)) {
      console.warn(`[SuppressionService] Invalid reason: ${reason}`);
      return null;
    }

    const now = new Date();
    const doc = {
      email: normalized,
      reason,
      source_campaign_id: context.campaignId ? Long.fromNumber(Number(context.campaignId)) : null,
      source_subscriber_id: context.subscriberId ? Long.fromNumber(Number(context.subscriberId)) : null,
      dsn_code: context.dsnCode || null,
      dsn_status: context.dsnStatus || null,
      suppressed_at: now,
      unsuppressed_at: null,
      active: true,
      created_at: now,
      updated_at: now
    };

    // Upsert: if email already suppressed, update with latest reason/context
    const result = await this.collection.updateOne(
      { email: normalized },
      {
        $set: {
          reason,
          source_campaign_id: doc.source_campaign_id,
          source_subscriber_id: doc.source_subscriber_id,
          dsn_code: doc.dsn_code,
          dsn_status: doc.dsn_status,
          suppressed_at: now,
          unsuppressed_at: null,
          active: true,
          updated_at: now
        },
        $setOnInsert: {
          email: normalized,
          created_at: now
        }
      },
      { upsert: true }
    );

    // Update Redis cache immediately
    if (this.redis) {
      try {
        await this.redis.set(`suppressed:${normalized}`, '1', 'EX', 86400);
      } catch (redisErr) {
        // Non-fatal
      }
    }

    console.log(`[SuppressionService] Suppressed ${normalized} (reason: ${reason}, campaign: ${context.campaignId || 'N/A'})`);
    return result;
  }

  /**
   * Unsuppress an email address (manual admin action)
   * 
   * @param {string} email - Email to unsuppress
   * @returns {Promise<boolean>} true if unsuppressed, false if not found
   */
  async unsuppress(email) {
    const normalized = SuppressionService.normalizeEmail(email);
    if (!normalized) return false;

    const result = await this.collection.updateOne(
      { email: normalized, active: true },
      {
        $set: {
          active: false,
          unsuppressed_at: new Date(),
          updated_at: new Date()
        }
      }
    );

    // Clear Redis cache
    if (this.redis) {
      try {
        await this.redis.del(`suppressed:${normalized}`);
      } catch (redisErr) {
        // Non-fatal
      }
    }

    if (result.modifiedCount > 0) {
      console.log(`[SuppressionService] Unsuppressed ${normalized}`);
      return true;
    }

    return false;
  }

  // ─── QUERY / STATS ─────────────────────────────────────────────────

  /**
   * Get suppression info for an email
   * @param {string} email 
   * @returns {Promise<Object|null>}
   */
  async getSuppressionInfo(email) {
    const normalized = SuppressionService.normalizeEmail(email);
    if (!normalized) return null;
    return await this.collection.findOne({ email: normalized, active: true });
  }

  /**
   * Get suppression statistics
   * @returns {Promise<Object>} { total, byReason: { hard_bounce: N, ... } }
   */
  async getStats() {
    const pipeline = [
      { $match: { active: true } },
      { $group: { _id: '$reason', count: { $sum: 1 } } }
    ];

    const results = await this.collection.aggregate(pipeline).toArray();
    const byReason = {};
    let total = 0;

    for (const r of results) {
      byReason[r._id] = r.count;
      total += r.count;
    }

    return { total, byReason };
  }

  // ─── UTILITY ───────────────────────────────────────────────────────

  /**
   * Normalize email: lowercase + trim
   * @param {string} email 
   * @returns {string|null}
   */
  static normalizeEmail(email) {
    if (!email || typeof email !== 'string') return null;
    const normalized = email.toLowerCase().trim();
    if (!normalized || !normalized.includes('@')) return null;
    return normalized;
  }
}

module.exports = SuppressionService;
