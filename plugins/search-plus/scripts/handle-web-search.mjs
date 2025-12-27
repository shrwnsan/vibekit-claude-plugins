// scripts/handle-web-search.mjs
import { tavily, extractContent } from './content-extractor.mjs';
import { handleWebSearchError } from './handle-search-error.mjs';
import { gitHubService } from './github-service.mjs';
import { transformToStandard, createErrorResponse } from './response-transformer.mjs';
import { sanitizeHTMLContent, validateAndSanitizeURL } from './security-utils.mjs';

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
      const startTime = Date.now();
      const rawResult = await tavily.search(params, timeoutMs);
      const responseTime = Date.now() - startTime;

      // Transform to standard format
      const standardizedResult = transformToStandard('tavily', rawResult, params.query, responseTime);

      return { data: standardizedResult, service: 'tavily' };
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
      const startTime = Date.now();
      const searchUrl = `${instance}/search?q=${query}&format=json&engines=google,duckduckgo,startpage&results=${maxResults}`;

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

      if (!response.ok) {
        continue; // Try next instance
      }

      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        continue; // Try next instance
      }

      // Transform to standard format
      const responseTime = Date.now() - startTime;
      const standardizedResult = transformToStandard('searxng', data, params.query, responseTime);

      return { data: standardizedResult, service: 'searxng' };

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

  const startTime = Date.now();
  const searchUrl = `https://html.duckduckgo.com/html/?q=${query}&kl=us-en`;

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
      // Validate and sanitize URL with error handling
      let sanitizedUrl = null;
      try {
        sanitizedUrl = validateAndSanitizeURL(url.startsWith('http') ? url : `https:${url}`);
      } catch (error) {
        console.warn(`URL sanitization failed: ${url}`, error.message);
      }

      if (sanitizedUrl) {
        // Sanitize content with error handling
        let sanitizedTitle = '';
        let sanitizedContent = '';

        try {
          sanitizedTitle = sanitizeHTMLContent(title.trim());
        } catch (error) {
          console.warn(`Title sanitization failed: ${title}`, error.message);
          sanitizedTitle = title.trim(); // Fallback to original
        }

        try {
          sanitizedContent = snippet ? sanitizeHTMLContent(snippet) : '';
        } catch (error) {
          console.warn(`Content sanitization failed for snippet`, error.message);
          sanitizedContent = snippet ? snippet.replace(/<[^>]*>/g, '').trim() : ''; // Basic fallback
        }

        results.push({
          title: sanitizedTitle,
          url: sanitizedUrl,
          content: sanitizedContent,
          score: 1.0 - (results.length * 0.1)
        });
      }
    }
  }

  if (results.length === 0) {
    throw new Error('No results found in DuckDuckGo HTML response');
  }

  // Transform to standard format
  const responseTime = Date.now() - startTime;
  const standardResponse = {
    results,
    answer: null // DuckDuckGo doesn't provide instant answers in HTML mode
  };

  const standardizedResult = transformToStandard('duckduckgo-html', standardResponse, params.query, responseTime);

  return { data: standardizedResult, service: 'duckduckgo-html' };
}

/**
 * Attempts search using Startpage HTML parsing
 */
async function tryStartpageHTML(params, timeoutMs = 10000) {
  const query = encodeURIComponent(params.query);
  const maxResults = params.maxResults || 5;

  const startTime = Date.now();
  const searchUrl = `https://www.startpage.com/do/search?query=${query}&cat=web&pl=ext-ff&extVersion=1.3.0`;

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

    // Validate and sanitize URL with error handling
    let sanitizedUrl = null;
    try {
      sanitizedUrl = validateAndSanitizeURL(url);
    } catch (error) {
      console.warn(`URL sanitization failed: ${url}`, error.message);
    }

    if (sanitizedUrl && title) {
      // Sanitize content with error handling
      let sanitizedTitle = '';
      let sanitizedContent = '';

      try {
        sanitizedTitle = sanitizeHTMLContent(title);
      } catch (error) {
        console.warn(`Title sanitization failed: ${title}`, error.message);
        sanitizedTitle = title; // Fallback to original
      }

      try {
        sanitizedContent = snippet ? sanitizeHTMLContent(snippet) : '';
      } catch (error) {
        console.warn(`Content sanitization failed for snippet`, error.message);
        sanitizedContent = snippet ? snippet.replace(/<[^>]*>/g, '').trim() : ''; // Basic fallback
      }

      results.push({
        title: sanitizedTitle,
        url: sanitizedUrl,
        content: sanitizedContent,
        score: 1.0 - (results.length * 0.1)
      });
    }
  }

  if (results.length === 0) {
    throw new Error('No results found in Startpage HTML response');
  }

  // Transform to standard format
  const responseTime = Date.now() - startTime;
  const standardResponse = {
    results,
    answer: null
  };

  const standardizedResult = transformToStandard('startpage-html', standardResponse, params.query, responseTime);

  return { data: standardizedResult, service: 'startpage-html' };
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

  // If GitHub is enabled and it's a GitHub URL, try that first
  if (gitHubService.githubEnabled && await gitHubService.isGitHubUrl(url)) {
    console.log('[GitHub Service] GitHub URL detected, attempting to fetch via gh CLI...');
    try {
      const info = gitHubService.extractGitHubInfo(url);
      if (info) {
        const content = await gitHubService.fetchRepoContent(info.owner, info.repo, info.path || '');
        const data = {
            success: true,
            content: typeof content === 'string' ? content : JSON.stringify(content, null, 2),
            service: 'github',
            url,
        };
        return {
          success: true,
          data: data,
          attempt: 1,
          isURLExtraction: true,
        };
      }
    } catch (error) {
        if (error.code === 'GH_NOT_INSTALLED') {
            console.log('[GitHub Service] `gh` command not found. Please install the GitHub CLI. Falling back to web extraction.');
        } else {
            console.log(`[GitHub Service] gh CLI method failed, falling back to web extraction: ${error.message}`);
        }
    }
  }
  
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