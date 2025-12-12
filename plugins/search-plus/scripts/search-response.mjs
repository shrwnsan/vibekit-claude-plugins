/**
 * Standardized Search Response Schema
 * Implements unified response format across all search services
 */

/**
 * @typedef {Object} StandardSearchResult
 * @property {string} title - The title of the search result
 * @property {string} url - The URL of the search result
 * @property {string} content - The content/snippet of the search result
 * @property {number} score - Normalized score from 0.0 to 1.0
 * @property {string|null} published_date - Publication date in ISO format or null
 * @property {string} source - The search service that provided this result
 * @property {number} relevance_score - Advanced relevance score from 0.0 to 1.0
 */

/**
 * @typedef {Object} StandardSearchResponse
 * @property {StandardSearchResult[]} results - Array of search results
 * @property {string|null} answer - Instant answer if available, null otherwise
 * @property {string} query - The original search query
 * @property {number} response_time - Response time in milliseconds
 * @property {string} service - The search service used
 * @property {number} success_rate - Success rate from 0.0 to 1.0
 * @property {Object} metadata - Additional metadata
 * @property {number} metadata.total_results - Total number of results
 * @property {string} metadata.query_processed_at - ISO timestamp when query was processed
 * @property {Object} metadata.service_info - Service-specific information
 */

/**
 * @typedef {Object} ServiceTransformer
 * @property {string} serviceName - Name of the service
 * @property {Function} transform - Function to transform service response to standard format
 * @property {Function} validate - Function to validate service response
 */

/**
 * Standard response schema validation
 */
export const STANDARD_RESPONSE_SCHEMA = {
  requiredFields: ['results', 'query', 'response_time', 'service', 'success_rate', 'metadata'],
  resultFields: ['title', 'url', 'content', 'score', 'published_date', 'source', 'relevance_score'],
  metadataFields: ['total_results', 'query_processed_at', 'service_info'],
  scoreRange: { min: 0.0, max: 1.0 }
};

/**
 * Validates if a response conforms to the standard schema
 * @param {any} response - The response to validate
 * @returns {boolean} True if valid, false otherwise
 */
export function validateStandardResponse(response) {
  if (!response || typeof response !== 'object') {
    return false;
  }

  // Check required top-level fields
  for (const field of STANDARD_RESPONSE_SCHEMA.requiredFields) {
    if (!(field in response)) {
      return false;
    }
  }

  // Validate results array
  if (!Array.isArray(response.results)) {
    return false;
  }

  // Validate each result
  for (const result of response.results) {
    if (!validateStandardResult(result)) {
      return false;
    }
  }

  // Validate score ranges
  if (typeof response.success_rate !== 'number' ||
      response.success_rate < 0 || response.success_rate > 1) {
    return false;
  }

  return true;
}

/**
 * Validates a single search result
 * @param {any} result - The result to validate
 * @returns {boolean} True if valid, false otherwise
 */
export function validateStandardResult(result) {
  if (!result || typeof result !== 'object') {
    return false;
  }

  // Check required result fields
  for (const field of STANDARD_RESPONSE_SCHEMA.resultFields) {
    if (!(field in result)) {
      return false;
    }
  }

  // Validate score ranges
  if (typeof result.score !== 'number' ||
      result.score < 0 || result.score > 1) {
    return false;
  }

  if (typeof result.relevance_score !== 'number' ||
      result.relevance_score < 0 || result.relevance_score > 1) {
    return false;
  }

  // Validate URL format
  try {
    new URL(result.url);
  } catch {
    return false;
  }

  return true;
}

/**
 * Creates an empty standard response template
 * @param {string} service - The service name
 * @param {string} query - The search query
 * @returns {StandardSearchResponse} Empty standard response
 */
export function createStandardResponse(service, query) {
  return {
    results: [],
    answer: null,
    query,
    response_time: 0,
    service,
    success_rate: 0.0,
    metadata: {
      total_results: 0,
      query_processed_at: new Date().toISOString(),
      service_info: {}
    }
  };
}

/**
 * Normalizes scores to 0.0-1.0 range using various strategies
 * @param {number|string|any} rawScore - The raw score from the service
 * @param {number} index - Index of the result (for fallback scoring)
 * @param {number} totalResults - Total number of results
 * @param {string} strategy - Normalization strategy ('linear', 'logarithmic', 'exponential')
 * @returns {number} Normalized score from 0.0 to 1.0
 */
export function normalizeScore(rawScore, index = 0, totalResults = 1, strategy = 'linear') {
  // Handle different score types
  let numericScore;

  if (typeof rawScore === 'number') {
    numericScore = rawScore;
  } else if (typeof rawScore === 'string') {
    numericScore = parseFloat(rawScore) || 0;
  } else {
    // Fallback to position-based scoring
    numericScore = Math.max(0, 1 - (index / totalResults));
  }

  switch (strategy) {
    case 'linear':
      // Simple linear normalization
      return Math.max(0, Math.min(1, numericScore));

    case 'logarithmic':
      // Logarithmic scaling: log(x+1)/log(2) maps 0→0, 0.5→0.585, 1→1
      return Math.max(0, Math.min(1, Math.log(numericScore + 1) / Math.log(2)));

    case 'exponential':
      // Square root transformation for emphasizing differences
      return Math.max(0, Math.min(1, Math.sqrt(numericScore)));

    default:
      return Math.max(0, Math.min(1, numericScore));
  }
}

/**
 * Calculates advanced relevance score based on multiple factors
 * @param {Object} factors - Relevance factors
 * @param {string} factors.title - Result title
 * @param {string} factors.content - Result content
 * @param {string} factors.query - Search query
 * @param {number} factors.position - Result position
 * @param {number} factors.totalResults - Total number of results
 * @param {string} factors.service - Service name
 * @returns {number} Relevance score from 0.0 to 1.0
 */
export function calculateRelevanceScore({
  title,
  content,
  query,
  position,
  totalResults,
  service
}) {
  const queryTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
  const titleLower = title.toLowerCase();
  const contentLower = content.toLowerCase();

  let relevanceScore = 0.5; // Base score

  // Title matching (most important)
  const titleMatches = queryTerms.filter(term => titleLower.includes(term)).length;
  relevanceScore += (titleMatches / queryTerms.length) * 0.3;

  // Content matching
  const contentMatches = queryTerms.filter(term => contentLower.includes(term)).length;
  relevanceScore += (contentMatches / queryTerms.length) * 0.2;

  // Position penalty (earlier results are better)
  const positionScore = Math.max(0, 1 - (position / totalResults));
  relevanceScore += positionScore * 0.2;

  // Service reliability bonus
  const serviceBonus = {
    'tavily': 0.1,
    'searxng': 0.05,
    'duckduckgo-html': 0.03,
    'startpage-html': 0.03
  };
  relevanceScore += serviceBonus[service] || 0;

  return Math.max(0, Math.min(1, relevanceScore));
}

/**
 * Optimized batch relevance scoring for better performance
 * @param {Array} results - Array of results to score
 * @param {string} query - Search query
 * @param {string} service - Service name
 * @returns {Array} Results with optimized relevance scores
 */
export function calculateBatchRelevanceScores(results, query, service) {
  // Pre-compile query terms once
  const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
  const serviceBonus = {
    'tavily': 0.1,
    'searxng': 0.05,
    'duckduckgo-html': 0.03,
    'startpage-html': 0.03
  };
  const bonus = serviceBonus[service] || 0;
  const totalResults = results.length;

  return results.map((result, index) => {
    const titleLower = result.title.toLowerCase();
    const contentLower = result.content.toLowerCase();

    // Count matches efficiently
    let titleMatches = 0;
    let contentMatches = 0;

    for (const term of queryTerms) {
      if (titleLower.includes(term)) titleMatches++;
      if (contentLower.includes(term)) contentMatches++;
    }

    let relevanceScore = 0.5; // Base score

    // Title matching (most important)
    relevanceScore += (titleMatches / queryTerms.length) * 0.3;

    // Content matching
    relevanceScore += (contentMatches / queryTerms.length) * 0.2;

    // Position penalty (earlier results are better)
    const positionScore = Math.max(0, 1 - (index / totalResults));
    relevanceScore += positionScore * 0.2;

    // Service reliability bonus
    relevanceScore += bonus;

    return {
      ...result,
      relevance_score: Math.max(0, Math.min(1, relevanceScore))
    };
  });
}

/**
 * Extracts published date from various formats
 * @param {any} dateValue - The date value from the service
 * @returns {string|null} ISO formatted date or null
 */
export function normalizeDate(dateValue) {
  if (!dateValue) return null;

  try {
    // If it's already a string in ISO format
    if (typeof dateValue === 'string') {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }

    // If it's a Date object
    if (dateValue instanceof Date) {
      if (!isNaN(dateValue.getTime())) {
        return dateValue.toISOString();
      }
    }

    // If it's a timestamp number
    if (typeof dateValue === 'number') {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }

    return null;
  } catch {
    return null;
  }
}