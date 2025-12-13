/**
 * Missing Features Implementation for Issue #23
 * Completes the response format standardization requirements
 */

import { validateResponse } from './response-validator.mjs';
import { createStandardResponse } from './search-response.mjs';

/**
 * Result Deduplication System
 * Removes duplicate results across different search services
 */
export class ResultDeduplicator {
  constructor(similarityThreshold = 0.85) {
    this.similarityThreshold = similarityThreshold;
    this.urlMap = new Map();
    this.titleMap = new Map();
  }

  deduplicate(results) {
    const unique = [];
    const seen = new Set();

    for (const result of results) {
      // Exact URL match
      const urlKey = this.normalizeUrl(result.url);
      if (seen.has(urlKey)) {
        continue;
      }

      // Similar title check
      let hasSimilarTitle = false;
      for (const existing of unique) {
        if (this.calculateSimilarity(result.title, existing.title) > this.similarityThreshold) {
          hasSimilarTitle = true;
          break;
        }
      }

      if (!hasSimilarTitle) {
        unique.push(result);
        seen.add(urlKey);
      }
    }

    return unique;
  }

  normalizeUrl(url) {
    try {
      const parsed = new URL(url);
      // Remove tracking parameters and fragments
      parsed.search = '';
      parsed.hash = '';
      return parsed.toString().toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  }

  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}

/**
 * Quality Scoring System
 * Assesses content quality beyond relevance
 */
export class QualityScorer {
  constructor() {
    this.factors = {
      contentLength: 0.2,
      titleQuality: 0.15,
      urlQuality: 0.1,
      freshness: 0.15,
      authority: 0.2,
      diversity: 0.1,
      completeness: 0.1
    };
  }

  calculateQualityScore(result, query, allResults) {
    let score = 0;

    // Content length assessment
    score += this.scoreContentLength(result.content) * this.factors.contentLength;

    // Title quality
    score += this.scoreTitleQuality(result.title) * this.factors.titleQuality;

    // URL quality (domain authority)
    score += this.scoreUrlQuality(result.url) * this.factors.urlQuality;

    // Freshness
    score += this.scoreFreshness(result.published_date) * this.factors.freshness;

    // Domain authority (simplified)
    score += this.scoreAuthority(result.url) * this.factors.authority;

    // Diversity from other results
    score += this.scoreDiversity(result, allResults) * this.factors.diversity;

    // Completeness of metadata
    score += this.scoreCompleteness(result) * this.factors.completeness;

    return Math.max(0, Math.min(1, score));
  }

  scoreContentLength(content) {
    const length = content?.length || 0;
    if (length < 50) return 0.2;
    if (length < 100) return 0.5;
    if (length < 300) return 0.8;
    if (length < 600) return 1.0;
    return 0.9; // Too long might be irrelevant
  }

  scoreTitleQuality(title) {
    if (!title || title.length < 10) return 0.3;
    if (title.length > 100) return 0.5;

    // Check for title spam
    const words = title.toLowerCase().split(' ');
    const uniqueWords = new Set(words);
    const uniqueRatio = uniqueWords.size / words.length;

    if (uniqueRatio < 0.5) return 0.3; // Too repetitive
    return 0.9;
  }

  scoreUrlQuality(url) {
    try {
      const domain = new URL(url).hostname.toLowerCase();

      // Penalty for URL shorteners
      if (domain.includes('bit.ly') || domain.includes('t.co') || domain.includes('tinyurl')) {
        return 0.3;
      }

      // Bonus for reputable domains
      const reputable = [
        'wikipedia.org',
        'github.com',
        'stackoverflow.com',
        'medium.com',
        'dev.to',
        'mdn.mozilla.org'
      ];

      if (reputable.some(rep => domain.includes(rep))) {
        return 0.9;
      }

      return 0.6;
    } catch {
      return 0.2;
    }
  }

  scoreFreshness(publishedDate) {
    if (!publishedDate) return 0.5; // Neutral

    const now = new Date();
    const published = new Date(publishedDate);
    const daysOld = (now - published) / (1000 * 60 * 60 * 24);

    if (daysOld < 7) return 1.0;
    if (daysOld < 30) return 0.9;
    if (daysOld < 90) return 0.8;
    if (daysOld < 365) return 0.6;
    return 0.4;
  }

  scoreAuthority(url) {
    try {
      const domain = new URL(url).hostname;
      const parts = domain.split('.');

      // Higher authority for established domains
      if (parts.length >= 2) {
        const tld = parts[parts.length - 1];
        const sld = parts[parts.length - 2];

        // Penalty for new TLDs that might be spam
        const newTlds = ['xyz', 'top', 'loan', 'win', 'click'];
        if (newTlds.includes(tld)) {
          return 0.4;
        }

        // Bonus for educational/government domains
        if (tld === 'edu' || tld === 'gov') {
          return 1.0;
        }

        // Bonus for long-standing domains
        if (sld.length > 6 && !newTlds.includes(tld)) {
          return 0.8;
        }
      }

      return 0.6;
    } catch {
      return 0.3;
    }
  }

  scoreDiversity(result, allResults) {
    const uniqueDomains = new Set(
      allResults.map(r => {
        try {
          return new URL(r.url).hostname;
        } catch {
          return null;
        }
      }).filter(Boolean)
    );

    return uniqueDomains.size / allResults.length;
  }

  scoreCompleteness(result) {
    let score = 0;
    const fields = ['title', 'url', 'content', 'published_date'];

    for (const field of fields) {
      if (result[field]) score += 0.25;
    }

    return score;
  }
}

/**
 * Response Aggregation System
 * Combines results from multiple services intelligently
 */
export class ResponseAggregator {
  constructor(options = {}) {
    this.deduplicator = new ResultDeduplicator(options.similarityThreshold);
    this.qualityScorer = new QualityScorer();
    this.weights = options.weights || {
      relevance: 0.4,
      quality: 0.3,
      originalScore: 0.2,
      serviceReliability: 0.1
    };
  }

  aggregate(responses, query) {
    // Combine all results
    let allResults = [];
    const serviceReliability = {};

    // Collect reliability info
    for (const response of responses) {
      serviceReliability[response.service] = response.success_rate || 0;
      allResults.push(...(response.results || []));
    }

    // Deduplicate
    allResults = this.deduplicator.deduplicate(allResults);

    // Score and sort
    const scoredResults = allResults.map(result => {
      const qualityScore = this.qualityScorer.calculateQualityScore(
        result,
        query,
        allResults
      );

      const serviceRel = serviceReliability[result.source] || 0;
      const combinedScore = this.calculateCombinedScore(
        result,
        qualityScore,
        serviceRel
      );

      return {
        ...result,
        quality_score: qualityScore,
        combined_score: combinedScore
      };
    });

    // Sort by combined score
    scoredResults.sort((a, b) => b.combined_score - a.combined_score);

    return scoredResults;
  }

  calculateCombinedScore(result, qualityScore, serviceReliability) {
    return (
      result.relevance_score * this.weights.relevance +
      qualityScore * this.weights.quality +
      result.score * this.weights.originalScore +
      serviceReliability * this.weights.serviceReliability
    );
  }
}

/**
 * Performance Metrics Collection
 * Detailed metrics for production monitoring
 */
export class MetricsCollector {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        byService: {}
      },
      performance: {
        responseTime: [],
        transformationTime: [],
        validationTime: []
      },
      quality: {
        averageResults: 0,
        averageRelevanceScore: 0,
        averageQualityScore: 0
      },
      cache: {
        hits: 0,
        misses: 0,
        size: 0
      }
    };
  }

  recordRequest(service, success, responseTime) {
    this.metrics.requests.total++;

    if (success) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
    }

    if (!this.metrics.requests.byService[service]) {
      this.metrics.requests.byService[service] = { total: 0, successful: 0, failed: 0 };
    }

    this.metrics.requests.byService[service].total++;
    if (success) {
      this.metrics.requests.byService[service].successful++;
    } else {
      this.metrics.requests.byService[service].failed++;
    }

    this.metrics.performance.responseTime.push(responseTime);
  }

  recordTransformation(time) {
    this.metrics.performance.transformationTime.push(time);
  }

  recordValidation(time) {
    this.metrics.performance.validationTime.push(time);
  }

  recordQuality(results) {
    if (!results || results.length === 0) return;

    const avgRelevance = results.reduce((sum, r) => sum + (r.relevance_score || 0), 0) / results.length;
    const avgQuality = results.reduce((sum, r) => sum + (r.quality_score || 0), 0) / results.length;

    // Update running averages
    this.metrics.quality.averageResults =
      (this.metrics.quality.averageResults + results.length) / 2;
    this.metrics.quality.averageRelevanceScore =
      (this.metrics.quality.averageRelevanceScore + avgRelevance) / 2;
    this.metrics.quality.averageQualityScore =
      (this.metrics.quality.averageQualityScore + avgQuality) / 2;
  }

  recordCacheHit() {
    this.metrics.cache.hits++;
  }

  recordCacheMiss() {
    this.metrics.cache.misses++;
  }

  recordCacheSize(size) {
    this.metrics.cache.size = size;
  }

  getReport() {
    const { requests, performance, quality, cache } = this.metrics;

    return {
      successRate: requests.total > 0 ? requests.successful / requests.total : 0,
      averageResponseTime: this.average(performance.responseTime),
      averageTransformationTime: this.average(performance.transformationTime),
      averageValidationTime: this.average(performance.validationTime),
      cacheHitRate: cache.hits + cache.misses > 0 ? cache.hits / (cache.hits + cache.misses) : 0,
      ...requests,
      ...quality,
      ...cache
    };
  }

  average(arr) {
    return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  }
}

/**
 * Feature Flag System
 * Enables gradual rollout of new features
 */
export class FeatureFlags {
  constructor() {
    this.flags = new Map();
    this.loadFromEnvironment();
  }

  loadFromEnvironment() {
    // Load from environment variables
    this.flags.set('enableDeduplication', process.env.SEARCH_PLUS_ENABLE_DEDUP === 'true');
    this.flags.set('enableQualityScoring', process.env.SEARCH_PLUS_ENABLE_QUALITY === 'true');
    this.flags.set('enableMetrics', process.env.SEARCH_PLUS_ENABLE_METRICS !== 'false'); // Default true
    this.flags.set('enableCaching', process.env.SEARCH_PLUS_ENABLE_CACHE !== 'false'); // Default true
  }

  isEnabled(feature) {
    return this.flags.get(feature) || false;
  }

  setEnabled(feature, enabled) {
    this.flags.set(feature, enabled);
  }

  getAll() {
    return Object.fromEntries(this.flags);
  }
}