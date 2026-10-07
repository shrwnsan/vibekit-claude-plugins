// scripts/handle-web-search.mjs
import { tavily, extractContent } from './content-extractor.mjs';
import { gitHubService } from './github-service.mjs';
import { transformToStandard, createErrorResponse } from './response-transformer.mjs';

// Configuration for environment variable namespacing
const TAVILY_API_KEY = process.env.SEARCH_PLUS_TAVILY_API_KEY || process.env.TAVILY_API_KEY || null;
const JINA_API_KEY = process.env.SEARCH_PLUS_JINA_API_KEY || process.env.SEARCH_PLUS_JINAAI_API_KEY || process.env.JINA_API_KEY || process.env.JINAAI_API_KEY || null;
const BRAVE_API_KEY = process.env.SEARCH_PLUS_BRAVE_API_KEY || process.env.BRAVE_API_KEY || null;
const EXA_API_KEY = process.env.SEARCH_PLUS_EXA_API_KEY || process.env.EXA_API_KEY || null;
const FIRECRAWL_API_KEY = process.env.SEARCH_PLUS_FIRECRAWL_API_KEY || null;

// Show deprecation warnings for old variable names
if (!process.env.SEARCH_PLUS_TAVILY_API_KEY && process.env.TAVILY_API_KEY) {
  console.warn('⚠️  TAVILY_API_KEY is deprecated. Please update to SEARCH_PLUS_TAVILY_API_KEY');
}
if (!process.env.SEARCH_PLUS_JINA_API_KEY && (process.env.JINA_API_KEY || process.env.JINAAI_API_KEY || process.env.SEARCH_PLUS_JINAAI_API_KEY)) {
  console.warn('⚠️  JINA/JINAAI API key variable names are deprecated. Please update to SEARCH_PLUS_JINA_API_KEY');
}
if (!process.env.SEARCH_PLUS_BRAVE_API_KEY && process.env.BRAVE_API_KEY) {
  console.warn('⚠️  BRAVE_API_KEY is deprecated. Please update to SEARCH_PLUS_BRAVE_API_KEY');
}
if (!process.env.SEARCH_PLUS_EXA_API_KEY && process.env.EXA_API_KEY) {
  console.warn('⚠️  EXA_API_KEY is deprecated. Please update to SEARCH_PLUS_EXA_API_KEY');
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
      includeRawContent: params.includeRawContent || false
    };

    const result = await performHybridSearch(searchParams, timeout);

    return {
      success: true,
      data: result.data,
      service: result.service,
      attempt: 1
    };

  } catch (error) {
    // The only reachable throw is the all-failed error from performHybridSearch;
    // recovery choreography (handle-search-error.mjs) was removed as dead code.
    console.error('All search strategies failed:', error.message);
    return {
      error: true,
      message: error.message,
      attempt: 1
    };
  }
}

/**
 * Hybrid web search with intelligent service selection
 * Sequential: Tavily → Brave → Exa → Jina Search → Firecrawl (keyless)
 */
export async function performHybridSearch(params, timeoutMs = 10000) {
  // Phase 1: Try Tavily API (premium, best RAG integration)
  if (TAVILY_API_KEY) {
    try {
      console.log('🚀 Trying Tavily API...');
      const startTime = Date.now();
      const rawResult = await tavily.search(params, timeoutMs);
      const responseTime = Date.now() - startTime;

      const standardizedResult = transformToStandard('tavily', rawResult, params.query, responseTime);
      return { data: standardizedResult, service: 'tavily' };
    } catch (error) {
      console.log('🔄 Tavily failed, trying Brave Search...');
    }
  }

  // Phase 2: Try Brave Search API (independent index, fastest)
  if (BRAVE_API_KEY) {
    try {
      console.log('🦁 Trying Brave Search...');
      const result = await tryBraveSearch(params, timeoutMs);
      console.log('✅ Success with Brave Search');
      return result;
    } catch (error) {
      console.log(`❌ Brave Search failed: ${error.message}`);
    }
  }

  // Phase 3: Try Exa AI (semantic/neural search)
  if (EXA_API_KEY) {
    try {
      console.log('🔬 Trying Exa Search...');
      const result = await tryExaSearch(params, timeoutMs);
      console.log('✅ Success with Exa Search');
      return result;
    } catch (error) {
      console.log(`❌ Exa Search failed: ${error.message}`);
    }
  }

  // Phase 4: Try Jina Search API (last resort)
  if (JINA_API_KEY) {
    try {
      console.log('🔍 Trying Jina Search (s.jina.ai)...');
      const result = await tryJinaSearch(params, timeoutMs);
      console.log('✅ Success with Jina Search');
      return result;
    } catch (error) {
      console.log(`❌ Jina Search failed: ${error.message}`);
    }
  }

  // Phase 5: Firecrawl Search (keyless tier works without signup; key raises limits)
  try {
    console.log('🔥 Trying Firecrawl Search...');
    const result = await tryFirecrawlSearch(params, timeoutMs);
    console.log('✅ Success with Firecrawl Search');
    return result;
  } catch (error) {
    console.log(`❌ Firecrawl Search failed: ${error.message}`);
  }

  throw new Error(
    'All search services failed (including keyless Firecrawl). Configure an API key for higher limits:\n' +
    '  • SEARCH_PLUS_TAVILY_API_KEY (recommended, 1000 free searches/month at tavily.com)\n' +
    '  • SEARCH_PLUS_BRAVE_API_KEY ($5 free credits/month at brave.com/search/api)\n' +
    '  • SEARCH_PLUS_EXA_API_KEY (1000 free searches/month at exa.ai)\n' +
    '  • SEARCH_PLUS_JINA_API_KEY (10M free tokens at jina.ai)\n' +
    '  • SEARCH_PLUS_FIRECRAWL_API_KEY (1,000 free credits/month at firecrawl.dev)\n' +
    'See: https://github.com/shrwnsan/vibekit-claude-plugins/tree/main/plugins/search-plus#setup-options'
  );
}

/**
 * Attempts web search using Firecrawl Search API.
 * Works without a key (keyless tier, rate-limited per IP); SEARCH_PLUS_FIRECRAWL_API_KEY raises limits.
 */
async function tryFirecrawlSearch(params, timeoutMs = 10000) {
  const startTime = Date.now();
  const response = await fetch('https://api.firecrawl.dev/v2/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(FIRECRAWL_API_KEY ? { 'Authorization': `Bearer ${FIRECRAWL_API_KEY}` } : {})
    },
    body: JSON.stringify({ query: params.query, limit: params.maxResults || 5 }),
    signal: AbortSignal.timeout(timeoutMs)
  });

  if (!response.ok) {
    throw new Error(`Firecrawl Search error: ${response.status}`);
  }

  const data = await response.json();

  // Firecrawl returns { data: { web: [{ url, title, description }] } }
  const results = (data.data?.web || []).map(item => ({
    title: item.title || '',
    url: item.url || '',
    content: item.description || item.markdown || ''
  }));

  if (results.length === 0) {
    throw new Error('No results found from Firecrawl Search');
  }

  const standardizedResult = transformToStandard('firecrawl', { results }, params.query, Date.now() - startTime);
  return { data: standardizedResult, service: 'firecrawl' };
}

/**
 * Formats a handleWebSearch() result as compact markdown for the model.
 * Raw JSON (scores, metadata, every attempt) costs tokens without helping the answer.
 * @param {Object} result - Successful result from handleWebSearch()
 * @returns {string} Markdown
 */
export function formatResult(result) {
  const data = result.data;
  if (typeof data === 'string') return data;

  // URL extraction
  if (result.isURLExtraction) {
    const title = data.metadata?.title;
    return [
      title ? `# ${title}` : null,
      `Source: ${data.url} (via ${data.service})`,
      '',
      typeof data.content === 'string' ? data.content.trim() : JSON.stringify(data.content, null, 2)
    ].filter(line => line !== null).join('\n');
  }

  // Web search
  const lines = [`Search results for "${data.query}" (via ${data.service || result.service})`, ''];
  if (data.answer) lines.push(`Answer: ${data.answer}`, '');
  (data.results || []).forEach((r, i) => {
    lines.push(`${i + 1}. [${r.title || r.url}](${r.url})${r.published_date ? ` (${r.published_date.slice(0, 10)})` : ''}`);
    if (r.content) {
      const snippet = r.content.replace(/\s+/g, ' ').trim();
      lines.push(`   ${snippet.length > 800 ? snippet.slice(0, 800) + '…' : snippet}`);
    }
  });
  return lines.join('\n');
}

/**
 * Attempts web search using Jina.ai Search API (s.jina.ai)
 * Requires SEARCH_PLUS_JINA_API_KEY
 */
async function tryJinaSearch(params, timeoutMs = 10000) {
  if (!JINA_API_KEY) {
    throw new Error('Jina API key not configured');
  }

  const query = encodeURIComponent(params.query);
  const maxResults = params.maxResults || 5;

  const startTime = Date.now();
  const searchUrl = `https://s.jina.ai/${query}`;

  const response = await fetch(searchUrl, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${JINA_API_KEY}`,
      'X-Retain-Images': 'none',
    },
    signal: AbortSignal.timeout(timeoutMs)
  });

  if (!response.ok) {
    throw new Error(`Jina Search error: ${response.status}`);
  }

  const data = await response.json();

  // Jina returns { data: [{ title, url, content, description }] }
  const results = (data.data || []).slice(0, maxResults).map(item => ({
    title: item.title || '',
    url: item.url || '',
    content: item.content || item.description || '',
    score: 1.0
  }));

  if (results.length === 0) {
    throw new Error('No results found from Jina Search');
  }

  const responseTime = Date.now() - startTime;
  const standardResponse = { results, answer: null };
  const standardizedResult = transformToStandard('jina-search', standardResponse, params.query, responseTime);

  return { data: standardizedResult, service: 'jina-search' };
}

/**
 * Attempts web search using Brave Search API
 * Requires SEARCH_PLUS_BRAVE_API_KEY
 */
async function tryBraveSearch(params, timeoutMs = 10000) {
  if (!BRAVE_API_KEY) {
    throw new Error('Brave API key not configured');
  }

  const query = encodeURIComponent(params.query);
  const maxResults = Math.min(params.maxResults || 5, 20);

  const startTime = Date.now();
  const searchUrl = `https://api.search.brave.com/res/v1/web/search?q=${query}&count=${maxResults}`;

  const response = await fetch(searchUrl, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': BRAVE_API_KEY,
    },
    signal: AbortSignal.timeout(timeoutMs)
  });

  if (!response.ok) {
    throw new Error(`Brave Search error: ${response.status}`);
  }

  const data = await response.json();

  // Brave returns { web: { results: [{ title, url, description, extra_snippets }] } }
  const webResults = data.web?.results || [];
  const results = webResults.slice(0, maxResults).map(item => ({
    title: item.title || '',
    url: item.url || '',
    content: item.description || '',
    score: 1.0
  }));

  if (results.length === 0) {
    throw new Error('No results found from Brave Search');
  }

  const responseTime = Date.now() - startTime;
  const standardResponse = { results, answer: null };
  const standardizedResult = transformToStandard('brave', standardResponse, params.query, responseTime);

  return { data: standardizedResult, service: 'brave' };
}

/**
 * Attempts web search using Exa AI Search API
 * Requires SEARCH_PLUS_EXA_API_KEY
 */
async function tryExaSearch(params, timeoutMs = 10000) {
  if (!EXA_API_KEY) {
    throw new Error('Exa API key not configured');
  }

  const maxResults = params.maxResults || 5;

  const startTime = Date.now();

  const response = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': EXA_API_KEY,
    },
    body: JSON.stringify({
      query: params.query,
      numResults: maxResults,
      contents: {
        text: { maxCharacters: 1000 }
      }
    }),
    signal: AbortSignal.timeout(timeoutMs)
  });

  if (!response.ok) {
    throw new Error(`Exa Search error: ${response.status}`);
  }

  const data = await response.json();

  // Exa returns { results: [{ title, url, text, publishedDate, author }] }
  const results = (data.results || []).slice(0, maxResults).map(item => ({
    title: item.title || '',
    url: item.url || '',
    content: item.text || item.summary || '',
    score: 1.0,
    published_date: item.publishedDate || null
  }));

  if (results.length === 0) {
    throw new Error('No results found from Exa Search');
  }

  const responseTime = Date.now() - startTime;
  const standardResponse = { results, answer: null };
  const standardizedResult = transformToStandard('exa', standardResponse, params.query, responseTime);

  return { data: standardizedResult, service: 'exa' };
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

  // If GitHub is enabled and it's a GitHub Gist URL, try that first
  if (gitHubService.githubEnabled && await gitHubService.isGistUrl(url)) {
    console.log('[GitHub Service] Gist URL detected, attempting to fetch via gh CLI...');
    try {
      const info = gitHubService.extractGistInfo(url);
      if (info) {
        const content = await gitHubService.fetchGistContent(info.gistId);
        const data = {
            success: true,
            content: content,
            service: 'github-gist',
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

  // If GitHub is enabled and it's a GitHub repository URL, try that next
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
      
      // Don't spoof browser headers: they get API requests challenged by Cloudflare (e.g. r.jina.ai → 403)
      const extractOptions = {
        includeImages: false, // Don't include images by default for faster processing
        ...options
      };

      const results = await extractContent(url, extractOptions);

      // extractContent already walks every service; a failed result is final, not retryable
      if (!results.success) {
        const tried = (results.allResults || []).map(r => `${r.service}: ${(r.error?.message || 'empty content').slice(0, 200)}`);
        return {
          error: true,
          message: tried.length
            ? `Failed to extract content from URL. Tried:\n  - ${tried.join('\n  - ')}`
            : `Failed to extract content from URL: ${results.error?.message || 'unknown error'}`,
          attempt: attempt + 1,
          isURLExtraction: true
        };
      }

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