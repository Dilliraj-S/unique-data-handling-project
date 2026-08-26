/**
 * HeadlessScraperService (CommonJS)
 * ------------------------------------------------------
 * Fallback scraper using Puppeteer for domains where static HTML extraction
 * fails to find contact information (typically 5-10% of domains).
 *
 * WORKFLOW:
 * 1. Render page with JavaScript enabled
 * 2. Detect and click "Contact / Get in Touch" buttons
 * 3. Wait for popup/modal/drawer to appear
 * 4. Extract ONLY popup DOM text (not full page)
 *
 * This service is ONLY called when:
 * - Static extraction confidence is below threshold
 * - Domain has incomplete data (missing address/phone)
 *
 * PERFORMANCE:
 * - Headless scraping is slow (5-15 seconds per domain)
 * - Only used as fallback (~5-10% of domains)
 * - Keeps overall system fast (85-90% domains finish in milliseconds)
 * - Uses browser pool to prevent memory leaks (CRITICAL)
 */

const puppeteer = require('puppeteer');

// ============================================================
// BROWSER POOL - Prevents memory leaks from launching new browser per domain
// ============================================================
let browserInstance = null;
let browserLaunchPromise = null;
let activePages = 0;
const MAX_PAGES_BEFORE_RESTART = 20; // Restart browser after 20 pages to prevent memory bloat
let pagesProcessed = 0;
let launchMutex = false; // Prevent concurrent launches

/**
 * Get or create browser instance (singleton pattern)
 * This prevents launching a new browser for every domain which causes OOM
 */
async function getBrowser() {
  // Wait for any pending launch
  while (launchMutex) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Check if browser needs restart (memory cleanup)
  if (browserInstance && pagesProcessed >= MAX_PAGES_BEFORE_RESTART) {
    console.log(`🔄 Restarting browser after ${pagesProcessed} pages (memory cleanup)`);
    try {
      await browserInstance.close();
    } catch (e) {
      // Ignore close errors
    }
    browserInstance = null;
    pagesProcessed = 0;
  }

  // Check if browser is still connected
  if (browserInstance) {
    try {
      // Simple check - if this fails, browser is dead
      const version = await browserInstance.version();
      if (version) {
        return browserInstance;
      }
    } catch (e) {
      console.log(`⚠️ Browser disconnected, launching new instance...`);
      browserInstance = null;
    }
  }

  // Launch new browser with mutex to prevent race conditions
  launchMutex = true;
  try {
    browserInstance = await puppeteer.launch({
      headless: 'new', // Use new headless mode (fixes deprecation warning)
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        // Removed --single-process and --no-zygote - causes crashes on Windows
      ],
    });
    
    console.log(`✅ Browser pool: Launched new browser instance`);
    
    // Handle browser disconnect
    browserInstance.on('disconnected', () => {
      console.log(`⚠️ Browser pool: Browser disconnected`);
      browserInstance = null;
    });

    pagesProcessed = 0;
    return browserInstance;
  } catch (launchErr) {
    console.error(`❌ Browser pool: Failed to launch browser:`, launchErr.message);
    browserInstance = null;
    throw launchErr;
  } finally {
    launchMutex = false;
  }
}


/**
 * Close browser pool (call on process exit)
 */
async function closeBrowserPool() {
  if (browserInstance) {
    try {
      await browserInstance.close();
      console.log(`✅ Browser pool: Closed browser instance`);
    } catch (e) {
      // Ignore close errors
    }
    browserInstance = null;
  }
}

// Graceful shutdown - close browser on process exit
process.on('SIGINT', async () => {
  await closeBrowserPool();
});
process.on('SIGTERM', async () => {
  await closeBrowserPool();
});
process.on('exit', () => {
  // Sync cleanup - can't await here
  if (browserInstance) {
    browserInstance.close().catch(() => {});
  }
});


// Contact button selectors (common patterns)
// Enhanced with icons, modern patterns, and emoji detection
const CONTACT_BUTTON_SELECTORS = [
  // Text-based selectors
  'a[href*="contact"]',
  'button:has-text("Contact")',
  'button:has-text("Get in Touch")',
  'button:has-text("Contact Us")',
  'a:has-text("Contact")',
  'a:has-text("Get in Touch")',
  'a:has-text("Contact Us")',
  'a:has-text("Locations")',
  'a:has-text("Find Us")',
  'a:has-text("About")',
  'a:has-text("About Us")',
  // ID/class-based selectors
  '#contact-button',
  '#contact-btn',
  '.contact-button',
  '.contact-btn',
  '[data-action="contact"]',
  '[data-target="contact"]',
  // Aria labels
  '[aria-label*="contact" i]',
  '[aria-label*="get in touch" i]',
  '[aria-label*="location" i]',
  // Icon-based (common icon patterns)
  'a[href*="contact"] svg',
  'button[class*="contact"]',
  'a[class*="contact"]',
  // Modern patterns (React/Vue components)
  '[data-testid*="contact"]',
  '[data-cy*="contact"]',
  '[role="button"][aria-label*="contact" i]',
];

// Popup/modal selectors
const POPUP_SELECTORS = [
  '[role="dialog"]',
  '[aria-modal="true"]',
  '.modal',
  '.popup',
  '.drawer',
  '.overlay',
  '[class*="modal"]',
  '[class*="popup"]',
  '[class*="drawer"]',
  '[class*="overlay"]',
  '[id*="modal"]',
  '[id*="popup"]',
];

/**
 * Extract text content from a DOM element (recursive, preserves structure)
 * NOTE: This is only used in the browser context via page.evaluate-style logic.
 */
function extractTextFromElement(element) {
  if (!element) return '';
  
  // Get direct text content
  let text = element.textContent || '';
  
  // Also check for nested <address> tags and include them
  const addressTags = element.querySelectorAll('address');
  if (addressTags.length > 0) {
    addressTags.forEach((addr) => {
      text += '\n' + (addr.textContent || '');
    });
  }
  
  return text.trim();
}

/**
 * Find and click contact button on page
 * Enhanced with icon detection and modern patterns
 * Returns true if button was found and clicked
 */
async function findAndClickContactButton(page) {
  try {
    // Wait for page to be interactive
    await page.waitForTimeout(2000);
    
    // Try each selector
    for (const selector of CONTACT_BUTTON_SELECTORS) {
      try {
        // Check if element exists and is visible
        const element = await page.$(selector);
        if (!element) continue;
        
        const isVisible = await page.evaluate((el) => {
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && 
                 style.visibility !== 'hidden' && 
                 style.opacity !== '0' &&
                 el.offsetWidth > 0 && 
                 el.offsetHeight > 0;
        }, element);
        
        if (!isVisible) continue;
        
        // Click the button
        await element.click();
        console.log(`✅ Clicked contact button with selector: ${selector}`);
        return true;
      } catch (e) {
        // Selector not found or not clickable, try next
        continue;
      }
    }
    
    // Enhanced Fallback: Try clicking by text content (including emoji/icon patterns)
    const buttons = await page.$$('button, a, [role="button"]');
    for (const button of buttons) {
      try {
        const buttonInfo = await page.evaluate((el) => {
          const text = (el.textContent || '').toLowerCase();
          const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
          const title = (el.getAttribute('title') || '').toLowerCase();
          const combined = `${text} ${ariaLabel} ${title}`;
          
          // Check for contact-related keywords
          const hasContactKeyword = 
            combined.includes('contact') || 
            combined.includes('get in touch') || 
            combined.includes('locations') ||
            combined.includes('find us') ||
            combined.includes('about');
          
          // Check for icon patterns (📍 📞 📧 📍 🏢)
          const hasIcon = /[📍📞📧🏢]/.test(text) || el.querySelector('svg');
          
          return {
            text: text.substring(0, 50),
            hasContactKeyword,
            hasIcon,
            isVisible: (() => {
              const style = window.getComputedStyle(el);
              return style.display !== 'none' && 
                     style.visibility !== 'hidden' &&
                     el.offsetWidth > 0 && 
                     el.offsetHeight > 0;
            })()
          };
        }, button);
        
        if ((buttonInfo.hasContactKeyword || buttonInfo.hasIcon) && buttonInfo.isVisible) {
          await button.click();
          console.log(`✅ Clicked contact button by text/icon: ${buttonInfo.text.substring(0, 30)}`);
          return true;
        }
      } catch (e) {
        continue;
      }
    }
    
    return false;
  } catch (err) {
    console.warn(`⚠️ Error finding/clicking contact button: ${err.message}`);
    return false;
  }
}

/**
 * Wait for popup/modal/drawer to appear
 * Returns the popup element if found, null otherwise
 */
async function waitForPopup(page, timeoutMs = 5000) {
  try {
    // Wait for any popup selector to appear
    for (const selector of POPUP_SELECTORS) {
      try {
        await page.waitForSelector(selector, { 
          visible: true, 
          timeout: timeoutMs 
        });
        const popup = await page.$(selector);
        if (popup) {
          console.log(`✅ Found popup with selector: ${selector}`);
          return popup;
        }
      } catch (e) {
        // Selector not found, try next
        continue;
      }
    }
    
    // Fallback: Check for elements with fixed/absolute positioning that cover the screen
    const overlaySelector = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        if (
          (style.position === 'fixed' || style.position === 'absolute') &&
          rect.width > window.innerWidth * 0.5 &&
          rect.height > window.innerHeight * 0.5 &&
          parseInt(style.zIndex) > 1000
        ) {
          // Return a unique selector for this element
          if (el.id) return `#${el.id}`;
          if (el.className && typeof el.className === 'string') {
            const classes = el.className.split(' ').filter(c => c).slice(0, 2).join('.');
            if (classes) return `.${classes}`;
          }
          // Fallback: use tag name with nth-child
          const parent = el.parentElement;
          if (parent) {
            const index = Array.from(parent.children).indexOf(el) + 1;
            return `${el.tagName.toLowerCase()}:nth-child(${index})`;
          }
        }
      }
      return null;
    });
    
    if (overlaySelector) {
      try {
        const popup = await page.$(overlaySelector);
        if (popup) {
          console.log(`✅ Found overlay popup with selector: ${overlaySelector}`);
          return popup;
        }
      } catch (e) {
        // Selector not valid, continue
      }
    }
    
    return null;
  } catch (err) {
    console.warn(`⚠️ Error waiting for popup: ${err.message}`);
    return null;
  }
}

/**
 * Extract structured address/location sections from the current page.
 * 
 * CRITICAL FIX: DOM-aware sibling joining for split addresses
 * 
 * Problem: Many sites split addresses across multiple DOM nodes:
 *   <div class="contact">
 *     <p>518 US Hwy 281 N</p>
 *     <p>Jacksboro, TX 76458</p>
 *   </div>
 * 
 * Solution: Join sibling text nodes INSIDE trusted containers:
 *   - class*="contact", class*="address", class*="location", class*="office"
 *   - <address> tags
 *   - footer sections
 * 
 * This produces: "518 US Hwy 281 N, Jacksboro, TX 76458"
 */
async function extractStructuredSections(page) {
  try {
    const sections = await page.evaluate(() => {
      const results = {
        addresses: [],
        phones: [],
        companies: [],
      };
      
      // ============================================================
      // 1. TRUSTED CONTAINER SELECTORS (where addresses live)
      //    Covers: Framer, Squarespace, Wix, WordPress, Webflow,
      //            Shopify, React/Vue/Angular, and generic patterns
      // ============================================================
      const CONTAINER_SELECTORS = [
        // === SEMANTIC HTML ===
        'address',
        
        // === STANDARD CLASS PATTERNS ===
        '[class*="contact" i]',
        '[class*="address" i]',
        '[class*="location" i]',
        '[class*="office" i]',
        '[class*="hq" i]',
        '[class*="headquarters" i]',
        '[class*="info" i]',
        '[class*="details" i]',
        
        // === SIDEBAR/ASIDE CONTAINERS ===
        'aside',
        '[class*="sidebar" i]',
        '[class*="aside" i]',
        '[class*="right-col" i]',
        '[class*="widget" i]',
        '[class*="info-box" i]',
        '[class*="company-info" i]',
        '[class*="business-info" i]',
        
        // === ID-BASED PATTERNS ===
        '[id*="contact" i]',
        '[id*="address" i]',
        '[id*="location" i]',
        '[id*="sidebar" i]',
        '[id*="footer" i]',
        
        // === DATA ATTRIBUTES ===
        '[data-section*="contact" i]',
        '[data-section*="address" i]',
        
        // === FRAMER FRAMEWORK ===
        '[data-framer-component-type="RichTextContainer"]',
        '[data-framer-component-type]',
        '[class*="framer" i]',
        
        // === SQUARESPACE FRAMEWORK ===
        '[data-block-type="text"]',
        '[data-block-type="html"]',
        '.sqs-block-content',
        '.sqs-block-html',
        '.sqs-layout',
        '.sqs-row',
        '[class*="squarespace" i]',
        
        // === WIX FRAMEWORK ===
        '[data-hook="rich-text"]',
        '[data-testid*="richText"]',
        '[class*="wixui" i]',
        '[data-comp="wixui.RichText"]',
        '[class*="TPASection" i]',
        
        // === WORDPRESS FRAMEWORK ===
        '.wp-block-paragraph',
        '.wp-block-group',
        '.wp-block-column',
        '.elementor-widget-text-editor',
        '.elementor-widget-heading',
        '.elementor-element',
        '.et_pb_text',
        '.et_pb_module',
        '.wpb_text_column',
        '.vc_column_text',
        '[class*="widget" i]',
        '[class*="wp-" i]',
        
        // === WEBFLOW FRAMEWORK ===
        '[class*="w-richtext"]',
        '.w-container',
        '.w-row',
        '[class*="webflow" i]',
        
        // === SHOPIFY FRAMEWORK ===
        '.shopify-section',
        '[data-section-type]',
        '.page-content',
        '.rte',
        
        // === REACT/VUE/ANGULAR PATTERNS ===
        '[data-testid*="address" i]',
        '[data-testid*="contact" i]',
        '[data-testid*="location" i]',
        '[data-cy*="address" i]',
        '[data-cy*="contact" i]',
        '[data-qa*="address" i]',
        '[data-qa*="contact" i]',
        
        // === FOOTER PATTERNS ===
        'footer',
        '[class*="footer" i]',
        '[role="contentinfo"]',
        
        // === GENERIC HEADING/TEXT FALLBACKS ===
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p',
      ];

      // ============================================================
      // 1.5. PATTERNS FOR ADDRESS/PHONE DETECTION
      // ============================================================
      
      // US/International Address Patterns
      const ADDRESS_PATTERNS = {
        // Street number at start
        streetNumber: /^\d+\s+[A-Za-z]/,
        // Street type keywords
        streetType: /\b(St|Street|Ave|Avenue|Rd|Road|Hwy|Highway|Dr|Drive|Blvd|Boulevard|Way|Lane|Ln|Ct|Court|Pl|Place|Circle|Cir|Trail|Tr|Pkwy|Parkway)\b/i,
        // US State + Zip
        usStateZip: /\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\s*\d{5}(-\d{4})?/i,
        // Canadian Postal
        canadianPostal: /\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/i,
        // UK Postal
        ukPostal: /\b[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}\b/i,
        // Australian State
        australianState: /\b(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\s*\d{4}\b/i,
        // German Postal
        germanPostal: /\b\d{5}\s+[A-Z]/i,
      };
      
      // Phone Patterns (Global)
      const PHONE_PATTERNS = [
        // International with +
        /\+\d{1,3}[\s.-]?\(?\d{2,4}\)?[\s.-]?\d{2,4}[\s.-]?\d{2,4}[\s.-]?\d{0,4}/g,
        // US/Canada (xxx) xxx-xxxx or xxx-xxx-xxxx
        /\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
        // Toll-free 1-800, 1-855, etc.
        /1[-.\s]?8(?:00|55|66|77|88)[-.\s]?\d{3}[-.\s]?\d{4}/g,
        // UK format
        /(?:\+44|0)\s?\d{2,4}\s?\d{3,4}\s?\d{3,4}/g,
        // Australian format
        /(?:\+61|0)\s?\d{1,2}\s?\d{4}\s?\d{4}/g,
      ];



      
      // ============================================================
      // 2. JOIN SIBLING TEXT NODES INSIDE CONTAINER
      //    CRITICAL: Handle BR tags, sibling p/div, nested spans
      // ============================================================
      
      // Helper: Extract text with BR→comma conversion (for Framer/etc)
      function extractTextWithBrJoining(element) {
        const html = element.innerHTML || '';
        return html
          .replace(/<br\s*\/?>/gi, ', ')           // <br> → comma
          .replace(/<\/p>\s*<p[^>]*>/gi, ', ')     // </p><p> → comma
          .replace(/<\/div>\s*<div[^>]*>/gi, ', ') // </div><div> → comma
          .replace(/<\/li>\s*<li[^>]*>/gi, ', ')   // </li><li> → comma
          .replace(/<[^>]+>/g, '')                  // Strip remaining HTML
          .replace(/\s+/g, ' ')                     // Normalize whitespace
          .replace(/,\s*,/g, ',')                   // Remove double commas
          .trim();
      }
      
      // Helper: Check if text is JUNK (marketing, navigation, forms)
      function isJunkText(text) {
        if (!text) return true;
        
        const junkPatterns = [
          // Navigation/Menu items
          /\b(home|about us|services|products|careers|blog|news|contact us|privacy policy|terms|sitemap)\b/gi,
          // Marketing phrases
          /\b(learn more|get started|sign up|subscribe|newsletter|click here|read more)\b/i,
          // Form field text
          /\b(first name|last name|email address|phone number|your message|submit|company)\b/i,
          // Legal/footer boilerplate
          /\b(all rights reserved|copyright|©|\bterms of (use|service)\b|privacy policy)\b/i,
          // Too many links/repetitive text
          /(\[.*?\]\(.*?\).*?){3,}/,  // 3+ markdown links
          // Cloudflare/bot protection
          /\b(cloudflare|ray id|attention required|checking your browser)\b/i,
          // Newsletter signup forms
          /\b(email\s*\*|by submitting|consent|unsubscribe|mailing list)\b/i,
          // Generic company descriptions (not addresses)
          /\b(we offer|we provide|we are|our team|global leader|industry|solutions|discover)\b/i,
          // Follow us / social media
          /\b(follow us|facebook|twitter|linkedin|instagram)\b/i,
        ];
        
        const lowerText = text.toLowerCase();
        
        // Too long is likely not an address
        if (text.length > 500) return true;
        
        // Check junk patterns
        for (const pattern of junkPatterns) {
          if (pattern.test(text)) return true;
        }
        
        // If mostly uppercase words (navigation), it's junk
        const words = text.split(/\s+/);
        const uppercaseWords = words.filter(w => w === w.toUpperCase() && w.length > 2);
        if (uppercaseWords.length > 3) return true;
        
        return false;
      }
      
      // Helper: Check if text looks like an address (RELAXED - catches more valid addresses)
      function looksLikeAddress(text) {
        if (!text || text.length < 10 || text.length > 400) return false;
        
        // First check if it's junk
        if (isJunkText(text)) return false;
        
        const hasStreetNumber = ADDRESS_PATTERNS.streetNumber.test(text);
        const hasStreetType = ADDRESS_PATTERNS.streetType.test(text);
        const hasUSStateZip = ADDRESS_PATTERNS.usStateZip.test(text);
        const hasCanadianPostal = ADDRESS_PATTERNS.canadianPostal.test(text);
        const hasUKPostal = ADDRESS_PATTERNS.ukPostal.test(text);
        const hasAUState = ADDRESS_PATTERNS.australianState.test(text);
        
        // Additional patterns for international/edge cases
        const hasGenericPostal = /\b\d{4,6}\b/.test(text); // Generic 4-6 digit postal
        const hasNorwayPostal = /\b\d{4}\s+[A-Z]/i.test(text); // Norwegian: "8271 Drag"
        const hasCityStateFormat = /,\s*[A-Z]{2}\s*\d{5}/i.test(text); // ", TX 76458"
        const hasStreetKeyword = /\b(street|st|avenue|ave|road|rd|drive|dr|boulevard|blvd|lane|ln|way|court|ct|place|pl|highway|hwy|floor|suite|ste|unit)\b/i.test(text);
        const hasDirectional = /\b(north|south|east|west|n|s|e|w|nw|ne|sw|se)\b/i.test(text);
        
        // High confidence patterns
        if (hasStreetNumber && hasUSStateZip) return true;
        if (hasStreetNumber && hasCanadianPostal) return true;
        if (hasStreetNumber && hasUKPostal) return true;
        if (hasStreetNumber && hasStreetType) return true;
        if (hasStreetNumber && hasStreetKeyword) return true;
        if (hasStreetNumber && hasCityStateFormat) return true;
        
        // Medium confidence: street number + comma (City, State format) + no junk
        if (hasStreetNumber && text.includes(',')) return true;
        
        // International: has postal + city-like text
        if (hasGenericPostal && hasStreetNumber && text.includes(',')) return true;
        if (hasNorwayPostal && text.includes(',')) return true;
        
        // Relaxed: street type/directional + zip-like pattern
        if ((hasStreetType || hasDirectional) && (hasGenericPostal || hasCityStateFormat)) return true;
        
        return false;
      }
      
      // Helper: Score an address for completeness (higher = more complete)
      function scoreAddress(text) {
        let score = 0;
        
        if (ADDRESS_PATTERNS.streetNumber.test(text)) score += 2;
        if (ADDRESS_PATTERNS.streetType.test(text)) score += 2;
        if (ADDRESS_PATTERNS.usStateZip.test(text)) score += 3;
        if (ADDRESS_PATTERNS.canadianPostal.test(text)) score += 3;
        if (ADDRESS_PATTERNS.ukPostal.test(text)) score += 3;
        if (text.includes(',')) score += 1;
        if (/suite|ste|#|unit|floor/i.test(text)) score += 1;
        if (/\b(usa|united states|canada|uk)\b/i.test(text)) score += 1;
        
        // Penalize junk
        if (isJunkText(text)) score -= 5;
        
        return score;
      }

      
      function extractJoinedAddress(container) {
        // First try: extract with BR joining (works for Framer/Squarespace)
        const brJoined = extractTextWithBrJoining(container);
        if (looksLikeAddress(brJoined)) {
          return brJoined;
        }
        
        // Second try: walk child nodes and join
        const textParts = [];
        
        const walker = (el) => {
          if (!el) return;
          
          // Skip script/style/nav/menu elements
          const tagName = el.tagName?.toLowerCase();
          if (['script', 'style', 'nav', 'menu', 'button', 'a', 'form', 'input'].includes(tagName)) return;
          
          // Get direct text content
          const children = el.childNodes;
          for (const child of children) {
            if (child.nodeType === Node.TEXT_NODE) {
              const text = child.textContent.trim();
              if (text && text.length > 1) {
                textParts.push(text);
              }
            } else if (child.nodeType === Node.ELEMENT_NODE) {
              const childTag = child.tagName?.toLowerCase();
              // For inline elements, get text directly
              if (['span', 'strong', 'b', 'em', 'i', 'small'].includes(childTag)) {
                const text = child.textContent.trim();
                if (text && text.length > 1) {
                  textParts.push(text);
                }
              } else if (['p', 'div', 'li', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(childTag)) {
                // For block elements, recurse
                const text = child.textContent.trim();
                if (text && text.length > 1) {
                  textParts.push(text);
                }
              }
            }
          }
        };
        
        walker(container);
        
        // Join parts, removing duplicates
        const uniqueParts = [...new Set(textParts)];
        return uniqueParts.join(', ').replace(/,\s*,/g, ',').trim();
      }

      
      // ============================================================
      // 3. EXTRACT FROM ALL TRUSTED CONTAINERS
      // ============================================================
      const selector = CONTAINER_SELECTORS.join(', ');
      const containers = document.querySelectorAll(selector);
      
      console.log(`[HeadlessScraper] Found ${containers.length} containers matching selectors`);
      
      containers.forEach(container => {
        // Skip very large containers (likely page wrappers)
        const text = container.textContent || '';
        if (text.length > 2000) return;
        
        // Get joined text from container
        const joined = extractJoinedAddress(container);
        
        // DEBUG: Log what we're finding
        if (joined && joined.length > 10) {
          console.log(`[HeadlessScraper] Container text: "${joined.substring(0, 100)}..."`);
        }
        
        // Use improved address detection logic
        if (joined && joined.length > 10 && looksLikeAddress(joined)) {
          // Double-check it's not junk
          if (!isJunkText(joined)) {
            results.addresses.push(joined);
            console.log(`[HeadlessScraper] ✅ Found address: "${joined}"`);
          } else {
            console.log(`[HeadlessScraper] ⚠️ Skipped junk: "${joined.substring(0, 60)}..."`);
          }
        }
        
        // Also extract phone numbers from container
        const phonePattern = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
        const phones = text.match(phonePattern);
        if (phones) {
          phones.forEach(p => results.phones.push(p.trim()));
        }
      });

      
      // ============================================================
      // 3.5. FALLBACK: Scan ALL h1-h6 for address patterns (FRAMER fix)
      // ============================================================
      if (results.addresses.length === 0) {
        console.log('[HeadlessScraper] No addresses from containers, trying h1-h6 fallback...');
        
        document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
          // Get text with br replaced by comma
          const html = heading.innerHTML;
          const textWithCommas = html
            .replace(/<br\s*\/?>/gi, ', ')
            .replace(/<[^>]+>/g, '')
            .replace(/\s+/g, ' ')
            .trim();
          
          // Check if it looks like an address
          if (textWithCommas.length > 15 && textWithCommas.length < 200) {
            const hasStreetNumber = /^\d+\s+[A-Za-z]/.test(textWithCommas);
            const hasState = /(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\s*\d{5}/i.test(textWithCommas);
            
            if (hasStreetNumber && hasState) {
              console.log(`[HeadlessScraper] ✅ Found address in heading: "${textWithCommas}"`);
              if (!results.addresses.includes(textWithCommas)) {
                results.addresses.push(textWithCommas);
              }
            }
          }
        });
      }

      
      // ============================================================
      // 4. EXTRACT FROM <address> TAGS (high confidence)
      // ============================================================
      document.querySelectorAll('address').forEach(el => {
        const joined = extractJoinedAddress(el);
        if (joined && joined.length > 15 && !results.addresses.includes(joined)) {
          results.addresses.push(joined);
        }
      });
      
      // ============================================================
      // 5. EXTRACT FROM FOOTER (common location)
      // ============================================================
      document.querySelectorAll('footer').forEach(footer => {
        // Look for address-like patterns in footer
        const footerText = footer.textContent || '';
        
        // US address pattern
        const usPattern = /\d+\s+[\w\s]+(?:Street|St|Ave|Avenue|Rd|Road|Blvd|Dr|Drive)[.,]?\s*(?:Suite|Ste|#)?\s*\d*[.,]?\s*[\w\s]+[.,]\s*(?:AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\s+\d{5}/gi;
        const footerAddrs = footerText.match(usPattern);
        if (footerAddrs) {
          footerAddrs.forEach(a => {
            if (!results.addresses.includes(a.trim())) {
              results.addresses.push(a.trim());
            }
          });
        }
      });
      // ============================================================
      // 6. EXTRACT FROM GOOGLE MAPS LINKS
      // ============================================================
      const mapsSelectors = [
        'a[href*="maps.google"]',
        'a[href*="goo.gl/maps"]',
        'a[href*="google.com/maps"]',
        'a[href*="google.co"]',
        'iframe[src*="google.com/maps"]',
      ];
      
      mapsSelectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
          try {
            const url = el.href || el.src || '';
            // Try to extract address from URL parameter
            const qMatch = url.match(/[?&]q=([^&]+)/);
            const placeMatch = url.match(/place\/([^\/]+)/);
            const dirMatch = url.match(/dir\/([^\/]+)/);
            
            let addr = null;
            if (qMatch) addr = decodeURIComponent(qMatch[1]).replace(/\+/g, ' ');
            else if (placeMatch) addr = decodeURIComponent(placeMatch[1]).replace(/\+/g, ' ');
            else if (dirMatch) addr = decodeURIComponent(dirMatch[1]).replace(/\+/g, ' ');
            
            if (addr && addr.length > 10 && !results.addresses.includes(addr)) {
              console.log(`[HeadlessScraper] ✅ Found address from Google Maps: "${addr}"`);
              results.addresses.push(addr);
            }
          } catch (e) {
            // Ignore URL parsing errors
          }
        });
      });
      
      // ============================================================
      // 7. ENHANCED PHONE EXTRACTION (Global Patterns)
      // ============================================================
      const bodyText = document.body?.textContent || '';
      PHONE_PATTERNS.forEach(pattern => {
        const matches = bodyText.match(pattern);
        if (matches) {
          matches.forEach(phone => {
            const cleaned = phone.trim();
            // Validate: must have 10+ digits total
            const digitCount = (cleaned.match(/\d/g) || []).length;
            if (digitCount >= 10 && digitCount <= 15 && !results.phones.includes(cleaned)) {
              results.phones.push(cleaned);
            }
          });
        }
      });
      
      // ============================================================
      // 8. EXTRACT COMPANY NAME FROM PAGE
      // ============================================================
      // From <title>
      const title = document.title || '';
      const titleParts = title.split(/[|\-–—]/);
      if (titleParts.length > 0) {
        const companyFromTitle = titleParts[0].trim();
        if (companyFromTitle.length > 2 && companyFromTitle.length < 100) {
          results.companyName = companyFromTitle;
        }
      }
      
      // From og:site_name (higher priority)
      const ogSiteName = document.querySelector('meta[property="og:site_name"]');
      if (ogSiteName?.content) {
        results.companyName = ogSiteName.content.trim();
      }
      
      // From Schema.org (highest priority)
      const ldScript = document.querySelector('script[type="application/ld+json"]');
      if (ldScript) {
        try {
          const json = JSON.parse(ldScript.textContent);
          if (json.name) results.companyName = json.name;
          if (json['@graph']) {
            for (const item of json['@graph']) {
              if (item['@type'] === 'Organization' && item.name) {
                results.companyName = item.name;
                break;
              }
            }
          }
        } catch (e) {}
      }
      
      console.log(`[HeadlessScraper] Final: ${results.addresses.length} addresses, ${results.phones.length} phones, company="${results.companyName || 'unknown'}"`);
      
      return results;

    });

    // Format output for downstream processing
    const addressText = (sections.addresses || []).join('\n');
    const phoneText = (sections.phones || []).join('\n');
    
    return {
      text: `${addressText}\n${phoneText}`.trim(),
      addresses: sections.addresses || [],
      phones: sections.phones || [],
    };
  } catch (err) {
    console.warn(`⚠️ Error extracting structured sections: ${err.message}`);
    return { text: '', addresses: [], phones: [] };
  }
}


/**
 * Extract text content from popup/modal ONLY
 * Enhanced to aggressively extract <address> tags from popups
 * This is critical: we don't want full page text, just the popup
 */
async function extractPopupText(page, popupElement) {
  try {
    if (!popupElement) return '';
    
    // Extract text from Puppeteer element handle
    const text = await page.evaluate((el) => {
      if (!el) return '';
      
      // Clone the element to avoid modifying the original
      const clone = el.cloneNode(true);
      
      // Remove script and style tags
      clone.querySelectorAll('script, style').forEach(tag => tag.remove());
      
      // AGGRESSIVE: Extract <address> tags from popup (high confidence source)
      const addressTags = clone.querySelectorAll('address');
      let addressText = '';
      if (addressTags.length > 0) {
        addressTags.forEach((addr) => {
          const addrText = (addr.textContent || '').trim();
          if (addrText) {
            addressText += '\n\n[ADDRESS TAG]: ' + addrText;
          }
        });
      }
      
      // Get main text content
      const mainText = clone.textContent || '';
      
      // Combine: address tags first (higher priority), then main text
      return addressText + (addressText ? '\n\n' : '') + mainText;
    }, popupElement);
    
    return text.trim();
  } catch (err) {
    console.warn(`⚠️ Error extracting popup text: ${err.message}`);
    return '';
  }
}

/**
 * Visit contact/location pages and extract data
 * OPTIMIZED: Early exit when address found, reduced wait times, domcontentloaded
 * Returns combined HTML from all visited pages
 */
async function crawlContactPages(page, baseUrl, options = {}) {
  // OPTIMIZED: Prioritized list - most likely to have address first
  const contactPages = ['/contact', '/contact-us', '/locations', '/about', '/about-us'];
  const maxPages = options.maxContactPages || 2; // OPTIMIZED: Limit pages (default 2)
  const visitedPages = [];
  let combinedHtml = '';
  let foundAddress = false;

  for (const path of contactPages) {
    // OPTIMIZED: Stop if we've visited enough pages or found address
    if (visitedPages.length >= maxPages || foundAddress) {
      break;
    }
    
    try {
      const contactUrl = new URL(path, baseUrl).toString();
      console.log(`🔍 Visiting contact page: ${contactUrl}`);
      
      // OPTIMIZED: Use domcontentloaded instead of networkidle2 (5-10s faster)
      await page.goto(contactUrl, {
        waitUntil: 'domcontentloaded',
        timeout: options.timeoutMs || 7500, // OPTIMIZED: reduced from 10000
      });
      
      // OPTIMIZED: Reduced wait from 2000ms to 800ms
      await new Promise(r => setTimeout(r, 800));
      
      const pageHtml = await page.content();
      combinedHtml += '\n\n<!-- PAGE: ' + path + ' -->\n\n' + pageHtml;
      visitedPages.push(path);
      
      // Check if this page has an address (for early exit)
      const quickAddressCheck = await page.evaluate(() => {
        const text = document.body?.textContent || '';
        // Quick regex check for address patterns
        const hasAddress = /\d+\s+[A-Za-z].*(?:St|Street|Ave|Avenue|Rd|Road|Hwy|Highway|Dr|Drive|Blvd)/i.test(text);
        const hasZip = /\b\d{5}(?:-\d{4})?\b/.test(text);
        return hasAddress && hasZip;
      });
      
      if (quickAddressCheck) {
        console.log(`✅ Found address on ${path}, early exit from contact crawl`);
        foundAddress = true;
        break; // OPTIMIZED: Don't visit remaining pages
      }
      
      // OPTIMIZED: Skip button click on contact pages (already on contact)
      // await findAndClickContactButton(page);
      // await page.waitForTimeout(1000);
      
    } catch (err) {
      // Page doesn't exist or failed to load, continue to next
      console.log(`⚠️ Could not visit ${path}: ${err.message}`);
      continue;
    }
  }

  return { combinedHtml, visitedPages, foundAddress };
}


/**
 * Main scraping function
 * Enhanced to visit contact pages and return full rendered HTML
 * 
 * @param {string} url - URL to scrape
 * @param {object} options - Options
 * @param {number} options.timeoutMs - Timeout in milliseconds (default: 15000)
 * @param {string} options.userAgent - User agent string
 * @param {boolean} options.visitContactPages - Whether to visit /contact, /locations, /about pages (default: false)
 * @returns {Promise<{html: string, popupText: string, sectionsText: string, success: boolean, contactPagesVisited: number}>}
 */
async function scrapeWithHeadless(url, options = {}) {
  const timeoutMs = options.timeoutMs || 15000;
  const userAgent = options.userAgent || 'Mozilla/5.0 (compatible; DomainEnrichmentBot/1.0; +https://example.com/bot)';
  const visitContactPages = options.visitContactPages !== false; // Default: true for Tier 2
  
  let page = null;
  let popupText = '';
  let sectionsText = '';
  let fullHtml = '';
  let contactPagesVisited = 0;
  
  try {
    console.log(`🌐 Starting headless scrape for: ${url}`);
    
    // Get browser from pool with retry
    let browser;
    let retries = 2;
    while (retries > 0) {
      try {
        browser = await getBrowser();
        // Test browser is responsive
        await browser.version();
        break;
      } catch (browserErr) {
        retries--;
        console.log(`⚠️ Browser pool error, retrying... (${retries} left)`);
        browserInstance = null; // Force new browser on next attempt
        if (retries === 0) throw browserErr;
        await new Promise(r => setTimeout(r, 500));
      }
    }
    
    // Create new page (this is lightweight, unlike launching browser)
    page = await browser.newPage();
    activePages++;

    
    // Set user agent
    await page.setUserAgent(userAgent);
    
    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Navigate to homepage URL with timeout
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: timeoutMs,
    });
    
    // Wait for JS to render (OPTIMIZED: reduced from 2000ms to 1000ms)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // CRITICAL: Scroll to bottom to trigger lazy-loaded content
    // Many modern sites load addresses only after scroll
    try {
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await new Promise(resolve => setTimeout(resolve, 500)); // OPTIMIZED: reduced from 1000ms
      console.log(`✅ Scrolled to bottom to load lazy content`);
    } catch (err) {
      console.warn(`⚠️ Error scrolling: ${err.message}`);
    }
    
    // Get initial HTML (for fallback extraction) - AFTER scroll to capture lazy content
    const initialHtml = await page.content();
    fullHtml = initialHtml;
    
    // Try to find and click contact button on homepage
    const buttonClicked = await findAndClickContactButton(page);
    
    if (buttonClicked) {
      // Wait for popup to appear (OPTIMIZED: reduced wait times)
      await new Promise(resolve => setTimeout(resolve, 500)); // OPTIMIZED: from 1000ms
      const popup = await waitForPopup(page, 2000); // OPTIMIZED: from 5000ms
      
      if (popup) {
        popupText = await extractPopupText(page, popup);
        console.log(`✅ Extracted ${popupText.length} characters from popup`);
      } else {
        console.log(`⚠️ Contact button clicked but no popup detected`);
      }
    } else {
      console.log(`⚠️ No contact button found on homepage`);
    }

    // Always try to extract structured address/location sections from homepage
    // extractStructuredSections now returns { text, addresses, phones }
    const sectionsResult = await extractStructuredSections(page);
    if (sectionsResult && sectionsResult.text) {
      sectionsText = sectionsResult.text;
      console.log(`✅ Extracted ${sectionsText.length} chars, ${sectionsResult.addresses?.length || 0} addresses, ${sectionsResult.phones?.length || 0} phones from structured sections`);
    }

    // NEW: Visit contact/location pages if enabled
    if (visitContactPages) {
      try {
        const { combinedHtml, visitedPages } = await crawlContactPages(page, url, { timeoutMs: timeoutMs / 2 });
        if (combinedHtml) {
          fullHtml += '\n\n<!-- CONTACT PAGES -->\n\n' + combinedHtml;
          contactPagesVisited = visitedPages.length;
          console.log(`✅ Visited ${contactPagesVisited} contact pages: ${visitedPages.join(', ')}`);
          
          // Extract structured sections from contact pages too
          const contactSectionsResult = await extractStructuredSections(page);
          if (contactSectionsResult && contactSectionsResult.text) {
            sectionsText += '\n\n' + contactSectionsResult.text;
            console.log(`✅ Contact page extraction: ${contactSectionsResult.addresses?.length || 0} addresses found`);
          }
        }
      } catch (err) {
        console.warn(`⚠️ Error visiting contact pages: ${err.message}`);
      }
    }
    
    // Collect addresses and phones from all extractions
    let allAddresses = [];
    let allPhones = [];
    let companyName = '';
    
    // Add addresses from initial extraction
    if (sectionsResult && sectionsResult.addresses) {
      allAddresses.push(...sectionsResult.addresses);
    }
    if (sectionsResult && sectionsResult.phones) {
      allPhones.push(...sectionsResult.phones);
    }
    if (sectionsResult && sectionsResult.companyName) {
      companyName = sectionsResult.companyName;
    }
    
    // Return full rendered HTML (homepage + contact pages), popup text, and structured sections
    return {
      html: fullHtml, // FULL RENDERED HTML (critical for Tier 2)
      popupText: popupText,
      sectionsText: sectionsText,
      // NEW: Return pre-extracted addresses/phones directly
      addresses: [...new Set(allAddresses)], // Dedupe
      phones: [...new Set(allPhones)],       // Dedupe
      companyName: companyName,
      success: true,
      contactPagesVisited: contactPagesVisited,
    };

  } catch (err) {
    console.error(`❌ Headless scrape failed for ${url}:`, err.message);
    return {
      html: '',
      popupText: '',
      sectionsText: '',
      success: false,
      error: err.message,
      contactPagesVisited: 0,
    };
  } finally {
    // Close page (NOT browser) - browser is pooled
    if (page) {
      try {
        await page.close();
        activePages--;
        pagesProcessed++;
      } catch (e) {
        // Page might already be closed
      }
    }
  }
}


module.exports = {
  scrapeWithHeadless,
  findAndClickContactButton,
  waitForPopup,
  extractPopupText,
  closeBrowserPool, // Export for worker to call on shutdown
};


