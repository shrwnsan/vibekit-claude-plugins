// hooks/handle-web-search.mjs
import { tavilySearch, extractContent } from './content-extractor.mjs';
import { handleWebSearchError } from './handle-search-error.mjs';

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

      // Use enhanced error handling for all errors, including 422
      const errorResult = await handleWebSearchError(error, {
        query,
        maxResults: params.maxResults || 5,
        includeAnswer: params.includeAnswer || true,
        includeRawContent: params.includeRawContent || false,
        headers: generateRandomHeaders(),
        timeout,
        attempt: attempt + 1
      });

      // If error handling succeeded, return the results
      if (errorResult && errorResult.success) {
        return {
          success: true,
          data: errorResult.data,
          attempt: attempt + 1,
          errorRecovered: true,
          originalError: error.message,
          recoveryMessage: errorResult.message
        };
      }

      // If this was the last attempt or non-retryable error, return final failure
      if (attempt === maxRetries || !isRetryableError(error)) {
        return {
          error: true,
          message: errorResult?.message || error.message,
          attempt: attempt + 1,
          errorHandlingApplied: true
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
  // 403, 422, 429, ECONNREFUSED, ETIMEDOUT are retryable
  const errorMessage = error.message || '';
  const errorString = JSON.stringify(error);

  return error.code === 403 ||
         error.code === 422 ||
         error.code === 429 ||
         error.code === 'ECONNREFUSED' ||
         error.code === 'ETIMEDOUT' ||
         errorMessage.includes('403') ||
         errorMessage.includes('422') ||
         errorMessage.includes('429') ||
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