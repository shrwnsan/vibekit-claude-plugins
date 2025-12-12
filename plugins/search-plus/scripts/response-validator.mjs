/**
 * Response Validation Utility
 * Provides comprehensive validation for standardized search responses
 */

import {
  validateStandardResponse,
  validateStandardResult,
  STANDARD_RESPONSE_SCHEMA
} from './search-response.mjs';

/**
 * Validation result structure
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Whether the response is valid
 * @property {string[]} errors - Array of error messages
 * @property {string[]} warnings - Array of warning messages
 * @property {Object} details - Detailed validation information
 */

/**
 * Validates a standardized search response with detailed reporting
 * @param {any} response - The response to validate
 * @param {Object} options - Validation options
 * @param {boolean} options.strict - Enable strict validation
 * @param {boolean} options.includeWarnings - Include warnings in results
 * @returns {ValidationResult} Detailed validation result
 */
export function validateResponse(response, options = {}) {
  const { strict = false, includeWarnings = true } = options;
  const errors = [];
  const warnings = [];
  const details = {
    missingFields: [],
    invalidFields: [],
    scoreIssues: [],
    urlIssues: []
  };

  // Basic object validation
  if (!response || typeof response !== 'object') {
    errors.push('Response must be a non-null object');
    return {
      isValid: false,
      errors,
      warnings,
      details
    };
  }

  // Check required top-level fields
  for (const field of STANDARD_RESPONSE_SCHEMA.requiredFields) {
    if (!(field in response)) {
      errors.push(`Missing required field: ${field}`);
      details.missingFields.push(field);
    }
  }

  // Validate results array
  if (!Array.isArray(response.results)) {
    errors.push('Results field must be an array');
  } else {
    // Validate each result
    response.results.forEach((result, index) => {
      const resultValidation = validateResultItem(result, index, strict);
      if (!resultValidation.isValid) {
        errors.push(...resultValidation.errors.map(e => `Result[${index}]: ${e}`));
        details.invalidFields.push({ index, fields: resultValidation.invalidFields });
      }
      if (includeWarnings && resultValidation.warnings.length > 0) {
        warnings.push(...resultValidation.warnings.map(w => `Result[${index}]: ${w}`));
      }
    });

    // Check for empty results
    if (response.results.length === 0) {
      warnings.push('Results array is empty');
    }
  }

  // Validate score range
  if (typeof response.success_rate === 'number') {
    if (response.success_rate < 0 || response.success_rate > 1) {
      errors.push(`Success rate must be between 0 and 1, got: ${response.success_rate}`);
      details.scoreIssues.push('success_rate_out_of_range');
    }
  } else if (strict && 'success_rate' in response) {
    errors.push('Success rate must be a number');
    details.invalidFields.push('success_rate');
  }

  // Validate response time
  if (typeof response.response_time !== 'number') {
    if (strict && 'response_time' in response) {
      errors.push('Response time must be a number');
      details.invalidFields.push('response_time');
    } else if (includeWarnings) {
      warnings.push('Response time should be a number');
    }
  } else if (response.response_time < 0) {
    errors.push(`Response time cannot be negative, got: ${response.response_time}`);
    details.scoreIssues.push('negative_response_time');
  }

  // Validate metadata
  if (response.metadata && typeof response.metadata === 'object') {
    // Check metadata fields
    for (const field of STANDARD_RESPONSE_SCHEMA.metadataFields) {
      if (!(field in response.metadata)) {
        if (strict) {
          errors.push(`Missing required metadata field: ${field}`);
          details.missingFields.push(`metadata.${field}`);
        } else if (includeWarnings) {
          warnings.push(`Missing recommended metadata field: ${field}`);
        }
      }
    }

    // Validate total_results matches results array length
    if (typeof response.metadata.total_results === 'number' &&
        Array.isArray(response.results) &&
        response.metadata.total_results !== response.results.length) {
      warnings.push(`metadata.total_results (${response.metadata.total_results}) does not match actual results count (${response.results.length})`);
    }
  } else if (strict) {
    errors.push('Metadata must be an object');
    details.invalidFields.push('metadata');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    details
  };
}

/**
 * Validates a single result item
 * @param {any} result - The result to validate
 * @param {number} index - Index of the result (for error messages)
 * @param {boolean} strict - Enable strict validation
 * @returns {ValidationResult} Validation result for the result
 */
function validateResultItem(result, index = 0, strict = false) {
  const errors = [];
  const warnings = [];
  const invalidFields = [];

  // Basic object validation
  if (!result || typeof result !== 'object') {
    errors.push('Result must be a non-null object');
    return { isValid: false, errors, warnings, invalidFields };
  }

  // Check required result fields
  for (const field of STANDARD_RESPONSE_SCHEMA.resultFields) {
    if (!(field in result)) {
      errors.push(`Missing required field: ${field}`);
      invalidFields.push(field);
    }
  }

  // Validate URL
  if (result.url) {
    try {
      new URL(result.url);
    } catch {
      errors.push(`Invalid URL format: ${result.url}`);
      invalidFields.push('url');
    }
  } else if (strict) {
    errors.push('URL field is required');
    invalidFields.push('url');
  }

  // Validate score ranges
  if (typeof result.score === 'number') {
    if (result.score < 0 || result.score > 1) {
      errors.push(`Score must be between 0 and 1, got: ${result.score}`);
      invalidFields.push('score');
    }
  } else if (strict && 'score' in result) {
    errors.push('Score must be a number');
    invalidFields.push('score');
  }

  if (typeof result.relevance_score === 'number') {
    if (result.relevance_score < 0 || result.relevance_score > 1) {
      errors.push(`Relevance score must be between 0 and 1, got: ${result.relevance_score}`);
      invalidFields.push('relevance_score');
    }
  } else if (strict && 'relevance_score' in result) {
    errors.push('Relevance score must be a number');
    invalidFields.push('relevance_score');
  }

  // Validate content quality
  if (result.content && typeof result.content === 'string') {
    if (result.content.trim().length === 0) {
      warnings.push('Content is empty or whitespace only');
    }
  } else if (strict && 'content' in result) {
    errors.push('Content must be a non-empty string');
    invalidFields.push('content');
  }

  // Validate title quality
  if (result.title && typeof result.title === 'string') {
    if (result.title.trim().length === 0) {
      warnings.push('Title is empty or whitespace only');
    }
  } else if (strict && 'title' in result) {
    errors.push('Title must be a non-empty string');
    invalidFields.push('title');
  }

  // Check for suspicious score patterns
  if (typeof result.score === 'number' && typeof result.relevance_score === 'number') {
    if (Math.abs(result.score - result.relevance_score) > 0.5) {
      warnings.push('Large discrepancy between score and relevance_score may indicate scoring issues');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    invalidFields
  };
}

/**
 * Validates a batch of responses
 * @param {Array} responses - Array of responses to validate
 * @param {Object} options - Validation options
 * @returns {Object} Batch validation results
 */
export function validateBatch(responses, options = {}) {
  const results = [];
  let totalValid = 0;
  const allErrors = [];
  const allWarnings = [];

  responses.forEach((response, index) => {
    const validation = validateResponse(response, options);
    if (validation.isValid) totalValid++;

    results.push({
      index,
      isValid: validation.isValid,
      errorCount: validation.errors.length,
      warningCount: validation.warnings.length
    });

    allErrors.push(...validation.errors.map(e => `Response[${index}]: ${e}`));
    allWarnings.push(...validation.warnings.map(w => `Response[${index}]: ${w}`));
  });

  return {
    total: responses.length,
    valid: totalValid,
    invalid: responses.length - totalValid,
    successRate: responses.length > 0 ? totalValid / responses.length : 0,
    results,
    allErrors,
    allWarnings
  };
}

/**
 * Performance validation metrics
 * @param {Array} responses - Array of standardized responses
 * @returns {Object} Performance metrics
 */
export function analyzePerformance(responses) {
  if (!Array.isArray(responses) || responses.length === 0) {
    return {
      error: 'No responses provided for analysis'
    };
  }

  const responseTimes = responses
    .filter(r => typeof r.response_time === 'number' && r.response_time >= 0)
    .map(r => r.response_time);

  const resultCounts = responses
    .filter(r => Array.isArray(r.results))
    .map(r => r.results.length);

  const scores = responses
    .filter(r => Array.isArray(r.results))
    .flatMap(r => r.results
      .filter(result => typeof result.score === 'number')
      .map(result => result.score)
    );

  const relevanceScores = responses
    .filter(r => Array.isArray(r.results))
    .flatMap(r => r.results
      .filter(result => typeof result.relevance_score === 'number')
      .map(result => result.relevance_score)
    );

  return {
    responseTime: {
      count: responseTimes.length,
      min: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
      max: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      average: responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
      median: responseTimes.length > 0 ? calculateMedian(responseTimes) : 0
    },
    resultCount: {
      count: resultCounts.length,
      min: resultCounts.length > 0 ? Math.min(...resultCounts) : 0,
      max: resultCounts.length > 0 ? Math.max(...resultCounts) : 0,
      average: resultCounts.length > 0 ? resultCounts.reduce((a, b) => a + b, 0) / resultCounts.length : 0,
      median: resultCounts.length > 0 ? calculateMedian(resultCounts) : 0
    },
    scores: {
      count: scores.length,
      min: scores.length > 0 ? Math.min(...scores) : 0,
      max: scores.length > 0 ? Math.max(...scores) : 0,
      average: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
      median: scores.length > 0 ? calculateMedian(scores) : 0
    },
    relevanceScores: {
      count: relevanceScores.length,
      min: relevanceScores.length > 0 ? Math.min(...relevanceScores) : 0,
      max: relevanceScores.length > 0 ? Math.max(...relevanceScores) : 0,
      average: relevanceScores.length > 0 ? relevanceScores.reduce((a, b) => a + b, 0) / relevanceScores.length : 0,
      median: relevanceScores.length > 0 ? calculateMedian(relevanceScores) : 0
    }
  };
}

/**
 * Calculates the median of an array of numbers
 * @param {number[]} numbers - Array of numbers
 * @returns {number} Median value
 */
function calculateMedian(numbers) {
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Creates a validation report for a single response
 * @param {any} response - The response to validate
 * @param {Object} options - Validation options
 * @returns {string} Formatted validation report
 */
export function createValidationReport(response, options = {}) {
  const validation = validateResponse(response, options);

  let report = `# Response Validation Report\n\n`;
  report += `**Status:** ${validation.isValid ? '✅ VALID' : '❌ INVALID'}\n\n`;

  if (validation.errors.length > 0) {
    report += `## Errors (${validation.errors.length})\n`;
    validation.errors.forEach(error => {
      report += `- ❌ ${error}\n`;
    });
    report += '\n';
  }

  if (validation.warnings.length > 0) {
    report += `## Warnings (${validation.warnings.length})\n`;
    validation.warnings.forEach(warning => {
      report += `- ⚠️ ${warning}\n`;
    });
    report += '\n';
  }

  if (Object.keys(validation.details).length > 0) {
    report += `## Details\n`;
    Object.entries(validation.details).forEach(([key, value]) => {
      if (Array.isArray(value) && value.length > 0) {
        report += `- **${key}:** ${value.join(', ')}\n`;
      }
    });
  }

  return report;
}