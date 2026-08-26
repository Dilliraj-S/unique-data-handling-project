/**
 * ActionProcessor
 * 
 * Processes post-classification actions for each email type.
 * Called by sync-action-worker.js after SmartClassifier classifies an email.
 * 
 * Actions per type:
 * - hard_bounce: suppress subscriber, update campaign log, increment counter
 * - soft_bounce: increment counter, convert to hard after 3 strikes
 * - ratelimit: increment counter, pause ACCOUNT (never subscriber)
 * - spam_block: suppress subscriber, increment counter
 * - auto_reply (left_company): suppress subscriber
 * - auto_reply (other sub-types): no suppression
 * - spam_complaint: suppress subscriber, increment counter
 * - unsubscribe: suppress subscriber, increment counter
 * - human_reply (no_longer): suppress subscriber
 * - human_reply (other): no action needed
 */

const { Long } = require('mongodb');
const SuppressionService = require('./SuppressionService');
const CampaignStatsService = require('./CampaignStatsService');
const MessageIdService = require('./MessageIdService');

class ActionProcessor {

  /**
   * @param {Object} db - MongoDB pluto database
   * @param {Object} redis - ioredis instance (optional)
   */
  constructor(db, redis = null) {
    this.db = db;
    this.redis = redis;
    this.suppressionService = new SuppressionService(db, redis);
    this.campaignStats = new CampaignStatsService(redis);
  }

  /**
   * Process a classification result and take appropriate actions
   * 
   * @param {Object} classification - SmartClassifier result
   * @param {string} classification.type - Primary type
   * @param {string} classification.subType - Sub-type
   * @param {string} classification.dsnCode - SMTP code
   * @param {string} classification.dsnStatus - DSN status
   * @param {string} classification.originalMessageId - Original Message-ID
   * @param {string} classification.recipient - Bounced recipient email
   * @param {string} recipientEmail - The recipient email address
   * @param {string|number} campaignId - Campaign ID (may be null)
   * @param {string|number} subscriberId - Subscriber ID (may be null)
   * @param {string} accountEmail - Sending account email
   * @returns {Promise<Object>} Action result
   */
  async process(classification, recipientEmail, campaignId, subscriberId, accountEmail) {
    const type = classification.type;
    const subType = classification.subType;

    console.log(`[ActionProcessor] Processing: type=${type}, subType=${subType}, email=${recipientEmail}, campaign=${campaignId}`);

    // Try to resolve campaignId/subscriberId from Message-ID if not provided
    if ((!campaignId || !subscriberId) && classification.originalMessageId) {
      const resolved = await this._resolveFromMessageId(classification.originalMessageId);
      if (resolved) {
        campaignId = campaignId || resolved.campaignId;
        subscriberId = subscriberId || resolved.subscriberId;
      }
    }

    const result = {
      type,
      subType,
      actionsApplied: [],
      suppressed: false,
      campaignPaused: false
    };

    switch (type) {
      case 'hard_bounce':
        await this._handleHardBounce(classification, recipientEmail, campaignId, subscriberId, result);
        break;

      case 'soft_bounce':
        await this._handleSoftBounce(classification, recipientEmail, campaignId, subscriberId, result);
        break;

      case 'ratelimit':
        await this._handleRateLimit(classification, campaignId, accountEmail, result);
        break;

      case 'spam_block':
        await this._handleSpamBlock(classification, recipientEmail, campaignId, subscriberId, result);
        break;

      case 'auto_reply':
        await this._handleAutoReply(classification, recipientEmail, campaignId, subscriberId, result);
        break;

      case 'spam_complaint':
        await this._handleSpamComplaint(classification, recipientEmail, campaignId, subscriberId, result);
        break;

      case 'unsubscribe':
        await this._handleUnsubscribe(classification, recipientEmail, campaignId, subscriberId, result);
        break;

      case 'human_reply':
        await this._handleHumanReply(classification, recipientEmail, campaignId, subscriberId, result);
        break;

      default:
        console.log(`[ActionProcessor] No action for type: ${type}`);
    }

    // Check campaign auto-pause after any action
    if (campaignId && ['hard_bounce', 'spam_complaint', 'spam_block'].includes(type)) {
      await this._checkCampaignAutoPause(campaignId, result);
    }

    console.log(`[ActionProcessor] Complete: ${result.actionsApplied.join(', ') || 'no actions'}`);
    return result;
  }

  // ─── HANDLERS ──────────────────────────────────────────────────

  async _handleHardBounce(classification, email, campaignId, subscriberId, result) {
    // 1. Suppress subscriber
    await this._suppressSubscriber(email, 'hard_bounce', campaignId, subscriberId, classification);
    result.suppressed = true;
    result.actionsApplied.push('subscriber_suppressed');

    // 2. Update subscriber fields
    await this._updateSubscriber(email, {
      bounce_count: { $inc: 1 },
      status: 'bounced',
      bounced_at: new Date(),
      last_bounce_dsn: classification.dsnStatus || classification.dsnCode || null
    });
    result.actionsApplied.push('subscriber_updated');

    // 3. Update campaign log
    if (campaignId) {
      await this._updateCampaignLog(campaignId, subscriberId, classification);
      result.actionsApplied.push('campaign_log_updated');
    }

    // 4. Increment counter
    if (campaignId) {
      await this.campaignStats.increment(campaignId, 'hard_bounces');
      result.actionsApplied.push('counter_incremented');
    }
  }

  async _handleSoftBounce(classification, email, campaignId, subscriberId, result) {
    // 1. Increment soft bounce count on subscriber
    const subscriber = await this._findSubscriber(email);
    const currentSoftCount = (subscriber?.soft_bounce_count || 0) + 1;

    if (currentSoftCount >= 3) {
      // Convert to hard bounce after 3 strikes
      console.log(`[ActionProcessor] Soft bounce #${currentSoftCount} for ${email} — converting to hard bounce`);
      classification.type = 'hard_bounce';
      classification.diagnostic = `Converted from soft_bounce after ${currentSoftCount} occurrences`;
      await this._handleHardBounce(classification, email, campaignId, subscriberId, result);
      result.actionsApplied.push('soft_to_hard_conversion');
      return;
    }

    // Normal soft bounce
    await this._updateSubscriber(email, {
      soft_bounce_count: { $inc: 1 }
    });
    result.actionsApplied.push('soft_bounce_counted');

    // Update campaign log
    if (campaignId) {
      await this._updateCampaignLog(campaignId, subscriberId, classification);
      await this.campaignStats.increment(campaignId, 'soft_bounces');
      result.actionsApplied.push('campaign_log_updated');
    }
  }

  async _handleRateLimit(classification, campaignId, accountEmail, result) {
    // NEVER suppress subscriber — this is OUR account's problem
    if (campaignId) {
      await this._updateCampaignLog(campaignId, null, classification);
      await this.campaignStats.increment(campaignId, 'ratelimit_hits');
      result.actionsApplied.push('ratelimit_logged');
    }

    // Optionally pause the sending account for 24 hours
    if (accountEmail && this.redis) {
      try {
        await this.redis.set(`account_paused:${accountEmail}`, '1', 'EX', 86400);
        result.actionsApplied.push('account_paused_24h');
        console.log(`[ActionProcessor] ⚠️ Account ${accountEmail} paused for 24h due to ratelimit`);
      } catch (err) {
        // Non-fatal
      }
    }
  }

  async _handleSpamBlock(classification, email, campaignId, subscriberId, result) {
    // 1. Suppress subscriber
    await this._suppressSubscriber(email, 'spam_block', campaignId, subscriberId, classification);
    result.suppressed = true;
    result.actionsApplied.push('subscriber_suppressed');

    // 2. Update subscriber
    await this._updateSubscriber(email, {
      spam_block_count: { $inc: 1 }
    });

    // 3. Update campaign log & counter
    if (campaignId) {
      await this._updateCampaignLog(campaignId, subscriberId, classification);
      await this.campaignStats.increment(campaignId, 'spam_blocks');
      result.actionsApplied.push('campaign_log_updated');
    }
  }

  async _handleAutoReply(classification, email, campaignId, subscriberId, result) {
    // Only suppress for left_company sub-type
    if (classification.subType === 'left_company') {
      await this._suppressSubscriber(email, 'left_company', campaignId, subscriberId, classification);
      await this._updateSubscriber(email, { status: 'left_company' });
      result.suppressed = true;
      result.actionsApplied.push('subscriber_suppressed_left_company');
    }

    // Update campaign log & counter
    if (campaignId) {
      await this._updateCampaignLog(campaignId, subscriberId, classification);
      await this.campaignStats.increment(campaignId, 'auto_replies');
      result.actionsApplied.push('auto_reply_logged');
    }
  }

  async _handleSpamComplaint(classification, email, campaignId, subscriberId, result) {
    // 1. Suppress immediately
    await this._suppressSubscriber(email, 'spam_complaint', campaignId, subscriberId, classification);
    result.suppressed = true;
    result.actionsApplied.push('subscriber_suppressed');

    // 2. Update subscriber
    await this._updateSubscriber(email, {
      status: 'complained',
      complained_at: new Date()
    });

    // 3. Update campaign log & counter
    if (campaignId) {
      await this._updateCampaignLog(campaignId, subscriberId, classification);
      await this.campaignStats.increment(campaignId, 'complaints');
      result.actionsApplied.push('complaint_logged');
    }
  }

  async _handleUnsubscribe(classification, email, campaignId, subscriberId, result) {
    // 1. Suppress immediately
    await this._suppressSubscriber(email, 'unsubscribe', campaignId, subscriberId, classification);
    result.suppressed = true;
    result.actionsApplied.push('subscriber_suppressed');

    // 2. Update subscriber
    await this._updateSubscriber(email, {
      status: 'unsubscribed',
      unsubscribed_at: new Date()
    });

    // 3. Update campaign log & counter
    if (campaignId) {
      await this._updateCampaignLog(campaignId, subscriberId, classification);
      await this.campaignStats.increment(campaignId, 'unsubscribes');
      result.actionsApplied.push('unsubscribe_logged');
    }
  }

  async _handleHumanReply(classification, email, campaignId, subscriberId, result) {
    // Only suppress for 'no_longer' intent
    if (classification.subType === 'no_longer') {
      await this._suppressSubscriber(email, 'no_longer', campaignId, subscriberId, classification);
      await this._updateSubscriber(email, { status: 'no_longer', suppressed: true, suppressed_at: new Date() });
      result.suppressed = true;
      result.actionsApplied.push('subscriber_suppressed_no_longer');
    }

    // Update campaign log & counter
    if (campaignId) {
      await this._updateCampaignLog(campaignId, subscriberId, classification);
      await this.campaignStats.increment(campaignId, 'replies');
      result.actionsApplied.push('reply_logged');
    }
  }

  // ─── HELPERS ───────────────────────────────────────────────────

  async _suppressSubscriber(email, reason, campaignId, subscriberId, classification) {
    await this.suppressionService.suppress(email, reason, {
      campaignId,
      subscriberId,
      dsnCode: classification.dsnCode,
      dsnStatus: classification.dsnStatus
    });

    // Also set suppressed flag on subscriber document
    await this._updateSubscriber(email, {
      suppressed: true,
      suppressed_at: new Date(),
      suppression_reason: reason
    });
  }

  async _updateSubscriber(email, updates) {
    if (!email) return;
    const normalized = email.toLowerCase().trim();

    const setFields = {};
    const incFields = {};

    for (const [key, value] of Object.entries(updates)) {
      if (value && typeof value === 'object' && value.$inc) {
        incFields[key] = value.$inc;
      } else {
        setFields[key] = value;
      }
    }

    setFields.updated_at = new Date();

    const updateOp = { $set: setFields };
    if (Object.keys(incFields).length > 0) {
      updateOp.$inc = incFields;
    }

    await this.db.collection('subscribers').updateMany(
      { email: normalized },
      updateOp
    );
  }

  async _findSubscriber(email) {
    if (!email) return null;
    return await this.db.collection('subscribers').findOne(
      { email: email.toLowerCase().trim() },
      { projection: { soft_bounce_count: 1, bounce_count: 1, id: 1 } }
    );
  }

  async _updateCampaignLog(campaignId, subscriberId, classification) {
    const filter = {};
    
    if (classification.originalMessageId) {
      // Best match: by original Message-ID
      filter.original_message_id = classification.originalMessageId;
    } else if (campaignId && subscriberId) {
      filter.campaign_id = Long.fromNumber(Number(campaignId));
      filter.subscriber_id = Long.fromNumber(Number(subscriberId));
    } else if (campaignId) {
      filter.campaign_id = Long.fromNumber(Number(campaignId));
    } else {
      return; // Can't identify the log entry
    }

    await this.db.collection('email_campaign_logs').updateOne(
      filter,
      {
        $set: {
          bounce_type: classification.type === 'hard_bounce' || classification.type === 'soft_bounce'
            ? classification.type.replace('_bounce', '')
            : (classification.type === 'ratelimit' ? 'ratelimit' : 
               classification.type === 'spam_block' ? 'spam_block' : null),
          dsn_code: classification.dsnCode || null,
          dsn_status: classification.dsnStatus || null,
          dsn_diagnostic: classification.diagnostic || null,
          classification: classification.type,
          classification_sub_type: classification.subType || null,
          classified_at: new Date(),
          classified_by: classification.classifiedBy || 'smart_classifier',
          updated_at: new Date()
        }
      }
    );
  }

  async _resolveFromMessageId(messageId) {
    const parsed = MessageIdService.parse(messageId);
    if (parsed && !parsed.isLegacy) {
      return {
        campaignId: parsed.campaignId,
        subscriberId: parsed.subscriberId
      };
    }

    // Fallback: search campaign logs by original_message_id
    const log = await this.db.collection('email_campaign_logs').findOne(
      { original_message_id: messageId },
      { projection: { campaign_id: 1, subscriber_id: 1 } }
    );

    if (log) {
      return {
        campaignId: log.campaign_id instanceof Long ? log.campaign_id.toNumber() : log.campaign_id,
        subscriberId: log.subscriber_id instanceof Long ? log.subscriber_id.toNumber() : log.subscriber_id
      };
    }

    return null;
  }

  async _checkCampaignAutoPause(campaignId, result) {
    try {
      // Get total sent count for this campaign
      const totalSent = await this.db.collection('email_campaign_logs').countDocuments({
        campaign_id: Long.fromNumber(Number(campaignId)),
        status: 'sent'
      });

      const pauseCheck = await this.campaignStats.checkAutoPause(campaignId, totalSent);

      if (pauseCheck.shouldPause) {
        // Pause the campaign
        await this.db.collection('campaigns').updateOne(
          { id: Long.fromNumber(Number(campaignId)) },
          {
            $set: {
              status: 'Paused',
              paused_reason: pauseCheck.message,
              paused_at: new Date(),
              updated_at: new Date()
            }
          }
        );

        result.campaignPaused = true;
        result.actionsApplied.push(`campaign_auto_paused: ${pauseCheck.reason}`);
        console.log(`[ActionProcessor] 🚨 Campaign ${campaignId} AUTO-PAUSED: ${pauseCheck.message}`);
      }
    } catch (err) {
      console.warn(`[ActionProcessor] Auto-pause check failed for campaign ${campaignId}:`, err.message);
    }
  }
}

module.exports = ActionProcessor;
