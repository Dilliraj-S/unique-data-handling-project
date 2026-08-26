/**
 * CampaignStatsService
 * 
 * Manages real-time campaign statistics using Redis counters.
 * Redis is used for speed; MongoDB email_campaign_logs is the source of truth.
 * 
 * Counter keys: campaign:{campaignId}:{metricType}
 * Example: campaign:1234:hard_bounces → 5
 * 
 * Counters expire after 30 days (auto-cleanup).
 */

class CampaignStatsService {

  /**
   * @param {Object} redis - ioredis instance (optional — degrades gracefully)
   */
  constructor(redis = null) {
    this.redis = redis;
    this.TTL = 30 * 24 * 60 * 60; // 30 days
  }

  /**
   * Increment a campaign metric counter
   * 
   * @param {string|number} campaignId 
   * @param {string} metricType - hard_bounces, soft_bounces, ratelimit_hits,
   *                               spam_blocks, auto_replies, complaints,
   *                               unsubscribes, replies
   * @param {number} amount - Amount to increment (default 1)
   */
  async increment(campaignId, metricType, amount = 1) {
    if (!this.redis) return;
    try {
      const key = `campaign:${campaignId}:${metricType}`;
      await this.redis.incrby(key, amount);
      await this.redis.expire(key, this.TTL);
    } catch (err) {
      console.warn(`[CampaignStats] Redis increment failed for ${campaignId}:${metricType}:`, err.message);
    }
  }

  /**
   * Get all stats for a campaign
   * 
   * @param {string|number} campaignId 
   * @returns {Object} { hard_bounces, soft_bounces, ... }
   */
  async getStats(campaignId) {
    const defaults = {
      hard_bounces: 0,
      soft_bounces: 0,
      ratelimit_hits: 0,
      spam_blocks: 0,
      auto_replies: 0,
      complaints: 0,
      unsubscribes: 0,
      replies: 0
    };

    if (!this.redis) return defaults;

    try {
      const pipeline = this.redis.pipeline();
      const metrics = Object.keys(defaults);
      
      for (const metric of metrics) {
        pipeline.get(`campaign:${campaignId}:${metric}`);
      }

      const results = await pipeline.exec();
      const stats = {};
      
      metrics.forEach((metric, i) => {
        stats[metric] = parseInt(results[i][1], 10) || 0;
      });

      return stats;
    } catch (err) {
      console.warn(`[CampaignStats] Redis getStats failed for ${campaignId}:`, err.message);
      return defaults;
    }
  }

  /**
   * Check if campaign should be auto-paused based on bounce/complaint rates
   * 
   * @param {string|number} campaignId 
   * @param {number} totalSent - Total emails sent in this campaign
   * @returns {Object} { shouldPause, reason, rate }
   */
  async checkAutoPause(campaignId, totalSent) {
    if (totalSent < 100) {
      // Don't auto-pause for very small campaigns (too noisy)
      return { shouldPause: false };
    }

    const stats = await this.getStats(campaignId);

    // Hard bounce rate ≥ 5%
    const hardBounceRate = stats.hard_bounces / totalSent;
    if (hardBounceRate >= 0.05) {
      return {
        shouldPause: true,
        reason: 'hard_bounce_rate',
        rate: hardBounceRate,
        threshold: 0.05,
        message: `Hard bounce rate ${(hardBounceRate * 100).toFixed(1)}% exceeds 5% threshold (${stats.hard_bounces}/${totalSent})`
      };
    }

    // Spam complaint rate ≥ 0.1%
    const complaintRate = stats.complaints / totalSent;
    if (complaintRate >= 0.001) {
      return {
        shouldPause: true,
        reason: 'complaint_rate',
        rate: complaintRate,
        threshold: 0.001,
        message: `Spam complaint rate ${(complaintRate * 100).toFixed(2)}% exceeds 0.1% threshold (${stats.complaints}/${totalSent})`
      };
    }

    // Spam block rate ≥ 3%
    const spamBlockRate = stats.spam_blocks / totalSent;
    if (spamBlockRate >= 0.03) {
      return {
        shouldPause: true,
        reason: 'spam_block_rate',
        rate: spamBlockRate,
        threshold: 0.03,
        message: `Spam block rate ${(spamBlockRate * 100).toFixed(1)}% exceeds 3% threshold (${stats.spam_blocks}/${totalSent})`
      };
    }

    return { shouldPause: false };
  }
}

module.exports = CampaignStatsService;
