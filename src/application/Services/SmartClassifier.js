/**
 * SmartClassifier
 * 
 * 5-step classification engine that replaces keyword-based classifyReply().
 * Steps run in priority order — first match wins:
 * 
 *   Step 1: Bounce Detection (DSN headers + SMTP codes)
 *   Step 2: Auto-Reply Detection (headers + subject fallback)
 *   Step 3: Spam Complaint Detection (FBL headers)
 *   Step 4: Unsubscribe Detection (confidence scoring ≥ 2)
 *   Step 5: Human Reply (keyword sub-classification + default)
 * 
 * Returns: { type, subType, dsnCode, dsnStatus, confidence, classifiedBy, ... }
 */

const BounceDetector = require('./BounceDetector');
const AutoReplyDetector = require('./AutoReplyDetector');
const SpamComplaintDetector = require('./SpamComplaintDetector');
const MessageIdService = require('./MessageIdService');

class SmartClassifier {

  /**
   * Classify an incoming email
   * 
   * @param {Object} email - Email object with headers, subject, body
   * @param {Object} email.headers - Structured headers object
   * @param {string} email.subject - Email subject
   * @param {string} email.body - Plain text body
   * @param {string} email.bodyHtml - HTML body (optional)
   * @param {Array}  keywords - Keyword config from DB (optional, for Step 4/5 fallback)
   * @returns {Object} Classification result
   */
  static classify(email, keywords = []) {
    const headers = email.headers || {};
    const subject = email.subject || '';
    const body = email.body || '';
    const bodyHtml = email.bodyHtml || '';

    const result = {
      type: 'other',           // Primary type
      subType: null,           // Sub-classification
      dsnCode: null,           // SMTP code (bounces only)
      dsnStatus: null,         // DSN status code (bounces only) 
      diagnostic: null,        // Diagnostic text (bounces only)
      recipient: null,         // Bounced recipient (bounces only)
      originalMessageId: null, // Linked original Message-ID
      confidence: 0,           // 0-1 confidence score
      classifiedBy: 'smart_classifier',  // 'smart_classifier' or 'keyword_fallback'
      step: null               // Which step matched
    };

    // ═══════════════════════════════════════════════════════════════
    // STEP 1: Bounce Detection (DSN)
    // ═══════════════════════════════════════════════════════════════
    const bounceResult = BounceDetector.detect(headers, body, bodyHtml);
    if (bounceResult.isBounce) {
      result.type = bounceResult.type;          // hard_bounce, soft_bounce, ratelimit, spam_block
      result.subType = bounceResult.type;       // Same as type for bounces
      result.dsnCode = bounceResult.smtpCode;
      result.dsnStatus = bounceResult.dsnStatus;
      result.diagnostic = bounceResult.diagnostic;
      result.recipient = bounceResult.recipient;
      result.originalMessageId = bounceResult.originalMessageId;
      result.confidence = bounceResult.confidence;
      result.step = 'bounce_detection';
      return result;
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 2: Auto-Reply Detection (Headers + Subject Fallback)
    // ═══════════════════════════════════════════════════════════════
    const autoReplyResult = AutoReplyDetector.detect(headers, subject, body);
    if (autoReplyResult.isAutoReply) {
      result.type = 'auto_reply';
      result.subType = autoReplyResult.subType;   // out_of_office, left_company, etc.
      result.confidence = autoReplyResult.confidence;
      result.step = 'auto_reply_detection';
      // Extract original message ID from In-Reply-To if available
      result.originalMessageId = SmartClassifier._extractReplyMessageId(headers);
      return result;
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 3: Spam Complaint Detection (FBL Headers)
    // ═══════════════════════════════════════════════════════════════
    const complaintResult = SpamComplaintDetector.detect(headers);
    if (complaintResult.isComplaint) {
      result.type = 'spam_complaint';
      result.subType = 'spam_complaint';
      result.confidence = complaintResult.confidence;
      result.step = 'spam_complaint_detection';
      return result;
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 4: Unsubscribe Detection (Confidence Scoring ≥ 2)
    // ═══════════════════════════════════════════════════════════════
    const unsubResult = SmartClassifier._detectUnsubscribe(subject, body, keywords);
    if (unsubResult.isUnsubscribe) {
      result.type = 'unsubscribe';
      result.subType = 'unsubscribe';
      result.confidence = unsubResult.confidence;
      result.step = 'unsubscribe_detection';
      result.originalMessageId = SmartClassifier._extractReplyMessageId(headers);
      return result;
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 5: Human Reply (Default, with keyword sub-classification)
    // ═══════════════════════════════════════════════════════════════
    const replyResult = SmartClassifier._classifyHumanReply(subject, body, keywords);
    result.type = 'human_reply';
    result.subType = replyResult.intent;      // interested, not_interested, no_longer, other
    result.confidence = replyResult.confidence;
    result.step = 'human_reply';
    result.classifiedBy = replyResult.usedKeywords ? 'keyword_fallback' : 'smart_classifier';
    result.originalMessageId = SmartClassifier._extractReplyMessageId(headers);
    return result;
  }

  // ─── STEP 4: Unsubscribe with Confidence Scoring ──────────────

  /**
   * Detect unsubscribe intent using confidence scoring
   * Threshold: ≥ 2 points required
   * 
   * DO NOT check List-Unsubscribe header (that's for outgoing emails)
   */
  static _detectUnsubscribe(subject, body, keywords = []) {
    let confidence = 0;
    const subjectLower = (subject || '').toLowerCase().trim();
    const bodyLower = (body || '').toLowerCase();

    // --- Subject exact matches (+3 points = instant trigger) ---
    const exactSubjects = [
      'unsubscribe', 'remove me', 'stop emailing me', 'stop emails',
      'take me off your list', 'remove from list', 'opt out',
      'please unsubscribe', 'cancel subscription'
    ];
    for (const exact of exactSubjects) {
      if (subjectLower === exact || subjectLower === `re: ${exact}`) {
        confidence += 3;
        break; // Only count once
      }
    }

    // --- Subject contains unsubscribe keyword (+2 points) ---
    if (confidence === 0) {
      const subjectKeywords = [
        'unsubscribe', 'remove me', 'stop email', 'opt out', 'opt-out',
        'take me off', 'remove from', 'stop sending', 'cancel subscription',
        'do not email', 'don\'t email', 'no more emails'
      ];
      for (const kw of subjectKeywords) {
        if (subjectLower.includes(kw)) {
          confidence += 2;
          break; // Only count subject once
        }
      }
    }

    // --- Body keyword matches (+1 first, +1 second, +0.5 each after) ---
    const bodyKeywords = [
      'unsubscribe', 'remove me', 'opt out', 'opt-out', 'take me off',
      'stop sending', 'remove my email', 'stop emailing', 'do not contact',
      'don\'t contact', 'no more emails', 'remove from list', 'cancel emails',
      'stop all emails', 'remove from mailing', 'discontinue', 'do not email'
    ];

    // Also include user-defined unsubscribe keywords from DB
    const dbUnsubKeywords = keywords
      .filter(k => k.status === 'unsubscribe')
      .map(k => k.keyword.toLowerCase());
    
    const allBodyKeywords = [...new Set([...bodyKeywords, ...dbUnsubKeywords])];
    let bodyMatches = 0;

    for (const kw of allBodyKeywords) {
      if (bodyLower.includes(kw)) {
        bodyMatches++;
        if (bodyMatches === 1) confidence += 1;
        else if (bodyMatches === 2) confidence += 1;
        else confidence += 0.5;
      }
    }

    return {
      isUnsubscribe: confidence >= 2,
      confidence: Math.min(confidence / 3, 1),  // Normalize to 0-1
      points: confidence
    };
  }

  // ─── STEP 5: Human Reply Sub-Classification ───────────────────

  /**
   * Classify human reply intent using keywords
   */
  static _classifyHumanReply(subject, body, keywords = []) {
    const text = ((subject || '') + ' ' + (body || '')).toLowerCase();

    // Use DB keywords if available for weighted matching (legacy compatibility)
    if (keywords.length > 0) {
      const statusScores = {};
      
      for (const kw of keywords) {
        const kwLower = kw.keyword.toLowerCase();
        if (text.includes(kwLower)) {
          const status = kw.status || 'other';
          if (!statusScores[status]) statusScores[status] = 0;

          // Weighted scoring (same as original classifyReply)
          const weights = {
            'hard_bounce': 2.0,    // Won't typically be reached here (Step 1 catches)
            'soft_bounce': 1.5,    // Won't typically be reached here
            'unsubscribe': 1.3,    // Won't typically be reached here (Step 4 catches)
            'no_longer': 1.2,
            'automatic_reply': 1.1 // Won't typically be reached here (Step 2 catches)
          };
          
          statusScores[status] += (weights[status] || 1.0);
        }
      }

      if (Object.keys(statusScores).length > 0) {
        // Find highest scoring status
        const bestStatus = Object.entries(statusScores)
          .sort((a, b) => b[1] - a[1])[0][0];
        
        // Map legacy status names to intent
        const intentMap = {
          'no_longer': 'no_longer',
          'not_interested': 'not_interested',
          'interested': 'interested',
          'automatic_reply': 'other',  // Should have been caught by Step 2
          'hard_bounce': 'other',      // Should have been caught by Step 1
          'soft_bounce': 'other',      // Should have been caught by Step 1
          'unsubscribe': 'other'       // Should have been caught by Step 4
        };

        return {
          intent: intentMap[bestStatus] || bestStatus,
          confidence: 0.7,
          usedKeywords: true
        };
      }
    }

    // --- Built-in pattern matching (fallback if no DB keywords) ---

    // "No longer interested" patterns
    const noLongerPatterns = [
      'no longer interested', 'not interested anymore', 'not interested',
      'no longer need', 'don\'t need', 'do not need', 'not relevant',
      'no thank you', 'no thanks', 'please stop', 'not for me',
      'pass on this', 'decline'
    ];
    for (const pattern of noLongerPatterns) {
      if (text.includes(pattern)) {
        return { intent: 'no_longer', confidence: 0.7, usedKeywords: false };
      }
    }

    // "Interested" patterns (positive engagement)
    const interestedPatterns = [
      'interested', 'tell me more', 'send me more', 'would like to',
      'sounds good', 'sounds great', 'let\'s connect', 'let\'s talk',
      'schedule a call', 'set up a meeting', 'book a demo',
      'yes please', 'sign me up', 'count me in'
    ];
    for (const pattern of interestedPatterns) {
      if (text.includes(pattern)) {
        return { intent: 'interested', confidence: 0.7, usedKeywords: false };
      }
    }

    // Default: genuine reply with no keyword match
    return { intent: 'other', confidence: 0.5, usedKeywords: false };
  }

  // ─── UTILITY ──────────────────────────────────────────────────

  /**
   * Extract original Message-ID from reply headers (In-Reply-To, References)
   */
  static _extractReplyMessageId(headers) {
    // In-Reply-To is the most direct link
    if (headers.inReplyTo) {
      const parsed = MessageIdService.parse(headers.inReplyTo);
      if (parsed) return headers.inReplyTo;
    }

    // Check References header (may contain our Message-ID)
    if (headers.references) {
      const refs = (headers.references || '').split(/\s+/);
      for (const ref of refs) {
        const parsed = MessageIdService.parse(ref);
        if (parsed && !parsed.isLegacy) return ref;
      }
      // Also try legacy format
      for (const ref of refs) {
        const parsed = MessageIdService.parse(ref);
        if (parsed) return ref;
      }
    }

    return null;
  }

  /**
   * Extract structured headers from raw Gmail API message headers array
   * Convenience method to convert Gmail's [{ name, value }] format
   * to a flat object usable by all detectors.
   * 
   * @param {Array} rawHeaders - Gmail API headers array [{ name: 'From', value: '...' }, ...]
   * @returns {Object} Structured headers object
   */
  static extractHeaders(rawHeaders) {
    if (!rawHeaders || !Array.isArray(rawHeaders)) return {};

    const headers = {};
    const headerMap = {
      'from': 'from',
      'to': 'to',
      'subject': 'subject',
      'content-type': 'contentType',
      'auto-submitted': 'autoSubmitted',
      'x-autoreply': 'xAutoreply',
      'x-autorespond': 'xAutorespond',
      'x-auto-response-suppress': 'xAutoResponseSuppress',
      'x-ms-exchange-generated-message-by': 'xMsExchangeGeneratedMessageBy',
      'precedence': 'precedence',
      'thread-topic': 'threadTopic',
      'feedback-type': 'feedbackType',
      'x-complaint-to': 'xComplaintTo',
      'x-failed-recipients': 'xFailedRecipients',
      'in-reply-to': 'inReplyTo',
      'references': 'references',
      'message-id': 'messageId',
      'return-path': 'returnPath',
      'list-unsubscribe': 'listUnsubscribe'
    };

    for (const h of rawHeaders) {
      const key = (h.name || '').toLowerCase();
      const mappedKey = headerMap[key];
      if (mappedKey) {
        headers[mappedKey] = h.value;
      }
    }

    return headers;
  }
}

module.exports = SmartClassifier;
