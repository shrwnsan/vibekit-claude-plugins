// hooks/handle-search-error.mjs
import contentExtractor from './content-extractor.mjs';
import { handleRateLimit } from './handle-rate-limit.mjs';

// ============================================================================
// CONFIGURATION: Recovery strategy timeout
// ============================================================================

/**
 * Recovery strategy timeout in milliseconds
 * Environment variable: SEARCH_PLUS_RECOVERY_TIMEOUT_MS
 * Default: 5000ms (5 seconds) - based on project requirements for <5s average recovery
 */
const RECOVERY_TIMEOUT_MS = parseInt(process.env.SEARCH_PLUS_RECOVERY_TIMEOUT_MS || '5000');

// Log configuration in development mode
if (process.env.NODE_ENV === 'development') {
  console.log(`🔧 Search-Plus Recovery Timeout: ${RECOVERY_TIMEOUT_MS}ms`);
}

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
  else if (error.code === 451 || error.message.includes('451') || error.message.toLowerCase().includes('securitycompromise') || error.message.toLowerCase().includes('blocked until')) {
    return await handle451SecurityError(error, options);
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
    
    const results = await contentExtractor.tavily.search(modifiedParams);
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
      const results = await contentExtractor.tavily.search({ ...options, query: reformulatedQuery });
      
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
 * Handles 451 SecurityCompromiseError (domain blocked due to abuse)
 * Uses parallel execution with enhanced UX logging
 * @param {Object} error - The 451 error
 * @param {Object} options - Search options
 * @returns {Object} Recovery results
 */
async function handle451SecurityError(error, options) {
  const blockedDomain = extractBlockedDomain(error.message);

  // Simple mode for power users who want minimal output
  if (process.env.SEARCH_PLUS_451_SIMPLE_MODE === 'true') {
    return await handleSimple451Recovery(error, options, blockedDomain);
  }

  // Enhanced UX logging by default
  console.log('🚫 451 SecurityCompromiseError detected');
  console.log(`📍 Blocked domain: ${blockedDomain || 'unknown'}`);
  console.log('🚀 Starting parallel recovery:');
  console.log('  🛡️ Strategy 1: Domain exclusion');
  console.log('  🔍 Strategy 2: Alternative sources');

  // Optimized parallel execution using the two most effective strategies
  const strategies = [
    searchWithExcludedDomainOptimized(options, blockedDomain),
    tryAlternativeSearchSourcesOptimized(options)
  ];

  try {
    const results = await Promise.any(strategies);
    console.log(`✅ Success! Used strategy: ${results.strategy} (${results.responseTime}ms)`);

    // Provide actionable suggestions for future searches
    if (blockedDomain) {
      console.log(`💡 Next time, try: /search-plus "${options.query} -site:${blockedDomain}"`);
    }

    return {
      success: true,
      data: results.data,
      message: `Successfully retrieved results using ${results.strategy} for blocked domain ${blockedDomain || 'unknown'}`,
      strategy: results.strategy,
      responseTime: results.responseTime,
      blockedDomain: blockedDomain
    };

  } catch (aggregateError) {
    // Enhanced error classification and user guidance
    const failureType = classify451Failure(aggregateError, blockedDomain);
    console.log(`❌ All recovery strategies failed`);
    console.log(`🔍 Error type: ${failureType.type}`);

    if (failureType.suggestions.length > 0) {
      console.log('💡 Suggestions:');
      failureType.suggestions.forEach((suggestion, i) => {
        console.log(`   ${i + 1}. ${suggestion.description}`);
      });
    }

    return generateEnhancedErrorResponse(failureType, blockedDomain, options);
  }
}

/**
 * Handles 451 errors in simple mode with minimal output
 * @param {Object} error - The 451 error
 * @param {Object} options - Search options
 * @param {string} blockedDomain - The blocked domain
 * @returns {Object} Recovery results
 */
async function handleSimple451Recovery(error, options, blockedDomain) {
  console.log('⚡ 451 error - attempting recovery...');

  const strategies = [
    searchWithExcludedDomainOptimized(options, blockedDomain),
    tryAlternativeSearchSourcesOptimized(options)
  ];

  try {
    const results = await Promise.any(strategies);
    console.log(`⚡ 451 recovered in ${results.responseTime}ms`);
    return results;
  } catch (aggregateError) {
    console.log('❌ 451 recovery failed');
    return {
      error: true,
      message: `Failed to recover from 451 error. Domain ${blockedDomain || 'unknown'} is blocked.`,
      blockedDomain: blockedDomain
    };
  }
}

/**
 * Classifies 451 failure types for enhanced error handling
 * @param {AggregateError} aggregateError - The combined error from failed strategies
 * @param {string} blockedDomain - The blocked domain
 * @returns {Object} Failure classification with suggestions
 */
function classify451Failure(aggregateError, blockedDomain) {
  // Check for permanent block patterns
  if (aggregateError.errors.some(err => err.message.includes('blocked until'))) {
    return {
      type: 'permanent-block',
      suggestions: [
        {
          type: 'ready-to-run',
          command: `/search-plus "${options.query} -site:${blockedDomain}"`,
          description: 'Exclude blocked domain and search again'
        },
        {
          type: 'manual-search',
          url: `https://www.google.com/search?q=${encodeURIComponent(options.query)}`,
          description: 'Search manually in external browser'
        }
      ],
      autoSuggestion: {
        message: 'For more predictable results, enable simple 451 handling?',
        command: 'export SEARCH_PLUS_451_SIMPLE_MODE=true',
        benefit: 'Provides clear guidance instead of complex automation'
      }
    };
  }

  // Default classification
  return {
    type: 'recovery-failed',
    suggestions: [
      {
        type: 'ready-to-run',
        command: `/search-plus "${options.query} -site:${blockedDomain}"`,
        description: 'Try again excluding the blocked domain'
      }
    ],
    autoSuggestion: {
      message: 'Want simpler error handling?',
      command: 'export SEARCH_PLUS_451_SIMPLE_MODE=true',
      benefit: 'Minimal output with focus on results'
    }
  };
}

/**
 * Generates enhanced error response with actionable suggestions
 * @param {Object} failureType - The classified failure type
 * @param {string} blockedDomain - The blocked domain
 * @param {Object} options - Original search options
 * @returns {Object} Enhanced error response
 */
function generateEnhancedErrorResponse(failureType, blockedDomain, options) {
  return {
    error: true,
    message: `Failed to retrieve results after handling 451 SecurityCompromiseError. Domain ${blockedDomain || 'unknown'} is blocked.`,
    blockedDomain: blockedDomain,
    failureType: failureType.type,
    suggestions: failureType.suggestions,
    autoSuggestion: failureType.autoSuggestion
  };
}

/**
 * Extracts the blocked domain from error message
 * @param {string} errorMessage - The error message
 * @returns {string|null} The blocked domain or null if not found
 */
function extractBlockedDomain(errorMessage) {
  const domainMatch = errorMessage.match(/domain (\S+) blocked/i) ||
                      errorMessage.match(/access to (\S+) blocked/i);
  return domainMatch ? domainMatch[1] : null;
}

/**
 * Extracts the block expiration date from error message
 * @param {string} errorMessage - The error message
 * @returns {string|null} The block expiration date or null if not found
 */
function extractBlockUntilDate(errorMessage) {
  // Look for "blocked until" followed by a date, capturing until the next reason or end
  const dateMatch = errorMessage.match(/blocked until (.+?)(?:\s+due|$)/i);
  return dateMatch ? dateMatch[1].trim() : null;
}

/**
 * Optimized alternative search sources with parallel execution support
 * @param {Object} options - Original search options
 * @returns {Promise<Object>} Search results from alternative sources
 */
async function tryAlternativeSearchSourcesOptimized(options) {
  const startTime = Date.now();
  const strategyName = 'alternative-search-sources';

  try {
    console.log('🔍 Trying alternative search sources...');
    const blockedDomain = options.blockedDomain || null;
    const domainFilter = blockedDomain ? `-site:${blockedDomain}` : '';
    const modifiedQuery = `${options.query} ${domainFilter} alternative OR substitute OR replacement`.trim();
    const modifiedParams = {
      ...options,
      query: modifiedQuery,
      include_answer: true,
      max_results: Math.min(options.max_results || 10, 8)
    };

    // Faster timeout for parallel execution
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Strategy timeout')), 1500);
    });

    const searchPromise = contentExtractor.tavily.search(modifiedParams);
    const results = await Promise.race([searchPromise, timeoutPromise]);

    return {
      success: true,
      data: results,
      strategy: strategyName,
      responseTime: Date.now() - startTime
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      strategy: strategyName,
      responseTime: Date.now() - startTime
    };
  }
}

/**
 * Tries alternative search sources when a domain is blocked
 * @param {Object} options - Original search options (contains error field)
 * @returns {Object} Search results from alternative sources
 */
async function tryAlternativeSearchSources(options) {
  const startTime = Date.now();
  const strategyName = 'alternative-search-sources';

  const strategyPromise = (async () => {
    try {
      console.log('Trying alternative search sources...');
      const blockedDomain = options.error ? extractBlockedDomain(options.error.message || '') : null;
      const domainFilter = blockedDomain ? `-site:${blockedDomain}` : '';
      const modifiedQuery = `${options.query} ${domainFilter} alternative OR substitute OR replacement`.trim();
      const modifiedParams = { ...options, query: modifiedQuery, include_answer: true, max_results: Math.min(options.max_results || 10, 8) };

      await new Promise(resolve => setTimeout(resolve, 2000));
      const results = await contentExtractor.tavily.search(modifiedParams);

      return { success: true, data: results, strategy: strategyName, responseTime: Date.now() - startTime };
    } catch (error) {
      return { success: false, error: error.message, strategy: strategyName, responseTime: Date.now() - startTime };
    }
  })();

  const timeoutPromise = new Promise((resolve) => {
    setTimeout(() => resolve({
      success: false,
      error: `Strategy timed out after ${RECOVERY_TIMEOUT_MS}ms`,
      strategy: strategyName,
      responseTime: Date.now() - startTime
    }), RECOVERY_TIMEOUT_MS);
  });

  return Promise.race([strategyPromise, timeoutPromise]);
}

/**
 * Optimized domain exclusion search with parallel execution support
 * @param {Object} options - Original search options
 * @param {string} blockedDomain - The blocked domain
 * @returns {Promise<Object>} Search results
 */
async function searchWithExcludedDomainOptimized(options, blockedDomain) {
  const startTime = Date.now();
  const strategyName = 'excluded-domain-search';

  try {
    if (!blockedDomain) {
      return {
        success: false,
        error: 'No blocked domain to exclude',
        strategy: strategyName,
        responseTime: Date.now() - startTime
      };
    }

    console.log(`🛡️ Excluding domain: ${blockedDomain}`);
    const exclusionQuery = `${options.query} -site:${blockedDomain}`;
    const modifiedParams = {
      ...options,
      query: exclusionQuery,
      headers: generateDiverseHeaders()
    };

    // Faster timeout for parallel execution
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Strategy timeout')), 1000);
    });

    const searchPromise = contentExtractor.tavily.search(modifiedParams);
    const results = await Promise.race([searchPromise, timeoutPromise]);

    return {
      success: true,
      data: results,
      strategy: strategyName,
      responseTime: Date.now() - startTime
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      strategy: strategyName,
      responseTime: Date.now() - startTime
    };
  }
}

/**
 * Searches while explicitly excluding the blocked domain
 * @param {Object} options - Original search options
 * @param {string} blockedDomain - The blocked domain
 * @returns {Object} Search results
 */
async function searchWithExcludedDomain(options, blockedDomain) {
  const startTime = Date.now();
  const strategyName = 'excluded-domain-search';

  const strategyPromise = (async () => {
    if (!blockedDomain) {
      return { success: false, error: 'No blocked domain to exclude', strategy: strategyName, responseTime: Date.now() - startTime };
    }

    try {
      console.log(`Searching while excluding domain: ${blockedDomain}`);
      const exclusionQuery = `${options.query} -site:${blockedDomain}`;
      const modifiedParams = { ...options, query: exclusionQuery, headers: generateDiverseHeaders() };

      await new Promise(resolve => setTimeout(resolve, 3000));
      const results = await contentExtractor.tavily.search(modifiedParams);

      return { success: true, data: results, strategy: strategyName, responseTime: Date.now() - startTime };
    } catch (error) {
      return { success: false, error: error.message, strategy: strategyName, responseTime: Date.now() - startTime };
    }
  })();

  const timeoutPromise = new Promise((resolve) => {
    setTimeout(() => resolve({
      success: false,
      error: `Strategy timed out after ${RECOVERY_TIMEOUT_MS}ms`,
      strategy: strategyName,
      responseTime: Date.now() - startTime
    }), RECOVERY_TIMEOUT_MS);
  });

  return Promise.race([strategyPromise, timeoutPromise]);
}

/**
 * Reformulates query to avoid references to blocked domains
 * @param {Object} options - Original search options
 * @param {string} blockedDomain - The blocked domain
 * @returns {Object} Search results
 */
async function reformulateQueryAvoidingBlockedDomain(options, blockedDomain) {
  const startTime = Date.now();
  const strategyName = 'reformulate-query';

  const strategyPromise = (async () => {
    try {
      console.log('Reformulating query to avoid blocked domain references...');
      let reformulatedQuery = options.query;
      if (blockedDomain) {
        const domainMappings = {
          'httpbin.org': 'HTTP testing API endpoint service',
          'github.com': 'code repository platform',
          'stackoverflow.com': 'programming Q&A website',
          'medium.com': 'blogging platform'
        };
        const genericTerm = domainMappings[blockedDomain] || 'online service';
        reformulatedQuery = options.query.replace(new RegExp(blockedDomain, 'gi'), genericTerm);
      }
      const modifiedParams = { ...options, query: reformulatedQuery, search_depth: "basic" };

      await new Promise(resolve => setTimeout(resolve, 2500));
      const results = await contentExtractor.tavily.search(modifiedParams);

      return { success: true, data: results, strategy: strategyName, responseTime: Date.now() - startTime };
    } catch (error) {
      return { success: false, error: error.message, strategy: strategyName, responseTime: Date.now() - startTime };
    }
  })();

  const timeoutPromise = new Promise((resolve) => {
    setTimeout(() => resolve({
      success: false,
      error: `Strategy timed out after ${RECOVERY_TIMEOUT_MS}ms`,
      strategy: strategyName,
      responseTime: Date.now() - startTime
    }), RECOVERY_TIMEOUT_MS);
  });

  return Promise.race([strategyPromise, timeoutPromise]);
}

/**
 * Attempts to use cached or archived results for blocked content
 * @param {Object} options - Original search options
 * @param {string} blockedDomain - The blocked domain
 * @returns {Object} Search results
 */
async function useCachedOrArchiveResults(options, blockedDomain) {
  const startTime = Date.now();
  const strategyName = 'archive-search';

  const strategyPromise = (async () => {
    try {
      console.log('Searching for archived or cached content...');
      const archiveQuery = blockedDomain
        ? `${options.query} web archive OR wayback machine OR cached version "site:${blockedDomain}"`
        : `${options.query} archived OR cached OR mirror`;
      const modifiedParams = { ...options, query: archiveQuery, max_results: Math.min(options.max_results || 10, 5) };

      await new Promise(resolve => setTimeout(resolve, 4000));
      const results = await contentExtractor.tavily.search(modifiedParams);

      return { success: true, data: results, strategy: strategyName, responseTime: Date.now() - startTime };
    } catch (error) {
      return { success: false, error: error.message, strategy: strategyName, responseTime: Date.now() - startTime };
    }
  })();

  const timeoutPromise = new Promise((resolve) => {
    setTimeout(() => resolve({
      success: false,
      error: `Strategy timed out after ${RECOVERY_TIMEOUT_MS}ms`,
      strategy: strategyName,
      responseTime: Date.now() - startTime
    }), RECOVERY_TIMEOUT_MS);
  });

  return Promise.race([strategyPromise, timeoutPromise]);
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
    
    const results = await contentExtractor.tavily.search(modifiedParams);
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
    
    const results = await contentExtractor.tavily.search(modifiedParams);
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

  return await contentExtractor.tavily.search(repairedParams);
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

  return await contentExtractor.tavily.search(simplifiedParams);
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

  return await contentExtractor.tavily.search(reformulatedParams);
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

  return await contentExtractor.tavily.search(minimalParams);
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