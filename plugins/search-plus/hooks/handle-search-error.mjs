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
  else if (error.code === 422 || error.message.includes('422') || is422SchemaError(error)) {
    return await handle422Error(error, options);
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
 * Detects if error is a 422 schema validation error
 * @param {Object} error - The error object
 * @returns {boolean} True if this is a 422 schema error
 */
function is422SchemaError(error) {
  const errorMessage = error.message || '';
  const errorString = JSON.stringify(error);

  // Check for common 422 schema validation patterns
  const schemaErrorPatterns = [
    'missing',
    'input_schema',
    'Field required',
    'unprocessable entity',
    'validation error',
    'schema validation',
    'invalid request format'
  ];

  return schemaErrorPatterns.some(pattern =>
    errorMessage.toLowerCase().includes(pattern) ||
    errorString.toLowerCase().includes(pattern)
  );
}

/**
 * Handles 422 Unprocessable Entity errors (schema validation)
 * @param {Object} error - The 422 error
 * @param {Object} options - Search options
 * @returns {Object} Recovery results
 */
async function handle422Error(error, options) {
  console.log('Handling 422 schema validation error...');

  // Try multiple recovery strategies
  const strategies = [
    () => repairSchemaAndRetry(options),
    () => simplifyQueryAndRetry(options),
    () => reformulateQueryForSchema(options),
    () => tryAlternativeAPIFormat(options)
  ];

  for (const strategy of strategies) {
    try {
      console.log('Attempting 422 error recovery strategy...');
      const results = await strategy();
      if (results && !results.error) {
        return {
          success: true,
          data: results,
          message: 'Successfully retrieved results after handling 422 schema error'
        };
      }
    } catch (strategyError) {
      console.log('422 recovery strategy failed:', strategyError.message);
      continue;
    }
  }

  return {
    error: true,
    message: `Failed to retrieve results after handling 422 schema error: ${error.message}`
  };
}

/**
 * Attempts to repair schema issues and retry
 * @param {Object} options - Original search options
 * @returns {Object} Search results
 */
async function repairSchemaAndRetry(options) {
  console.log('Attempting schema repair...');

  // Add missing input_schema if this is the issue
  const repairedParams = {
    ...options,
    input_schema: {
      type: "web_search_20250305",
      name: "web_search",
      max_uses: 8
    }
  };

  // Add delay before retry
  await new Promise(resolve => setTimeout(resolve, 1000));

  return await tavilySearch(repairedParams);
}

/**
 * Simplifies the query to avoid schema validation issues
 * @param {Object} options - Original search options
 * @returns {Object} Search results
 */
async function simplifyQueryAndRetry(options) {
  console.log('Simplifying query for schema compatibility...');

  const simplifiedQuery = simplifyQueryForSchema(options.query);
  const simplifiedParams = {
    ...options,
    query: simplifiedQuery,
    max_results: Math.min(options.max_results || 10, 5), // Reduce complexity
    search_depth: "basic" // Use simpler search mode
  };

  await new Promise(resolve => setTimeout(resolve, 1500));

  return await tavilySearch(simplifiedParams);
}

/**
 * Reformulates query specifically for schema issues
 * @param {Object} options - Original search options
 * @returns {Object} Search results
 */
async function reformulateQueryForSchema(options) {
  console.log('Reformulating query for schema compatibility...');

  const reformulatedQuery = reformulateQueryForSchemaCompatibility(options.query);
  const reformulatedParams = {
    ...options,
    query: reformulatedQuery,
    include_answer: false, // Simplify request
    include_raw_content: false
  };

  await new Promise(resolve => setTimeout(resolve, 2000));

  return await tavilySearch(reformulatedParams);
}

/**
 * Tries alternative API format
 * @param {Object} options - Original search options
 * @returns {Object} Search results
 */
async function tryAlternativeAPIFormat(options) {
  console.log('Trying alternative API format...');

  // Try with minimal parameters
  const minimalParams = {
    query: options.query,
    api_key: options.api_key,
    search_depth: "basic"
  };

  await new Promise(resolve => setTimeout(resolve, 3000));

  return await tavilySearch(minimalParams);
}

/**
 * Simplifies query for schema compatibility
 * @param {string} query - Original query
 * @returns {string} Simplified query
 */
function simplifyQueryForSchema(query) {
  return query
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[^\w\s\-.,!?]/g, '') // Remove special characters except basic punctuation
    .substring(0, 200) // Limit length
    .trim();
}

/**
 * Reformulates query specifically for schema compatibility issues
 * @param {string} query - Original query
 * @returns {string} Reformulated query
 */
function reformulateQueryForSchemaCompatibility(query) {
  // Break down complex queries into simpler components
  const words = query.split(' ').filter(word => word.length > 2);
  if (words.length > 8) {
    // If query is too long, use the most important terms
    return words.slice(0, 6).join(' ');
  }

  // Replace problematic patterns
  return query
    .replace(/\d{4}/g, '') // Remove years
    .replace(/github|gitlab|bitbucket/gi, 'code repository') // Replace specific platforms
    .replace(/open source|open-source/gi, 'free software') // Simplify terminology
    .replace(/platform|boilerplate|framework/gi, 'software') // Generic terms
    .trim();
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