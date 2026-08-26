/**
 * JinaReaderService - FREE web scraping via Jina Reader API
 * ------------------------------------------------------
 * Jina Reader is a FREE service that:
 *  - Renders JavaScript (like Puppeteer)
 *  - Returns clean Markdown (no HTML noise)
 *  - No API key required
 *  - Fast: 2-3 seconds per page
 *
 * Usage:
 *   const { crawlDomain } = require('./JinaReaderService');
 *   const result = await crawlDomain('example.com');
 *   // result.markdown contains combined content from all pages
 */

const JINA_BASE_URL = 'https://r.jina.ai/';
const TIMEOUT_MS = 15000;

/**
 * Fetch clean markdown from a URL using Jina Reader
 * @param {string} url - Full URL to scrape
 * @returns {Promise<{success: boolean, markdown?: string, error?: string, url: string}>}
 */
async function fetchMarkdown(url) {
  const jinaUrl = `${JINA_BASE_URL}${url}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(jinaUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'text/markdown',
        'User-Agent': 'Mozilla/5.0 (compatible; DomainEnrichmentBot/2.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`Jina returned ${response.status}`);
    }

    const markdown = await response.text();

    // Check if Jina returned an error message
    if (markdown.includes('Error:') && markdown.length < 500) {
      throw new Error(`Jina error: ${markdown.substring(0, 200)}`);
    }

    return { success: true, markdown, url };
  } catch (err) {
    const errorMsg = err.name === 'AbortError' ? 'Timeout' : err.message;
    return { success: false, error: errorMsg, url };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Crawl multiple pages of a domain and combine markdown
 * OPTIMIZED: Reduced pages, increased concurrency
 * @param {string} domain - Domain to crawl (without https://)
 * @returns {Promise<{success: boolean, markdown: string, pages: string[], errors: string[]}>}
 */
async function crawlDomain(domain) {
  // Clean domain
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');

  // OPTIMIZED: Reduced from 7 to 4 pages (homepage + contact + locations)
  const pages = [
    `https://${cleanDomain}`,
    `https://${cleanDomain}/contact`,
    `https://${cleanDomain}/contact-us`,
    `https://${cleanDomain}/locations`, // Added back for sites like cleanearthinc.com
    // Removed: /about, /about-us, /offices (rarely have address)
  ];


  console.log(`🌐 [Jina] Crawling ${cleanDomain} (${pages.length} pages)...`);

  // OPTIMIZED: Increased concurrency from 2 to 3, reduced delay from 300ms to 100ms
  const MAX_CONCURRENT = 3;
  const DELAY_BETWEEN_BATCHES_MS = 100;


  const successfulPages = [];
  const errors = [];

  // Process in batches of MAX_CONCURRENT
  for (let i = 0; i < pages.length; i += MAX_CONCURRENT) {
    const batch = pages.slice(i, i + MAX_CONCURRENT);
    
    const batchResults = await Promise.allSettled(
      batch.map(url => fetchMarkdown(url))
    );

    batchResults.forEach((result, batchIndex) => {
      const pageIndex = i + batchIndex;
      if (result.status === 'fulfilled' && result.value.success) {
        successfulPages.push(result.value);
      } else {
        const errorMsg = result.status === 'fulfilled'
          ? result.value.error
          : result.reason?.message || 'Unknown error';
        errors.push(`${pages[pageIndex]}: ${errorMsg}`);
      }
    });

    // Early exit if we have enough content (at least homepage + 1 contact page)
    if (successfulPages.length >= 2) {
      console.log(`✅ [Jina] Got enough pages (${successfulPages.length}), skipping rest`);
      break;
    }

    // Delay between batches to prevent rate limiting
    if (i + MAX_CONCURRENT < pages.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
    }
  }

  if (successfulPages.length === 0) {
    console.log(`⚠️ [Jina] All pages failed for ${cleanDomain}`);
    return {
      success: false,
      markdown: '',
      pages: [],
      errors,
    };
  }

  // Combine all markdown with page separators (limit each page to prevent LLM overload)
  const MAX_CHARS_PER_PAGE = 8000;
  const combinedMarkdown = successfulPages
    .map(p => {
      const truncatedContent = p.markdown.substring(0, MAX_CHARS_PER_PAGE);
      return `\n\n--- PAGE: ${p.url} ---\n\n${truncatedContent}`;
    })
    .join('\n');

  console.log(`✅ [Jina] Got ${successfulPages.length}/${pages.length} pages for ${cleanDomain}`);

  return {
    success: true,
    markdown: combinedMarkdown,
    pages: successfulPages.map(p => p.url),
    errors,
  };
}


module.exports = {
  fetchMarkdown,
  crawlDomain,
};
