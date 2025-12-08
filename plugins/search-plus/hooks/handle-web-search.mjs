// hooks/handle-web-search.mjs
import { tavily, extractContent } from './content-extractor.mjs';
import { handleWebSearchError } from './handle-search-error.mjs';
import { transform } from './schema.mjs';

// Configuration for environment variable namespacing
const TAVILY_API_KEY = process.env.SEARCH_PLUS_TAVILY_API_KEY || process.env.TAVILY_API_KEY || null;
const JINAAI_API_KEY = process.env.SEARCH_PLUS_JINAAI_API_KEY || process.env.JINAAI_API_KEY || null;

// Show deprecation warnings for old variable names
if (!process.env.SEARCH_PLUS_TAVILY_API_KEY && process.env.TAVILY_API_KEY) {
  console.warn('⚠️  TAVILY_API_KEY is deprecated. Please update to SEARCH_PLUS_TAVILY_API_KEY');
}
if (!process.env.SEARCH_PLUS_JINAAI_API_KEY && process.env.JINAAI_API_KEY) {
  console.warn('⚠️  JINAAI_API_KEY is deprecated. Please update to SEARCH_PLUS_JINAAI_API_KEY');
}

/**
 * Detects if the input is a URL
 * @param {string} input - The input to check
 * @returns {boolean} True if the input is a URL
 */
function isURL(input) {
  try {
    const url = new URL(input);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Handles web search requests with enhanced error handling
 * @param {Object} params - Search parameters
 * @returns {Object} Search results or error information
 */
export async function handleWebSearch(params) {
  const query = params.query || params.q || '';
  const maxRetries = params.maxRetries || 3;
  const timeout = params.timeout || 10000; // 10 seconds default
  
  if (!query) {
    return {
      error: true,
      message: 'No search query or URL provided'
    };
  }

  // Check if the query is a URL and handle extraction
  if (isURL(query)) {
    console.log(`🔍 Extracting content from URL: ${query}`);
    const result = await handleURLExtraction(query, { maxRetries, timeout });

    // Provide brief status feedback
    if (result.success) {
      console.log(`✅ URL extraction completed successfully`);
    } else {
      console.log(`❌ URL extraction failed: ${result.message}`);
    }

    return result;
  }

  // Provide status feedback for search queries
  if (!isURL(query)) {
    console.log(`🔍 Searching: ${query}`);
  }

  // Use hybrid search strategy
  try {
    const searchParams = {
      query,
      maxResults: params.maxResults || 5,
      includeAnswer: params.includeAnswer !== false,
      includeRawContent: params.includeRawContent || false,
      headers: generateRandomHeaders()
    };

    const result = await performHybridSearch(searchParams, timeout);

    return {
      success: true,
      data: result.data,
      service: result.service,
      attempt: 1
    };

  } catch (error) {
    console.error('All search strategies failed:', error.message);

    // Final error handling for recovery attempts
    const errorResult = await handleWebSearchError(error, {
      query,
      maxResults: params.maxResults || 5,
      includeAnswer: params.includeAnswer || true,
      includeRawContent: params.includeRawContent || false,
      headers: generateRandomHeaders(),
      timeout,
      attempt: 1,
      error: error
    });

    if (errorResult && errorResult.success) {
      return {
        success: true,
        data: errorResult.data,
        attempt: 1,
        errorRecovered: true,
        originalError: error.message,
        recoveryMessage: errorResult.message
      };
    }

    return {
      error: true,
      message: errorResult?.message || error.message,
      attempt: 1,
      errorHandlingApplied: true
    };
  }
}

/**
 * Hybrid web search with intelligent service selection
 * Sequential: Tavily → Parallel free services
 * Note: Jina API is only used for URL extraction, not web search
 */
async function performHybridSearch(params, timeoutMs = 10000) {
  // Phase 1: Try Tavily API (premium service)
  if (TAVILY_API_KEY) {
    try {
      console.log('🚀 Trying Tavily API...');
      const result = await tavily.search(params, timeoutMs);
      return { data: result, service: 'tavily' };
    } catch (error) {
      console.log('🔄 Tavily failed, trying free services...');
    }
  }

  // Phase 2: Parallel execution for free services
  console.log('🌐 Trying all free search engines in parallel...');
  const freeStrategies = [
    trySearXNGSearch(params, timeoutMs),
    tryDuckDuckGoHTML(params, timeoutMs),
    tryStartpageHTML(params, timeoutMs)
  ];

  try {
    const result = await Promise.any(freeStrategies);
    console.log(`✅ Success with free service: ${result.service}`);
    return result;
  } catch (aggregateError) {
    throw new Error('All search services failed. Try again or configure Tavily API key for enhanced reliability.');
  }
}


/**
 * Attempts search using SearXNG metasearch engine
 */
async function trySearXNGSearch(params, timeoutMs = 10000) {
  const searxngInstances = [
    'https://search.brave.works',
    'https://searx.be',
    'https://searx.tiekoetter.com',
    'https://search.snopyta.org'
  ];

  const query = encodeURIComponent(params.query);
  const maxResults = params.maxResults || 5;

  for (const instance of searxngInstances) {
    try {
      const searchUrl = `${instance}/search?q=${query}&format=json&engines=google,duckduckgo,startpage&results=${maxResults}`;

      const startTime = performance.now();
      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Referer': instance,
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin',
          ...params.headers
        },
        signal: AbortSignal.timeout(timeoutMs)
      });
      const response_time = performance.now() - startTime;

      if (!response.ok) {
        continue; // Try next instance
      }

      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        continue; // Try next instance
      }

      // Standardize the response
      const transformedData = transform({ ...data, query: params.query }, 'searxng', response_time);
      return { data: transformedData, service: 'searxng' };

    } catch (error) {
      console.log(`❌ SearXNG instance ${instance} failed: ${error.message}`);
      continue; // Try next instance
    }
  }

  throw new Error('All SearXNG instances failed');
}

/**
 * Attempts search using DuckDuckGo HTML parsing
 */
async function tryDuckDuckGoHTML(params, timeoutMs = 10000) {
  const query = encodeURIComponent(params.query);
  const maxResults = params.maxResults || 5;

  const searchUrl = `https://html.duckduckgo.com/html/?q=${query}&kl=us-en`;

  const startTime = performance.now();
  const response = await fetch(searchUrl, {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Cache-Control': 'max-age=0',
      ...params.headers
    },
    signal: AbortSignal.timeout(timeoutMs)
  });
  const response_time = performance.now() - startTime;

  if (!response.ok) {
    throw new Error(`DuckDuckGo HTML error: ${response.status}`);
  }

  const html = await response.text();

  // Parse HTML results
  const results = [];
  const resultRegex = /<div class="result">[\s\S]*?<a rel="nofollow" class="result__a" href="([^"]+)">([^<]+)<\/a>[\s\S]*?<a class="result__snippet" href="[^"]*">([^<]*)<\/a>/g;

  let match;
  while ((match = resultRegex.exec(html)) !== null && results.length < maxResults) {
    const [, url, title, snippet] = match;

    if (url && title && !url.includes('//r.jina.ai/http')) { // Filter out redirect links
      results.push({
        title: title.trim(),
        url: url.startsWith('http') ? url : `https:${url}`,
        content: snippet ? snippet.replace(/<[^>]*>/g, '').trim() : '',
        score: 1.0 - (results.length * 0.1)
      });
    }
  }

  if (results.length === 0) {
    throw new Error('No results found in DuckDuckGo HTML response');
  }

  // Standardize the response
  const rawData = { results, query: params.query };
  const transformedData = transform(rawData, 'duckduckgo-html', response_time);

  return { data: transformedData, service: 'duckduckgo-html' };
}

/**
 * Attempts search using Startpage HTML parsing
 */
async function tryStartpageHTML(params, timeoutMs = 10000) {
  const query = encodeURIComponent(params.query);
  const maxResults = params.maxResults || 5;

  const searchUrl = `https://www.startpage.com/do/search?query=${query}&cat=web&pl=ext-ff&extVersion=1.3.0`;

  const startTime = performance.now();
  const response = await fetch(searchUrl, {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Cache-Control': 'max-age=0',
      ...params.headers
    },
    signal: AbortSignal.timeout(timeoutMs)
  });
  const response_time = performance.now() - startTime;

  if (!response.ok) {
    throw new Error(`Startpage HTML error: ${response.status}`);
  }

  const html = await response.text();

  // Parse HTML results (Startpage format)
  const results = [];
  const resultRegex = /<h3><a href="([^"]+)"[^>]*>([^<]+)<\/a><\/h3>[\s\S]*?<p class="snippet">([^<]*)<\/p>/g;

  let match;
  while ((match = resultRegex.exec(html)) !== null && results.length < maxResults) {
    const [, url, title, snippet] = match;

    if (url && title) {
      results.push({
        title: title.trim(),
        url: url.startsWith('http') ? url : `https:${url}`,
        content: snippet ? snippet.replace(/<[^>]*>/g, '').trim() : '',
        score: 1.0 - (results.length * 0.1)
      });
    }
  }

  if (results.length === 0) {
    throw new Error('No results found in Startpage HTML response');
  }

  // Standardize the response
  const rawData = { results, query: params.query };
  const transformedData = transform(rawData, 'startpage-html', response_time);

  return { data: transformedData, service: 'startpage-html' };
}

/**
 * Generate random headers to avoid detection
 * @returns {Object} Random headers object
 */
function generateRandomHeaders() {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:89.0) Gecko/20100101 Firefox/89.0'
  ];
  
  return {
    'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)],
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
  };
}

/**
 * Determines if an error is retryable
 * @param {Error} error - The error to check
 * @returns {boolean} True if the error is retryable
 */
function isRetryableError(error) {
  // 403, 422, 429, 451, ECONNREFUSED, ETIMEDOUT are retryable
  const errorMessage = error.message || '';
  const errorString = JSON.stringify(error);

  return error.code === 403 ||
         error.code === 422 ||
         error.code === 429 ||
         error.code === 451 ||
         error.code === 'ECONNREFUSED' ||
         error.code === 'ETIMEDOUT' ||
         errorMessage.includes('403') ||
         errorMessage.includes('422') ||
         errorMessage.includes('429') ||
         errorMessage.includes('451') ||
         errorMessage.includes('SecurityCompromiseError') ||
         errorMessage.includes('blocked until') ||
         errorMessage.includes('ECONNREFUSED') ||
         errorMessage.includes('ETIMEDOUT') ||
         // Check for schema validation patterns
         errorString.toLowerCase().includes('missing') ||
         errorString.toLowerCase().includes('input_schema') ||
         errorString.toLowerCase().includes('field required');
}

/**
 * Handles URL extraction with retry logic
 * @param {string} url - The URL to extract content from
 * @param {Object} options - Extraction options
 * @returns {Object} Extraction results or error information
 */
async function handleURLExtraction(url, options = {}) {
  const { maxRetries = 3, timeout = 15000 } = options;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Add random delay to avoid rate limiting
      if (attempt > 0) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 8000); // Exponential backoff up to 8s
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      // Try to extract content with custom headers
      const extractOptions = {
        headers: generateRandomHeaders(),
        includeImages: false, // Don't include images by default for faster processing
        ...options
      };
      
      const results = await extractContent(url, extractOptions);
      
      return {
        success: true,
        data: results,
        attempt: attempt + 1,
        isURLExtraction: true
      };
      
    } catch (error) {
      console.error(`URL extraction attempt ${attempt + 1} failed:`, error.message);
      
      // Check if it's a retryable error
      if (attempt === maxRetries || !isRetryableError(error)) {
        return {
          error: true,
          message: `Failed to extract content from URL: ${error.message}`,
          attempt: attempt + 1,
          isURLExtraction: true
        };
      }
      
      // Continue to next attempt
    }
  }
}
