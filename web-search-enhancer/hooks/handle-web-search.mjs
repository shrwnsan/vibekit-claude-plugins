// hooks/handle-web-search.mjs
import { tavilySearch } from './tavily-client.mjs';

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
      message: 'No search query provided'
    };
  }

  // Try the search with retry logic
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Add random delay to avoid rate limiting
      if (attempt > 0) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Exponential backoff up to 10s
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      // Try to search with custom headers to avoid detection
      const searchParams = {
        query,
        maxResults: params.maxResults || 5,
        includeAnswer: params.includeAnswer || true,
        includeRawContent: params.includeRawContent || false,
        headers: generateRandomHeaders()
      };
      
      const results = await tavilySearch(searchParams, timeout);
      
      // If successful, return results
      return {
        success: true,
        data: results,
        attempt: attempt + 1
      };
      
    } catch (error) {
      console.error(`Search attempt ${attempt + 1} failed:`, error.message);
      
      // Check if it's a retryable error
      if (attempt === maxRetries || !isRetryableError(error)) {
        return {
          error: true,
          message: error.message,
          attempt: attempt + 1
        };
      }
      
      // Continue to next attempt
    }
  }
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
  // 403, 429, ECONNREFUSED, ETIMEDOUT are retryable
  return error.code === 403 || 
         error.code === 429 || 
         error.code === 'ECONNREFUSED' || 
         error.code === 'ETIMEDOUT' ||
         error.message.includes('403') ||
         error.message.includes('429') ||
         error.message.includes('ECONNREFUSED') ||
         error.message.includes('ETIMEDOUT');
}