/**
 * MarkdownExtractor - Extract addresses, phones, companies from markdown
 * -----------------------------------------------------------------------
 * This service extracts structured data from Jina Reader markdown WITHOUT LLM.
 * Uses regex patterns to find real addresses that exist in the content.
 * 
 * KEY PRINCIPLE: Extract only what's ACTUALLY in the text.
 * Do not infer, guess, or complete partial data.
 */

// Address patterns - ordered by confidence
const ADDRESS_PATTERNS = [
  // Pattern 1: Full US address (123 Main St, City, ST 12345)
  /\d+\s+[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct|Place|Pl|Parkway|Pkwy|Highway|Hwy)[.,]?\s*(?:Suite|Ste|Unit|Apt|#)?\s*\d*[.,]?\s+[A-Za-z\s]+[.,]\s*(?:AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\s+\d{5}(?:-\d{4})?/gi,
  
  // Pattern 2: Address with country (123 Main St, City, Country)
  /\d+\s+[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr)[.,]?\s*[\w\s]*[.,]\s*[\w\s]+[.,]\s*(?:USA|United States|Canada|UK|United Kingdom|Australia|Germany|France|Italy|Spain|Netherlands|Belgium|Switzerland|Japan|China|India)/gi,
  
  // Pattern 3: International format (City Postal Country)
  /[\w\s]+\d+[.,]?\s*\d{4,6}\s+[\w\s]+[.,]?\s*(?:Germany|France|Italy|Spain|Netherlands|Belgium|Switzerland|Australia|UK|United Kingdom)/gi,
  
  // Pattern 4: Canadian address (123 Main St, City, ON M5J 0E7)
  /\d+\s+[\w\s]+[.,]\s*[\w\s]+[.,]\s*(?:ON|BC|AB|QC|MB|SK|NS|NB|PE|NL|NT|NU|YT)\s+[A-Z]\d[A-Z]\s?\d[A-Z]\d/gi,
];

// Phone patterns - GLOBAL COVERAGE
const PHONE_PATTERNS = [
  // International format with + (e.g., +1-555-123-4567)
  /\+\d{1,3}[\s.-]?\(?\d{2,4}\)?[\s.-]?\d{2,4}[\s.-]?\d{2,4}[\s.-]?\d{0,4}/g,
  
  // US/Canada format (e.g., 1-800-555-1234, (555) 123-4567)
  /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
  
  // Toll-free (1-800, 1-888, etc.)
  /1[\s.-]?(?:800|888|877|866|855|844|833)[\s.-]?\d{3}[\s.-]?\d{4}/g,
  
  // UK format (+44 20 1234 5678, 020 1234 5678)
  /(?:\+44|0)\s?\d{2,4}\s?\d{3,4}\s?\d{3,4}/g,
  
  // Australian format (+61 2 1234 5678, 02 1234 5678)
  /(?:\+61|0)\s?\d{1,2}\s?\d{4}\s?\d{4}/g,
  
  // German format (+49 30 12345678)
  /(?:\+49|0)\s?\d{2,4}[\s.-]?\d{5,8}/g,
  
  // French format (+33 1 23 45 67 89)
  /(?:\+33|0)\s?\d{1}\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{2}/g,
];


// Company name patterns
const COMPANY_PATTERNS = [
  // Copyright notice
  /©\s*\d{4}\s+([A-Z][\w\s&,'.-]+(?:Inc|LLC|Ltd|Corp|Corporation|Company|Co|Group|Holdings|Partners|International|Global)?\.?)/gi,
  
  // All rights reserved
  /([A-Z][\w\s&,'.-]+(?:Inc|LLC|Ltd|Corp|Corporation)?\.?)\s+All\s+Rights\s+Reserved/gi,
  
  // Formal company name with suffix
  /\b([A-Z][\w\s&,'.-]{2,50}(?:Inc|LLC|Ltd|Corp|Corporation|Company|Co|Group|Holdings|Partners|International|Global|LP|LLP|PLC|GmbH|AG|SA|NV|BV)\.?)\b/g,
];

// Junk patterns to filter out
const JUNK_PATTERNS = [
  /cloudflare/i,
  /attention\s+required/i,
  /javascript/i,
  /function\s*\(/i,
  /\{\s*\}/,
  /window\./i,
  /document\./i,
  /css/i,
  /\bvar\s+/i,
  /\bconst\s+/i,
  /privacy\s+policy/i,
  /terms\s+of\s+service/i,
  /cookie/i,
  /subscribe/i,
  /newsletter/i,
];

// INVALID COMPANY NAME PATTERNS
// These are UI elements, questions, CTAs that should NOT be company names
const INVALID_COMPANY_PATTERNS = [
  // Questions and CTA patterns
  /^how\s+(can|do|to)/i,
  /^what\s+(is|are|can)/i,
  /^why\s+(choose|us)/i,
  /^where\s+(are|is)/i,
  /^when\s+(to|can)/i,
  /^get\s+(started|in\s+touch|help)/i,
  /^contact\s+(us|me|sales)/i,
  /^learn\s+(more|about)/i,
  /^find\s+(out|us|a)/i,
  /^request\s+(a|demo|quote)/i,
  /^schedule\s+(a|call|meeting)/i,
  /^book\s+(a|demo|call)/i,
  
  // Navigation patterns
  /^(home|about|services|products|solutions|careers|blog|news|press|media)$/i,
  /^(login|sign\s*in|register|sign\s*up)$/i,
  /^(menu|navigation|header|footer|sidebar)$/i,
  
  // Generic UI text
  /^attention\s+required/i,
  /^loading/i,
  /^please\s+wait/i,
  /^click\s+here/i,
  /^read\s+more/i,
  /^view\s+(all|more)/i,
  /^see\s+(all|more)/i,
  
  // Legal/policy text
  /^(copyright|privacy|terms|legal|disclaimer)/i,
  /^all\s+rights\s+reserved/i,
  
  // Location/address text (not company names)
  /^locations?\s+(in|at|near)/i,
  /^(address|phone|email|fax)/i,
  /^(headquarters|hq|office|branch)/i,
  
  // Country names (not company names)
  /^(united\s+states|usa|canada|india|china|japan|germany|france|uk|australia)$/i,
  
  // Single words that are too generic
  /^(home|about|contact|info|help|support|faq)$/i,
  
  // Report titles
  /report\s+\d{4}/i,
  /annual\s+report/i,
  /supply\s+chains?\s+act/i,
];

/**
 * Check if a company name is valid (not UI text, CTA, navigation, etc.)
 */
function isValidCompanyName(name) {
  if (!name || typeof name !== 'string') return false;
  
  const trimmed = name.trim();
  
  // Too short or too long
  if (trimmed.length < 2 || trimmed.length > 100) return false;
  
  // Check against invalid patterns
  for (const pattern of INVALID_COMPANY_PATTERNS) {
    if (pattern.test(trimmed)) return false;
  }
  
  // Check against junk patterns
  if (isJunkText(trimmed)) return false;
  
  return true;
}

/**
 * Check if text is junk (code, marketing, etc.)
 */
function isJunkText(text) {
  if (!text || text.length < 10) return true;
  return JUNK_PATTERNS.some(p => p.test(text));
}

/**
 * Get page priority score based on URL
 * Higher score = more likely to contain HQ address
 */
function getPagePriorityScore(pageUrl) {

  if (!pageUrl) return 0;
  
  const url = pageUrl.toLowerCase();
  
  // Contact pages have HIGHEST priority for HQ address
  if (url.includes('/contact') || url.includes('/contact-us')) {
    return 5;
  }
  
  // Homepage often has HQ in footer
  if (url.match(/^https?:\/\/[^\/]+\/?$/)) {
    return 4;
  }
  
  // About pages sometimes have HQ
  if (url.includes('/about') || url.includes('/about-us')) {
    return 3;
  }
  
  // Offices/branches page - lower priority
  if (url.includes('/offices') || url.includes('/branches')) {
    return 1;
  }
  
  // Locations page - LOWEST priority (contains multiple branches)
  if (url.includes('/locations') || url.includes('/location')) {
    return 0;
  }
  
  return 2;
}

/**
 * Parse Jina markdown into sections by page
 * Jina format: --- PAGE: url ---\n\ncontent
 */
function parseMarkdownSections(markdown) {
  if (!markdown) return [{ url: '', content: markdown }];
  
  const sections = [];
  
  // Normalize line endings first (Windows CRLF to LF)
  const normalizedMarkdown = markdown.replace(/\r\n/g, '\n');
  
  // Try to parse page sections from Jina format: --- PAGE: url ---\n\ncontent
  const pagePattern = /---\s*PAGE:\s*(.+?)\s*---\n\n?([\s\S]*?)(?=---\s*PAGE:|$)/gi;
  
  let match;
  while ((match = pagePattern.exec(normalizedMarkdown)) !== null) {
    sections.push({
      url: match[1].trim(),
      content: match[2].trim(),
    });
  }
  
  // If no page markers found, treat entire markdown as one section
  if (sections.length === 0) {
    sections.push({ url: '', content: normalizedMarkdown });
  }
  
  console.log(`🔍 [MarkdownExtractor] Parsed ${sections.length} sections from markdown`);
  
  return sections;
}


/**
 * Extract addresses from markdown text
 * NOW WITH HQ PRIORITIZATION based on page source
 * 
 * @param {string} markdown - Markdown content from Jina
 * @returns {Array<{value: string, score: number, source: string, pageUrl: string}>}
 */
function extractAddressesFromMarkdown(markdown) {
  if (!markdown || typeof markdown !== 'string') return [];
  
  const addresses = [];
  const seen = new Set();
  
  // ============================================================
  // STEP 0: Parse markdown into page sections for HQ prioritization
  // ============================================================
  const sections = parseMarkdownSections(markdown);
  
  // Process each page section separately
  for (const section of sections) {
    const pageUrl = section.url;
    const content = section.content;
    const pagePriority = getPagePriorityScore(pageUrl);
    
    // ============================================================
    // METHOD 1: Full address regex patterns
    // ============================================================
    for (const pattern of ADDRESS_PATTERNS) {
      // Reset lastIndex for global patterns
      pattern.lastIndex = 0;
      const matches = content.match(pattern) || [];
      for (const match of matches) {
        const cleaned = match.trim().replace(/\s+/g, ' ');
        const normalized = cleaned.toLowerCase();
        
        if (seen.has(normalized)) continue;
        if (isJunkText(cleaned)) continue;
        if (cleaned.length < 20) continue;
        
        seen.add(normalized);
        addresses.push({
          value: cleaned,
          score: getAddressScore(cleaned) + pagePriority, // ADD PAGE PRIORITY
          source: 'markdown-regex',
          pageUrl: pageUrl,
          isHQSource: pagePriority >= 4, // Contact page or homepage
        });
      }
    }
    
    // ============================================================
    // METHOD 2: Labeled address patterns
    // ============================================================
    const labeledPatterns = [
      /(?:Address|Location|Office|Headquarters|HQ)[:\s]+([^<\n]+(?:,\s*[^<\n]+){2,})/gi,
      /(?:📍|📌|🏢)\s*([^<\n]+(?:,\s*[^<\n]+){2,})/gi,
    ];
    
    for (const pattern of labeledPatterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const addr = match[1].trim();
        const normalized = addr.toLowerCase();
        
        if (seen.has(normalized)) continue;
        if (isJunkText(addr)) continue;
        if (addr.length < 20 || addr.length > 200) continue;
        
        // Check if labeled as HQ
        const isHQLabel = /headquarters|hq|main\s+office|corporate/i.test(match[0]);
        const hqBonus = isHQLabel ? 3 : 0;
        
        seen.add(normalized);
        addresses.push({
          value: addr,
          score: getAddressScore(addr) + pagePriority + hqBonus + 2, // Bonus for labeled
          source: 'markdown-labeled',
          pageUrl: pageUrl,
          isHQSource: pagePriority >= 4 || isHQLabel,
        });
      }
    }
    
    // ============================================================
    // METHOD 3: CRITICAL FIX - Join adjacent lines that form addresses
    // More aggressive detection patterns
    // ============================================================
    const lines = content.split(/\n/).map(l => l.trim()).filter(Boolean);
    
    // Debug: log first few lines to see what we're working with
    if (pageUrl.includes('contact')) {
      console.log(`🔍 [DEBUG] Contact page has ${lines.length} lines. Sample:`, lines.slice(0, 10));
    }
    
    for (let i = 0; i < lines.length - 1; i++) {
      const line1 = lines[i];
      const line2 = lines[i + 1];
      const line3 = lines[i + 2] || '';
      
      // PATTERN A: Line starts with street number (e.g., "518 US Hwy 281 N")
      const startsWithNumber = /^\d+\s/.test(line1);
      
      // PATTERN B: Line contains street keywords (Hwy, St, Rd, Ave, Dr, Blvd)
      const hasStreetKeyword = /\b(Hwy|Highway|St|Street|Rd|Road|Ave|Avenue|Dr|Drive|Blvd|Boulevard|Lane|Ln|Way|Court|Ct|Place|Pl)\b/i.test(line1);
      
      // PATTERN C: Line contains directional suffix (N, S, E, W)
      const hasDirection = /\b[NSEW]\b|\b(North|South|East|West)\b/i.test(line1);
      
      // Line2 should have city/state pattern
      const hasCityState = /\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\b/i.test(line2);
      const hasZip = /\d{5}(-\d{4})?/.test(line2);
      
      // Match if line1 looks like address AND line2 has city/state/zip
      const line1LooksLikeAddress = (startsWithNumber && (hasStreetKeyword || hasDirection)) || 
                                     (startsWithNumber && line1.length > 10);
      
      if (line1LooksLikeAddress && (hasCityState || hasZip)) {
        // Join adjacent lines
        let joined = `${line1.replace(/,?\s*$/, '')}, ${line2}`;
        
        // Optionally add line3 if it has country
        if (line3 && /^(USA|United States|Canada|UK|Australia|\d{5})/i.test(line3)) {
          joined = `${joined}, ${line3}`;
        }
        
        // Clean up
        joined = joined.replace(/,\s*,/g, ',').replace(/\s+/g, ' ').trim();
        const normalized = joined.toLowerCase();
        
        console.log(`🔍 [DEBUG] Found potential address: "${joined}" (score: ${getAddressScore(joined)})`);
        
        if (!seen.has(normalized) && joined.length >= 20 && getAddressScore(joined) >= 3) {
          seen.add(normalized);
          addresses.push({
            value: joined,
            score: getAddressScore(joined) + pagePriority + 2, // +2 bonus for joined
            source: 'markdown-joined',
            pageUrl: pageUrl,
            isHQSource: pagePriority >= 4,
          });
          console.log(`✅ [DEBUG] Added address: "${joined}" with score ${getAddressScore(joined) + pagePriority + 2}`);
        }
      }
    }
  }

  
  // Sort by score (HQ addresses will be at top due to page priority)
  return addresses.sort((a, b) => b.score - a.score);
}


/**
 * Score an address based on completeness
 */
function getAddressScore(address) {
  let score = 0;
  
  // Has street number
  if (/^\d+\s/.test(address)) score += 2;
  
  // Has street type
  if (/\b(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr)\b/i.test(address)) score += 2;
  
  // Has city/state separator
  if ((address.match(/,/g) || []).length >= 2) score += 2;
  
  // Has postal code
  if (/\d{5}(-\d{4})?/.test(address)) score += 2; // US
  if (/[A-Z]\d[A-Z]\s?\d[A-Z]\d/i.test(address)) score += 2; // Canada
  if (/\d{4,6}/.test(address)) score += 1; // Other
  
  // Has country
  if (/\b(USA|United States|Canada|UK|Germany|France|Australia)\b/i.test(address)) score += 1;
  
  return Math.min(10, score);
}

/**
 * Extract phone numbers from markdown text
 * @param {string} markdown - Markdown content
 * @returns {Array<{value: string, score: number, source: string}>}
 */
function extractPhonesFromMarkdown(markdown) {
  if (!markdown || typeof markdown !== 'string') return [];
  
  const phones = [];
  const seen = new Set();
  
  for (const pattern of PHONE_PATTERNS) {
    const matches = markdown.match(pattern) || [];
    for (const match of matches) {
      // Normalize phone
      const digits = match.replace(/\D/g, '');
      
      // Skip invalid lengths
      if (digits.length < 10 || digits.length > 15) continue;
      
      // Skip if seen
      if (seen.has(digits)) continue;
      seen.add(digits);
      
      // Format with +
      let formatted = match.trim();
      if (!formatted.startsWith('+') && digits.length >= 10) {
        if (digits.length === 10) {
          formatted = `+1${digits}`;
        } else if (digits.startsWith('1') && digits.length === 11) {
          formatted = `+${digits}`;
        } else {
          formatted = `+${digits}`;
        }
      }
      
      phones.push({
        value: formatted,
        score: getPhoneScore(formatted),
        source: 'markdown-regex',
      });
    }
  }
  
  // Look for labeled phones
  const labeledPattern = /(?:Phone|Tel|Call|Contact)[:\s]+([+\d\s().-]{10,20})/gi;
  let match;
  while ((match = labeledPattern.exec(markdown)) !== null) {
    const phone = match[1].trim();
    const digits = phone.replace(/\D/g, '');
    
    if (digits.length < 10 || digits.length > 15) continue;
    if (seen.has(digits)) continue;
    seen.add(digits);
    
    phones.push({
      value: phone,
      score: 5, // Bonus for labeled
      source: 'markdown-labeled',
    });
  }
  
  return phones.sort((a, b) => b.score - a.score);
}

/**
 * Score a phone number
 */
function getPhoneScore(phone) {
  let score = 3;
  
  // Has country code
  if (phone.startsWith('+')) score += 2;
  
  // Toll-free
  if (/800|888|877|866|855|844|833/.test(phone)) score += 1;
  
  return Math.min(10, score);
}

/**
 * Extract company names from markdown
 * @param {string} markdown - Markdown content
 * @returns {Array<{value: string, score: number, source: string}>}
 */
function extractCompanyFromMarkdown(markdown) {
  if (!markdown || typeof markdown !== 'string') return [];
  
  const companies = [];
  const seen = new Set();
  
  for (const pattern of COMPANY_PATTERNS) {
    let match;
    while ((match = pattern.exec(markdown)) !== null) {
      const company = match[1]?.trim() || match[0]?.trim();
      if (!company || company.length < 2 || company.length > 100) continue;
      
      const normalized = company.toLowerCase();
      if (seen.has(normalized)) continue;
      
      // Use new isValidCompanyName for comprehensive validation
      if (!isValidCompanyName(company)) continue;
      
      seen.add(normalized);
      companies.push({
        value: cleanCompanyName(company),
        score: 5,
        source: 'markdown-regex',
      });
    }
  }
  
  // Look for title or heading
  const titleMatch = markdown.match(/^#\s+([A-Z][\w\s&,'.-]{2,50})/m);
  if (titleMatch) {
    const title = titleMatch[1].trim();
    if (!seen.has(title.toLowerCase()) && isValidCompanyName(title)) {
      companies.push({
        value: cleanCompanyName(title),
        score: 4,
        source: 'markdown-title',
      });
    }
  }
  
  return companies.sort((a, b) => b.score - a.score);
}


/**
 * Clean company name
 */
function cleanCompanyName(name) {
  if (!name) return '';
  return name
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract all data from markdown
 * @param {string} markdown - Markdown content from Jina
 * @returns {{addresses: Array, phones: Array, companies: Array}}
 */
function extractAllFromMarkdown(markdown) {
  return {
    addresses: extractAddressesFromMarkdown(markdown),
    phones: extractPhonesFromMarkdown(markdown),
    companies: extractCompanyFromMarkdown(markdown),
  };
}

module.exports = {
  extractAddressesFromMarkdown,
  extractPhonesFromMarkdown,
  extractCompanyFromMarkdown,
  extractAllFromMarkdown,
  isJunkText,
  isValidCompanyName,
};
