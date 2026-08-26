/**
 * MessageIdService
 * 
 * Generates campaign-linked Message-IDs and parses them back
 * to attribute bounces/replies to the original campaign + subscriber.
 * 
 * Format: <c{campaignId}.s{subscriberId}.a{accountHash}.{timestamp}@{domain}>
 * 
 * Example: <c1234.s5678.a9f3e.1708900000@yourdomain.com>
 * 
 * This replaces the old generateMessageId() in EmailDeliveryService.js
 * which produced: <campaign_{timestamp}_{random}@{host}> (not parseable)
 */

const crypto = require('crypto');

class MessageIdService {

  /**
   * Generate a campaign-linked Message-ID
   * 
   * @param {string|number} campaignId - Campaign ID
   * @param {string|number} subscriberId - Subscriber ID
   * @param {string} fromEmail - Sender email (hashed for compactness)
   * @returns {string} Message-ID header value including angle brackets
   */
  static generate(campaignId, subscriberId, fromEmail) {
    const domain = MessageIdService.getDomain();
    const accountHash = MessageIdService.hashAccount(fromEmail);
    const timestamp = Date.now();
    // Add 4 chars of randomness to ensure uniqueness even for same campaign+subscriber retries
    const nonce = crypto.randomBytes(2).toString('hex');

    return `<c${campaignId}.s${subscriberId}.a${accountHash}.${timestamp}.${nonce}@${domain}>`;
  }

  /**
   * Parse a campaign-linked Message-ID back to its components
   * 
   * @param {string} messageId - Message-ID to parse (with or without angle brackets)
   * @returns {Object|null} Parsed components or null if not parseable
   *   { campaignId, subscriberId, accountHash, timestamp, domain }
   */
  static parse(messageId) {
    if (!messageId) return null;

    // Strip angle brackets if present
    const cleaned = messageId.replace(/^<|>$/g, '');

    // Match format: c{cid}.s{sid}.a{hash}.{timestamp}.{nonce}@{domain}
    const regex = /^c(\d+)\.s(\d+)\.a([a-f0-9]+)\.(\d+)\.([a-f0-9]+)@(.+)$/;
    const match = cleaned.match(regex);

    if (!match) {
      // Try legacy format: campaign_{timestamp}_{random}@{host}
      const legacyRegex = /^campaign_(\d+)_([a-z0-9]+)@(.+)$/;
      const legacyMatch = cleaned.match(legacyRegex);
      if (legacyMatch) {
        return {
          campaignId: null,       // Legacy format doesn't embed campaignId
          subscriberId: null,     // Legacy format doesn't embed subscriberId
          accountHash: null,
          timestamp: parseInt(legacyMatch[1], 10),
          domain: legacyMatch[3],
          isLegacy: true
        };
      }
      return null;
    }

    return {
      campaignId: match[1],
      subscriberId: match[2],
      accountHash: match[3],
      timestamp: parseInt(match[4], 10),
      nonce: match[5],
      domain: match[6],
      isLegacy: false
    };
  }

  /**
   * Check if a Message-ID is in the new campaign-linked format
   * @param {string} messageId 
   * @returns {boolean}
   */
  static isCampaignLinked(messageId) {
    const parsed = MessageIdService.parse(messageId);
    return parsed !== null && !parsed.isLegacy;
  }

  /**
   * Get domain from APP_URL or fallback
   * @returns {string}
   */
  static getDomain() {
    if (process.env.APP_URL) {
      try {
        return new URL(process.env.APP_URL).hostname;
      } catch (e) {
        // Fallback if URL parsing fails
      }
    }
    return process.env.MESSAGE_ID_DOMAIN || 'mail.localhost';
  }

  /**
   * Hash account email to a short 5-char hex string
   * Used to keep Message-ID compact while still identifying the sender
   * @param {string} email 
   * @returns {string} 5-char hex hash
   */
  static hashAccount(email) {
    if (!email) return '00000';
    return crypto
      .createHash('md5')
      .update(email.toLowerCase().trim())
      .digest('hex')
      .substring(0, 5);
  }
}

module.exports = MessageIdService;
