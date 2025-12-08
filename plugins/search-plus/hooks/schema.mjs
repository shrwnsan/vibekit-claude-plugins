// plugins/search-plus/hooks/schema.mjs

/**
 * Standardized Response Schema for Search Services
 * Ensures a consistent data structure across all search providers.
 */
export const STANDARD_RESPONSE_SCHEMA = {
  results: [{
    title: 'string',
    url: 'string',
    content: 'string',
    score: 'number (0.0-1.0)',
    published_date: 'string|null',
    source: 'string',
    relevance_score: 'number'
  }],
  answer: 'string|null',
  query: 'string',
  response_time: 'number',
  service: 'string',
  success_rate: 'number',
  metadata: {
    total_results: 'number',
    query_processed_at: 'string'
  }
};

/**
 * Transforms raw search results into the standard response schema.
 * @param {Object} data - The raw search results from a service.
 * @param {string} service - The name of the service (e.g., 'tavily', 'searxng').
 * @param {number} response_time - The response time of the network request.
 * @returns {Object} The transformed search results.
 */
export function transform(data, service, response_time) {
  const transformed = {
    results: [],
    answer: data.answer || null,
    query: data.query,
    response_time: response_time,
    service,
    success_rate: 1, // Default to 1, can be adjusted based on service reliability
    metadata: {
      total_results: data.results.length,
      query_processed_at: new Date().toISOString()
    }
  };

  if (data.results && Array.isArray(data.results)) {
    transformed.results = data.results.map((item, index) => ({
      title: item.title || 'No Title',
      url: item.url || '',
      content: item.content || item.snippet || '',
      score: item.score || (1.0 - (index * 0.1)), // Simple scoring if not provided
      published_date: item.published_date || item.publishedDate || null,
      source: item.source || service,
      relevance_score: item.relevance_score || 0
    }));
  }

  return transformed;
}
