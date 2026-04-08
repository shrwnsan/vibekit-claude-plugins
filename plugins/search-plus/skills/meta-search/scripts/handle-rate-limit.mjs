// scripts/handle-rate-limit.mjs
import contentExtractor from './content-extractor.mjs';

/**
 * Handles rate limiting scenarios
 * @param {Object} error - The rate limit error
 * @param {Object} options - Search options
 * @returns {Object} Results after handling rate limit
 */
export async function handleRateLimit(error, options) {
  console.log('Handling rate limit error...');
  
  // Extract retry-after header if available, or use default delay
  let delay = 60000; // Default to 1 minute
  
  if (error.response && error.response.headers && error.response.headers['retry-after']) {
    const retryAfter = parseInt(error.response.headers['retry-after'], 10);
    if (!isNaN(retryAfter)) {
      delay = retryAfter * 1000; // Convert to milliseconds
    }
  }
  
  // Apply jitter to avoid thundering herd problem
  const jitter = Math.random() * 5000; // Up to 5 seconds
  delay += jitter;
  
  console.log(`Waiting ${Math.round(delay/1000)} seconds before retrying due to rate limiting...`);
  
  try {
    // Wait for the required time
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Try again with modified parameters to reduce load
    const modifiedParams = {
      ...options,
      headers: generateRateLimitHeaders(),
      maxResults: Math.max(1, Math.floor((options.maxResults || 5) / 2)) // Reduce number of results
    };
    
    const results = await contentExtractor.tavily.search(modifiedParams);
    return {
      success: true,
      data: results,
      message: 'Successfully retrieved results after handling rate limit'
    };
    
  } catch (retryError) {
    // If still rate limited, try with even more conservative parameters
    try {
      // Wait an additional time
      await new Promise(resolve => setTimeout(resolve, 120000)); // 2 minutes
      
      const conservativeParams = {
        ...options,
        headers: generateVeryConservativeHeaders(),
        maxResults: 1, // Get just one result
        query: simplifyQuery(options.query)
      };
      
      const results = await contentExtractor.tavily.search(conservativeParams);
      return {
        success: true,
        data: results,
        message: 'Successfully retrieved results with conservative approach after rate limiting'
      };
    } catch (finalError) {
      return {
        error: true,
        message: `Rate limit handling failed after multiple attempts: ${finalError.message}`
      };
    }
  }
}

/**
 * Generate headers that are less likely to trigger rate limits
 * @returns {Object} Conservative headers
 */
function generateRateLimitHeaders() {
  return {
    'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'DNT': '1'
  };
}

/**
 * Generate very conservative headers
 * @returns {Object} Very conservative headers
 */
function generateVeryConservativeHeaders() {
  return {
    'User-Agent': 'Mozilla/5.0 (compatible; ArchiveBot/1.0; +http://archive.org/details/archivebot)',
    'Accept': 'text/html',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'identity', // Don't request compression to reduce processing load
    'Connection': 'close',
    'Cache-Control': 'max-age=0'
  };
}

/**
 * Simplifies a query to reduce complexity
 * @param {string} query - Original query
 * @returns {string} Simplified query
 */
function simplifyQuery(query) {
  // Remove complex terms that might trigger more intensive processing
  return query
    .replace(/\b(how to|guide to|tutorial for)\b/gi, '')
    .replace(/\b(detailed|comprehensive|complete)\b/gi, '')
    .trim();
}