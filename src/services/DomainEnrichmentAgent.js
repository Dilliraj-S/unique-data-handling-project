/**
 * DomainEnrichmentAgent (CommonJS)
 * ------------------------------------------------------
 * Core logic for:
 *  - Fetching a domain homepage (and optional secondary pages)
 *  - Extracting company_name, address, phone from HTML
 *  - Scoring candidates and returning the BEST one
 *
 * ENHANCED PIPELINE (Production-Ready):
 * 1. Static HTML Extraction (Schema.org, meta tags, regex, maps)
 * 2. Confidence Check → If high confidence → return result
 * 3. Headless Scraper Fallback (Puppeteer) → Extract popup/modal content
 * 4. Merge popup data with static extraction
 * 5. Re-score deterministically
 * 6. LLM Disambiguation (OpenRouter) → Only if still ambiguous
 * 7. Return final result
 *
 * PERFORMANCE NOTES
 * ------------------------------------------------------
 * This module is heavily IO-bound (HTTP).
 * To keep throughput high for 10k–100k domains we:
 *  - Fetch homepage URL variants in parallel (Promise.any)
 *  - Fetch contact pages in parallel (Promise.allSettled)
 *  - Short‑circuit early when confidence is high enough (85-90% of domains)
 *  - Headless scraper only for 5-10% of domains (low confidence)
 *  - LLM only for 1-2% of domains (ambiguous cases)
 *
 * Final output is aligned with CSV header:
 *   domain, company_name, address, phone
 */

// Parsing implemented via Regex/String manipulation to avoid heavy dependencies.

// Lazy-load services to avoid startup overhead (only load when needed)
let HeadlessScraperService = null;
let LLMService = null;
let JinaReaderService = null;
let AddressValidator = null;
let MarkdownExtractor = null;

function getHeadlessScraperService() {
  if (!HeadlessScraperService) {
    try {
      HeadlessScraperService = require('./HeadlessScraperService.js');
    } catch (e) {
      console.warn('⚠️ HeadlessScraperService not available:', e.message);
    }
  }
  return HeadlessScraperService;
}

function getLLMService() {
  if (!LLMService) {
    try {
      LLMService = require('./LLMService.js');
    } catch (e) {
      console.warn('⚠️ LLMService not available:', e.message);
    }
  }
  return LLMService;
}

function getJinaReaderService() {
  if (!JinaReaderService) {
    try {
      JinaReaderService = require('./JinaReaderService.js');
    } catch (e) {
      console.warn('⚠️ JinaReaderService not available:', e.message);
    }
  }
  return JinaReaderService;
}

function getAddressValidator() {
  if (!AddressValidator) {
    try {
      AddressValidator = require('./AddressValidator.js');
    } catch (e) {
      console.warn('⚠️ AddressValidator not available:', e.message);
    }
  }
  return AddressValidator;
}

function getMarkdownExtractor() {
  if (!MarkdownExtractor) {
    try {
      MarkdownExtractor = require('./MarkdownExtractor.js');
    } catch (e) {
      console.warn('⚠️ MarkdownExtractor not available:', e.message);
    }
  }
  return MarkdownExtractor;
}

// ============================================================
// CLOUDFLARE/BOT PROTECTION DETECTION
// ============================================================
const BLOCKED_PAGE_PATTERNS = [
  /attention\s+required/i,
  /just\s+a\s+moment/i,
  /checking\s+your\s+browser/i,
  /cloudflare/i,
  /access\s+denied/i,
  /please\s+verify\s+you\s+are\s+human/i,
  /enable\s+javascript\s+and\s+cookies/i,
  /captcha/i,
  /ddos\s+protection/i,
  /security\s+check/i,
  /ray\s+id/i,  // Cloudflare Ray ID
];

/**
 * Detect if page is blocked by Cloudflare or bot protection
 */
function isBlockedPage(html) {
  if (!html || html.length < 100) return false;
  
  // Check for blocked patterns
  const hasBlockedPattern = BLOCKED_PAGE_PATTERNS.some(p => p.test(html));
  
  // Also check for very short HTML with challenge
  const isChallengePage = html.length < 5000 && 
    (/challenge/i.test(html) || /captcha/i.test(html));
  
  return hasBlockedPattern || isChallengePage;
}

/**
 * Extract addresses from HTML footer
 */
function extractFromFooter(html, baseUrl) {
  const footerMatch = html.match(/<footer[^>]*>([\s\S]*?)<\/footer>/i);
  if (!footerMatch) return { addresses: [], phones: [], companies: [] };
  
  const footerHtml = footerMatch[1];
  
  // Use existing extraction methods on footer content
  const addresses = [];
  const phones = [];
  
  // Extract addresses from footer text
  const footerText = footerHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  
  // US address pattern
  const usPattern = /\d+\s+[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr)[.,]?\s*(?:Suite|Ste|#)?\s*\d*[.,]?\s*[\w\s]+[.,]\s*(?:AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\s+\d{5}/gi;
  const usMatches = footerText.match(usPattern) || [];
  usMatches.forEach(match => {
    addresses.push({ value: match.trim(), score: 8, source: 'footer' });
  });
  
  // Phone pattern
  const phonePattern = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
  const phoneMatches = footerText.match(phonePattern) || [];
  phoneMatches.forEach(match => {
    phones.push({ value: match.trim(), score: 6, source: 'footer' });
  });
  
  return { addresses, phones, companies: [] };
}


// Terms that almost always indicate NON-address text (CSS, UI copy, legal, etc.)
const NEGATIVE_ADDRESS_TERMS = [
  'privacy',
  'policy',
  'terms',
  'cookies',
  'gdpr',
  'legal',
  'copyright',
  '©',
  'all rights reserved',
  'po box',
  'rights reserved',
  'subscribe',
  'newsletter',
  'function(',
  'var ',
  'const ',
  'window.',
  'jquery',
  'header:',
  'mission',
  'vision',
  'values',
  'expertise',
  'solutions',
  'opening hours',
  'contact us',
  'cookie',
  'browser',
  'javascript',
  // CSS / layout hints
  'border:',
  'padding:',
  'margin:',
  'font-size',
  'font-family',
  'line-height',
  'px ',
  ' px',
  'vh',
  'vw',
  'rem',
  'em ',
  'transition:',
  'transform:',
  '-ms-',
  // UI / component hints
  'btn ',
  'btn-',
  'header ',
  'footer',
  'notifytitle',
  // Meta / timestamp noise
  'updated:',
  'last updated',
  // Marketing / news-y phrases that look like headlines, not postal addresses
  'opens new service center',
  'opens new ',
  'sustainability report',
  'fy202', // FY2024, FY2025...
  'see what ',
  'coming soon',
  'annual report',
  'quarterly report',
  'report 20', // e.g. "Report 2024"
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
  'daily',
  'hours',
  'a.m.',
  'p.m.',
  'est',
  'cst',
  'pst',
  'gmt',
  'utc',
  // Headline / news indicators
  'shines',
  'announces',
  'announce',
  'celebrates',
  'celebrate',
  'launches',
  'launch',
  'raises',
  'raise',
  'milestone',
  'award',
  'winner',
  'characters',
  'password',
  'login',
  'sign in',
  'sign up',
  'iso ',
  'iso:',
  'certified',
  'certification',
  'standards',
  'continue to have',
  'difficulties',
  'please contact',
  'for more information',
  'click here',
  'learn more',
  'read more',
  'fy20',
  'fy19',
  '-e-o',
  'road-e-o'
];

// Regex for US States (Abbr & Full)
const US_STATES_REGEX = /\b(?:AL|Alabama|AK|Alaska|AZ|Arizona|AR|Arkansas|CA|California|CO|Colorado|CT|Connecticut|DE|Delaware|FL|Florida|GA|Georgia|HI|Hawaii|ID|Idaho|IL|Illinois|IN|Indiana|IA|Iowa|KS|Kansas|KY|Kentucky|LA|Louisiana|ME|Maine|MD|Maryland|MA|Massachusetts|MI|Michigan|MN|Minnesota|MS|Mississippi|MO|Missouri|MT|Montana|NE|Nebraska|NV|Nevada|NH|New\s?Hampshire|NJ|New\s?Jersey|NM|New\s?Mexico|NY|New\s?York|NC|North\s?Carolina|ND|North\s?Dakota|OH|Ohio|OK|Oklahoma|OR|Oregon|PA|Pennsylvania|RI|Rhode\s?Island|SC|South\s?Carolina|SD|South\s?Dakota|TN|Tennessee|TX|Texas|UT|Utah|VT|Vermont|VA|Virginia|WA|Washington|WV|West\s?Virginia|WI|Wisconsin|WY|Wyoming)\b/i;

// Unsupported countries can be added here. Currently covers ~95% of global GDP.
const COUNTRIES_REGEX = /\b(?:USA|United States|Canada|UK|United Kingdom|Great Britain|Australia|Germany|France|Italy|Spain|China|Japan|India|Brazil|Mexico|Russia|Netherlands|Switzerland|Sweden|Norway|Denmark|Finland|Belgium|Austria|Poland|Turkey|Indonesia|Saudi Arabia|Argentina|South Africa|Thailand|Egypt|Vietnam|Philippines|Malaysia|Ireland|Israel|Singapore|New Zealand|Portugal|Greece|Ukraine|Hungary|Czech Republic|Romania|Chile|Colombia|Peru|Bangladesh|Pakistan|Nigeria|Kenya|South Korea|United Arab Emirates|UAE|Qatar|Kuwait)\b/i;

// Regex for International Phones (Broad support)
// Matches +91 90309 90395, +44 20 7123 4567, 0044...
const INTERNATIONAL_PHONE_REGEX = /(?:\+|00)(?:[0-9][-.\s]?){6,14}[0-9]/g;

/**
 * Level A: Hard reject (noise only)
 */
function isGarbageAddress(addr) {
  if (!addr || addr.length < 4) return true; // Allow short things like "City, ST"
  
  const lower = addr.toLowerCase();
  
  // Reject Code/CSS artifacts
  // Also reject JS comments "//" and HTML entities "&#"
  if (lower.includes('{') || lower.includes('}') || lower.includes('<') || lower.includes('>') || 
      lower.includes('window.') || lower.includes('var ') || lower.includes('const ') || lower.includes('jquery') ||
      lower.includes('//') || lower.includes('&#')) {
    return true;
  }

  // Reject obvious CSS / layout lines that slipped through
  if (
    lower.includes('border:') ||
    lower.includes('padding:') ||
    lower.includes('margin:') ||
    lower.includes('font-size') ||
    lower.includes('font-family') ||
    lower.includes('line-height') ||
    lower.includes('vh') ||
    lower.includes('vw') ||
    lower.includes('rem') ||
    lower.includes('transition:') ||
    lower.includes('transform:') ||
    lower.includes('-ms-') ||
    /\bpx\b/.test(lower)
  ) {
    return true;
  }

  // Reject very likely marketing / news headlines (not postal addresses)
  if (
    lower.includes('opens new service center') ||
    lower.includes('opens new ') ||
    lower.includes('annual report') ||
    lower.includes('quarterly report') ||
    lower.startsWith('see what ') ||
    lower.startsWith('coming soon')
  ) {
    return true;
  }

  // Reject pure dates like "10 December 2025" (no street words, no commas, just a date)
  if (
    /\b\d{1,2}\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}\b/i.test(
      addr,
    ) &&
    !/(st|street|ave|avenue|road|rd|blvd|boulevard|suite|ste|floor|fl|way|place|square|court|ct)/i.test(addr)
  ) {
    return true;
  }

  // Reject overly long lines (likely text paragraphs) unless they are extremely high confidence
  if (addr.length > 200) return true;  // Relaxed from 120 to 200 for multi-line addresses

  if (NEGATIVE_ADDRESS_TERMS.some(term => lower.includes(term))) {
    return true;
  }

  // NEW: Reject marketing/company descriptions (these were slipping through)
  const marketingPatterns = [
    'we offer', 'we provide', 'we are', 'our team', 'global leader', 'industry leader',
    'discover', 'solutions', 'learn more', 'get started', 'sign up', 'subscribe',
    'newsletter', 'follow us', 'connect with', 'stay updated', 'join our',
    'all rights reserved', 'copyright', 'privacy policy', 'terms of use', 'terms of service',
    'cookie policy', 'sitemap', 'related sites', 'follow us on',
    'by submitting', 'consent', 'mailing list', 'unsubscribe', 
    '@gmail', '@yahoo', '@hotmail', '@outlook',
    'steel is everywhere', 'redefining the future', 'pushing the boundaries',
    'careers', 'contact us', 'about us', 'who we are', 'what we do',
  ];
  
  if (marketingPatterns.some(pattern => lower.includes(pattern))) {
    return true;
  }

  // Reject if it looks like a phone number (e.g., starts with + and mostly digits)
  // "Digit Density" check: if > 50% numbers and length < 20, likely a phone
  const digits = addr.replace(/\D/g, '').length;
  if (digits > 6 && (digits / addr.length) > 0.5) return true;
  
  // Specific checks for phone prefixes in address field
  if (/^(\+|00)[1-9]/.test(addr)) return true;
  if (/^(tel|phone|mobile|fax):/i.test(addr)) return true;

  // Reject purely numeric short tokens like "2025" or "38698"
  const onlyDigits = addr.replace(/\D/g, '');
  const onlyLetters = addr.replace(/[^A-Za-z]/g, '');
  if (onlyLetters.length === 0 && onlyDigits.length > 0 && onlyDigits.length < 8) {
    return true;
  }

  // Reject sentences / headlines (contain common verbs or look like prose)
  // Real addresses rarely have verbs like 'is', 'are', 'have', 'has', 'was', 'were', 'will', 'can'
  if (/\b(is|are|has|have|was|were|will|can|should|would|could|may|might|shall|must|does|did|shines|opens|raises|announces|celebrates|launches|wins|achieves|receives|joins|partners|completes|expands|acquires|inspires|helps|shapes|offers|provides|delivers|brings|creates|enables|empowers)\b/i.test(addr)) {
    return true;
  }

  // Reject if it looks like a complete sentence (ends with period and has 5+ words)
  const wordCount = addr.split(/\s+/).length;
  if (wordCount >= 5 && addr.trim().endsWith('.')) {
    return true;
  }

  // Reject questions
  if (addr.trim().endsWith('?')) {
    return true;
  }

  return false;
}

/**
 * Level B: Address strength detection
 */
function getAddressStrength(addr) {
  let score = 0;

  // 1. Street Detection (+10 points - Strongest Signal)
  // CRITICAL FIX: Require the street number to be at the START of the string
  // or immediately after a comma/separator. This prevents matching headlines
  // like "2025 SWANA International Road-E-O"
  // Valid: "123 Main Street" (starts with number)
  // Valid: "Suite 100, 123 Main Street" (number after comma)
  // Invalid: "Driver Antonio shines at 2025 SWANA International Road" (number in middle)
  const streetRegex = /(?:^|,\s*)\d+[A-Za-z]?\s+[A-Za-z0-9\s.'-]+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Lane|Ln|Way|Pl|Place|Square|Sq|Hwy|Highway|Pkwy|Parkway|Ct|Court|Cir|Circle)/i;
  if (streetRegex.test(addr)) {
    score += 10;
  }
  
  // 2. Zip/Postal Code (+5 points)
  if (/\b\d{5}(?:-\d{4})?\b/.test(addr)) score += 5; // US Zip
  if (/\b[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d\b/.test(addr)) score += 5; // Canada/UK specific (A1A 1A1)
  
  // Generic Global Postal Codes (4 digits for EU/AU, 6 digits for India/China/UK-compact)
  // We use a stricter boundary check for these to avoid confusion with years (e.g. 2023)
  // "India: 500081", "Australia: 4000", "Swiss: 8000"
  if (/\b\d{6}\b/.test(addr)) score += 4; // 6-digit (India, China, Russia)
  // For 4-digit codes, require some additional location context to avoid treating years (e.g. 2025) as postal codes.
  const hasRegionToken =
    US_STATES_REGEX.test(addr) || COUNTRIES_REGEX.test(addr);
  const hasStreetWord = /(St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Lane|Way|Pl|Place|Square|Hwy|Highway|Pkwy|Parkway|Ct|Court|Cir|Circle|Suite|Ste|Building|Bldg|Floor|Fl)/i.test(
    addr,
  );
  if (/\b(?:1|2|3|4|5|6|7|8|9)\d{3}\b/.test(addr) && (hasRegionToken || hasStreetWord || addr.includes(','))) {
    score += 3; // 4-digit (Australia, Swiss, etc) - check context to avoid pure years
  }

  // 3. State/Country Detection (+3 points)
  if (US_STATES_REGEX.test(addr)) score += 3;
  if (COUNTRIES_REGEX.test(addr)) score += 3;

  // 4. Minor Signals
  if (addr.includes(',')) score += 1;
  if (/\d/.test(addr)) score += 1;

  // 5. Penalties
  // If it starts with common non-address words, huge penalty
  if (/^(The|This|Please|Copyright|All\s|Mission|Vision|We\s)/i.test(addr)) score -= 10;

  return score;
}

/**
 * Cleans company name strings.
 */
function cleanCompanyName(name) {
  if (!name) return '';

  return name
    .replace(/home|welcome|official site/i, '')
    .replace(/\b(by nature|global site|homepage)\b/i, '')
    .replace(/\/.*$/, '')
    .replace(/\|.*$/, '')
    .replace(/-.*$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Normalizes phone numbers.
 * Discards invalid or non-conformant numbers.
 */
function normalizePhone(phone) {
  if (!phone) return '';

  // Remove all non-digits except initial +
  let clean = phone.replace(/[^0-9+]/g, '');
  
  // If starts with 00, replace with +
  if (clean.startsWith('00')) clean = '+' + clean.substring(2);

  // If completely raw digits (no +), try to guess
  if (!clean.includes('+')) {
      // If 10 digits, assume US +1
      if (clean.length === 10) return '+1' + clean;
      // If 11 digits and starts with 1, assume US +1
      if (clean.length === 11 && clean.startsWith('1')) return '+' + clean;
      
      // If 12-15 digits, assume international w/o plus (risky, but better than nothing)
      if (clean.length >= 12) return '+' + clean;
  }

  return clean;
}

/**
 * Deduplicates a list of candidates by value, keeping the highest score.
 */
function dedupeByValue(list) {
  const map = new Map();

  for (const item of list) {
    const key = item.value.toLowerCase().trim();
    if (!map.has(key) || map.get(key).score < item.score) {
      map.set(key, item);
    }
  }
  return Array.from(map.values());
}

/**
 * Fetch HTML for a given URL with basic timeouts and redirects.
 */
async function fetchHtml(url, options = {}) {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs || 15000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent':
          options.userAgent ||
          'Mozilla/5.0 (compatible; DomainEnrichmentBot/1.0; +https://example.com/bot)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} for ${url}`);
    }

    const html = await res.text();
    return html || '';
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * PRIMARY ENTRY POINT: Enrich a domain (3-Tier Architecture)
 * Metric for "Good Enough" = Score >= 8 (Likely a full address with Street + City/State)
 */
/**
 * Detect if page is a Single Page Application (SPA)
 * SPAs typically have minimal HTML and require JavaScript rendering
 */
function isSPA(html) {
  if (!html || html.length < 8000) return true; // Very small HTML = likely SPA
  
  // Common SPA markers
  if (html.includes('__NEXT_DATA__')) return true; // Next.js
  if (html.includes('data-reactroot')) return true; // React SSR
  if (html.includes('id="root"') && html.length < 15000) return true; // React/Vue minimal HTML
  if (html.includes('ng-app') || html.includes('ng-controller')) return true; // Angular
  if (html.includes('data-vue-ssr-id')) return true; // Vue SSR
  
  // If HTML is mostly script tags and minimal content, likely SPA
  const scriptContent = (html.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || []).join('').length;
  if (scriptContent > html.length * 0.5 && html.length < 20000) return true;
  
  return false;
}

/**
 * TIER 1: Fast Static Extraction
 * Uses fetch + Regex + Schema.org (Current Implementation)
 * Returns: { result, allExtracted, debug }
 */
async function runTier1Static(domain, options = {}) {
  const debug = { tier: 1, strategy: 'static' };
  const allExtracted = [];
  const maxContactPages = typeof options.maxContactPages === 'number' ? options.maxContactPages : 2;

  try {
    // Fetch Homepage
    const { url: homepageUrl, html: homepageHtml } = await fetchHomepageForDomain(domain, options);
    debug.homepageUrl = homepageUrl;
    
    // CLOUDFLARE DETECTION: Skip blocked pages
    if (isBlockedPage(homepageHtml)) {
      console.log(`🚫 [${domain}] Blocked page detected (Cloudflare/bot protection), skipping`);
      return {
        result: { company_name: '', address: '', phone: '', score: 0, debug: {} },
        allExtracted: [],
        debug: { ...debug, skipped: 'Blocked page (Cloudflare)' },
      };
    }
    
    // SPA Early Detection: Skip Tier 1 scoring if SPA detected
    const isSPADetected = isSPA(homepageHtml);
    debug.isSPA = isSPADetected;
    
    if (isSPADetected) {
      console.log(`⚡ [${domain}] SPA detected (HTML length: ${homepageHtml.length}), skipping Tier 1 static extraction`);
      // Return empty result to force Tier 2
      return {
        result: { company_name: '', address: '', phone: '', score: 0, debug: {} },
        allExtracted: [],
        debug: { ...debug, skipped: 'SPA detected' },
      };
    }

    // Extract from Homepage
    const schemaHome = extractFromSchemaOrg(homepageHtml, homepageUrl);
    const metaHome = extractFromMeta(homepageHtml, homepageUrl);
    const regexHome = extractFromRegex(homepageHtml, homepageUrl);
    const addressTagHome = extractFromAddressTag(homepageHtml, homepageUrl);
    const mapsHome = extractFromMapLinks(homepageHtml, homepageUrl);
    const footerHome = extractFromFooter(homepageHtml, homepageUrl); // NEW: Footer extraction

    const pass1 = {
      companies: [
        ...(schemaHome.companies || []),
        ...(metaHome.companies || []),
        ...(regexHome.companies || []),
      ],
      addresses: [
        ...(schemaHome.addresses || []),
        ...(mapsHome.addresses || []),
        ...(addressTagHome.addresses || []),
        ...(regexHome.addresses || []),
        ...(footerHome.addresses || []), // NEW: Footer addresses
      ],
      phones: [
        ...(schemaHome.phones || []),
        ...(regexHome.phones || []),
        ...(footerHome.phones || []), // NEW: Footer phones
      ],
    };

    allExtracted.push(pass1);


    // Try Contact Pages (if needed for better coverage)
    const contactLinks = findContactLikeLinks(homepageHtml, homepageUrl).slice(0, maxContactPages);
    if (contactLinks.length > 0) {
      debug.contactLinks = contactLinks;

      const pageResults = await Promise.allSettled(
        contactLinks.map((link) => fetchHtml(link, options).then((html) => ({ link, html }))),
      );

      for (const res of pageResults) {
        if (res.status !== 'fulfilled' || !res.value?.html) continue;
        const { link, html } = res.value;

        try {
          const schemaContact = extractFromSchemaOrg(html, link);
          const mapContact = extractFromMapLinks(html, link);
          const metaContact = extractFromMeta(html, link);
          const addressTagContact = extractFromAddressTag(html, link);
          const regexContact = extractFromRegex(html, link);

          const contactPass = {
            companies: [
              ...(metaContact.companies || []),
              ...(schemaContact.companies || []),
            ],
            addresses: [
              ...(addressTagContact.addresses || []),
              ...(mapContact.addresses || []),
              ...(regexContact.addresses || []),
              ...(schemaContact.addresses || []),
            ],
            phones: [
              ...(regexContact.phones || []),
              ...(schemaContact.phones || []),
            ],
          };

          // Boost scores from contact page
          contactPass.addresses.forEach((a) => { a.score += 2; });
          contactPass.phones.forEach((p) => { p.score += 2; });

          allExtracted.push(contactPass);
        } catch {
          // Ignore parsing errors on individual contact pages
        }
      }
    }
  } catch (err) {
    debug.error = err.message;
  }

  // Merge and score Tier 1 results
  const result = mergeAndScore(allExtracted);
  debug.score = result.score;
  debug.result = {
    company_name: result.company_name,
    address: result.address,
    phone: result.phone,
  };

  return { result, allExtracted, debug };
}

/**
 * TIER 2: Deep Headless Scraping
 * Uses Puppeteer to render DOM, click contact buttons, extract popups
 * Returns: { result, allExtracted, debug }
 */
async function runTier2Headless(domain, tier1Result, tier1Extracted, options = {}) {
  const debug = { tier: 2, strategy: 'headless' };
  const allExtracted = [...tier1Extracted]; // Start with Tier 1 data

  try {
    // Get the service module (lazy-loaded)
    const scraperService = getHeadlessScraperService();
    if (!scraperService || !scraperService.scrapeWithHeadless) {
      debug.error = 'HeadlessScraperService not available or missing scrapeWithHeadless method';
      console.warn(`⚠️ [${domain}] HeadlessScraperService not available`);
      return { result: tier1Result, allExtracted, debug };
    }

    const homepageUrl = `https://${domain}`;
    console.log(`🔍 [${domain}] Tier 2: Starting headless scraper...`);

    const scrapeResult = await scraperService.scrapeWithHeadless(homepageUrl, {
      timeoutMs: options.headlessTimeoutMs || 15000,
      userAgent: options.userAgent,
      visitContactPages: true, // NEW: Visit /contact, /locations, /about pages
    });

    if (!scrapeResult.success) {
      debug.error = scrapeResult.error || 'Headless scrape failed';
      return { result: tier1Result, allExtracted, debug };
    }

    debug.renderedHtmlLength = (scrapeResult.html || '').length;
    debug.popupTextLength = (scrapeResult.popupText || '').length;
    debug.sectionsTextLength = (scrapeResult.sectionsText || '').length;
    debug.contactPagesVisited = scrapeResult.contactPagesVisited || 0;

    // Process FULL RENDERED HTML (catches React/Angular content)
    if (scrapeResult.html) {
      const headlessSchema = extractFromSchemaOrg(scrapeResult.html, homepageUrl);
      const headlessMeta = extractFromMeta(scrapeResult.html, homepageUrl);
      const headlessRegex = extractFromRegex(scrapeResult.html, homepageUrl);
      const headlessAddressTag = extractFromAddressTag(scrapeResult.html, homepageUrl);
      const headlessMaps = extractFromMapLinks(scrapeResult.html, homepageUrl);

      const headlessPass = {
        companies: [
          ...(headlessMeta.companies || []),
          ...(headlessSchema.companies || []),
        ],
        addresses: [
          ...(headlessAddressTag.addresses || []),
          ...(headlessMaps.addresses || []),
          ...(headlessSchema.addresses || []),
          ...(headlessRegex.addresses || []),
        ],
        phones: [
          ...(headlessRegex.phones || []),
          ...(headlessSchema.phones || []),
        ],
      };

      // Boost scores from rendered DOM (high confidence)
      headlessPass.addresses.forEach((a) => { a.score += 2; a.source = 'headless_dom'; });
      headlessPass.phones.forEach((p) => { p.score += 2; p.source = 'headless_dom'; });

      allExtracted.push(headlessPass);
    }

    // Process Popup Text (Highly valuable - often contains hidden address)
    if (scrapeResult.popupText) {
      const popupSchema = extractFromSchemaOrg(scrapeResult.popupText, homepageUrl);
      const popupRegex = extractFromRegex(scrapeResult.popupText, homepageUrl);
      const popupAddressTag = extractFromAddressTag(scrapeResult.popupText, homepageUrl);
      const popupMaps = extractFromMapLinks(scrapeResult.popupText, homepageUrl);

      const popupPass = {
        companies: [],
        addresses: [
          ...(popupSchema.addresses || []),
          ...(popupMaps.addresses || []),
          ...(popupAddressTag.addresses || []),
          ...(popupRegex.addresses || []),
        ],
        phones: [
          ...(popupSchema.phones || []),
          ...(popupRegex.phones || []),
        ],
      };

      // Higher boost for popup (very high confidence)
      popupPass.addresses.forEach((a) => { a.score += 3; a.source = 'headless_popup'; });
      popupPass.phones.forEach((p) => { p.score += 3; p.source = 'headless_popup'; });

      allExtracted.push(popupPass);
    }

    // Process Structured Sections (Footer/Contact Blocks)
    if (scrapeResult.sectionsText) {
      const sectionSchema = extractFromSchemaOrg(scrapeResult.sectionsText, homepageUrl);
      const sectionRegex = extractFromRegex(scrapeResult.sectionsText, homepageUrl);
      const sectionAddressTag = extractFromAddressTag(scrapeResult.sectionsText, homepageUrl);
      const sectionMaps = extractFromMapLinks(scrapeResult.sectionsText, homepageUrl);

      // Convert pre-extracted addresses from HeadlessScraper to proper format
      const preExtractedAddresses = (scrapeResult.addresses || []).map(addr => ({
        value: addr,
        score: 5, // High score for DOM-extracted addresses
        source: 'headless_dom_direct',
      }));
      
      const preExtractedPhones = (scrapeResult.phones || []).map(phone => ({
        value: phone,
        score: 5, // High score for DOM-extracted phones
        source: 'headless_dom_direct',
      }));
      
      console.log(`🔍 [${domain}] Pre-extracted: ${preExtractedAddresses.length} addresses, ${preExtractedPhones.length} phones`);

      const sectionPass = {
        companies: [],
        addresses: [
          // PRE-EXTRACTED FROM DOM (highest priority - these are BR-joined addresses)
          ...preExtractedAddresses,
          ...(sectionSchema.addresses || []),
          ...(sectionMaps.addresses || []),
          ...(sectionAddressTag.addresses || []),
          ...(sectionRegex.addresses || []),
        ],
        phones: [
          // PRE-EXTRACTED FROM DOM (highest priority)
          ...preExtractedPhones,
          ...(sectionSchema.phones || []),
          ...(sectionRegex.phones || []),
        ],
      };

      sectionPass.addresses.forEach((a) => { a.score += 1; a.source = a.source || 'headless_sections'; });
      sectionPass.phones.forEach((p) => { p.score += 1; p.source = p.source || 'headless_sections'; });

      allExtracted.push(sectionPass);
    }


    // Merge and re-score
    const result = mergeAndScore(allExtracted);
    debug.score = result.score;
    debug.result = {
      company_name: result.company_name,
      address: result.address,
      phone: result.phone,
    };

    console.log(`✅ [${domain}] Tier 2 completed, score: ${result.score}`);
    return { result, allExtracted, debug };
  } catch (err) {
    console.warn(`⚠️ [${domain}] Tier 2 failed:`, err.message);
    debug.error = err.message;
    return { result: tier1Result, allExtracted, debug };
  }
}

/**
 * TIER 3: Smart LLM Refinement
 * Uses OpenRouter API for disambiguation when candidates are ambiguous/messy
 * Returns: { result, debug }
 */
async function runTier3LLM(domain, tier2Result, tier2Extracted, options = {}) {
  const debug = { tier: 3, strategy: 'llm' };
  let result = { ...tier2Result };

  try {
    // Get the service module (lazy-loaded)
    const llmService = getLLMService();
    if (!llmService) {
      debug.error = 'LLMService module not available';
      console.warn(`⚠️ [${domain}] LLMService module not available`);
      return { result, debug };
    }
    if (!llmService.isAvailable || !llmService.isAvailable()) {
      debug.error = 'LLMService not available (API key not configured)';
      console.warn(`⚠️ [${domain}] LLMService not available (API key not configured)`);
      return { result, debug };
    }

    // Collect and FILTER candidates for disambiguation
    const debugInfo = tier2Result.debug || {};
    const rawCompanies = debugInfo.allCompanies || [];
    const rawAddresses = debugInfo.allAddresses || [];
    const rawPhones = debugInfo.allPhones || [];

    // Filter to only strong candidates
    // For addresses, preserve source/score/hint for address type awareness
    const strongAddresses = rawAddresses
      .filter((a) => a && a.value && !isGarbageAddress(a.value) && getAddressStrength(a.value) >= 4)
      .map((a) => {
        const value = String(a.value).trim();
        const source = a.source || 'unknown';
        const score = a.score || 0;
        
        // Generate hint based on source (helps LLM prefer HQ/main office)
        let hint = '';
        if (source.includes('popup') || source.includes('modal')) {
          hint = 'contact popup';
        } else if (source.includes('schema_org')) {
          hint = 'structured data (likely main office)';
        } else if (source.includes('footer')) {
          hint = 'footer (likely main office)';
        } else if (source.includes('locations') || source.includes('contact')) {
          hint = 'locations/contact page';
        } else if (source.includes('map_link')) {
          hint = 'map link (likely main office)';
        } else if (source.includes('address_tag')) {
          hint = 'address tag (likely main office)';
        } else {
          hint = source;
        }
        
        return {
          value,
          source,
          score,
          hint,
        };
      })
      .slice(0, 5);

    const strongPhones = rawPhones
      .map((p) => (p && p.value ? String(p.value).trim() : ''))
      .filter((v) => {
        if (!v) return false;
        const digits = v.replace(/\D/g, '').length;
        return digits >= 8 && digits <= 16;
      })
      .slice(0, 5);

    const strongCompanies = rawCompanies
      .map((c) => (c && c.value ? String(c.value).trim() : ''))
      .filter((v) => v && v.length <= 120)
      .slice(0, 5);

    const allCandidates = {
      companies: strongCompanies,
      addresses: strongAddresses, // Now includes source/score/hint
      phones: strongPhones,
    };

    // Only call LLM if we have candidates worth disambiguating
    if (!llmService.needsDisambiguation(allCandidates)) {
      debug.skipped = 'No disambiguation needed';
      return { result, debug };
    }

    console.log(`🤖 [${domain}] Tier 3: Starting LLM disambiguation...`);
    const llmResult = await llmService.disambiguateCandidates(domain, allCandidates);

    // Helper functions for validation
    const normalizeText = (v) =>
      String(v || '').toLowerCase().replace(/[\s,.;'"`]/g, '');
    const normalizePhoneDigits = (v) => String(v || '').replace(/\D/g, '');

    const allowedCompanySet = new Set(allCandidates.companies.map((v) => normalizeText(v)));
    
    // Addresses are now objects with {value, source, score, hint}, extract values for validation
    const addressValues = allCandidates.addresses.map(a => 
      typeof a === 'string' ? a : a.value
    );
    const allowedAddressSet = new Set(addressValues.map((v) => normalizeText(v)));
    
    const allowedPhoneSet = new Set(allCandidates.phones.map((v) => normalizePhoneDigits(v)));

    // Validate and merge LLM result (STRICT: must match provided candidates)
    // Note: addresses are now objects with value/source/score/hint, so we need to extract value for comparison
    if (llmResult.company_name) {
      const name = String(llmResult.company_name).trim();
      const normName = normalizeText(name);
      if (name && name.length <= 120 && allowedCompanySet.has(normName)) {
        if (!result.company_name) {
          result.company_name = name;
        }
      }
    }

    if (llmResult.address) {
      const addr = String(llmResult.address).trim();
      const normAddr = normalizeText(addr);
      
      // Check against address values (extract value from objects if needed)
      const addressValues = allCandidates.addresses.map(a => 
        typeof a === 'string' ? a : a.value
      );
      const allowedAddressValues = new Set(addressValues.map(v => normalizeText(v)));
      
      if (
        allowedAddressValues.has(normAddr) &&
        !isGarbageAddress(addr)
      ) {
        const llmStrength = getAddressStrength(addr);
        const currentStrength = result.address ? getAddressStrength(result.address) : 0;
        if (llmStrength >= 4 && llmStrength >= currentStrength) {
          result.address = addr;
        }
      }
    }

    if (llmResult.phone) {
      const phone = String(llmResult.phone).trim();
      const digits = phone.replace(/\D/g, '').length;
      const normDigits = normalizePhoneDigits(phone);
      if (digits >= 8 && digits <= 16 && allowedPhoneSet.has(normDigits)) {
        if (!result.phone) {
          result.phone = phone;
        }
      }
    }

    debug.llmResult = llmResult;
    debug.score = result.score;
    console.log(`✅ [${domain}] Tier 3 completed`);
    return { result, debug };
  } catch (err) {
    console.warn(`⚠️ [${domain}] Tier 3 failed:`, err.message);
    debug.error = err.message;
    return { result, debug };
  }
}

/**
 * TIER 2: Jina Reader + Regex Extraction (NO LLM!)
 * 
 * Uses Jina Reader for web scraping + REGEX patterns for extraction.
 * This prevents hallucination because regex can only find text that EXISTS.
 * 
 * IMPORTANT: LLM is NOT used here anymore. LLM is only used in Tier 4
 * for VALIDATION/SELECTION from candidates, not extraction.
 * 
 * @param {string} domain - Domain to enrich
 * @param {object} tier1Result - Result from Tier 1
 * @param {array} tier1Extracted - All candidates from Tier 1
 * @param {object} options - Processing options
 * @returns {Promise<{result: object, candidates: object, debug: object, fallback?: boolean}>}
 */
async function runTier2JinaRegex(domain, tier1Result, tier1Extracted = [], options = {}) {
  const debug = { tier: '2-jina-regex', strategy: 'jina+regex' };
  const jinaService = getJinaReaderService();
  const markdownExtractor = getMarkdownExtractor();
  const validator = getAddressValidator();

  // Check if services are available
  if (!jinaService) {
    debug.error = 'JinaReaderService not available';
    console.warn(`⚠️ [${domain}] JinaReaderService not available`);
    return { result: tier1Result, candidates: {}, debug, fallback: true };
  }

  try {
    // Step 1: Crawl domain with Jina Reader
    console.log(`🌐 [${domain}] Tier 2: Jina Reader scraping...`);
    const crawlResult = await jinaService.crawlDomain(domain);

    if (!crawlResult.success || !crawlResult.markdown) {
      console.log(`⚠️ [${domain}] Jina crawl failed, falling back to Headless`);
      debug.jinaError = crawlResult.errors?.[0] || 'No markdown returned';
      return { result: tier1Result, candidates: {}, debug, fallback: true };
    }

    console.log(`✅ [${domain}] Jina got ${crawlResult.pages.length} pages (${crawlResult.markdown.length} chars)`);
    debug.pagesScraped = crawlResult.pages;
    debug.markdownLength = crawlResult.markdown.length;

    // Step 2: Extract using REGEX (NOT LLM!)
    console.log(`🔍 [${domain}] Tier 2: Extracting with regex patterns (no LLM)...`);
    
    let extracted = { addresses: [], phones: [], companies: [] };
    
    if (markdownExtractor) {
      extracted = markdownExtractor.extractAllFromMarkdown(crawlResult.markdown);
    } else {
      // Fallback: basic regex extraction
      extracted = extractBasicFromMarkdown(crawlResult.markdown);
    }

    debug.regexResults = {
      addresses: extracted.addresses.length,
      phones: extracted.phones.length,
      companies: extracted.companies.length,
    };

    console.log(`✅ [${domain}] Regex found: ${extracted.addresses.length} addresses, ${extracted.phones.length} phones, ${extracted.companies.length} companies`);

    // Step 3: Merge with Tier 1 candidates
    const mergedCandidates = {
      addresses: [...(tier1Extracted.flatMap(e => e.addresses || [])), ...extracted.addresses],
      phones: [...(tier1Extracted.flatMap(e => e.phones || [])), ...extracted.phones],
      companies: [...(tier1Extracted.flatMap(e => e.companies || [])), ...extracted.companies],
    };

    // Deduplicate by normalized value
    mergedCandidates.addresses = dedupeByNormalizedValue(mergedCandidates.addresses);
    mergedCandidates.phones = dedupeByNormalizedValue(mergedCandidates.phones);
    mergedCandidates.companies = dedupeByNormalizedValue(mergedCandidates.companies);

    debug.totalCandidates = {
      addresses: mergedCandidates.addresses.length,
      phones: mergedCandidates.phones.length,
      companies: mergedCandidates.companies.length,
    };

    // Step 4: Build result from best candidates (highest score)
    const bestAddress = mergedCandidates.addresses.sort((a, b) => b.score - a.score)[0];
    const bestPhone = mergedCandidates.phones.sort((a, b) => b.score - a.score)[0];
    const bestCompany = mergedCandidates.companies.sort((a, b) => b.score - a.score)[0];

    // Validate best address
    let primaryAddress = '';
    if (bestAddress?.value) {
      const addr = bestAddress.value;
      const isComplete = !validator || validator.isCompleteAddress(addr);
      if (isComplete) {
        primaryAddress = validator ? validator.cleanAddress(addr) : addr;
      }
    }

    // Format best phone
    let primaryPhone = bestPhone?.value || '';
    if (primaryPhone && !primaryPhone.startsWith('+')) {
      const digits = primaryPhone.replace(/\D/g, '');
      if (digits.length === 10) primaryPhone = `+1${digits}`;
      else if (digits.length === 11 && digits.startsWith('1')) primaryPhone = `+${digits}`;
    }

    // Get all valid addresses for branches
    const allAddresses = mergedCandidates.addresses
      .filter(a => a.value && (!validator || validator.isCompleteAddress(a.value)))
      .map(a => validator ? validator.cleanAddress(a.value) : a.value)
      .filter((v, i, arr) => arr.indexOf(v) === i); // Dedupe

    // Calculate quality score
    let score = 0;
    if (bestCompany?.value && bestCompany.value.length > 2) score += 3;
    if (primaryAddress && primaryAddress.length > 30) score += 5;
    if (primaryPhone && primaryPhone.length >= 8) score += 2;

    // Build result
    const result = {
      company_name: bestCompany?.value || tier1Result.company_name || '',
      address: primaryAddress || tier1Result.address || '',
      phone: primaryPhone || tier1Result.phone || '',
      allAddresses: allAddresses.length > 0 ? allAddresses : (tier1Result.address ? [tier1Result.address] : []),
      score: Math.min(10, score),
      debug: {
        source: 'jina+regex',
        branchCount: allAddresses.length,
        pagesScraped: crawlResult.pages.length,
      },
    };

    console.log(`✅ [${domain}] Tier 2 Jina+Regex: company="${result.company_name}", address="${result.address.substring(0, 40)}...", branches=${allAddresses.length}, score=${result.score}`);
    
    // Return candidates for potential LLM validation in Tier 4
    return { result, candidates: mergedCandidates, debug };

  } catch (err) {
    console.error(`❌ [${domain}] Tier 2 Jina+Regex failed:`, err.message);
    debug.error = err.message;
    return { result: tier1Result, candidates: {}, debug, fallback: true };
  }
}

/**
 * Fallback basic extraction from markdown (if MarkdownExtractor not available)
 */
function extractBasicFromMarkdown(markdown) {
  const addresses = [];
  const phones = [];
  const companies = [];
  
  // Basic US address pattern
  const addrPattern = /\d+\s+[\w\s]+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Dr|Drive)[.,]?\s*[\w\s]+[.,]\s*(?:AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\s+\d{5}/gi;
  const addrMatches = markdown.match(addrPattern) || [];
  addrMatches.forEach(m => addresses.push({ value: m.trim(), score: 5, source: 'markdown' }));
  
  // Phone pattern
  const phonePattern = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
  const phoneMatches = markdown.match(phonePattern) || [];
  phoneMatches.forEach(m => phones.push({ value: m.trim(), score: 4, source: 'markdown' }));
  
  return { addresses, phones, companies };
}

/**
 * Deduplicate candidates by normalized value
 */
function dedupeByNormalizedValue(items) {
  const seen = new Map();
  for (const item of items) {
    const normalized = (item.value || '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (!normalized) continue;
    
    const existing = seen.get(normalized);
    if (!existing || item.score > existing.score) {
      seen.set(normalized, item);
    }
  }
  return Array.from(seen.values());
}


/**
 * Main Pipeline: UPGRADED 5-Tier Hybrid Architecture
 *
 * TIER 1: Fast Static (fetch + Regex + Schema.org)
 *   - Quick extraction for ~40% of sites
 *   - If score >= 8 AND complete address AND phone: RETURN SUCCESS
 *   - Else: PROCEED TO TIER 2
 *
 * TIER 2: Jina + LLM (NEW - FREE)
 *   - Jina Reader crawls pages, returns markdown
 *   - Gemini 2.0 Flash extracts structured data
 *   - Completes partial addresses, finds all branches
 *   - If success: RETURN
 *   - If Jina fails: PROCEED TO TIER 3
 *
 * TIER 3: Headless Fallback (Puppeteer)
 *   - Only if Jina fails (bot protection, etc.)
 *   - Render full DOM, click contact buttons
 *   - If score >= 8: RETURN SUCCESS
 *   - Else: PROCEED TO TIER 4
 *
 * TIER 4: LLM Disambiguation (OpenRouter)
 *   - Select best from ambiguous candidates
 *   - RETURN FINAL RESULT
 */
async function enrichDomain(domain, options = {}) {
  const startTime = Date.now();
  const debug = { pipeline: '5-tier-hybrid', startTime };


  // Confidence threshold: score >= 8 means high confidence (skip next tier)
  const tierThreshold = typeof options.earlyExitScore === 'number' ? options.earlyExitScore : 8;

  // Get validator for completeness check
  const validator = getAddressValidator();

  // TIER 1: Fast Static Extraction
  console.log(`⚡ [${domain}] Tier 1: Fast Static Extraction...`);
  const tier1 = await runTier1Static(domain, options);
  debug.tier1 = tier1.debug;
  debug.tier1Score = tier1.result.score;

  // Check if Tier 1 is good enough (high score + COMPLETE address + phone)
  if (tier1.result.score >= tierThreshold) {
    const hasCompany = tier1.result.company_name && tier1.result.company_name.length > 2;
    const hasPhone = tier1.result.phone && tier1.result.phone.length >= 8;
    const isAddressComplete = validator 
      ? validator.isCompleteAddress(tier1.result.address)
      : (tier1.result.address && tier1.result.address.includes(',') && tier1.result.address.length > 30);
    
    if (hasCompany && isAddressComplete && hasPhone) {
      debug.earlyExit = true;
      debug.strategy = 'tier1-static';
      debug.processingTimeMs = Date.now() - startTime;
      console.log(`✅ [${domain}] Tier 1 SUCCESS (score=${tier1.result.score}, complete=true), returning immediately`);
      return {
        domain,
        company_name: tier1.result.company_name,
        address: tier1.result.address,
        phone: tier1.result.phone,
        allAddresses: [tier1.result.address],
        score: tier1.result.score,
        debug: { ...debug, details: tier1.result.debug },
      };
    }
  }

  // TIER 2: Jina + Regex Extraction (NO LLM!)
  // Uses Jina Reader + regex patterns to extract candidates without hallucination
  if (options.enableJinaLLM !== false) {
    console.log(`📉 [${domain}] Tier 1 incomplete/low score, proceeding to Tier 2 Jina+Regex...`);
    const tier2 = await runTier2JinaRegex(domain, tier1.result, tier1.allExtracted, options);
    debug.tier2JinaRegex = tier2.debug;
    debug.tier2Score = tier2.result.score;

    // Check if Jina+Regex succeeded (good score = success)
    if (!tier2.fallback && tier2.result.score >= 6) {
      debug.strategy = 'tier2-jina-regex';
      debug.processingTimeMs = Date.now() - startTime;
      console.log(`✅ [${domain}] Tier 2 Jina+Regex SUCCESS (score=${tier2.result.score}), returning`);
      return {
        domain,
        company_name: tier2.result.company_name,
        address: tier2.result.address,
        phone: tier2.result.phone,
        allAddresses: tier2.result.allAddresses || [tier2.result.address].filter(Boolean),
        score: tier2.result.score,
        debug: { ...debug, details: tier2.result.debug },
      };
    }


    // TIER 3: Headless Fallback
    // Run if: Jina failed (tier2.fallback) OR LLM failed (score < 6)
    const needsTier3 = tier2.fallback || tier2.result.score < 6;
    if (needsTier3 && options.enableHeadlessScraper !== false) {
      const reason = tier2.fallback ? 'Jina failed' : 'LLM extraction failed (low score)';
      console.log(`📉 [${domain}] ${reason}, proceeding to Tier 3 Headless...`);
      const tier3 = await runTier2Headless(domain, tier2.result, tier1.allExtracted, options);

      debug.tier3Headless = tier3.debug;
      debug.tier3Score = tier3.result.score;

      // Check if Tier 3 is good enough
      if (tier3.result.score >= tierThreshold) {
        const hasAllFields = tier3.result.company_name && tier3.result.address && tier3.result.phone;
        if (hasAllFields) {
          debug.strategy = 'tier3-headless';
          debug.processingTimeMs = Date.now() - startTime;
          console.log(`✅ [${domain}] Tier 3 Headless SUCCESS (score=${tier3.result.score}), returning`);
          return {
            domain,
            company_name: tier3.result.company_name,
            address: tier3.result.address,
            phone: tier3.result.phone,
            allAddresses: [tier3.result.address].filter(Boolean),
            score: tier3.result.score,
            debug: { ...debug, details: tier3.result.debug },
          };
        }
      }

      // TIER 4: LLM Disambiguation (only if Tier 3 still low confidence)
      if (options.enableLLM !== false && tier3.result.score < tierThreshold) {
        console.log(`📉 [${domain}] Tier 3 score (${tier3.result.score}) < ${tierThreshold}, proceeding to Tier 4 LLM...`);
        const tier4 = await runTier3LLM(domain, tier3.result, tier3.allExtracted || tier1.allExtracted, options);
        debug.tier4LLM = tier4.debug;
        debug.tier4Score = tier4.result.score;
        debug.strategy = 'tier4-llm';
        debug.processingTimeMs = Date.now() - startTime;
        console.log(`✅ [${domain}] Tier 4 LLM completed, final score: ${tier4.result.score}`);
        return {
          domain,
          company_name: tier4.result.company_name,
          address: tier4.result.address,
          phone: tier4.result.phone,
          allAddresses: [tier4.result.address].filter(Boolean),
          score: tier4.result.score,
          debug: { ...debug, details: tier4.result.debug },
        };
      }

      // Return Tier 3 result
      debug.strategy = 'tier3-headless';
      debug.processingTimeMs = Date.now() - startTime;
      return {
        domain,
        company_name: tier3.result.company_name,
        address: tier3.result.address,
        phone: tier3.result.phone,
        allAddresses: [tier3.result.address].filter(Boolean),
        score: tier3.result.score,
        debug: { ...debug, details: tier3.result.debug },
      };
    }

    // Return Tier 2 result (Jina+LLM succeeded or fallback disabled)
    debug.strategy = 'tier2-jina-llm';
    debug.processingTimeMs = Date.now() - startTime;
    return {
      domain,
      company_name: tier2.result.company_name,
      address: tier2.result.address,
      phone: tier2.result.phone,
      allAddresses: tier2.result.allAddresses || [tier2.result.address].filter(Boolean),
      score: tier2.result.score,
      debug: { ...debug, details: tier2.result.debug },
    };
  }

  // Fallback: Old flow (if Jina+LLM disabled)
  // TIER 2 (old): Deep Headless Scraping
  if (options.enableHeadlessScraper !== false) {
    console.log(`📉 [${domain}] Proceeding to Headless (Jina disabled)...`);
    const tier2 = await runTier2Headless(domain, tier1.result, tier1.allExtracted, options);
    debug.tier2 = tier2.debug;
    debug.tier2Score = tier2.result.score;

    if (tier2.result.score >= tierThreshold) {
      const hasAllFields = tier2.result.company_name && tier2.result.address && tier2.result.phone;
      if (hasAllFields) {
        debug.strategy = 'tier2-headless';
        debug.processingTimeMs = Date.now() - startTime;
        return {
          domain,
          company_name: tier2.result.company_name,
          address: tier2.result.address,
          phone: tier2.result.phone,
          allAddresses: [tier2.result.address].filter(Boolean),
          score: tier2.result.score,
          debug: { ...debug, details: tier2.result.debug },
        };
      }
    }

    // TIER 3 (old): LLM disambiguation
    if (options.enableLLM !== false && tier2.result.score < tierThreshold) {
      const tier3 = await runTier3LLM(domain, tier2.result, tier2.allExtracted, options);
      debug.tier3 = tier3.debug;
      debug.strategy = 'tier3-llm';
      debug.processingTimeMs = Date.now() - startTime;
      return {
        domain,
        company_name: tier3.result.company_name,
        address: tier3.result.address,
        phone: tier3.result.phone,
        allAddresses: [tier3.result.address].filter(Boolean),
        score: tier3.result.score,
        debug: { ...debug, details: tier3.result.debug },
      };
    }

    debug.strategy = 'tier2-headless';
    debug.processingTimeMs = Date.now() - startTime;
    return {
      domain,
      company_name: tier2.result.company_name,
      address: tier2.result.address,
      phone: tier2.result.phone,
      allAddresses: [tier2.result.address].filter(Boolean),
      score: tier2.result.score,
      debug: { ...debug, details: tier2.result.debug },
    };
  }

  // Return Tier 1 result if all other tiers are disabled
  debug.strategy = 'tier1-static';
  debug.processingTimeMs = Date.now() - startTime;
  return {
    domain,
    company_name: tier1.result.company_name,
    address: tier1.result.address,
    phone: tier1.result.phone,
    allAddresses: [tier1.result.address].filter(Boolean),
    score: tier1.result.score,
    debug: { ...debug, details: tier1.result.debug },
  };
}


/**
 * Try a list of URL variants until one succeeds.
 *  - Fire all candidates in parallel and use Promise.any to return
 *    the first successful response.
 *  - We rely on fetchHtml's own timeout to avoid hanging requests.
 */
async function fetchHomepageForDomain(domain, options = {}) {
  const trimmed = String(domain || '').trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  if (!trimmed) {
  }

  const candidates = [
    `https://${trimmed}`,
    `https://www.${trimmed}`,
    `http://${trimmed}`,
    `http://www.${trimmed}`,
  ];

  const attempts = candidates.map((url) =>
    fetchHtml(url, options)
      .then((html) => {
        if (html && html.length > 0) {
          return { url, html };
        }
        // Force this branch to be treated as a failed attempt
        return Promise.reject(new Error(`Empty HTML for ${url}`));
      }),
  );

  try {
    // Promise.any resolves as soon as the *first* promise fulfills
    return await Promise.any(attempts);
  } catch (err) {
    // All candidates failed
    throw new Error(`Failed to fetch homepage for ${domain}: ${err.message || err}`);
  }
}

/**
 * Extract JSON-LD (<script type="application/ld+json">) organization data.
 */
function extractFromSchemaOrg(html, baseUrl) {
  const extracted = { companies: [], addresses: [], phones: [] };
  const scriptRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    const jsonText = match[1];
    if (!jsonText) continue;

    try {
      const parsed = JSON.parse(jsonText.trim());
      const items = Array.isArray(parsed) ? parsed : [parsed];

      for (const item of items) {
        if (!item || typeof item !== 'object') continue;
        const type = item['@type'] || item['@type'.toLowerCase()];
        const typeStr = Array.isArray(type) ? type.join(',') : String(type || '');
        if (!/organization|localbusiness|corporation/i.test(typeStr)) continue;

        // Company Name
        const name = item.name || item.legalName;
        if (name) {
             const cleaned = cleanCompanyName(name);
             if (cleaned) extracted.companies.push({ value: cleaned, score: 6, source: 'schema_org' });
        }

        // Address
        let fullAddr = '';
        if (item.address && typeof item.address === 'object') {
          const addr = item.address;
          const parts = [
            addr.streetAddress,
            addr.addressLocality,
            addr.addressRegion,
            addr.postalCode,
            addr.addressCountry,
          ].filter(Boolean).map((p) => String(p).trim());
          fullAddr = parts.join(', ');
        } else if (typeof item.address === 'string') {
           fullAddr = item.address;
        }

        if (!isGarbageAddress(fullAddr)) {
            const strength = getAddressStrength(fullAddr);
            // Schema is reliable, trust it more (require score >= 4)
            // e.g. "Boston, MA" = 3(State)+1(Comma) = 4 -> PASS
            if (strength >= 4 || fullAddr.length > 5) {
                extracted.addresses.push({ value: fullAddr, score: strength + 3, source: 'schema_org' });
            }
        }

        // Phone
        const phone = item.telephone || item.phone;
        if (phone) {
            const norm = normalizePhone(phone);
            if (norm) extracted.phones.push({ value: norm, score: 5, source: 'schema_org' });
        }
      }
    } catch (e) { /* ignore */ }
  }
  return extracted;
}

/**
 * Extract from <meta> tags.
 */
function extractFromMeta(html, baseUrl) {
  const extracted = { companies: [], addresses: [], phones: [] };

  const ogSiteNameRegex = /<meta[^>]+property=["']og:site_name["'][^>]*content=["']([^"']+)["'][^>]*>/i;
  const titleRegex = /<title>([^<]+)<\/title>/i;

  const siteMatch = ogSiteNameRegex.exec(html);
  if (siteMatch && siteMatch[1]) {
      const cleaned = cleanCompanyName(siteMatch[1]);
      if (cleaned) extracted.companies.push({ value: cleaned, score: 5, source: 'meta_og' });
  }

  const titleMatch = titleRegex.exec(html);
  if (titleMatch && titleMatch[1]) {
    const parts = titleMatch[1].split(/[|-]/);
    if (parts[0]) {
        const cleaned = cleanCompanyName(parts[0]);
        if (cleaned) extracted.companies.push({ value: cleaned, score: 3, source: 'meta_title' });
    }
  }

  return extracted;
}

/**
 * Extract from <address> tags.
 */
function extractFromAddressTag(html, baseUrl) {
  const extracted = { companies: [], addresses: [], phones: [] };
  const addressRegex = /<address[^>]*>([\s\S]*?)<\/address>/gi;
  let match;

  while ((match = addressRegex.exec(html)) !== null) {
    const raw = match[1] || '';
    const text = raw
      .replace(/<br\s*\/?>/gi, ', ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (!isGarbageAddress(text)) {
      const strength = getAddressStrength(text);
      // Address tag is mostly reliable, require moderate score (4+)
      if (strength >= 4) {
        extracted.addresses.push({ value: text, score: strength + 2, source: 'address_tag' });
      }
    }
  }
  return extracted;
}

/**
 * Extract via Regex scan (Body text).
 */
function extractFromRegex(html, baseUrl) {
  const extracted = { companies: [], addresses: [], phones: [] };

  // Cleanup HTML to text
  const tail = html.slice(Math.max(0, html.length - 20000)); // Scan last 20k chars (footer)
  const text = tail
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, ', ') // CRITICAL: Keep multi-line addresses together
    .replace(/<[^>]*>/g, '\n') // Replace tags with newlines to preserve structure
    .replace(/&nbsp;/g, ' ');

  const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean);

  // 1. Phone Extraction
  // Use broad international regex first
  const phoneText = text; // Scan whole text for phones, not line by line (phones might span?)
  const matches = phoneText.match(INTERNATIONAL_PHONE_REGEX);
  if (matches) {
    for (const m of matches) {
        const norm = normalizePhone(m);
        if (norm && norm.length >= 8 && norm.length <= 16) {
           extracted.phones.push({ value: norm, score: 3, source: 'regex_intl' });
        }
    }
  }

  // Backup: US-style phones (xxx-xxx-xxxx) that didn't have + prefix
  const usPhoneRegex = /(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}/g;
  const usMatches = phoneText.match(usPhoneRegex);
  if (usMatches) {
     for (const m of usMatches) {
        // Only add if not already covered (basic check)
        const norm = normalizePhone(m);
        if (norm) extracted.phones.push({ value: norm, score: 2, source: 'regex_us' });
     }
  }

  // 2. Address Extraction
  for (const line of lines) {
    if (line.length > 200) continue; 
    
    // Graded Acceptance
    if (!isGarbageAddress(line)) {
        // Exclude if it looks like JUST a phone number line "Call us: 555-0199"
        if (line.match(/call|phone|tel|fax/i)) continue;

        // High threshold for Regex body scan (prevent random text)
        // Must be >= 4 to pass.
        // "123 Main St" = 10(Street)+1(Digit) = 11 -> PASS
        // "Boston, MA" = 1(Comma)+3(State) = 4 -> PASS
        // "Hello, World" = 1(Comma) = 1 -> FAIL
        // "Medical devices..." = 0 -> FAIL
        const strength = getAddressStrength(line);
        if (strength >= 4) {
             extracted.addresses.push({ value: line, score: strength, source: 'regex_body' });
        }
    }
  }

  return extracted;
}


/**
 * MERGE STEP: Combine field candidates into a single Best Result.
 */
function mergeAndScore(allExtracted) {
  // 1. Flatten
  let companies = [];
  let addresses = [];
  let phones = [];

  allExtracted.forEach(group => {
    companies.push(...group.companies);
    addresses.push(...group.addresses);
    phones.push(...group.phones);
  });

  // 2. Deduplicate
  companies = dedupeByValue(companies);
  addresses = dedupeByValue(addresses);
  phones = dedupeByValue(phones);

  // 2b. Address Promotion (New Logic for PEBCO case)
  // If "225 North 4th Street" exists AND "225 North 4th Street, Paducah, KY" exists,
  // we want the LONGER one to win, even if the shorter one has a high "Schema" score.
  if (addresses.length > 1) {
    // Sort by length DESC so we process longest first
    addresses.sort((a, b) => b.value.length - a.value.length);
    
    const promoted = [];
    const absorbedIndices = new Set();

    for (let i = 0; i < addresses.length; i++) {
        if (absorbedIndices.has(i)) continue;
        
        const longCand = addresses[i];
        
        // Look for smaller substrings
        for (let j = i + 1; j < addresses.length; j++) {
            if (absorbedIndices.has(j)) continue;
            
            const shortCand = addresses[j];
            
            // If the long candidate contains the short candidate (case-insensitive)
            if (longCand.value.toLowerCase().includes(shortCand.value.toLowerCase().replace(/[.,]/g, '').trim())) {
                 // Promote the long candidate!
                 // Take the max score of the two to preserve high confidence
                 longCand.score = Math.max(longCand.score, shortCand.score);
                 
                 // Mark short one as absorbed
                 absorbedIndices.add(j);
            }
        }
        promoted.push(longCand);
    }
    addresses = promoted;
  }

  // 3. Sort by Score
  companies.sort((a, b) => b.score - a.score);
  addresses.sort((a, b) => b.score - a.score);
  phones.sort((a, b) => b.score - a.score);

  // 4. Pick Top
  const bestCompany = companies[0] || null;
  const bestAddress = addresses[0] || null;
  const bestPhone = phones[0] || null;

  // Calculate overall confidence score (0-10)
  let totalScore = 0;
  if (bestCompany) totalScore += (bestCompany.score > 3 ? 4 : 2);
  if (bestAddress) totalScore += (bestAddress.score > 5 ? 4 : 2);
  if (bestPhone) totalScore += 2;
  
  // Cap at 10
  totalScore = Math.min(10, totalScore);

  return {
    company_name: bestCompany ? bestCompany.value : '', // Value already cleaned during extraction
    address: bestAddress ? bestAddress.value : '',
    phone: bestPhone ? bestPhone.value : '', // Value already normalized
    score: totalScore,
    debug: {
        topCompany: bestCompany,
        topAddress: bestAddress,
        topPhone: bestPhone,
        allCompanies: companies.slice(0, 3),
        allAddresses: addresses.slice(0, 3),
        allPhones: phones.slice(0, 3)
    }
  };
}


/**
 * Find contact-like links
 */
function findContactLikeLinks(html, baseUrl) {
  const links = new Set();
  const anchorRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const base = new URL(baseUrl);

  let match;
  while ((match = anchorRegex.exec(html)) !== null) {
    const href = (match[1] || '').trim();
    const text = (match[2] || '').toLowerCase();
    if (!href || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
    
    // Check keyword in link text OR href
    const combined = `${href.toLowerCase()} ${text}`;
    if (/contact|about|locations?|offices?|imprint|impressum|find us/.test(combined)) {
      try {
        const url = new URL(href, base);
        links.add(url.toString());
      } catch { }
    }
  }

  // FORCE GUESSING: Always add standard paths (Deep Crawl Improvement)
  // This catches pages hidden behind JS menus or not linked directly
  try {
      links.add(new URL('/contact', base).toString());
      links.add(new URL('/contact-us', base).toString());
      links.add(new URL('/locations', base).toString());
      links.add(new URL('/about', base).toString());
  } catch(e) {}

  return Array.from(links);
}

/**
 * Extract from Map links (e.g. Google Maps) found on the page.
 * This is a HIGH CONFIDENCE source often containing exact address in query.
 */
function extractFromMapLinks(html, baseUrl) {
  const extracted = { companies: [], addresses: [], phones: [] };
  
  // Regex for Google Maps links
  // Matches: maps.google.com/maps?q=... OR google.com/maps?q=... OR goo.gl/maps/...
  // We care most about the 'q=' parameter or the embedded location
  const mapLinkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi;
  
  let match;
  while ((match = mapLinkRegex.exec(html)) !== null) {
    const href = (match[1] || '').trim();
    if (!href) continue;

    let addressCandidate = '';

    try {
        const url = new URL(href, baseUrl);
        
        // Case 1: Standard Google Maps with q param
        if (url.hostname.includes('google.com') && url.searchParams.has('q')) {
            addressCandidate = url.searchParams.get('q');
        }
        // Case 2: Apple Maps with q param
        else if (url.hostname.includes('maps.apple.com') && url.searchParams.has('q')) {
            addressCandidate = url.searchParams.get('q');
        }
        // Case 3: Bing Maps with q param
        else if (url.hostname.includes('bing.com') && url.searchParams.has('q')) {
            addressCandidate = url.searchParams.get('q');
        }
        
        // Clean up candidate
        if (addressCandidate) {
            // Sometimes it's lat/long like "34.05,-118.25", ignore those
            if (/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(addressCandidate)) continue;

            // Decode and clean
            let decoded = decodeURIComponent(addressCandidate).replace(/\+/g, ' ').trim();

            // Require that map 'q' parameter actually looks like a real-world location:
            //  - contains at least one digit (street number or postal code), OR
            //  - contains a postal-like 4–6 digit block, OR
            //  - contains a known state / country token.
            const hasAnyDigit = /\d/.test(decoded);
            const hasPostalBlock = /\b\d{4,6}\b/.test(decoded);
            const hasRegionToken = US_STATES_REGEX.test(decoded) || COUNTRIES_REGEX.test(decoded);

            if (!hasAnyDigit && !hasPostalBlock && !hasRegionToken) {
              // Likely a generic label like "Headquarters" or marketing text
              continue;
            }

            if (!isGarbageAddress(decoded)) {
              const strength = getAddressStrength(decoded);
              if (strength > 0) {
                // High score because someone explicitly linked it on a map
                extracted.addresses.push({ value: decoded, score: strength + 4, source: 'map_link' });
              }
            }
        }
    } catch (e) { /* ignore invalid URLs */ }
  }

  return extracted;
}





module.exports = {
  enrichDomain,
  fetchHomepageForDomain,
  extractFromSchemaOrg,
  extractFromMapLinks,
  normalizePhone,
  isValidAddress: (addr) => !isGarbageAddress(addr) && getAddressStrength(addr) >= 4,
  isGarbageAddress,
  getAddressStrength,
  cleanCompanyName,
  // Export helper functions for debugging
  getHeadlessScraperService,
  getLLMService,
};
