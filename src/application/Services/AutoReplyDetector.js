/**
 * AutoReplyDetector
 * 
 * Detects auto-reply emails using:
 * 1. Primary header checks (RFC 3834, Exchange, corporate servers)
 * 2. Subject pattern fallback (for servers with no auto-reply headers)
 * 3. Sub-classification: out_of_office, left_company, unmonitored_mailbox, generic_auto_reply
 * 
 * Subject fallback ONLY fires if NO auto-reply header was found,
 * preventing misclassification of human replies containing "out of office".
 */

class AutoReplyDetector {

  /**
   * Detect if an email is an auto-reply
   * 
   * @param {Object} headers - Structured headers
   * @param {string} subject - Email subject
   * @param {string} body - Plain text body
   * @returns {Object} { isAutoReply, subType, detectedBy, confidence }
   */
  static detect(headers, subject = '', body = '') {
    const result = {
      isAutoReply: false,
      subType: null,     // 'out_of_office' | 'left_company' | 'unmonitored_mailbox' | 'generic_auto_reply'
      detectedBy: null,  // 'header' | 'subject_fallback'
      confidence: 0
    };

    // === Step 1: Primary header checks ===
    const headerResult = AutoReplyDetector._checkHeaders(headers);
    if (headerResult.matched) {
      result.isAutoReply = true;
      result.detectedBy = 'header';
      result.confidence = 0.95;
    }

    // === Step 2: Subject fallback (ONLY if no header matched) ===
    if (!result.isAutoReply) {
      const subjectResult = AutoReplyDetector._checkSubjectFallback(subject, body);
      if (subjectResult.matched) {
        result.isAutoReply = true;
        result.subType = subjectResult.subType;
        result.detectedBy = 'subject_fallback';
        result.confidence = 0.75;
      }
    }

    // === Step 3: Sub-classify (if header matched but subType not yet set) ===
    if (result.isAutoReply && !result.subType) {
      result.subType = AutoReplyDetector._subClassify(subject, body);
    }

    return result;
  }

  /**
   * Check primary auto-reply headers
   * Any ONE match = auto-reply confirmed
   */
  static _checkHeaders(headers) {
    const autoSubmitted = (headers.autoSubmitted || '').toLowerCase().trim();
    const xAutoreply = (headers.xAutoreply || headers['x-autoreply'] || '').toLowerCase().trim();
    const xAutorespond = (headers.xAutorespond || headers['x-autorespond'] || '').toLowerCase().trim();
    const xAutoResponseSuppress = (headers.xAutoResponseSuppress || headers['x-auto-response-suppress'] || '').toLowerCase().trim();
    const xMsExchangeGenerated = (headers.xMsExchangeGeneratedMessageBy || headers['x-ms-exchange-generated-message-by'] || '').trim();
    const precedence = (headers.precedence || '').toLowerCase().trim();
    const threadTopic = (headers.threadTopic || headers['thread-topic'] || '').trim();

    // RFC 3834: Auto-Submitted
    if (autoSubmitted === 'auto-replied') {
      return { matched: true, header: 'Auto-Submitted: auto-replied' };
    }
    // auto-generated that passed bounce detection (not a bounce) = auto-reply
    if (autoSubmitted === 'auto-generated') {
      return { matched: true, header: 'Auto-Submitted: auto-generated' };
    }

    // X-Autoreply (corporate servers)
    if (xAutoreply === 'yes') {
      return { matched: true, header: 'X-Autoreply: yes' };
    }

    // X-Autorespond (legacy auto-responders)
    if (xAutorespond) {
      return { matched: true, header: 'X-Autorespond' };
    }

    // Microsoft Exchange/365: X-Auto-Response-Suppress
    if (xAutoResponseSuppress) {
      return { matched: true, header: `X-Auto-Response-Suppress: ${xAutoResponseSuppress}` };
    }

    // Microsoft Exchange: X-MS-Exchange-Generated-Message-By
    if (xMsExchangeGenerated) {
      return { matched: true, header: 'X-MS-Exchange-Generated-Message-By' };
    }

    // Precedence: auto_reply
    if (precedence === 'auto_reply' || precedence === 'auto-reply') {
      return { matched: true, header: `Precedence: ${precedence}` };
    }

    // Precedence: bulk (often auto-generated newsletters, auto-replies)
    if (precedence === 'bulk') {
      return { matched: true, header: 'Precedence: bulk' };
    }

    // Thread-Topic combined with any other auto indicator is Exchange auto-reply
    // (Thread-Topic alone is not sufficient)
    if (threadTopic && (autoSubmitted || xAutoResponseSuppress || xMsExchangeGenerated)) {
      return { matched: true, header: 'Thread-Topic + auto headers' };
    }

    return { matched: false };
  }

  /**
   * Subject pattern fallback for servers that set NO auto-reply headers
   * Only fires if header check returned false
   */
  static _checkSubjectFallback(subject, body) {
    if (!subject) return { matched: false };
    
    const subjectLower = subject.toLowerCase().trim();
    const bodyLower = (body || '').toLowerCase();

    // Exchange default: "Automatic reply: {original subject}"
    if (subjectLower.startsWith('automatic reply:') || subjectLower.startsWith('automatic reply -')) {
      return { matched: true, subType: 'generic_auto_reply' };
    }

    // Various servers: "Auto:" or "AutoReply:"
    if (subjectLower.startsWith('auto:') || subjectLower.startsWith('autoreply:') || 
        subjectLower.startsWith('auto reply:')) {
      return { matched: true, subType: 'generic_auto_reply' };
    }

    // "Out of office" in subject (universal)
    if (subjectLower.includes('out of office') || subjectLower.includes('out-of-office')) {
      return { matched: true, subType: 'out_of_office' };
    }

    // "Away from office" or "OOO" variations
    if (subjectLower.includes('away from office') || 
        subjectLower.match(/\booo\b/) ||
        subjectLower.includes('absenteeism') ||
        subjectLower.includes('on leave')) {
      return { matched: true, subType: 'out_of_office' };
    }

    // Minimal OOO: short reply with out-of-office content
    if (subjectLower.startsWith('re:') && bodyLower.length < 200) {
      if (bodyLower.includes('out of office') || bodyLower.includes('on vacation') ||
          bodyLower.includes('away from') || bodyLower.includes('annual leave')) {
        return { matched: true, subType: 'out_of_office' };
      }
    }

    return { matched: false };
  }

  /**
   * Sub-classify an auto-reply based on subject + body content
   */
  static _subClassify(subject, body) {
    const text = ((subject || '') + ' ' + (body || '')).toLowerCase();

    // Out of office patterns
    const oooPatterns = [
      'out of office', 'out-of-office', 'ooo', 'on vacation', 
      'away from', 'annual leave', 'holiday', 'on leave',
      'traveling', 'be back on', 'returning on', 'return to office',
      'currently unavailable', 'currently away', 'on break',
      'maternity leave', 'paternity leave', 'sick leave',
      'will be back', 'will return', 'away until'
    ];
    for (const pattern of oooPatterns) {
      if (text.includes(pattern)) return 'out_of_office';
    }

    // Left company patterns
    const leftPatterns = [
      'left the company', 'no longer with', 'departed', 
      'is no longer employed', 'has left', 'no longer works',
      'no longer at', 'no longer associated', 'has moved on',
      'former employee', 'position has been vacated',
      'no longer a member', 'separated from'
    ];
    for (const pattern of leftPatterns) {
      if (text.includes(pattern)) return 'left_company';
    }

    // Unmonitored mailbox patterns
    const unmonitoredPatterns = [
      'not monitored', 'unattended mailbox', 'do not reply',
      'noreply', 'no-reply', 'mailbox is not monitored',
      'this mailbox is not checked', 'not being monitored',
      'unmonitored', 'this inbox is not checked',
      'automated mailbox', 'do-not-reply'
    ];
    for (const pattern of unmonitoredPatterns) {
      if (text.includes(pattern)) return 'unmonitored_mailbox';
    }

    // Default: generic auto-reply
    return 'generic_auto_reply';
  }
}

module.exports = AutoReplyDetector;
