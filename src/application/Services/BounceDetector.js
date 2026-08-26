/**
 * BounceDetector
 * 
 * Detects bounce emails by analyzing:
 * 1. DSN (Delivery Status Notification) headers 
 * 2. DSN body for SMTP status codes and diagnostic text
 * 3. GSuite-specific ratelimit patterns
 * 
 * CRITICAL: "ratelimit" must NEVER suppress a subscriber.
 * A ratelimit means OUR sending account hit quota, not the recipient.
 * 
 * Returns: { isBounce, type, smtpCode, dsnStatus, diagnostic, recipient, originalMessageId }
 */

const MessageIdService = require('./MessageIdService');

class BounceDetector {

  /**
   * Detect if an email is a bounce and classify it
   * 
   * @param {Object} headers - Structured headers { from, to, subject, contentType, autoSubmitted, ... }
   * @param {string} body - Plain text body of the email
   * @param {string} bodyHtml - HTML body (optional)
   * @returns {Object} Detection result
   */
  static detect(headers, body = '', bodyHtml = '') {
    const result = {
      isBounce: false,
      type: null,           // 'hard_bounce' | 'soft_bounce' | 'ratelimit' | 'spam_block'
      smtpCode: null,       // e.g. '550'
      dsnStatus: null,      // e.g. '5.1.1'
      diagnostic: null,     // Full diagnostic message
      recipient: null,      // Bounced email address
      originalMessageId: null, // Message-ID of the original email
      confidence: 0
    };

    // === Step A: Check if this looks like a bounce (header-level) ===
    const isBounceSource = BounceDetector._isBounceSource(headers);
    if (!isBounceSource) {
      return result;
    }

    result.isBounce = true;
    result.confidence = 0.5; // Confirmed bounce source

    // === Step B: Check for ratelimit FIRST (before any bounce classification) ===
    const ratelimitResult = BounceDetector._checkRateLimit(headers, body);
    if (ratelimitResult.isRateLimit) {
      result.type = 'ratelimit';
      result.smtpCode = ratelimitResult.smtpCode || null;
      result.dsnStatus = ratelimitResult.dsnStatus || null;
      result.diagnostic = ratelimitResult.diagnostic;
      result.confidence = 0.95;
      return result;
    }

    // === Step C: Parse DSN body for SMTP codes ===
    const dsnResult = BounceDetector._parseDSN(body, bodyHtml);
    if (dsnResult.found) {
      result.smtpCode = dsnResult.smtpCode;
      result.dsnStatus = dsnResult.dsnStatus;
      result.diagnostic = dsnResult.diagnostic;
      result.recipient = dsnResult.recipient;
      result.confidence = 0.9;
    }

    // === Step D: Extract original Message-ID for campaign linking ===
    result.originalMessageId = BounceDetector._extractOriginalMessageId(headers, body);

    // === Step E: Extract recipient from X-Failed-Recipients or DSN ===
    if (!result.recipient && headers.xFailedRecipients) {
      result.recipient = headers.xFailedRecipients.split(',')[0].trim().replace(/[<>]/g, '');
    }

    // === Step F: Classify bounce type based on SMTP code ===
    result.type = BounceDetector._classifyBySmtpCode(result.smtpCode, result.dsnStatus, result.diagnostic || body);

    // Default to soft_bounce if we confirmed it's a bounce but couldn't parse codes
    if (!result.type) {
      result.type = 'soft_bounce';
      result.confidence = 0.6;
    }

    return result;
  }

  /**
   * Check if the email comes from a bounce source (MAILER-DAEMON, postmaster, etc.)
   */
  static _isBounceSource(headers) {
    const from = (headers.from || '').toLowerCase();
    const contentType = (headers.contentType || '').toLowerCase();
    const autoSubmitted = (headers.autoSubmitted || '').toLowerCase();
    const xFailedRecipients = headers.xFailedRecipients || '';

    // From address checks
    if (from.includes('mailer-daemon') || 
        from.includes('postmaster@') || 
        from.includes('mail delivery') ||
        from.includes('mail system') ||
        from.includes('mailerdaemon')) {
      return true;
    }

    // DSN MIME type
    if (contentType.includes('message/delivery-status') || 
        contentType.includes('delivery-status')) {
      return true;
    }

    // X-Failed-Recipients header present
    if (xFailedRecipients) {
      return true;
    }

    // Auto-generated + looks like bounce (from contains delivery/failure keywords)
    if (autoSubmitted === 'auto-generated' && 
        (from.includes('delivery') || from.includes('failure') || from.includes('bounce'))) {
      return true;
    }

    // Subject-based bounce detection (fallback)
    const subject = (headers.subject || '').toLowerCase();
    if (subject.includes('delivery status notification') ||
        subject.includes('undeliverable') ||
        subject.includes('undelivered mail') ||
        subject.includes('mail delivery failed') ||
        subject.includes('returned mail') ||
        subject.includes('delivery failure') ||
        subject.includes('failure notice')) {
      return true;
    }

    return false;
  }

  /**
   * Check for ratelimit patterns (MUST be checked before bounce classification)
   * Ratelimits must NEVER suppress a subscriber.
   */
  static _checkRateLimit(headers, body) {
    const bodyLower = (body || '').toLowerCase();
    const subject = (headers.subject || '').toLowerCase();
    const diagnostic = bodyLower;

    // GSuite-specific ratelimit patterns
    const ratelimitPatterns = [
      'you have reached your daily sending quota',
      'daily sending quota exceeded',
      'too many messages',
      'rate limit exceeded',
      'rate limit',
      'sending rate',
      'over quota',
      'quota exceeded',
      'too many concurrent',
      'resource_exhausted',
      'too many requests',
      'try again later',
      'temporarily rate limited',
      'mail sending rate',
      'exceeded the maximum'
    ];

    for (const pattern of ratelimitPatterns) {
      if (bodyLower.includes(pattern)) {
        // Extract SMTP code if present near the ratelimit text
        const smtpMatch = bodyLower.match(/\b(421|429|452|550)\b/);
        const dsnMatch = bodyLower.match(/\b(4\.\d\.\d)\b/);
        return {
          isRateLimit: true,
          smtpCode: smtpMatch ? smtpMatch[1] : '421',
          dsnStatus: dsnMatch ? dsnMatch[1] : '4.7.0',
          diagnostic: `Ratelimit detected: "${pattern}" found in body`
        };
      }
    }

    // Subject-level ratelimit detection
    if (subject.includes('quota') || subject.includes('rate limit')) {
      return {
        isRateLimit: true,
        smtpCode: '421',
        dsnStatus: '4.7.0',
        diagnostic: `Ratelimit detected in subject: "${subject}"`
      };
    }

    return { isRateLimit: false };
  }

  /**
   * Parse DSN body for SMTP status codes and diagnostic info
   * @param {string} body - Plain text body
   * @param {string} bodyHtml - HTML body (Gmail DSNs put recipient info here)
   */
  static _parseDSN(body, bodyHtml = '') {
    if (!body && !bodyHtml) return { found: false };

    const result = {
      found: false,
      smtpCode: null,
      dsnStatus: null,
      diagnostic: null,
      recipient: null
    };

    // Helper: strip HTML tags for text extraction
    const stripHtml = (html) => html ? html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim() : '';
    const bodyForParsing = body || '';
    const htmlStripped = stripHtml(bodyHtml);
    // Combine both for pattern matching (plain text first, then stripped HTML)
    const combinedText = bodyForParsing + '\n' + htmlStripped;

    // --- Extract Diagnostic-Code ---
    // Format: Diagnostic-Code: smtp; 550 5.1.1 The email account does not exist
    const diagnosticMatch = combinedText.match(/Diagnostic-Code:\s*smtp;\s*(\d{3})\s+([\d.]+)?\s*(.*)/i);
    if (diagnosticMatch) {
      result.found = true;
      result.smtpCode = diagnosticMatch[1];
      result.dsnStatus = diagnosticMatch[2] || null;
      result.diagnostic = diagnosticMatch[3] ? diagnosticMatch[3].trim() : null;
    }

    // --- Extract Status field ---
    // Format: Status: 5.1.1
    if (!result.dsnStatus) {
      const statusMatch = combinedText.match(/(?:^|\s)Status:\s*([\d.]+)/mi);
      if (statusMatch) {
        result.found = true;
        result.dsnStatus = statusMatch[1];
      }
    }

    // --- Extract SMTP code from body text (fallback) ---
    if (!result.smtpCode) {
      const smtpMatch = combinedText.match(/\b(4[0-9]{2}|5[0-9]{2})\s+([\d.]+)/);
      if (smtpMatch) {
        result.found = true;
        result.smtpCode = smtpMatch[1];
        if (!result.dsnStatus) result.dsnStatus = smtpMatch[2];
      }
    }

    // --- Extract SMTP code standalone (last resort) ---
    if (!result.smtpCode) {
      const standaloneMatch = combinedText.match(/\b(550|551|552|553|554|421|450|451|452)\b/);
      if (standaloneMatch) {
        result.found = true;
        result.smtpCode = standaloneMatch[1];
      }
    }

    // --- Extract Final-Recipient ---
    // Format: Final-Recipient: rfc822; user@example.com
    const recipientMatch = combinedText.match(/Final-Recipient:\s*rfc822;\s*([^\s\r\n]+)/i);
    if (recipientMatch) {
      result.recipient = recipientMatch[1].replace(/[<>]/g, '').trim();
    }

    // --- Fallback: extract email from delivery failure patterns ---
    if (!result.recipient) {
      const deliveryPatterns = [
        // Standard DSN patterns
        /(?:could not be delivered to|delivery to|rejected by)\s+<?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?/i,
        // Gmail-specific patterns
        /(?:delivering your message to|wasn't delivered to|couldn't be delivered to|not delivered to)\s+<?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?/i,
        // "message to <email> has been" pattern
        /message to\s+<?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?\s+(?:has been|was)/i,
        // "The address <email>" or "recipient <email>" patterns
        /(?:the address|recipient|mailbox)\s*:?\s*<?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?/i,
        // Generic "failed" + email pattern
        /(?:failed|failure|undeliverable|bounce).*?<?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?/i
      ];

      for (const pattern of deliveryPatterns) {
        const match = combinedText.match(pattern);
        if (match && match[1]) {
          const extracted = match[1].toLowerCase().trim();
          // Skip mailer-daemon and postmaster addresses
          if (!extracted.includes('mailer-daemon') && 
              !extracted.includes('postmaster') &&
              !extracted.includes('mail-daemon')) {
            result.recipient = extracted;
            break;
          }
        }
      }
    }

    // --- Last resort: Extract from HTML href mailto links ---
    if (!result.recipient && bodyHtml) {
      const mailtoMatch = bodyHtml.match(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
      if (mailtoMatch) {
        const email = mailtoMatch[1].toLowerCase().trim();
        if (!email.includes('mailer-daemon') && !email.includes('postmaster')) {
          result.recipient = email;
        }
      }
    }

    // --- Extract diagnostic text if not already found ---
    if (!result.diagnostic) {
      const diagPatterns = [
        /The email account.*does not exist/i,
        /User unknown/i,
        /Mailbox not found/i,
        /No such user/i,
        /Address rejected/i,
        /Message rejected/i,
        /Spam message rejected/i,
        /Access denied/i,
        /Mailbox full/i,
        /Over quota/i,
        /temporary problem delivering/i,
        /delivery incomplete/i
      ];
      for (const pattern of diagPatterns) {
        const match = combinedText.match(pattern);
        if (match) {
          result.diagnostic = match[0];
          result.found = true;
          break;
        }
      }
    }

    return result;
  }

  /**
   * Extract the original Message-ID from the bounce email
   * This links the bounce back to the campaign that sent the original email
   */
  static _extractOriginalMessageId(headers, body) {
    // Check In-Reply-To header
    if (headers.inReplyTo) {
      const parsed = MessageIdService.parse(headers.inReplyTo);
      if (parsed && !parsed.isLegacy) return headers.inReplyTo;
    }

    // Check References header
    if (headers.references) {
      const refs = headers.references.split(/\s+/);
      for (const ref of refs) {
        const parsed = MessageIdService.parse(ref);
        if (parsed && !parsed.isLegacy) return ref;
      }
    }

    // Search body for Original-Message-ID
    if (body) {
      const origMsgIdMatch = body.match(/Original-Message-ID:\s*(<[^>]+>)/i);
      if (origMsgIdMatch) return origMsgIdMatch[1];

      // Search for our campaign-linked format in the body
      const campaignIdMatch = body.match(/<c\d+\.s\d+\.a[a-f0-9]+\.\d+\.[a-f0-9]+@[^>]+>/);
      if (campaignIdMatch) return campaignIdMatch[0];
    }

    return null;
  }

  /**
   * Classify bounce type based on SMTP code and DSN status
   */
  static _classifyBySmtpCode(smtpCode, dsnStatus, diagnosticText = '') {
    if (!smtpCode && !dsnStatus) return null;

    const code = parseInt(smtpCode, 10);
    const text = (diagnosticText || '').toLowerCase();

    // --- Spam block detection (check first, even for 5xx codes) ---
    if (text.includes('spam') || text.includes('blocked') || text.includes('blacklist') ||
        text.includes('blocklist') || text.includes('barracuda') || text.includes('spamhaus')) {
      return 'spam_block';
    }

    // DSN status-based classification
    if (dsnStatus) {
      const major = dsnStatus.charAt(0);
      const statusParts = dsnStatus.split('.');

      if (major === '5') {
        // Permanent failures
        if (dsnStatus === '5.7.1' || dsnStatus === '5.7.0') {
          // Could be spam block or auth failure
          if (text.includes('spam') || text.includes('rejected') || text.includes('policy')) {
            return 'spam_block';
          }
          return 'hard_bounce';
        }
        if (dsnStatus.startsWith('5.1.')) return 'hard_bounce'; // Address errors
        if (dsnStatus.startsWith('5.2.')) return 'hard_bounce'; // Mailbox errors (permanent)
        if (dsnStatus.startsWith('5.3.')) return 'hard_bounce'; // System errors (permanent)
        return 'hard_bounce'; // Default for any 5.x.x
      }

      if (major === '4') {
        // Temporary failures
        return 'soft_bounce';
      }
    }

    // SMTP code-based classification (fallback)
    if (code) {
      if (code === 550 || code === 551 || code === 552 || code === 553 || code === 554) {
        return 'hard_bounce';
      }
      if (code === 421 || code === 450 || code === 451 || code === 452) {
        return 'soft_bounce';
      }
      if (code >= 500) return 'hard_bounce';
      if (code >= 400) return 'soft_bounce';
    }

    return null;
  }
}

module.exports = BounceDetector;
