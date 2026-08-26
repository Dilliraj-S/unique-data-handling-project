/**
 * LLMService (CommonJS)
 * ------------------------------------------------------
 * Multi-provider LLM Service with Groq (primary) + OpenRouter (fallback)
 *
 * PROVIDER PRIORITY:
 * 1. Groq (14,400 requests/day free tier - best rate limits)
 * 2. OpenRouter (fallback, ~10-20 requests/minute global limit)
 *
 * IMPORTANT RULES:
 * - AI is NOT used for scraping
 * - AI is ONLY used when multiple strong candidates exist
 * - AI input is small and structured (not full HTML)
 * - AI output is deterministic selection, not hallucination
 *
 * USE CASES:
 * 1. Multiple conflicting addresses (e.g., "123 Main St" vs "456 Oak Ave")
 * 2. Partial data that needs semantic judgment
 * 3. Ambiguous company names
 */

const axios = require('axios');

// ============================================================
// GROQ API Configuration (PRIMARY - 14,400 requests/day free)
// ============================================================
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'; // Best free model

// ============================================================
// OpenRouter API Configuration (FALLBACK)
// ============================================================
const OPENROUTER_API_URL = process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-exp:free';

// Determine which provider to use (Groq preferred)
const USE_GROQ = !!GROQ_API_KEY && GROQ_API_KEY.length > 0;
const PRIMARY_PROVIDER = USE_GROQ ? 'groq' : 'openrouter';

/**
 * Check if LLM service is available
 */
function isAvailable() {
  return (GROQ_API_KEY && GROQ_API_KEY.length > 0) || 
         (OPENROUTER_API_KEY && OPENROUTER_API_KEY.length > 0);
}


/**
 * Build prompt for LLM disambiguation
 */
function buildPrompt(domain, candidates) {
  const { addresses = [], phones = [], companies = [] } = candidates;
  
  let prompt = `You are a data extraction assistant. Given a domain and multiple candidate values, select the BEST single value for each field.

Domain: ${domain}

Candidates:
`;

  if (companies.length > 0) {
    prompt += `\nCompany Names:\n`;
    companies.forEach((c, i) => {
      prompt += `  ${i + 1}. "${c}"\n`;
    });
  }

  if (addresses.length > 0) {
    prompt += `\nAddresses:\n`;
    addresses.forEach((a, i) => {
      // Support both string format (backward compat) and object format (new)
      if (typeof a === 'string') {
        prompt += `  ${i + 1}. "${a}"\n`;
      } else if (a && a.value) {
        const hint = a.hint ? ` (${a.hint})` : '';
        const score = a.score ? ` [score: ${a.score}]` : '';
        prompt += `  ${i + 1}. "${a.value}"${hint}${score}\n`;
      }
    });
  }

  if (phones.length > 0) {
    prompt += `\nPhone Numbers:\n`;
    phones.forEach((p, i) => {
      prompt += `  ${i + 1}. "${p}"\n`;
    });
  }

  prompt += `\nCRITICAL RULES (STRICT NO-HALLUCINATION POLICY):
1. YOU MUST ONLY SELECT FROM THE PROVIDED CANDIDATES. DO NOT INVENT, MODIFY, OR COMBINE VALUES.
2. If a field has no valid candidate, return an EMPTY STRING for that field.
3. For ADDRESSES (CRITICAL - Address Type Awareness):
   - ONLY select candidates that look like REAL POSTAL ADDRESSES with:
     * House/building number (digits at start)
     * Street name with street type (Street, St, Ave, Avenue, Road, Rd, Blvd, Boulevard, Suite, Ste, etc.)
     * City and state/country
     * Postal/ZIP code (preferred but not required)
   - ADDRESS TYPE PREFERENCE (IMPORTANT):
     * STRONGLY PREFER: Headquarters, Corporate Office, Main Office
       - Hints indicating main office: "contact popup", "footer", "structured data", "map link", "address tag"
       - These are typically the primary business address
     * AVOID: Branch offices, warehouses, registered offices, distribution centers
       - Hints indicating branches: "locations page" (unless it's the only/main location)
     * If multiple addresses exist with similar scores, choose the one with the highest score AND the hint suggesting main office
   - REJECT any candidate containing:
     * CSS/style code: "border:", "padding:", "margin:", "font-size", "px", "vh", "vw", "rem", "{", "}"
     * Marketing headlines: "Opens New Service Center", "Annual Report 2024", "Sustainability Report"
     * Generic phrases: "See what...", "Coming soon", "Report 20XX"
     * Pure dates: "10 December 2025" (unless it's part of a real address)
     * Short numeric-only: "2025", "38698" (unless clearly a postal code with context)
   - If NO candidate looks like a real postal address, return "" (empty string).
4. For PHONES:
   - ONLY select from provided candidates that:
     * Start with "+" and country code (E.164 format preferred)
     * OR are 10-15 digit numbers (US/international format)
   - DO NOT invent, modify, or format phone numbers.
   - If NO valid phone candidate exists, return "" (empty string).
5. For COMPANY NAMES:
   - ONLY select from provided candidates.
   - Prefer official legal names over shortened versions.
   - Reject candidates longer than 120 characters.
   - If NO valid company name exists, return "" (empty string).
6. VALIDATION: Before returning, verify each selected value EXACTLY MATCHES one of the provided candidates (case-insensitive, ignoring whitespace/punctuation).
7. Return ONLY valid JSON, no explanations, no markdown, no code blocks.

Response format (JSON only):
{
  "company_name": "exact match from candidates or empty string",
  "address": "exact match from candidates or empty string",
  "phone": "exact match from candidates or empty string"
}`;

  return prompt;
}

/**
 * Call OpenRouter API for disambiguation
 * 
 * @param {string} domain - Domain name
 * @param {object} candidates - Object with addresses, phones, companies arrays
 * @returns {Promise<{company_name: string, address: string, phone: string}>}
 */
async function disambiguateCandidates(domain, candidates) {
  if (!isAvailable()) {
    console.warn('⚠️ OpenRouter API key not configured, skipping LLM disambiguation');
    return {
      company_name: '',
      address: '',
      phone: '',
    };
  }

  try {
    const prompt = buildPrompt(domain, candidates);
    
    console.log(`🤖 Calling OpenRouter API for disambiguation (domain: ${domain})`);
    
    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a precise data extraction assistant. Return only valid JSON, no explanations.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.0, // Zero temperature for maximum determinism (no hallucination)
        max_tokens: 300, // Shorter response to prevent elaboration
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || 'https://example.com',
          'X-Title': 'Domain Enrichment Agent',
        },
        timeout: 10000, // 10 second timeout
      }
    );

    const content = response.data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenRouter response');
    }

    // Extract JSON from response (may have markdown code blocks)
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    const result = JSON.parse(jsonStr);
    
    console.log(`✅ LLM disambiguation completed for ${domain}`);
    
    return {
      company_name: String(result.company_name || '').trim(),
      address: String(result.address || '').trim(),
      phone: String(result.phone || '').trim(),
    };
  } catch (err) {
    console.error(`❌ LLM disambiguation failed for ${domain}:`, err.message);
    
    // On failure, do NOT invent or pick arbitrary values.
    // Let the caller fall back to its existing deterministic result.
    return {
      company_name: '',
      address: '',
      phone: '',
    };
  }
}

/**
 * Check if disambiguation is needed
 * Returns true if multiple strong candidates exist
 */
function needsDisambiguation(candidates) {
  const { addresses = [], phones = [], companies = [] } = candidates;
  
  // Need disambiguation if:
  // - Multiple addresses with similar scores
  // - Multiple phones
  // - Multiple companies
  const hasMultipleAddresses = addresses.length > 1;
  const hasMultiplePhones = phones.length > 1;
  const hasMultipleCompanies = companies.length > 1;
  
  return hasMultipleAddresses || hasMultiplePhones || hasMultipleCompanies;
}

// Model for full extraction (uses free Gemini 2.0 Flash)
const EXTRACTION_MODEL = process.env.OPENROUTER_EXTRACTION_MODEL || 'google/gemini-2.0-flash-exp:free';

/**
 * NEW: Extract structured data from markdown content
 * This is different from disambiguation - it reads the FULL page content
 * and extracts ALL company info including multiple addresses
 *
 * @param {string} domain - Domain being processed
 * @param {string} markdown - Markdown content from Jina Reader
 * @returns {Promise<{company_name: string, headquarters: object, branches: array, phones: array}>}
 */
async function extractFromMarkdown(domain, markdown) {
  if (!isAvailable()) {
    console.warn(`⚠️ [${domain}] LLM not available for extraction`);
    return { company_name: '', headquarters: null, branches: [], phones: [] };
  }

  const prompt = `You are extracting business contact information from a company website.

DOMAIN: ${domain}

WEBSITE CONTENT (from multiple pages):
${markdown.substring(0, 25000)}

TASK: Extract ALL contact information. Be THOROUGH - find EVERY address.

CRITICAL RULES:
1. ADDRESSES MUST BE COMPLETE:
   - Include: Street number, Street name, City, State/Province, Postal code, Country
   - If you see "123 Main Street" and "Chicago, IL 60601" nearby - COMBINE THEM into one complete address
   - REJECT partial addresses like "123 Main St." without city/state
   
2. HEADQUARTERS vs BRANCHES:
   - Identify the HEADQUARTERS (main office, corporate HQ, head office)
   - List ALL other locations as BRANCHES
   - If only one address found, put it in headquarters
   
3. PHONE NUMBERS:
   - Include country code (e.g., +1 for USA, +91 for India, +44 for UK)
   - Main/HQ phone is most important
   - Look in footer, contact page, and structured data
   
4. COMPANY NAME:
   - Use the official legal name (e.g., "Apple Inc." not "Apple")
   - Look for the name in footer, copyright notices, or structured data
   - Remove HTML entities like &amp; (convert to &)

5. ABSOLUTELY REJECT (do NOT include these as addresses):
   - CSS/code snippets (anything with { } or window. or function())
   - Marketing headlines ("Opens New Service Center", "Annual Report 2024")
   - Hours of operation ("Monday-Friday 9am-5pm")
   - Directions text ("Located 2 miles from...")
   - Event announcements
   - University names without street addresses
   - Date-only text ("December 2024")

OUTPUT FORMAT (JSON only, no markdown code blocks, no backticks):
{
  "company_name": "Official Company Name, Inc.",
  "headquarters": {
    "address": "123 Main Street, City, State 12345, Country",
    "phone": "+1-XXX-XXX-XXXX"
  },
  "branches": [
    {
      "name": "Branch name or city",
      "address": "456 Oak Avenue, City, State 67890, Country",
      "phone": "+1-XXX-XXX-XXXX"
    }
  ],
  "additional_phones": ["+1-800-XXX-XXXX"]
}

If NO valid address is found, return: {"company_name": "", "headquarters": null, "branches": [], "additional_phones": []}`;

  // Track global rate limit state to skip LLM when exhausted
  const now = Date.now();
  const RATE_LIMIT_COOLDOWN_MS = 60000; // 1 minute cooldown after hitting global limit
  if (global._llmGlobalRateLimitedUntil && now < global._llmGlobalRateLimitedUntil) {
    const waitSec = Math.ceil((global._llmGlobalRateLimitedUntil - now) / 1000);
    console.log(`⏭️ [${domain}] Skipping LLM - global rate limit cooldown (${waitSec}s remaining)`);
    return { company_name: '', headquarters: null, branches: [], additional_phones: [] };
  }

  // ============================================================
  // Provider Configuration: Groq (primary) + OpenRouter (fallback)
  // ============================================================
  const providers = [];
  
  // Groq - primary (14,400 requests/day free tier)
  if (GROQ_API_KEY && GROQ_API_KEY.length > 0) {
    providers.push({
      name: 'groq',
      model: GROQ_MODEL,
      url: GROQ_API_URL,
      apiKey: GROQ_API_KEY,
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
  }
  
  // OpenRouter - fallback (lower rate limits)
  if (OPENROUTER_API_KEY && OPENROUTER_API_KEY.length > 0) {
    providers.push({
      name: 'openrouter',
      model: OPENROUTER_MODEL,
      url: OPENROUTER_API_URL,
      apiKey: OPENROUTER_API_KEY,
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || 'https://example.com',
        'X-Title': 'Domain Enrichment Agent - Extraction',
      },
    });
  }

  if (providers.length === 0) {
    console.log(`⚠️ [${domain}] No LLM providers configured (set GROQ_API_KEY or OPENROUTER_API_KEY)`);
    return { company_name: '', headquarters: null, branches: [], additional_phones: [] };
  }

  console.log(`🤖 [${domain}] LLM providers available: ${providers.map(p => p.name).join(', ')}`);

  // Helper function to make LLM call to a specific provider
  async function callProvider(provider, retryCount = 0) {
    const maxRetries = 2;
    const baseDelayMs = 3000;

    try {
      const response = await axios.post(
        provider.url,
        {
          model: provider.model,
          messages: [
            {
              role: 'system',
              content: 'You extract structured business data from website content. Return ONLY valid JSON, no markdown formatting, no backticks, no explanation.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.1,
          max_tokens: 4000,
        },
        {
          headers: provider.headers,
          timeout: 60000,
        }
      );

      return response.data?.choices?.[0]?.message?.content || '';
    } catch (err) {
      // Handle rate limit (429) with retry
      if (err.response?.status === 429 && retryCount < maxRetries) {
        const delayMs = baseDelayMs * Math.pow(2, retryCount);
        console.log(`⏳ [${domain}] ${provider.name} rate limited (429), retrying in ${delayMs}ms... (attempt ${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return callProvider(provider, retryCount + 1);
      }
      throw err;
    }
  }


  try {
    // Reduce delay for Groq (better rate limits) vs OpenRouter
    const MIN_DELAY_MS = USE_GROQ ? 500 : 2000;
    const now2 = Date.now();
    if (global._lastLLMCallTime && (now2 - global._lastLLMCallTime) < MIN_DELAY_MS) {
      const waitTime = MIN_DELAY_MS - (now2 - global._lastLLMCallTime);
      console.log(`⏳ [${domain}] Rate limit delay, waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    global._lastLLMCallTime = Date.now();
    
    let content = '';
    let usedProvider = null;

    // Try each provider in order (Groq first, OpenRouter fallback)
    for (const provider of providers) {
      console.log(`🤖 [${domain}] Trying ${provider.name} (${provider.model})...`);
      
      try {
        content = await callProvider(provider);
        if (content) {
          usedProvider = provider;
          break;
        }
      } catch (providerErr) {
        // Handle rate limit and other errors
        const status = providerErr.response?.status;
        if (status === 429 || status === 400 || status === 404) {
          console.log(`⚠️ [${domain}] ${provider.name} failed (${status}), trying next provider...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        console.error(`❌ [${domain}] ${provider.name} error:`, providerErr.message);
        continue; // Try next provider
      }
    }
    
    if (!content) {
      // All providers failed - set global cooldown only if no Groq available
      if (!USE_GROQ) {
        global._llmGlobalRateLimitedUntil = Date.now() + 60000; // 1 minute cooldown
        console.log(`🚫 [${domain}] All LLM providers rate limited - entering 60s cooldown`);
      } else {
        console.log(`🚫 [${domain}] All LLM providers failed`);
      }
      throw new Error('All LLM providers failed or returned empty');
    }


    // Clean JSON from markdown code blocks
    content = content.trim();
    if (content.startsWith('```json')) {
      content = content.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (content.startsWith('```')) {
      content = content.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    // Find JSON object in response (in case there's extra text)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      content = jsonMatch[0];
    }

    const result = JSON.parse(content);
    
    // Success! Clear any cooldown
    global._llmGlobalRateLimitedUntil = null;
    
    console.log(`✅ [${domain}] LLM extraction completed (${usedProvider.name}/${usedProvider.model}): company="${result.company_name || ''}", HQ="${result.headquarters?.address ? 'found' : 'empty'}", branches=${result.branches?.length || 0}`);


    return {
      company_name: String(result.company_name || '').trim(),
      headquarters: result.headquarters || null,
      branches: Array.isArray(result.branches) ? result.branches : [],
      additional_phones: Array.isArray(result.additional_phones) ? result.additional_phones : [],
    };
  } catch (err) {
    console.error(`❌ [${domain}] LLM extraction failed:`, err.message);
    return { company_name: '', headquarters: null, branches: [], additional_phones: [] };

  }
}

/**
 * NEW: Validate and select best candidates from pre-extracted data
 * 
 * This function represents the NEW LLM role: VALIDATION only, no extraction.
 * LLM can ONLY select from the given candidates - it cannot invent new data.
 * 
 * @param {string} domain - Domain being processed
 * @param {object} candidates - Pre-extracted candidates { addresses: [], phones: [], companies: [] }
 * @returns {Promise<{company_name: string, headquarters: object, branches: array}>}
 */
async function validateCandidates(domain, candidates) {
  if (!isAvailable()) {
    console.warn(`⚠️ [${domain}] LLM not available for validation`);
    return null;
  }

  if (!candidates || 
      (!candidates.addresses?.length && !candidates.phones?.length && !candidates.companies?.length)) {
    console.log(`⚠️ [${domain}] No candidates to validate`);
    return null;
  }

  const addressList = candidates.addresses?.map(a => a.value || a) || [];
  const phoneList = candidates.phones?.map(p => p.value || p) || [];
  const companyList = candidates.companies?.map(c => c.value || c) || [];

  const prompt = `You are validating business data for ${domain}.

EXTRACTED CANDIDATES (from website, these are real data found on the site):
- Addresses: ${JSON.stringify(addressList.slice(0, 10))}
- Phones: ${JSON.stringify(phoneList.slice(0, 5))}
- Companies: ${JSON.stringify(companyList.slice(0, 5))}

TASK: Select the BEST option for each field.

CRITICAL RULES:
1. ONLY select from the candidates above - do NOT invent new data
2. Do NOT modify, complete, or expand any address
3. If multiple addresses exist, identify which is HQ (headquarters) vs branch
4. For country, use 2-letter ISO code (US, FR, DE, GB, CA, AU, etc.)
5. If no good candidate exists for a field, return empty string

OUTPUT (JSON only, no markdown):
{
  "company_name": "selected from companies list or empty",
  "headquarters": {
    "address": "selected from addresses list or empty",
    "phone": "selected from phones list or empty",
    "country": "2-letter ISO code"
  },
  "branches": [
    {
      "address": "another address from list",
      "phone": "phone for this branch or empty",
      "country": "2-letter ISO code"
    }
  ]
}`;

  try {
    // Build providers list (same as extractFromMarkdown)
    const providers = [];
    
    if (GROQ_API_KEY && GROQ_API_KEY.length > 0) {
      providers.push({
        name: 'groq',
        model: GROQ_MODEL,
        url: GROQ_API_URL,
        apiKey: GROQ_API_KEY,
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });
    }
    
    if (OPENROUTER_API_KEY && OPENROUTER_API_KEY.length > 0) {
      providers.push({
        name: 'openrouter',
        model: OPENROUTER_MODEL,
        url: OPENROUTER_API_URL,
        apiKey: OPENROUTER_API_KEY,
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || 'https://example.com',
          'X-Title': 'Domain Enrichment Agent - Validation',
        },
      });
    }

    if (providers.length === 0) {
      console.log(`⚠️ [${domain}] No LLM providers configured for validation`);
      return null;
    }

    let content = '';
    let usedProvider = null;

    for (const provider of providers) {
      try {
        const response = await axios.post(
          provider.url,
          {
            model: provider.model,
            messages: [
              { role: 'system', content: 'You validate and select best candidates. Return ONLY JSON.' },
              { role: 'user', content: prompt },
            ],
            temperature: 0.1,
            max_tokens: 2000,
          },
          { headers: provider.headers, timeout: 60000 }
        );
        
        content = response.data?.choices?.[0]?.message?.content || '';
        if (content) {
          usedProvider = provider;
          break;
        }
      } catch (err) {
        console.log(`⚠️ [${domain}] ${provider.name} validation failed:`, err.message);
        continue;
      }
    }

    if (!content) {
      console.log(`⚠️ [${domain}] All providers failed for validation`);
      return null;
    }

    // Parse JSON
    content = content.trim();
    if (content.startsWith('```')) {
      content = content.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
    }
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) content = jsonMatch[0];

    const result = JSON.parse(content);
    
    // CRITICAL: Verify LLM didn't hallucinate - all addresses must be from candidates
    if (result.headquarters?.address) {
      const hqAddr = result.headquarters.address;
      const isFromCandidates = addressList.some(a => 
        a.toLowerCase().includes(hqAddr.toLowerCase().substring(0, 20)) ||
        hqAddr.toLowerCase().includes(a.toLowerCase().substring(0, 20))
      );
      if (!isFromCandidates && addressList.length > 0) {
        console.log(`⚠️ [${domain}] LLM invented HQ address, using first candidate instead`);
        result.headquarters.address = addressList[0];
      }
    }

    // Verify branches too
    if (result.branches && Array.isArray(result.branches)) {
      result.branches = result.branches.filter(b => {
        if (!b.address) return false;
        return addressList.some(a => 
          a.toLowerCase().includes(b.address.toLowerCase().substring(0, 20)) ||
          b.address.toLowerCase().includes(a.toLowerCase().substring(0, 20))
        );
      });
    }

    console.log(`✅ [${domain}] LLM validation completed (${usedProvider.name}): HQ="${result.headquarters?.address ? 'found' : 'empty'}", branches=${result.branches?.length || 0}`);

    return result;

  } catch (err) {
    console.error(`❌ [${domain}] LLM validation failed:`, err.message);
    return null;
  }
}

module.exports = {
  disambiguateCandidates,
  needsDisambiguation,
  isAvailable,
  extractFromMarkdown,
  validateCandidates,
};

