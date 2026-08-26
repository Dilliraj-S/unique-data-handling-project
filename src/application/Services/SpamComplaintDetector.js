/**
 * SpamComplaintDetector
 * 
 * Detects spam complaint/FBL (Feedback Loop) reports using headers.
 * When ISPs or mailbox providers forward spam complaints via ARF format.
 * 
 * Returns: { isComplaint, detectedBy, confidence }
 */

class SpamComplaintDetector {

  /**
   * Detect if an email is a spam complaint
   * 
   * @param {Object} headers - Structured headers
   * @returns {Object} { isComplaint, detectedBy, confidence }
   */
  static detect(headers) {
    const result = {
      isComplaint: false,
      detectedBy: null,
      confidence: 0
    };

    const feedbackType = (headers.feedbackType || headers['feedback-type'] || '').toLowerCase().trim();
    const contentType = (headers.contentType || '').toLowerCase();
    const from = (headers.from || '').toLowerCase();
    const xComplaintTo = (headers.xComplaintTo || headers['x-complaint-to'] || '').trim();

    // Feedback-Type: abuse (ARF standard)
    if (feedbackType === 'abuse') {
      result.isComplaint = true;
      result.detectedBy = 'Feedback-Type: abuse';
      result.confidence = 0.99;
      return result;
    }

    // Any Feedback-Type header (rarely non-abuse, but still indicates complaint system)
    if (feedbackType) {
      result.isComplaint = true;
      result.detectedBy = `Feedback-Type: ${feedbackType}`;
      result.confidence = 0.90;
      return result;
    }

    // Content-Type: message/feedback-report (ARF MIME type)
    if (contentType.includes('message/feedback-report') || 
        contentType.includes('feedback-report')) {
      result.isComplaint = true;
      result.detectedBy = 'Content-Type: message/feedback-report';
      result.confidence = 0.95;
      return result;
    }

    // From address patterns (ISP complaint forwarding)
    if (from.includes('abuse@') || from.includes('complaints@') || 
        from.includes('fbl@') || from.includes('feedback@')) {
      result.isComplaint = true;
      result.detectedBy = `From: ${from}`;
      result.confidence = 0.85;
      return result;
    }

    // X-Complaint-To header present
    if (xComplaintTo) {
      result.isComplaint = true;
      result.detectedBy = `X-Complaint-To: ${xComplaintTo}`;
      result.confidence = 0.80;
      return result;
    }

    return result;
  }
}

module.exports = SpamComplaintDetector;
