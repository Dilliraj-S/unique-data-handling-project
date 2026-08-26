/**
 * Gmail Profile Photo Scraper Service
 * 
 * Playwright-based service for scraping Gmail profile photos.
 * Used by gmail-photo-scraper-worker.js (standalone process).
 * 
 * CRITICAL: This file runs in a worker process, NOT in Next.js API routes.
 * 
 * Includes 3 scale fixes for 10K+ email reliability:
 * - FIX 1: Session health check every 500 emails
 * - FIX 2: Adaptive rate limiting with progressive delays
 * - FIX 3: Runs only in dedicated worker process
 */

const fs = require('fs');
const path = require('path');

// ─── Configuration ─────────────────────────────────────────────────
const IMAGE_SIZE = parseInt(process.env.GMAIL_SCRAPER_IMAGE_SIZE || '200', 10);
const REOPEN_EVERY = parseInt(process.env.GMAIL_SCRAPER_REOPEN_EVERY || '50', 10);
const SESSION_HEALTH_CHECK_INTERVAL = parseInt(process.env.SESSION_HEALTH_CHECK_INTERVAL || '500', 10);
const LOGIN_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes to login

// ─── Browser Management ────────────────────────────────────────────

/**
 * Launch Chromium with anti-detection flags.
 * headless: false is REQUIRED — Gmail blocks headless browsers.
 * 
 * @param {string} cookiesFile - Path to cookies JSON file
 * @returns {{ browser, context, page }}
 */
async function createBrowser(cookiesFile) {
  // Dynamic import since playwright may not be available in all environments
  const { chromium } = require('playwright');

  // Cross-platform headless detection:
  // - Windows: always headless: false (GUI available)
  // - Linux with DISPLAY (desktop or Xvfb): headless: false
  // - Linux without DISPLAY (bare server): headless: true (Gmail may block — use Xvfb!)
  const isLinux = process.platform === 'linux';
  const hasDisplay = !!process.env.DISPLAY;
  const useHeadless = isLinux && !hasDisplay;

  if (useHeadless) {
    console.warn('⚠️ No DISPLAY found — running headless. Gmail may block this!');
    console.warn('   For reliable scraping, run with: xvfb-run --auto-servernum node gmail-photo-scraper-worker.js');
  }

  const browser = await chromium.launch({
    headless: useHeadless,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
    ],
  });

  // Load existing cookies if available
  let cookies = [];
  if (cookiesFile && fs.existsSync(cookiesFile)) {
    try {
      cookies = JSON.parse(fs.readFileSync(cookiesFile, 'utf-8'));
      console.log(`🍪 Loaded ${cookies.length} cookies from ${cookiesFile}`);
    } catch (e) {
      console.warn(`⚠️ Could not load cookies: ${e.message}`);
    }
  }

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
  });

  // Remove automation flags
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  if (cookies.length > 0) {
    await context.addCookies(cookies);
  }

  const page = await context.newPage();
  return { browser, context, page };
}

// ─── Auto-Login via Credentials ─────────────────────────────────────

/**
 * Attempt automated Gmail login using email + password.
 * Handles CAPTCHA, 2FA, and "browser not secure" blocks gracefully.
 * 
 * @param {Page} page
 * @param {string} email - Gmail address (from GMAIL_USER env)
 * @param {string} password - Gmail password (from GMAIL_PASS env)
 * @returns {'success' | 'blocked' | 'failed'}
 */
async function loginToGmail(page, email, password) {
  try {
    // Navigate to Google sign-in
    console.log('🤖 Navigating to Google sign-in...');
    await page.goto('https://accounts.google.com/signin/v2/identifier', {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });
    await page.waitForTimeout(2000);

    // Step 1: Enter email
    const emailInput = await page.waitForSelector('input[type="email"]', { timeout: 8000 });
    if (!emailInput) {
      console.warn('⚠️ Could not find email input');
      return 'failed';
    }
    await emailInput.fill(email);
    await page.waitForTimeout(500);

    // Click Next
    const nextBtn = await page.$('#identifierNext');
    if (nextBtn) {
      await nextBtn.click();
    } else {
      await page.keyboard.press('Enter');
    }
    await page.waitForTimeout(3000);

    // Detect: "This browser or app may not be secure"
    const bodyText1 = await page.textContent('body').catch(() => '');
    if (bodyText1.includes('browser or app may not be secure') ||
        bodyText1.includes("Couldn't sign you in") ||
        bodyText1.includes('Browser not supported')) {
      console.warn('⚠️ Google blocked auto-login: "browser not secure"');
      return 'blocked';
    }

    // Step 2: Enter password
    let passInput;
    try {
      passInput = await page.waitForSelector('input[type="password"]', { timeout: 8000 });
    } catch {
      // Password field didn't appear — might be CAPTCHA or different flow
      const bodyText = await page.textContent('body').catch(() => '');
      if (bodyText.includes('captcha') || bodyText.includes('CAPTCHA') ||
          bodyText.includes('Verify') || bodyText.includes('verify')) {
        console.warn('⚠️ CAPTCHA detected — falling back to manual login');
        return 'blocked';
      }
      console.warn('⚠️ Password field not found');
      return 'failed';
    }

    await passInput.fill(password);
    await page.waitForTimeout(500);

    // Click password Next
    const passNext = await page.$('#passwordNext');
    if (passNext) {
      await passNext.click();
    } else {
      await page.keyboard.press('Enter');
    }
    await page.waitForTimeout(5000);

    // Detect: wrong password
    const bodyText2 = await page.textContent('body').catch(() => '');
    if (bodyText2.includes('Wrong password') || bodyText2.includes('Incorrect password')) {
      console.error('❌ Wrong password for ' + email);
      return 'failed';
    }

    // Detect: 2FA / phone verification / unusual activity
    if (bodyText2.includes('2-Step Verification') ||
        bodyText2.includes('Verify it') ||
        bodyText2.includes('Confirm your recovery') ||
        bodyText2.includes('unusual activity') ||
        bodyText2.includes('Verify your identity')) {
      console.warn('⚠️ Google requires 2FA/verification — falling back to manual login');
      return 'blocked';
    }

    // Step 3: Wait for Gmail inbox URL
    try {
      await page.waitForURL(/mail\.google\.com\/mail\/u\/\d+/, { timeout: 15000 });
      console.log('✅ Auto-login successful for ' + email);
      return 'success';
    } catch {
      // Check if we ended up on Gmail anyway
      if (page.url().includes('mail.google.com/mail/u/')) {
        console.log('✅ Auto-login successful (fallback URL check)');
        return 'success';
      }
      console.warn('⚠️ Did not reach Gmail inbox after login');
      return 'failed';
    }
  } catch (err) {
    console.warn('⚠️ Auto-login error: ' + err.message);
    return 'failed';
  }
}

/**
 * 2-Tier Gmail Login Strategy:
 *   1. Cookies → already logged in? Done.
 *   2. Manual fallback → Wait for user to login in browser window.
 * 
 * Saves cookies after any successful login for future runs.
 * 
 * @param {Page} page
 * @param {BrowserContext} context
 * @param {string} cookiesFile - Path to save cookies (null = don't save)
 * @returns {boolean} true if logged in successfully
 */
async function waitForGmailLogin(page, context, cookiesFile) {
  console.log('🔐 Navigating to Gmail...');

  try {
    await page.goto('https://mail.google.com', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
  } catch (e) {
    console.warn(`⚠️ Gmail navigation timeout (continuing): ${e.message}`);
  }

  // Give page time to settle (redirects, cookie-based auto-login)
  await page.waitForTimeout(3000);

  // ── TIER 1: Already logged in via cookies? ──────────────────────
  const currentUrl = page.url();
  if (currentUrl.includes('mail.google.com/mail/u/')) {
    console.log('✅ Already logged in via cookies!');
    // Refresh cookies so they don't expire
    if (cookiesFile) {
      try {
        const dir = path.dirname(cookiesFile);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const cookies = await context.cookies();
        fs.writeFileSync(cookiesFile, JSON.stringify(cookies, null, 2));
        console.log(`🍪 Cookies refreshed → ${cookiesFile}`);
      } catch (e) {
        console.warn(`⚠️ Could not save cookies: ${e.message}`);
      }
    }
    return true;
  }

  // ── TIER 2: Manual login fallback (Primary Flow) ────────────────
  console.log('⏳ Waiting for manual Gmail login...');
  console.log('   Please login in the Chrome window.');

  try {
    await page.waitForURL(/mail\.google\.com\/mail\/u\/\d+/, {
      timeout: LOGIN_TIMEOUT_MS,
      waitUntil: 'domcontentloaded',
    });

    console.log('✅ Gmail login detected (manual)!');
    await page.waitForTimeout(3000);

    // Save cookies
    if (cookiesFile) {
      try {
        const dir = path.dirname(cookiesFile);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const cookies = await context.cookies();
        fs.writeFileSync(cookiesFile, JSON.stringify(cookies, null, 2));
        console.log(`🍪 Cookies saved → ${cookiesFile}`);
      } catch (e) {
        console.warn(`⚠️ Could not save cookies: ${e.message}`);
      }
    }

    return true;
  } catch (e) {
    // Final fallback: URL check
    const finalUrl = page.url();
    if (finalUrl.includes('mail.google.com/mail/u/')) {
      console.log('✅ Gmail login detected (fallback URL check)!');
      return true;
    }
    console.error(`❌ Login timeout after ${LOGIN_TIMEOUT_MS / 1000}s: ${e.message}`);
    return false;
  }
}

// ─── FIX 1: Session Health Check ────────────────────────────────────

// ─── FIX 1: Session Health Check ────────────────────────────────────

/**
 * Check if Gmail session is still active.
 * Returns true if compose button visible (= logged in).
 * Returns false if redirected to login page.
 */
async function isStillLoggedIn(page) {
  try {
    const url = page.url();
    // Primary: URL-based detection (most reliable)
    if (url.includes('mail.google.com/mail/u/')) return true;
    // Logged out: redirected to accounts.google.com
    if (url.includes('accounts.google.com') || url.includes('signin')) return false;
    return false;
  } catch {
    return false;
  }
}

/**
 * Check session health every SESSION_HEALTH_CHECK_INTERVAL emails.
 * If expired: update status, wait for re-login, then resume.
 * 
 * @param {Page} page
 * @param {BrowserContext} context
 * @param {string} cookiesFile
 * @param {Function} onSessionExpired - callback when session expires
 * @param {Function} onSessionRestored - callback when session restored
 */
async function checkSessionHealth(page, context, cookiesFile, onSessionExpired, onSessionRestored) {
  const alive = await isStillLoggedIn(page);
  if (!alive) {
    console.warn('⚠️ Gmail session expired!');
    
    if (onSessionExpired) await onSessionExpired();

    console.log('🔐 Please re-login to Gmail in the browser window...');
    const loggedIn = await waitForGmailLogin(page, context, cookiesFile);
    
    if (loggedIn && onSessionRestored) {
      await onSessionRestored();
      console.log('✅ Session restored — resuming');
    }
    
    return loggedIn;
  }
  return true;
}

// ─── FIX 2: Adaptive Rate Limiting ──────────────────────────────────

/**
 * Progressive delay based on how many emails processed.
 * These delays are BETWEEN batches, not per-email.
 * At 75 emails/batch, we only sleep between batches.
 * Phase 1 (0-150):     800ms — warmup: slow start
 * Phase 2 (150-750):   400ms — steady state
 * Phase 3 (750-3000):  600ms — sustained run
 * Phase 4 (3000+):    1000ms — long session protection
 * Plus random jitter: 0-300ms to appear human-like.
 */
function getAdaptiveDelay(emailIndex) {
  let baseDelay;
  if (emailIndex < 150) baseDelay = 800;
  else if (emailIndex < 750) baseDelay = 400;
  else if (emailIndex < 3000) baseDelay = 600;
  else baseDelay = 1000;

  const jitter = Math.random() * 300;
  return baseDelay + jitter;
}

/**
 * Returns pause duration in ms if a full pause is needed.
 * Every 5000 emails: 2 minute pause (long session cool-down)
 * Every 1000 emails: 20 second pause
 */
function shouldTakeFullPause(emailIndex) {
  if (emailIndex > 0 && emailIndex % 5000 === 0) return 120000;
  if (emailIndex > 0 && emailIndex % 1000 === 0) return 20000;
  return 0;
}

/**
 * Get human-readable phase label for frontend display.
 */
function getDelayPhase(emailIndex) {
  if (emailIndex < 150) return { phase: 'warmup', label: '⚡ Warmup (~2,400 emails/min)', delay: 800 };
  if (emailIndex < 750) return { phase: 'steady', label: '🔄 Steady (~3,200 emails/min)', delay: 400 };
  if (emailIndex < 3000) return { phase: 'sustained', label: '🐢 Sustained (~2,800 emails/min)', delay: 600 };
  return { phase: 'protection', label: '🛡️ Protection (~2,000 emails/min)', delay: 1000 };
}

// ─── Core Scraping Logic ────────────────────────────────────────────

/**
 * Upgrade Google profile image from small (s30) to desired size.
 */
function upgradeImageSize(url) {
  if (!url) return url;
  return url
    .replace(/=s\d+(-c)?/, `=s${IMAGE_SIZE}`)
    .replace(/\/s\d+(-c)?\//, `/s${IMAGE_SIZE}/`);
}

// ─── Compose Detection Helpers ──────────────────────────────────────
// Gmail dynamically generates CSS class names per Chromium version.
// e.g. "span.gO" in Chrome vs "span.E0E5jb" in Playwright's Chromium.
// So we MUST use stable selectors: name=, aria-label=, role=, text content.

// Broad To-field selector — covers all Gmail variants
const TO_FIELD_SELECTOR = [
  'textarea[name="to"]',
  'input[name="to"]',
  'div[name="to"]',
  'input[aria-label="To recipients"]',
  'input[aria-label="To"]',
  'span[aria-label="Select contacts"]',  // confirmed from user's HTML
].join(', ');

const DEBUG = process.env.GMAIL_SCRAPER_DEBUG === 'true';

async function logDomCounts(page, label) {
  if (!DEBUG) return;
  const selectors = [
    'img[src*="googleusercontent"]',
    'div[role="button"] img',
    'span[email]',
    '.vR',
    'div[data-hovercard-id]',
  ];
  const counts = {};
  for (const sel of selectors) {
    try {
      counts[sel] = await page.locator(sel).count();
    } catch {
      counts[sel] = -1;
    }
  }
  console.log(`[GMAIL_SCRAPER][DOM_COUNTS] ${label}`, counts);
}

async function getChipCount(page) {
  // Gmail recipient chips are inconsistent across runs; use a few stable-ish candidates.
  // IMPORTANT: do not use '.vR' here; it's too broad in Gmail and can include non-chip UI nodes.
  const selectors = ['span[email]', 'div[data-hovercard-id]'];
  let max = 0;
  for (const sel of selectors) {
    try {
      const c = await page.locator(sel).count();
      if (c > max) max = c;
    } catch {
      // ignore
    }
  }
  return max;
}

async function getAvatarCount(page) {
  // Exclude default placeholders when possible.
  const sel = 'img[src*="googleusercontent"]:not([src*="default-user"])';
  try {
    return await page.locator(sel).count();
  } catch {
    return 0;
  }
}

/**
 * Wait for compose To field to appear (with timeout).
 * Returns the element or null.
 */
async function waitForToField(page, timeoutMs = 5000) {
  try {
    return await page.waitForSelector(TO_FIELD_SELECTOR, { timeout: timeoutMs });
  } catch {
    return null;
  }
}

/**
 * Open the Gmail compose window.
 */
async function openCompose(page) {
  try {
    // Check if compose is already open
    const existingTo = await page.$(TO_FIELD_SELECTOR);
    if (existingTo) {
      console.log('📝 Compose window already open');
      return true;
    }

    // Strategy 1: Click div[gh="cm"] — confirmed compose button
    console.log('📝 Looking for compose button div[gh="cm"]...');
    const ghBtn = await page.$('div[gh="cm"]');
    if (ghBtn) {
      console.log('📝 Found compose button, clicking...');
      await ghBtn.click();
      const toField = await waitForToField(page, 5000);
      if (toField) {
        console.log('✅ Compose window opened (div[gh=cm])');
        return true;
      }
      console.log('⚠️ Compose button clicked but To field not detected');
    } else {
      console.log('⚠️ div[gh="cm"] not found');
    }

    // Strategy 2: Keyboard shortcut 'c'
    console.log('📝 Trying keyboard shortcut (c)...');
    await page.keyboard.press('c');
    const toField2 = await waitForToField(page, 5000);
    if (toField2) {
      console.log('✅ Compose window opened (keyboard shortcut)');
      return true;
    }

    // Strategy 3: Navigate directly to compose URL
    console.log('📝 Navigating to compose URL...');
    await page.goto('https://mail.google.com/mail/u/0/#inbox?compose=new', {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });
    const toField3 = await waitForToField(page, 8000);
    if (toField3) {
      console.log('✅ Compose window opened (URL navigation)');
      return true;
    }

    // DEBUG: Dump what we CAN find on the page
    console.error('❌ All compose strategies failed');
    try {
      const bodyText = await page.evaluate(() => {
        const forms = document.querySelectorAll('form');
        const textareas = document.querySelectorAll('textarea');
        const inputs = document.querySelectorAll('input');
        const spans = document.querySelectorAll('span[aria-label]');
        return {
          url: window.location.href,
          forms: forms.length,
          textareas: Array.from(textareas).map(t => ({ name: t.name, id: t.id })),
          inputs: Array.from(inputs).slice(0, 10).map(i => ({ name: i.name, type: i.type, ariaLabel: i.ariaLabel })),
          ariaSpans: Array.from(spans).slice(0, 10).map(s => ({ text: s.textContent, ariaLabel: s.ariaLabel })),
        };
      });
      console.log('Page debug info:', JSON.stringify(bodyText, null, 2));
    } catch (e) {
      console.log('Could not get debug info:', e.message);
    }
    return false;
  } catch (e) {
    console.error(`❌ Failed to open compose: ${e.message}`);
    return false;
  }
}

/**
 * Close the compose window.
 */
async function closeCompose(page) {
  try {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    // Click discard if dialog appears
    const discardBtn = await page.$('button[name="ok"], div[role="button"][aria-label*="Discard"]');
    if (discardBtn) {
      await discardBtn.click();
      await page.waitForTimeout(500);
    }
  } catch {
    // Ignore close errors
  }
}

/**
 * Clear the "To" field between emails.
 */
async function clearToField(page) {
  try {
    await page.waitForTimeout(200);
    const chipsBefore = await getChipCount(page);
    console.log("Clearing field...");
    console.log("Chips before clearing:", chipsBefore);
    if (DEBUG) await logDomCounts(page, 'clearToField:before');

    // Ensure focus is inside the To field so keyboard deletion works.
    const toEl = await page.$(TO_FIELD_SELECTOR);
    if (toEl) {
      await toEl.click();
      await page.waitForTimeout(100);
    }

    // Iterative deletion: Gmail chips can be protected by UI timing; do a loop until chip count drops to 0.
    // Avoid infinite loops: cap at 12 attempts.
    for (let attempt = 1; attempt <= 12; attempt++) {
      const chipCount = await getChipCount(page);
      if (chipCount === 0) break;

      // Try Ctrl/Cmd+A then Backspace (works for textarea/input chips; also usually clears tokens in div-based To field).
      // Use Control+A; on Mac this might need Meta+A, but your worker targets Chromium/Windows UA.
      try {
        await page.keyboard.press('Control+a');
      } catch {
        // ignore
      }
      await page.keyboard.press('Backspace');
      await page.waitForTimeout(250);
    }

    // Final fallback (keyboard only): one more Ctrl+A + Backspace.
    // Avoid click-based cleanup because Gmail UI nodes can be too broad (.vR etc).
    try {
      await page.keyboard.press('Control+a');
    } catch {
      // ignore
    }
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(300);

    const chipsAfter = await getChipCount(page);
    console.log("Clearing field done.");
    console.log("Chips after clearing:", chipsAfter);
    if (DEBUG) await logDomCounts(page, 'clearToField:after');
  } catch {
    // Best effort
  }
}

/**
 * DOM fallback — try to extract photo URL from rendered DOM elements.
 */
async function getDomFallbackUrl(page, email) {
  try {
    // Check for profile images in the compose area
    const imgs = await page.$$('img[src*="googleusercontent"]');
    for (const img of imgs) {
      const src = await img.getAttribute('src');
      if (src && src.includes('googleusercontent') && !src.includes('default-user')) {
        return upgradeImageSize(src);
      }
    }

    // Check data-hovercard for profile image
    const hovercard = await page.$(`div[data-hovercard-id="${email}"] img, span[email="${email}"] img`);
    if (hovercard) {
      const src = await hovercard.getAttribute('src');
      if (src && src.includes('googleusercontent')) {
        return upgradeImageSize(src);
      }
    }

    return '';
  } catch {
    return '';
  }
}

/**
 * CORE METHOD: Scrape profile photo via network interception.
 * Sets up response listener BEFORE typing email, then types to trigger
 * Gmail's profile photo request.
 * 
 * @param {Page} page
 * @param {string} email
 * @returns {string} Photo URL or empty string
 */
async function getPhotoViaInterception(page, email) {
  return new Promise(async (resolve) => {
    let resolved = false;

    // STEP 1: Set up network listener BEFORE typing (order is critical)
    const responseHandler = async (response) => {
      if (resolved) return;

      const url = response.url();
      const isPhotoUrl =
        url.includes('/photos/photo/') ||
        url.includes('photos?email=') ||
        url.includes('contacts.google.com') ||
        url.includes('people.googleapis.com');
      if (!isPhotoUrl) return;

      try {
        const status = response.status();

        // 302 redirect — Location header IS the image URL
        if (status === 302 || status === 301) {
          const location = response.headers()['location'] || '';
          if (location.includes('googleusercontent')) {
            resolved = true;
            page.off('response', responseHandler);
            resolve(upgradeImageSize(location));
            return;
          }
        }

        // 200 — check URL or parse body
        if (status === 200) {
          const finalUrl = response.url();
          if (finalUrl.includes('googleusercontent')) {
            resolved = true;
            page.off('response', responseHandler);
            resolve(upgradeImageSize(finalUrl));
            return;
          }
          try {
            const body = await response.text();
            const match = body.match(/https:\/\/lh3\.googleusercontent\.com\/[^\s"']+/);
            if (match) {
              resolved = true;
              page.off('response', responseHandler);
              resolve(upgradeImageSize(match[0]));
              return;
            }
          } catch (_) {}
        }
      } catch (_) {}
    };

    page.on('response', responseHandler);

    // STEP 2: Type email in the To field using class-independent selectors
    try {
      // Try textarea/input first (most reliable for typing)
      let toInput = await page.$('textarea[name="to"], input[name="to"]');
      
      if (toInput) {
        await toInput.click();
        await toInput.fill('');
        await page.waitForTimeout(200);
        await toInput.type(email, { delay: 30 });
      } else {
        // Fallback: find any To field element and click it to activate typing
        const toEl = await page.$(TO_FIELD_SELECTOR);
        if (toEl) {
          await toEl.click();
          await page.waitForTimeout(300);
          // After clicking, a textarea/input may appear — try to use it
          const activatedInput = await page.$('textarea[name="to"], input[name="to"]');
          if (activatedInput) {
            await activatedInput.type(email, { delay: 30 });
          } else {
            // Type via keyboard directly
            await page.keyboard.type(email, { delay: 30 });
          }
        } else {
          // Last resort: Tab into the To field
          await page.keyboard.press('Tab');
          await page.waitForTimeout(200);
          await page.keyboard.type(email, { delay: 30 });
        }
      }

      await page.waitForTimeout(1200);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(600);
    } catch (e) {
      page.off('response', responseHandler);
      if (!resolved) resolve('');
      return;
    }

    // STEP 3: Timeout fallback after 4s
    setTimeout(async () => {
      if (resolved) return;
      page.off('response', responseHandler);
      const domUrl = await getDomFallbackUrl(page, email);
      resolved = true;
      resolve(domUrl);
    }, 4000);
  });
}

/**
 * BATCH METHOD: Scrape profile photos for multiple emails in one compose cycle.
 * Types all emails sequentially (150ms apart), intercepts all photo responses
 * via a single listener using a Map keyed by email address.
 *
 * ~12-14x throughput improvement over single-email mode:
 *   Single: 1 email per 4-5s = ~12/min
 *   Batch:  20 emails per 8-10s = ~120-150/min
 *
 * @param {Page} page - Playwright Page (must have compose open)
 * @param {string[]} emails - Array of email addresses to process
 * @returns {Map<string, string>} Map of email (lowercase) → image URL (or "")
 */
async function getPhotoBatchViaInterception(page, emails) {
  const results = new Map();        // email → imageUrl (final output)
  const pending = new Map();        // email → { resolve, promise }
  const allPromises = [];

  // ── STEP 1: Build per-email Promises BEFORE attaching listener ────
  for (const email of emails) {
    const key = email.toLowerCase().trim();
    let resolveFn;
    const promise = new Promise((resolve) => { resolveFn = resolve; });
    pending.set(key, resolveFn);
    allPromises.push(promise.then(url => results.set(key, url)));
  }

  // ── STEP 2: Attach single response listener ──────────────────────
  let debugResponseCount = 0;
  let debugMatchCount = 0;
  const debugUrls = new Set(); // Track unique interesting URLs

  const responseHandler = async (response) => {
    if (pending.size === 0) return; // All resolved

    const url = response.url();
    const status = response.status();
    debugResponseCount++;

    // ── DEBUG: Log ALL potentially relevant URLs ──────────────────
    const urlLower = url.toLowerCase();
    if (urlLower.includes('photo') ||
        urlLower.includes('people') ||
        urlLower.includes('contacts') ||
        urlLower.includes('profile') ||
        urlLower.includes('googleusercontent') ||
        urlLower.includes('batchexecute') ||
        urlLower.includes('mail/u/0/') && !urlLower.includes('.js') && !urlLower.includes('.css')) {
      const shortUrl = url.length > 120 ? url.substring(0, 120) + '...' : url;
      if (!debugUrls.has(shortUrl)) {
        debugUrls.add(shortUrl);
        console.log(`    🔍 [${status}] ${shortUrl}`);
      }
    }

    const isPhotoUrl =
      url.includes('/photos/photo/') ||
      url.includes('photos?email=') ||
      url.includes('contacts.google.com') ||
      url.includes('people.googleapis.com') ||
      url.includes('googleusercontent.com') ||
      url.includes('batchexecute');  // Gmail uses batchexecute for RPC calls
    if (!isPhotoUrl) return;

    debugMatchCount++;
    console.log(`    ✅ MATCH [${status}] ${url.substring(0, 150)}`);

    try {
      // Extract email from URL
      let matchedEmail = null;

      // Primary: ?email= or &email= parameter
      const emailParam = url.match(/[?&/]email=([^&]+)/i);
      if (emailParam) {
        const extracted = decodeURIComponent(emailParam[1]).toLowerCase().trim();
        if (pending.has(extracted)) {
          matchedEmail = extracted;
        }
      }

      // Fallback: search URL for any pending email
      if (!matchedEmail) {
        for (const pendingEmail of pending.keys()) {
          if (urlLower.includes(encodeURIComponent(pendingEmail)) ||
              urlLower.includes(pendingEmail.replace('@', '%40')) ||
              urlLower.includes(pendingEmail)) {
            matchedEmail = pendingEmail;
            break;
          }
        }
      }

      // Extract photo URL from response
      let imageUrl = '';

      // 301/302 redirect — Location header is the image URL
      if (status === 302 || status === 301) {
        const location = response.headers()['location'] || '';
        if (location.includes('googleusercontent')) {
          imageUrl = upgradeImageSize(location);
        }
      }

      // 200 — check URL or parse body for googleusercontent URLs
      if (!imageUrl && status === 200) {
        const finalUrl = response.url();
        if (finalUrl.includes('googleusercontent')) {
          imageUrl = upgradeImageSize(finalUrl);
        } else {
          try {
            const body = await response.text();
            // Look for ALL googleusercontent URLs in the response body
            const allMatches = body.match(/https:\/\/lh3\.googleusercontent\.com\/[^\s"'\\)]+/g);
            if (allMatches && allMatches.length > 0) {
              console.log(`    📦 Found ${allMatches.length} googleusercontent URLs in response body`);

              // If we couldn't match email from URL, try to match from body
              // For batchexecute responses, body contains multiple email→photo mappings
              for (const photoUrl of allMatches) {
                // Try to find which pending email this photo belongs to
                // Check if the response body has the email near the photo URL
                for (const pendingEmail of pending.keys()) {
                  // Search for email in body near the photo URL
                  const emailIdx = body.toLowerCase().indexOf(pendingEmail);
                  if (emailIdx !== -1 && pending.has(pendingEmail)) {
                    const upgraded = upgradeImageSize(photoUrl);
                    // Check it's not a default avatar
                    if (!upgraded.includes('default-user')) {
                      console.log(`    📷 Matched: ${pendingEmail} → ${upgraded.substring(0, 80)}...`);
                      pending.get(pendingEmail)(upgraded);
                      pending.delete(pendingEmail);
                    }
                  }
                }
              }
              // Don't set imageUrl — we already resolved directly above
              return;
            }
          } catch (_) {}
        }
      }

      // Resolve single-email match
      if (matchedEmail && pending.has(matchedEmail)) {
        if (imageUrl) {
          console.log(`    📷 Resolved: ${matchedEmail} → ${imageUrl.substring(0, 80)}...`);
          pending.get(matchedEmail)(imageUrl);
          pending.delete(matchedEmail);
        }
      }
    } catch (err) {
      console.warn(`    ⚠️ Response handler error: ${err.message}`);
    }
  };

  page.on('response', responseHandler);

  try {
    // ── STEP 3: Focus To field ONCE then type all emails via keyboard ──
    // CRITICAL: Do NOT re-find or re-click the To input for each email.
    // After pressing Enter, Gmail creates a chip and the cursor stays
    // in the To field. Re-clicking breaks focus when chips obscure the element.

    // Focus the To field once at the start
    let focused = false;
    const toInput = await page.$('textarea[name="to"], input[name="to"]');
    if (toInput) {
      await toInput.click();
      focused = true;
    } else {
      const toEl = await page.$(TO_FIELD_SELECTOR);
      if (toEl) {
        await toEl.click();
        await page.waitForTimeout(200);
        focused = true;
      }
    }

    if (!focused) {
      // Last resort: Tab into the field
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);
    }

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      try {
        // Always use keyboard.type — cursor is already in To field
        await page.keyboard.type(email, { delay: 30 });
        // CRITICAL: Gmail fires the profile photo network request DURING this pause.
        // Single-email mode uses 1200ms here. Without this wait, Gmail never
        // triggers the contact lookup and no photo URLs are intercepted.
        await page.waitForTimeout(1000);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(300); // Let chip animation complete + re-focus input
      } catch (e) {
        console.warn(`  ⚠️ Failed to type email ${i + 1}/${emails.length} (${email}): ${e.message}`);
        const key = email.toLowerCase().trim();
        if (pending.has(key)) {
          pending.get(key)('');
          pending.delete(key);
        }
      }
    }

    // ── STEP 4: Wait for responses with 8s timeout ────────────────
    // Give Gmail time to respond for all typed emails
    await page.waitForTimeout(3000); // Initial wait for responses to arrive
    console.log(`    📡 After typing ${emails.length} emails: ${pending.size} still pending`);
    console.log(`    📊 Debug: ${debugResponseCount} total responses, ${debugMatchCount} pattern matches, ${debugUrls.size} unique interesting URLs`);

    // Set timeout for any still-pending emails
    const timeoutPromises = [];
    for (const [email, resolveFn] of pending.entries()) {
      timeoutPromises.push(
        new Promise((resolve) => {
          setTimeout(() => {
            if (pending.has(email)) {
              pending.get(email)(''); // Resolve with empty
              pending.delete(email);
            }
            resolve();
          }, 5000); // 5s more after initial 3s wait = 8s total
        })
      );
    }

    // Wait for all — either resolved by response or timed out
    await Promise.allSettled([...allPromises, ...timeoutPromises]);

  } finally {
    // ── STEP 5: Always clean up listener ──────────────────────────
    page.off('response', responseHandler);

    // Resolve any still-pending (safety net)
    for (const [email, resolveFn] of pending.entries()) {
      resolveFn('');
      pending.delete(email);
    }
  }

  return results;
}

// ─── DOM-Based Photo Extraction (Primary Method) ────────────────────

/**
 * DOM SELECTORS for Gmail compose avatars.
 * Gmail renders small avatar images next to recipient chips in the To field.
 * These selectors are ordered by reliability.
 */
const AVATAR_SELECTORS = [
  'img[data-hovercard-id]',
  'span[email] img',
  'div[data-hovercard-id] img',
  'img[src*="googleusercontent"]',
  'div[role="button"] img[src*="lh3"]',
];

/**
 * Extract a single profile photo via DOM after typing an email in compose.
 * 
 * Flow:
 *   1. Type email in To field (20ms/char)
 *   2. Press Enter to create chip
 *   3. Wait 1.5s for avatar to render
 *   4. Query DOM for avatar image using multiple selectors
 *   5. Extract src, upgrade size
 *   6. Return URL or empty string
 * 
 * @param {Page} page - Playwright page with compose open
 * @param {string} email - Email address to look up
 * @returns {string} Photo URL or empty string
 */
async function getPhotoViaDOM(page, email) {
  const emailLower = email.toLowerCase().trim();
  
  try {
    // Type the email
    await page.keyboard.type(email, { delay: 20 });
    await page.waitForTimeout(1000);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500); // Wait for avatar render

    // Query DOM for avatar
    const imageUrl = await page.evaluate((targetEmail, selectors) => {
      // Strategy 1: Find chip with matching email attribute and get its img
      const chips = document.querySelectorAll(`span[email="${targetEmail}"], div[data-hovercard-id="${targetEmail}"]`);
      for (const chip of chips) {
        const img = chip.querySelector('img');
        if (img && img.src && img.src.includes('googleusercontent') && !img.src.includes('default-user')) {
          return img.src;
        }
      }

      // Strategy 2: Check all hovercard images
      const hovercardImgs = document.querySelectorAll('img[data-hovercard-id]');
      for (const img of hovercardImgs) {
        const hid = img.getAttribute('data-hovercard-id');
        if (hid && hid.toLowerCase() === targetEmail) {
          if (img.src && img.src.includes('googleusercontent') && !img.src.includes('default-user')) {
            return img.src;
          }
        }
      }

      // Strategy 3: Find any recent googleusercontent image in compose area
      const composeArea = document.querySelector('div[role="dialog"]') || document.querySelector('form');
      if (composeArea) {
        const imgs = composeArea.querySelectorAll('img[src*="googleusercontent"]');
        for (const img of imgs) {
          if (img.src && !img.src.includes('default-user')) {
            return img.src;
          }
        }
      }

      // Strategy 4: Global fallback
      for (const sel of selectors) {
        const imgs = document.querySelectorAll(sel);
        for (const img of imgs) {
          if (img.src && img.src.includes('googleusercontent') && !img.src.includes('default-user')) {
            return img.src;
          }
        }
      }

      return '';
    }, emailLower, AVATAR_SELECTORS);

    return imageUrl ? upgradeImageSize(imageUrl) : '';
  } catch (err) {
    console.warn(`⚠️ DOM extraction failed for ${email}: ${err.message}`);
    return '';
  }
}

/**
 * BATCH DOM EXTRACTION: Scrape profile photos for multiple emails in one compose cycle.
 * 
 * This is the PRIMARY scraping method — ~10-12x faster than single-email mode.
 * 
 * Flow:
 *   Phase 1: Type all emails sequentially (20ms/char delay, 150ms between)
 *   Phase 2: Wait 2.5s for all avatars to render
 *   Phase 3: Query DOM once for all avatar images
 *   Phase 4: Map images to email addresses
 *   Phase 5: Fill missing with empty string
 * 
 * Throughput: ~120-150 emails/min vs ~12/min with single-email mode
 * 
 * @param {Page} page - Playwright page with compose open
 * @param {string[]} emails - Array of emails (max 20-30 per batch)
 * @returns {Map<string, string>} Map of email (lowercase) → image URL (or "")
 */
async function getPhotoBatchViaDOM(page, emails) {
  const results = new Map();
  const emailKeys = emails.map(e => e.toLowerCase().trim());

  try {
    // ── Phase 1: Focus To field once, then type all emails ──────────
    let focused = false;
    const toInput = await page.$('textarea[name="to"], input[name="to"]');
    if (toInput) {
      await toInput.click();
      focused = true;
    } else {
      const toEl = await page.$(TO_FIELD_SELECTOR);
      if (toEl) {
        await toEl.click();
        await page.waitForTimeout(200);
        focused = true;
      }
    }
    if (!focused) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);
    }

    console.log(`    📝 Typing ${emails.length} emails into To field...`);
    if (DEBUG) await logDomCounts(page, 'getPhotoBatchViaDOM:beforeTyping');

    // Per-email delay: 800ms is the minimum for Gmail to trigger AND complete
    // the avatar network request. Reducing below 800ms causes Gmail to cancel
    // pending avatar requests when new input arrives, resulting in 0 photos found.
    // Speed gains come from running 40 browsers in parallel, not from faster typing.
    const emailDelay = parseInt(process.env.GMAIL_EMAIL_DELAY_MS || '800', 10);
    
    for (let i = 0; i < emails.length; i++) {
      try {
        const email = emails[i];
        if (DEBUG) console.log(`      [DOM_BATCH] typing(${i + 1}/${emails.length}): ${email}`);
        await page.keyboard.type(email, { delay: 20 });
        await page.waitForTimeout(emailDelay); // Gmail needs this to trigger avatar fetch
        await page.keyboard.press('Enter');
        await page.waitForTimeout(150); // Chip creation + avatar render start
      } catch (e) {
        console.warn(`    ⚠️ Failed to type email ${i + 1}/${emails.length} (${emails[i]}): ${e.message}`);
      }
    }

    // ── Phase 2: Wait for avatars to STABILIZE (not just appear) ────
    console.log(`    ⏳ Waiting for chips + avatars to render...`);

    // Wait for chips to appear to avoid extracting too early.
    // Primary: wait until chip count is at least email count (best-effort).
    // Secondary: wait until some avatars exist.
    const start = Date.now();
    const timeoutMs = 15000;
    // eslint-disable-next-line no-constant-condition
    while (Date.now() - start < timeoutMs) {
      const chipsNow = await getChipCount(page);
      const avatarsNow = await getAvatarCount(page);
      if (chipsNow >= emailKeys.length && avatarsNow > 0) break;
      await page.waitForTimeout(300);
    }

    const chipsAfter = await getChipCount(page);
    const avatarsAfter = await getAvatarCount(page);
    console.log("Chips found:", chipsAfter);
    console.log("Images found:", avatarsAfter);
    console.log(`    🧩 DOM batch status: chips=${chipsAfter}, avatars=${avatarsAfter}`);
    if (DEBUG) await logDomCounts(page, 'getPhotoBatchViaDOM:afterTypingBeforeEvaluate');

    // ── Phase 3: Query DOM for all avatar images at once ───────────
    const avatarData = await page.evaluate((emailList) => {
      const result = [];

      // Strategy A: Find all chips with explicit email identifiers
      const chips = document.querySelectorAll('span[email], div[data-hovercard-id]');
      for (const chip of chips) {
        const email = (chip.getAttribute('email') || chip.getAttribute('data-hovercard-id') || '').toLowerCase();
        if (!email) continue;

        // Look for avatar img inside the chip node
        const img = chip.querySelector('img[src*="googleusercontent"]');
        if (img && img.src && img.src.includes('googleusercontent') && !img.src.includes('default-user')) {
          result.push({ email, src: img.src });
          continue;
        }

        // Fallback: sometimes img is wrapped one level up
        const parent = chip.parentElement;
        if (parent) {
          const nearbyImg = parent.querySelector('img[src*="googleusercontent"]');
          if (nearbyImg && nearbyImg.src && !nearbyImg.src.includes('default-user')) {
            result.push({ email, src: nearbyImg.src });
          }
        }
      }

      // Strategy B: Find all hovercard images
      const hovercardImgs = document.querySelectorAll('img[data-hovercard-id]');
      for (const img of hovercardImgs) {
        const email = (img.getAttribute('data-hovercard-id') || '').toLowerCase();
        if (email && img.src && img.src.includes('googleusercontent') && !img.src.includes('default-user')) {
          result.push({ email, src: img.src });
        }
      }

      // Strategy C: Find googleusercontent images in compose area
      const composeArea = document.querySelector('div[role="dialog"]') || document.querySelector('form');
      if (composeArea) {
        const gcImgs = composeArea.querySelectorAll('img[src*="googleusercontent"]');
        for (const img of gcImgs) {
          // Try to find associated email from nearby chip
          const nearbyChip = img.closest('span[email]') || img.closest('div[data-hovercard-id]');
          const email = nearbyChip
            ? (nearbyChip.getAttribute('email') || nearbyChip.getAttribute('data-hovercard-id') || '').toLowerCase()
            : null;
          if (img.src && img.src.includes('googleusercontent') && !img.src.includes('default-user')) {
            result.push({ email, src: img.src });
          }
        }
      }

      return result;
    }, emailKeys);

    // ── Phase 4: Map images to emails ──────────────────────────────
    let matchCount = 0;
    for (const { email, src } of avatarData) {
      if (!src || !src.includes('googleusercontent') || src.includes('default-user')) continue;

      if (email && emailKeys.includes(email) && !results.has(email)) {
        results.set(email, upgradeImageSize(src));
        matchCount++;
      }
    }

    // If we have unmatched googleusercontent images and unmatched emails,
    // try positional matching as last resort (Gmail renders chips in order)
    if (matchCount < emails.length) {
      // Positional fallback: if email attribute mapping fails, assign images in DOM order to remaining emails.
      const remainingEmails = emailKeys.filter(e => !results.has(e));
      const orderedImages = [];
      for (const { src } of avatarData) {
        if (!src || !src.includes('googleusercontent') || src.includes('default-user')) continue;
        orderedImages.push(src);
      }

      // De-dupe while keeping order
      const seen = new Set();
      const uniqImages = [];
      for (const src of orderedImages) {
        if (seen.has(src)) continue;
        seen.add(src);
        uniqImages.push(src);
      }

      if (uniqImages.length >= remainingEmails.length && remainingEmails.length > 0) {
        console.log(`    🧷 Positional fallback: mapping ${remainingEmails.length} remaining emails from ${uniqImages.length} images`);
        for (let idx = 0; idx < remainingEmails.length; idx++) {
          const email = remainingEmails[idx];
          results.set(email, upgradeImageSize(uniqImages[idx]));
          matchCount++;
        }
      }
    }

    console.log(`    📷 DOM extraction: ${matchCount}/${emails.length} photos found`);
    if (DEBUG) {
      const nonEmpty = [...results.values()].filter(v => v && v.length > 0).length;
      console.log(`    [DEBUG] DOM non-empty urls=${nonEmpty}/${emails.length}`);
      console.log("Extraction result:", Object.fromEntries([...results.entries()].slice(0, 10)));
    }

  } catch (err) {
    console.error(`    ❌ Batch DOM extraction error: ${err.message}`);
  }

  // ── Phase 5: Fill missing emails with empty string ──────────────
  for (const key of emailKeys) {
    if (!results.has(key)) {
      results.set(key, '');
    }
  }

  return results;
}

module.exports = {
  createBrowser,
  loginToGmail,
  waitForGmailLogin,
  isStillLoggedIn,
  checkSessionHealth,
  getAdaptiveDelay,
  shouldTakeFullPause,
  getDelayPhase,
  upgradeImageSize,
  openCompose,
  closeCompose,
  clearToField,
  getDomFallbackUrl,
  getPhotoViaInterception,
  getPhotoBatchViaInterception,
  getPhotoViaDOM,
  getPhotoBatchViaDOM,
  REOPEN_EVERY,
  SESSION_HEALTH_CHECK_INTERVAL,
  IMAGE_SIZE,
};
