/**
 * AccountRateLimiter - Per-Account Rate Limiting for Gmail API
 * Prevents "Too many concurrent requests" errors by limiting concurrent requests per account
 * 
 * Features:
 * - Per-account concurrency limits (max 10-15 concurrent per account)
 * - Per-account rate limiting (max requests per second)
 * - Automatic backoff on rate limit errors
 * - Account-level queue management
 */

class AccountRateLimiter {
  // Per-account concurrency tracking
  static accountConcurrency = new Map(); // email -> current concurrent count
  
  // Per-account rate limit tracking
  static accountRateLimits = new Map(); // email -> { lastRequestTime, requestCount, windowStart }
  
  // Configuration (kept in sync with RedisRateLimiter defaults)
  // REDUCED from 10 to 5 to prevent "Too many concurrent requests" errors
  static MAX_CONCURRENT_PER_ACCOUNT = parseInt(process.env.MAX_CONCURRENT_PER_ACCOUNT, 10) || 5; // Safe: 5 concurrent per account
  static MAX_REQUESTS_PER_SECOND = parseInt(process.env.MAX_REQUESTS_PER_SECOND, 10) || 2; // Conservative: 2 requests/second per account
  static RATE_LIMIT_WINDOW = 1000; // 1 second window
  
  /**
   * Acquire lock for account (wait if at max concurrency)
   */
  static async acquireLock(email) {
    const current = this.accountConcurrency.get(email) || 0;
    
    // If at max concurrency, wait
    if (current >= this.MAX_CONCURRENT_PER_ACCOUNT) {
      // Wait with exponential backoff
      let waitTime = 100; // Start with 100ms
      let attempts = 0;
      const maxAttempts = 50; // Max 5 seconds wait
      
      while (current >= this.MAX_CONCURRENT_PER_ACCOUNT && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
        const updated = this.accountConcurrency.get(email) || 0;
        if (updated < this.MAX_CONCURRENT_PER_ACCOUNT) {
          break;
        }
        waitTime = Math.min(waitTime * 1.5, 1000); // Max 1 second wait
        attempts++;
      }
    }
    
    // Increment concurrency counter
    this.accountConcurrency.set(email, (this.accountConcurrency.get(email) || 0) + 1);
  }
  
  /**
   * Release lock for account
   */
  static releaseLock(email) {
    const current = this.accountConcurrency.get(email) || 0;
    if (current > 0) {
      this.accountConcurrency.set(email, current - 1);
    }
  }
  
  /**
   * Check and enforce rate limit (requests per second)
   */
  static async checkRateLimit(email) {
    const now = Date.now();
    let rateLimit = this.accountRateLimits.get(email);
    
    if (!rateLimit) {
      rateLimit = {
        lastRequestTime: 0,
        requestCount: 0,
        windowStart: now
      };
      this.accountRateLimits.set(email, rateLimit);
    }
    
    // Reset window if 1 second has passed
    if (now - rateLimit.windowStart >= this.RATE_LIMIT_WINDOW) {
      rateLimit.requestCount = 0;
      rateLimit.windowStart = now;
    }
    
    // If at max requests per second, wait
    if (rateLimit.requestCount >= this.MAX_REQUESTS_PER_SECOND) {
      const waitTime = this.RATE_LIMIT_WINDOW - (now - rateLimit.windowStart);
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
        // Reset after wait
        rateLimit.requestCount = 0;
        rateLimit.windowStart = Date.now();
      }
    }
    
    // Increment request count
    rateLimit.requestCount++;
    rateLimit.lastRequestTime = now;
  }
  
  /**
   * Add delay between emails from same account (prevents Google blocking)
   */
  static async addAccountDelay(email, baseDelay = 200) {
    const rateLimit = this.accountRateLimits.get(email);
    if (!rateLimit) {
      await new Promise(resolve => setTimeout(resolve, baseDelay));
      return;
    }
    
    const timeSinceLastRequest = Date.now() - rateLimit.lastRequestTime;
    const minDelay = baseDelay; // Minimum 200ms between emails from same account
    
    if (timeSinceLastRequest < minDelay) {
      const waitTime = minDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  /**
   * Get current concurrency for account
   */
  static getConcurrency(email) {
    return this.accountConcurrency.get(email) || 0;
  }
  
  /**
   * Reset all rate limits (for testing or cleanup)
   */
  static reset() {
    this.accountConcurrency.clear();
    this.accountRateLimits.clear();
  }
}

module.exports = AccountRateLimiter;

