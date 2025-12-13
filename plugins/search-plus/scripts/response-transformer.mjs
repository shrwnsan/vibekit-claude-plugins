/**
 * Unified Response Transformer
 * Transforms various search service responses into standard format
 */

import {
  validateStandardResponse,
  createStandardResponse,
  normalizeScore,
  calculateRelevanceScore,
  calculateBatchRelevanceScores,
  normalizeDate
} from './search-response.mjs';

/**
 * Registry of service transformers
 */
const SERVICE_TRANSFORMERS = new Map();

/**
 * Registers a transformer for a search service
 * @param {string} serviceName - Name of the service
 * @param {Object} transformer - Transformer configuration
 */
export function registerServiceTransformer(serviceName, transformer) {
  SERVICE_TRANSFORMERS.set(serviceName, transformer);
}

/**
 * Transforms a service response to standard format
 * @param {string} serviceName - Name of the service
 * @param {any} serviceResponse - Raw response from the service
 * @param {string} query - Original search query
 * @param {number} responseTime - Response time in milliseconds
 * @returns {Object} Standardized response
 */
export function transformToStandard(serviceName, serviceResponse, query, responseTime = 0) {
  const transformer = SERVICE_TRANSFORMERS.get(serviceName);

  if (!transformer) {
    throw new Error(`No transformer registered for service: ${serviceName}`);
  }

  // Create base standard response
  const standardResponse = createStandardResponse(serviceName, query);
  standardResponse.response_time = responseTime;

  try {
    // Validate service response if validator exists
    if (transformer.validate && !transformer.validate(serviceResponse)) {
      throw new Error(`Invalid response format for service: ${serviceName}`);
    }

    // Transform the response
    const transformed = transformer.transform(serviceResponse, query);

    // Merge with base response
    return {
      ...standardResponse,
      ...transformed,
      service: serviceName,
      response_time: responseTime
    };
  } catch (error) {
    // Return error response
    return {
      ...standardResponse,
      success_rate: 0.0,
      metadata: {
        ...standardResponse.metadata,
        error: error.message,
        service_info: {
          transformation_error: true,
          original_response: serviceResponse
        }
      }
    };
  }
}

/**
 * Tavily API Transformer
 * Transforms Tavily API responses to standard format
 */
const tavilyTransformer = {
  validate: (response) => {
    return response &&
           typeof response === 'object' &&
           Array.isArray(response.results);
  },

  transform: (response, query) => {
    // Base transformation with URL validation and content sanitization
    let results = response.results.map((item, index) => ({
      title: item.title || '',
      url: item.url || '',
      content: item.content || '',
      score: normalizeScore(item.score || 1.0, index, response.results.length),
      published_date: normalizeDate(item.published_date),
      source: 'tavily',
      relevance_score: 0 // Will be calculated in batch
    }));

    // Apply optimized batch relevance scoring
    results = calculateBatchRelevanceScores(results, query, 'tavily');

    return {
      results,
      answer: response.answer || null,
      query,
      success_rate: 1.0,
      metadata: {
        total_results: results.length,
        query_processed_at: new Date().toISOString(),
        service_info: {
          api_version: response.api_version || 'unknown',
          original_score_count: response.results.filter(r => r.score).length,
          has_answer: !!response.answer
        }
      }
    };
  }
};

/**
 * SearXNG Transformer
 * Transforms SearXNG metasearch responses to standard format
 */
const searxngTransformer = {
  validate: (response) => {
    return response &&
           typeof response === 'object' &&
           Array.isArray(response.results);
  },

  transform: (response, query) => {
    const results = response.results.map((item, index) => ({
      title: item.title || '',
      url: item.url || '',
      content: item.content || '',
      score: normalizeScore(item.score || (1.0 - index * 0.1), index, response.results.length, 'logarithmic'),
      published_date: normalizeDate(item.publishedDate),
      source: 'searxng',
      relevance_score: calculateRelevanceScore({
        title: item.title,
        content: item.content,
        query,
        position: index,
        totalResults: response.results.length,
        service: 'searxng'
      })
    }));

    return {
      results,
      answer: response.answers?.[0] || null,
      query,
      success_rate: 1.0,
      metadata: {
        total_results: results.length,
        query_processed_at: new Date().toISOString(),
        service_info: {
          number_of_engines: response.number_of_results || 0,
          search_time: response.search_time || 0,
          has_answers: response.answers && response.answers.length > 0
        }
      }
    };
  }
};

/**
 * DuckDuckGo HTML Transformer
 * Transforms DuckDuckGo HTML parsing results to standard format
 */
const duckduckgoTransformer = {
  validate: (response) => {
    return response &&
           typeof response === 'object' &&
           Array.isArray(response.results);
  },

  transform: (response, query) => {
    const results = response.results.map((item, index) => ({
      title: item.title || '',
      url: item.url || '',
      content: item.content || '',
      score: normalizeScore(item.score || (1.0 - index * 0.1), index, response.results.length),
      published_date: null, // DuckDuckGo HTML doesn't provide dates
      source: 'duckduckgo-html',
      relevance_score: calculateRelevanceScore({
        title: item.title,
        content: item.content,
        query,
        position: index,
        totalResults: response.results.length,
        service: 'duckduckgo-html'
      })
    }));

    return {
      results,
      answer: null, // DuckDuckGo HTML doesn't provide instant answers
      query,
      success_rate: 1.0,
      metadata: {
        total_results: results.length,
        query_processed_at: new Date().toISOString(),
        service_info: {
          parsed_html: true,
          extraction_successful: results.length > 0
        }
      }
    };
  }
};

/**
 * Startpage HTML Transformer
 * Transforms Startpage HTML parsing results to standard format
 */
const startpageTransformer = {
  validate: (response) => {
    return response &&
           typeof response === 'object' &&
           Array.isArray(response.results);
  },

  transform: (response, query) => {
    const results = response.results.map((item, index) => ({
      title: item.title || '',
      url: item.url || '',
      content: item.content || '',
      score: normalizeScore(item.score || (1.0 - index * 0.1), index, response.results.length),
      published_date: null, // Startpage HTML doesn't provide dates
      source: 'startpage-html',
      relevance_score: calculateRelevanceScore({
        title: item.title,
        content: item.content,
        query,
        position: index,
        totalResults: response.results.length,
        service: 'startpage-html'
      })
    }));

    return {
      results,
      answer: null, // Startpage HTML doesn't provide instant answers
      query,
      success_rate: 1.0,
      metadata: {
        total_results: results.length,
        query_processed_at: new Date().toISOString(),
        service_info: {
          parsed_html: true,
          extraction_successful: results.length > 0
        }
      }
    };
  }
};

/**
 * Error Response Transformer
 * Creates standardized error responses
 */
export function createErrorResponse(serviceName, query, error, responseTime = 0) {
  return {
    results: [],
    answer: null,
    query,
    response_time: responseTime,
    service: serviceName,
    success_rate: 0.0,
    metadata: {
      total_results: 0,
      query_processed_at: new Date().toISOString(),
      service_info: {
        error: true,
        error_message: error.message || 'Unknown error',
        error_code: error.code || 'UNKNOWN'
      }
    }
  };
}

/**
 * Register all service transformers
 */
registerServiceTransformer('tavily', tavilyTransformer);
registerServiceTransformer('searxng', searxngTransformer);
registerServiceTransformer('duckduckgo-html', duckduckgoTransformer);
registerServiceTransformer('startpage-html', startpageTransformer);

/**
 * Get list of registered services
 * @returns {string[]} Array of service names
 */
export function getRegisteredServices() {
  return Array.from(SERVICE_TRANSFORMERS.keys());
}

/**
 * Validate if a service has a registered transformer
 * @param {string} serviceName - Name of the service
 * @returns {boolean} True if transformer exists
 */
export function hasTransformer(serviceName) {
  return SERVICE_TRANSFORMERS.has(serviceName);
}

/**
 * Batch transform multiple responses
 * @param {Array} responses - Array of response objects with serviceName, response, query, and responseTime
 * @returns {Array} Array of standardized responses
 */
export function batchTransform(responses) {
  return responses.map(({ serviceName, response, query, responseTime }) =>
    transformToStandard(serviceName, response, query, responseTime)
  );
}