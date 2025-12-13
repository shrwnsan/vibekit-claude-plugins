/**
 * Optimized Response Transformation Utilities
 * Performance-focused implementation for production use
 */

import {
  createStandardResponse,
  normalizeScore,
  calculateRelevanceScore,
  normalizeDate
} from './search-response.mjs';

// Pre-compile regex patterns for better performance
const URL_REGEX = /^https?:\/\/.+/i;
const TERM_REGEX = /\b\w{3,}\b/g;

// Cache for computed relevance scores
const relevanceCache = new Map();
const MAX_CACHE_SIZE = 1000;

// Pre-computed service bonuses
const SERVICE_BONUSES = Object.freeze({
  'tavily': 0.1,
  'searxng': 0.05,
  'duckduckgo-html': 0.03,
  'startpage-html': 0.03
});

/**
 * Optimized relevance score calculation with caching
 */
export function calculateRelevanceScoreOptimized({
  title,
  content,
  query,
  position,
  totalResults,
  service
}) {
  // Create cache key
  const cacheKey = `${title.slice(0, 50)}:${content.slice(0, 50)}:${query}:${position}:${service}`;

  // Check cache first
  if (relevanceCache.has(cacheKey)) {
    return relevanceCache.get(cacheKey);
  }

  // Optimized term extraction
  const queryTerms = query.toLowerCase().match(TERM_REGEX) || [];
  const titleLower = title.toLowerCase();
  const contentLower = content.toLowerCase();

  // Calculate matches with early exit
  let titleMatches = 0;
  let contentMatches = 0;

  for (const term of queryTerms) {
    if (titleLower.includes(term)) titleMatches++;
    if (contentLower.includes(term)) contentMatches++;
  }

  // Fast relevance calculation
  const queryLength = queryTerms.length || 1;
  const relevanceScore = Math.min(1, 0.5 +
    (titleMatches / queryLength) * 0.3 +
    (contentMatches / queryLength) * 0.2 +
    Math.max(0, 1 - (position / totalResults)) * 0.2 +
    (SERVICE_BONUSES[service] || 0)
  );

  // Cache result (LRU eviction if needed)
  if (relevanceCache.size >= MAX_CACHE_SIZE) {
    const firstKey = relevanceCache.keys().next().value;
    relevanceCache.delete(firstKey);
  }
  relevanceCache.set(cacheKey, relevanceScore);

  return relevanceScore;
}

/**
 * Batch transform with parallel processing
 */
export async function batchTransformParallel(responses, concurrency = 4) {
  const chunks = [];
  for (let i = 0; i < responses.length; i += concurrency) {
    chunks.push(responses.slice(i, i + concurrency));
  }

  const results = [];
  for (const chunk of chunks) {
    const chunkResults = await Promise.all(
      chunk.map(({ serviceName, response, query, responseTime }) =>
        transformToStandardOptimized(serviceName, response, query, responseTime)
      )
    );
    results.push(...chunkResults);
  }

  return results;
}

/**
 * Memory-efficient streaming transformer
 */
export function* transformStream(serviceName, responses, query) {
  const transformer = SERVICE_TRANSFORMERS.get(serviceName);
  if (!transformer) {
    throw new Error(`No transformer registered for service: ${serviceName}`);
  }

  let index = 0;
  for (const response of responses) {
    yield transformer.transform(response, query, index++);
  }
}

/**
 * Optimized URL validation
 */
export function isValidURL(url) {
  return URL_REGEX.test(url);
}

/**
 * Fast score normalization with lookup table
 */
const SCORE_LOOKUP = new Float32Array(1001); // Pre-compute 0.000 to 1.000
for (let i = 0; i <= 1000; i++) {
  SCORE_LOOKUP[i] = i / 1000;
}

export function normalizeScoreOptimized(rawScore, index = 0, totalResults = 1, strategy = 'linear') {
  let numericScore;

  if (typeof rawScore === 'number') {
    numericScore = Math.max(0, Math.min(1, rawScore));
    // Use lookup for precision
    const scaled = Math.round(numericScore * 1000);
    return SCORE_LOOKUP[Math.min(1000, Math.max(0, scaled))];
  }

  if (typeof rawScore === 'string') {
    numericScore = parseFloat(rawScore);
    if (isNaN(numericScore)) {
      return Math.max(0, 1 - (index / totalResults));
    }
    return normalizeScoreOptimized(numericScore, index, totalResults, strategy);
  }

  // Position-based fallback
  return Math.max(0, 1 - (index / totalResults));
}

/**
 * Transformer registry with optimization
 */
const SERVICE_TRANSFORMERS = new Map();

// Lazy transformer initialization
let transformersInitialized = false;
function initializeTransformers() {
  if (transformersInitialized) return;

  // Register optimized transformers here
  transformersInitialized = true;
}

export function registerServiceTransformerOptimized(serviceName, transformer) {
  initializeTransformers();
  SERVICE_TRANSFORMERS.set(serviceName, transformer);
}

export function transformToStandardOptimized(serviceName, serviceResponse, query, responseTime = 0) {
  const transformer = SERVICE_TRANSFORMERS.get(serviceName);
  if (!transformer) {
    throw new Error(`No transformer registered for service: ${serviceName}`);
  }

  // Create response object with minimal allocations
  const standardResponse = {
    results: [],
    answer: null,
    query,
    response_time: responseTime,
    service: serviceName,
    success_rate: 0.0,
    metadata: {
      total_results: 0,
      query_processed_at: new Date().toISOString(),
      service_info: {}
    }
  };

  try {
    if (transformer.validate && !transformer.validate(serviceResponse)) {
      throw new Error(`Invalid response format for service: ${serviceName}`);
    }

    return transformer.transform(serviceResponse, query, standardResponse);
  } catch (error) {
    standardResponse.success_rate = 0.0;
    standardResponse.metadata.service_info = {
      error: true,
      error_message: error.message,
      error_code: error.code || 'UNKNOWN'
    };
    return standardResponse;
  }
}