/**
 * AddressValidator - Post-extraction validation for addresses
 * ------------------------------------------------------
 * Ensures only complete, valid addresses are accepted.
 * Rejects:
 *  - Truncated addresses (missing city/state)
 *  - Junk data (code, marketing text, etc.)
 *  - Institution names mistaken as addresses
 */

// Minimum requirements for a valid address
const MIN_ADDRESS_LENGTH = 20;

// Must contain at least one of these patterns
const REQUIRED_PATTERNS = [
  /\d+\s+[A-Za-z]/,                    // Street number + name start
  /\b[A-Z]{2}\s*\d{5}\b/,              // US state + zip (e.g., "CA 90210")
  /\b\d{5}(-\d{4})?\b/,                // US zip code
  /\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/i,     // Canadian postal (e.g., "M5J 0E7")
  /\b\d{6}\b/,                         // India/China postal
  /\b\d{4}\b/,                         // Australia/EU postal (4 digits)
];

// Patterns that indicate junk data - REJECT if matched
const JUNK_PATTERNS = [
  /data-[a-z]/i,                       // HTML data attributes
  /section-id/i,                       // Code artifacts
  /style\s*=/i,                        // Inline styles
  /class\s*=/i,                        // Class attributes
  /brave_/i,                           // JavaScript variables
  /^\d+[-\d]*$/,                       // Only numbers/dashes
  /university\s+of/i,                  // Institution names
  /college\s+of/i,
  /institute\s+of/i,
  /school\s+of/i,
  /production/i,                       // Production stats
  /conference/i,
  /ageq/i,
  /\boz\b/i,
  /report\s+20/i,                      // Annual reports
  /fy\s?20/i,
  /quarterly/i,
  /statement\s+about/i,                // News headlines
  /tragic/i,
  /accident/i,
  /shines\s+at/i,
  /announces/i,
  /celebrates/i,
  /\{|\}/,                             // Code braces
  /window\./i,                         // JavaScript
  /function\s*\(/i,
  /characters$/i,                      // Form validation
  /password/i,
  /sign\s*in/i,
  /login/i,
  /©|copyright/i,                      // Copyright notices
  /all\s+rights\s+reserved/i,
  /privacy\s+policy/i,
  /terms\s+(of|and)/i,
  /cookies?/i,
  /gdpr/i,
  /opens?\s+new/i,                     // Marketing
  /coming\s+soon/i,
  /learn\s+more/i,
  /click\s+here/i,
  /iso\s*\d/i,                         // Certifications
  /certified/i,
  /standard/i,
  // NEW: Additional junk patterns from actual CSV failures
  /fraudulent/i,                       // "For Fraudulent websites in India"
  /earn\s+\d/i,                        // "Earn 50,000 Miles"
  /\bnc-/i,                            // "nc-previous-guid" (code artifact)
  /previous-guid/i,                    // More code artifacts
  /meet\s+the\s+unsung/i,              // Marketing headlines
  /driven\s+by\s+dedication/i,         // Marketing
  /unsung\s+heroes/i,
  /membership/i,                       // "1-year Discount Den membership"
  /discount\s+den/i,
  /show\s+submenu/i,                   // UI elements
  /submenu/i,
  /locations\s+in\s+/i,                // "UBS locations In India" (not address)
  /attention\s+required/i,             // Cloudflare block page
  /^for\s+/i,                          // "For Fraudulent..." (sentences starting with For)
  /^our\s+address/i,                   // "Our Address1020..." (needs cleaning)
  /^\"\S+\"/,                          // Quoted code like "nc-previous-guid"
  /drop\s+off\s+locations/i,           // UI elements
];


// State/Province abbreviations (required for completeness check)
const STATE_PROVINCE_REGEX = /\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC|ON|BC|AB|QC|MB|SK|NS|NB|PE|NL|NT|NU|YT)\b/i;

// Country names (for international addresses)
const COUNTRY_REGEX = /\b(USA|United\s+States|Canada|UK|United\s+Kingdom|Australia|Germany|France|Italy|Spain|Japan|China|India|Brazil|Mexico|Netherlands|Switzerland|Sweden|Norway|Denmark|Finland|Belgium|Austria|Ireland|Israel|Singapore|New\s+Zealand|Portugal|Greece|South\s+Korea)\b/i;

// Country name to ISO code mapping
const COUNTRY_TO_ISO = {
  'usa': 'US', 'united states': 'US', 'u.s.a': 'US', 'u.s.': 'US',
  'canada': 'CA',
  'uk': 'GB', 'united kingdom': 'GB', 'great britain': 'GB', 'england': 'GB',
  'australia': 'AU',
  'germany': 'DE', 'deutschland': 'DE',
  'france': 'FR',
  'italy': 'IT', 'italia': 'IT',
  'spain': 'ES', 'españa': 'ES',
  'japan': 'JP',
  'china': 'CN',
  'india': 'IN',
  'brazil': 'BR', 'brasil': 'BR',
  'mexico': 'MX', 'méxico': 'MX',
  'netherlands': 'NL', 'holland': 'NL',
  'switzerland': 'CH',
  'sweden': 'SE',
  'norway': 'NO',
  'denmark': 'DK',
  'finland': 'FI',
  'belgium': 'BE',
  'austria': 'AT',
  'ireland': 'IE',
  'israel': 'IL',
  'singapore': 'SG',
  'new zealand': 'NZ',
  'portugal': 'PT',
  'greece': 'GR',
  'south korea': 'KR', 'korea': 'KR',
  'poland': 'PL',
  'russia': 'RU',
  'ukraine': 'UA',
  'turkey': 'TR',
  'south africa': 'ZA',
  'argentina': 'AR',
  'chile': 'CL',
  'colombia': 'CO',
  'peru': 'PE',
  'philippines': 'PH',
  'malaysia': 'MY',
  'indonesia': 'ID',
  'thailand': 'TH',
  'vietnam': 'VN',
  'hong kong': 'HK',
  'taiwan': 'TW',
  'czech republic': 'CZ', 'czechia': 'CZ',
  'romania': 'RO',
  'hungary': 'HU',
  'bulgaria': 'BG',
};

/**
 * Extract country code from address
 * @param {string} address - Address to extract country from
 * @returns {string} 2-letter ISO country code or empty string
 */
function extractCountry(address) {
  if (!address || typeof address !== 'string') return '';
  
  const lower = address.toLowerCase();
  
  // Check for explicit country name
  for (const [name, code] of Object.entries(COUNTRY_TO_ISO)) {
    if (lower.includes(name)) {
      return code;
    }
  }
  
  // Check for US state abbreviations + zip (strong indicator of USA)
  if (/\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\s*\d{5}(-\d{4})?\b/i.test(address)) {
    return 'US';
  }
  
  // Check for Canadian postal code pattern
  if (/\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/i.test(address)) {
    return 'CA';
  }
  
  // Check for UK postcode pattern (e.g., SW1A 1AA)
  if (/\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/i.test(address)) {
    return 'GB';
  }
  
  // Check for German postal code (5 digits before city)
  if (/\b\d{5}\s+[A-Z][a-z]+/i.test(address) && /germany|deutschland|münchen|berlin|hamburg|frankfurt/i.test(lower)) {
    return 'DE';
  }
  
  // Check for French postal code
  if (/\b\d{5}\s+[A-Z][a-z]+/i.test(address) && /france|paris|lyon|marseille/i.test(lower)) {
    return 'FR';
  }
  
  return '';
}


/**
 * Check if a string is a valid address (basic validation)
 * @param {string} address - Address to validate
 * @returns {boolean}
 */
function isValidAddress(address) {

  if (!address || typeof address !== 'string') return false;

  const trimmed = address.trim();

  // Length check
  if (trimmed.length < MIN_ADDRESS_LENGTH) {
    return false;
  }

  // Must not match junk patterns
  const isJunk = JUNK_PATTERNS.some(p => p.test(trimmed));
  if (isJunk) {
    return false;
  }

  // Must have at least one required pattern
  const hasRequiredPattern = REQUIRED_PATTERNS.some(p => p.test(trimmed));
  if (!hasRequiredPattern) {
    return false;
  }

  return true;
}

/**
 * Check if an address is COMPLETE (has city, state/country)
 * This is the CRITICAL function for rejecting truncated addresses
 * @param {string} address - Address to validate
 * @returns {boolean}
 */
function isCompleteAddress(address) {
  if (!isValidAddress(address)) return false;

  const trimmed = address.trim();

  // CRITICAL: Reject addresses ending with comma (truncated)
  if (trimmed.endsWith(',')) {
    return false;
  }

  // Must be at least 30 characters for a complete address
  if (trimmed.length < 30) {
    return false;
  }

  // Must contain comma (city/state separator)
  if (!trimmed.includes(',')) {
    return false;
  }

  // Check for multiple parts separated by comma (need at least 3: street, city, state)
  const parts = trimmed.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length < 2) {
    return false;
  }

  // Check for state/province OR country OR postal code
  const hasStateOrCountry = STATE_PROVINCE_REGEX.test(trimmed) || COUNTRY_REGEX.test(trimmed);
  const hasPostalCode = /\b\d{5}(-\d{4})?\b/.test(trimmed) || /\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/i.test(trimmed) || /\b\d{4,6}\b/.test(trimmed);

  // Must have either state/country OR postal code
  if (!hasStateOrCountry && !hasPostalCode) {
    return false;
  }

  return true;
}


/**
 * Get the quality score of an address (0-10)
 * @param {string} address - Address to score
 * @returns {number}
 */
function getAddressQualityScore(address) {
  if (!isValidAddress(address)) return 0;

  let score = 0;
  const trimmed = address.trim();

  // Length bonus
  if (trimmed.length >= 30) score += 2;
  if (trimmed.length >= 50) score += 1;

  // Has street number
  if (/^\d+\s+[A-Za-z]/.test(trimmed)) score += 2;

  // Has street type
  if (/\b(St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Lane|Ln|Way|Pl|Place|Court|Ct|Circle|Cir|Pkwy|Parkway|Highway|Hwy)\b/i.test(trimmed)) {
    score += 2;
  }

  // Has comma separators
  const commas = (trimmed.match(/,/g) || []).length;
  if (commas >= 2) score += 1;

  // Has postal code
  if (/\b\d{5}(-\d{4})?\b/.test(trimmed)) score += 1; // US
  if (/\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/i.test(trimmed)) score += 1; // Canada

  // Has state/country
  if (STATE_PROVINCE_REGEX.test(trimmed)) score += 1;
  if (COUNTRY_REGEX.test(trimmed)) score += 1;

  return Math.min(10, score);
}

/**
 * Clean an address string (remove extra whitespace, fix common issues)
 * @param {string} address - Address to clean
 * @returns {string}
 */
function cleanAddress(address) {
  if (!address || typeof address !== 'string') return '';

  return address
    .replace(/\s+/g, ' ')           // Collapse whitespace
    .replace(/,\s*,/g, ',')         // Remove double commas
    .replace(/\s*,\s*/g, ', ')      // Normalize comma spacing
    .replace(/^\s*,\s*/, '')        // Remove leading comma
    .replace(/\s*,\s*$/, '')        // Remove trailing comma
    .trim();
}

module.exports = {
  isValidAddress,
  isCompleteAddress,
  getAddressQualityScore,
  cleanAddress,
  extractCountry,
  // Export patterns for testing
  JUNK_PATTERNS,
  STATE_PROVINCE_REGEX,
  COUNTRY_REGEX,
  COUNTRY_TO_ISO,
};
