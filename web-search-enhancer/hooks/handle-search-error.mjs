// hooks/handle-search-error.mjs
import { tavilySearch } from './tavily-client.mjs';
import { handleRateLimit } from './handle-rate-limit.mjs';

/**
 * Handles web search errors with advanced recovery strategies
 * @param {Object} error - The error object
 * @param {Object} options - Search options that caused the error
 * @returns {Object} Recovery results or final error
 */
export async function handleWebSearchError(error, options) {
  console.log('Handling search error:', error);
  
  // Check error type and apply appropriate recovery strategy
  if (error.code === 403 || error.message.includes('403') || error.message.toLowerCase().includes('forbidden')) {
    return await handle403Error(error, options);
  } 
  else if (error.code === 429 || error.message.includes('429') || error.message.toLowerCase().includes('rate limit')) {
    return await handleRateLimit(error, options);
  } 
  else if (error.code === 'ECONNREFUSED' || error.message.toLowerCase().includes('connection refused')) {
    return await handleConnectionRefusedError(error, options);
  }
  else if (error.code === 'ETIMEDOUT' || error.message.toLowerCase().includes('timeout')) {
    return await handleTimeoutError(error, options);
  }
  else {
    // For other errors, return the original error
    return {
      error: true,
      message: `Search failed: ${error.message}`,
      code: error.code
    };
  }
}

/**
 * Handles 403 Forbidden errors
 * @param {Object} error - The 403 error
 * @param {Object} options - Search options
 * @returns {Object} Recovery results
 */
async function handle403Error(error, options) {
  console.log('Handling 403 error - trying with different headers...');
  
  try {
    // Try again with completely different headers
    const modifiedParams = {
      ...options,
      headers: generateDiverseHeaders()
    };
    
    // Add a delay before retrying
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const results = await tavilySearch(modifiedParams);
    return {
      success: true,
      data: results,
      message: 'Successfully retrieved results after handling 403 error'
    };
    
  } catch (retryError) {
    console.log('403 retry failed, trying alternative approach...');
    
    // Try with a different search query formulation
    try {
      const reformulatedQuery = reformulateQuery(options.query);
      const results = await tavilySearch({ ...options, query: reformulatedQuery });
      
      return {
        success: true,
        data: results,
        message: 'Successfully retrieved results with reformulated query after 403 error'
      };
    } catch (finalError) {
      return {
        error: true,
        message: `Failed to retrieve results after handling 403 error: ${finalError.message}`
      };
    }
  }
}

/**
 * Handles connection refused errors
 * @param {Object} error - The connection error
 * @param {Object} options - Search options
 * @returns {Object} Recovery results
 */
async function handleConnectionRefusedError(error, options) {
  console.log('Handling connection refused error...');
  
  try {
    // Sometimes waiting and retrying works
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Try with different parameters
    const modifiedParams = {
      ...options,
      headers: generateDiverseHeaders(),
      timeout: (options.timeout || 10000) + 5000  // Increase timeout
    };
    
    const results = await tavilySearch(modifiedParams);
    return {
      success: true,
      data: results,
      message: 'Successfully retrieved results after handling connection refused error'
    };
  } catch (retryError) {
    return {
      error: true,
      message: `Failed to retrieve results after handling connection refused error: ${retryError.message}`
    };
  }
}

/**
 * Handles timeout errors
 * @param {Object} error - The timeout error
 * @param {Object} options - Search options
 * @returns {Object} Recovery results
 */
async function handleTimeoutError(error, options) {
  console.log('Handling timeout error...');
  
  try {
    // Retry with increased timeout and different headers
    const modifiedParams = {
      ...options,
      headers: generateDiverseHeaders(),
      timeout: Math.min((options.timeout || 10000) * 2, 30000)  // Double timeout, max 30s
    };
    
    const results = await tavilySearch(modifiedParams);
    return {
      success: true,
      data: results,
      message: 'Successfully retrieved results after handling timeout error'
    };
  } catch (retryError) {
    return {
      error: true,
      message: `Failed to retrieve results after handling timeout error: ${retryError.message}`
    };
  }
}

/**
 * Generate diverse headers to avoid detection
 * @returns {Object} Diverse headers object
 */
function generateDiverseHeaders() {
  const userAgents = [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  ];
  
  const acceptLanguages = [
    'en-US,en;q=0.9',
    'en-GB,en;q=0.9',
    'en-CA,en;q=0.9',
    'en-AU,en;q=0.9'
  ];
  
  return {
    'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)],
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': acceptLanguages[Math.floor(Math.random() * acceptLanguages.length)],
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Cache-Control': 'max-age=0'
  };
}

/**
 * Reformulates a query to potentially bypass filters
 * @param {string} query - Original query
 * @returns {string} Reformulated query
 */
function reformulateQuery(query) {
  // Simple reformulation - could be enhanced with more sophisticated NLP
  const synonyms = {
    'how to': 'guide for',
    'what is': 'information about',
    'why is': 'reason for',
    'when did': 'date of'
  };
  
  let reformulated = query;
  for (const [original, replacement] of Object.entries(synonyms)) {
    reformulated = reformulated.replace(new RegExp(original, 'gi'), replacement);
  }
  
  return reformulated;
}