/**
 * Test Suite for Search Response Standardization
 * Tests the standardized response format and transformation utilities
 */

import {
  transformToStandard,
  getRegisteredServices,
  hasTransformer,
  batchTransform,
  createErrorResponse
} from './response-transformer.mjs';

import {
  validateResponse,
  validateBatch,
  analyzePerformance,
  createValidationReport
} from './response-validator.mjs';

import {
  createStandardResponse,
  normalizeScore,
  calculateRelevanceScore,
  normalizeDate
} from './search-response.mjs';

/**
 * Test runner utility
 */
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, testFn) {
    this.tests.push({ name, testFn });
  }

  async run() {
    console.log('\n🧪 Running Search Response Standardization Tests\n');
    console.log('=' .repeat(60));

    for (const { name, testFn } of this.tests) {
      try {
        await testFn();
        console.log(`✅ ${name}`);
        this.passed++;
      } catch (error) {
        console.log(`❌ ${name}`);
        console.log(`   Error: ${error.message}`);
        this.failed++;
      }
    }

    console.log('=' .repeat(60));
    console.log(`\n📊 Test Results:`);
    console.log(`   Passed: ${this.passed}`);
    console.log(`   Failed: ${this.failed}`);
    console.log(`   Total:  ${this.tests.length}`);
    console.log(`   Success Rate: ${Math.round((this.passed / this.tests.length) * 100)}%\n`);

    return this.failed === 0;
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(`${message}: Expected ${expected}, got ${actual}`);
    }
  }

  assertArrayEqual(actual, expected, message) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`${message}: Arrays are not equal`);
    }
  }
}

// Create test runner
const runner = new TestRunner();

// Mock data for testing
const mockTavilyResponse = {
  results: [
    {
      title: "Test Result 1",
      url: "https://example.com/1",
      content: "This is test content 1",
      score: 0.95,
      published_date: "2023-12-01T00:00:00Z"
    },
    {
      title: "Test Result 2",
      url: "https://example.com/2",
      content: "This is test content 2",
      score: 0.87
    }
  ],
  answer: "This is a test answer",
  api_version: "v1"
};

const mockSearXNGResponse = {
  results: [
    {
      title: "SearXNG Result 1",
      url: "https://searx.example.com/1",
      content: "SearXNG content 1",
      publishedDate: "2023-11-15"
    },
    {
      title: "SearXNG Result 2",
      url: "https://searx.example.com/2",
      content: "SearXNG content 2"
    }
  ],
  answers: ["SearXNG answer"],
  number_of_results: 2,
  search_time: 0.5
};

const mockDuckDuckGoResponse = {
  results: [
    {
      title: "DDG Result",
      url: "https://ddg.example.com",
      content: "DuckDuckGo content",
      score: 0.9
    }
  ]
};

// Test cases

runner.test('should register all required services', () => {
  const services = getRegisteredServices();
  const expectedServices = ['tavily', 'searxng', 'duckduckgo-html', 'startpage-html'];

  runner.assertArrayEqual(
    services.sort(),
    expectedServices.sort(),
    'Not all required services are registered'
  );
});

runner.test('should detect transformer availability', () => {
  runner.assert(hasTransformer('tavily'), 'Tavily transformer should be available');
  runner.assert(hasTransformer('searxng'), 'SearXNG transformer should be available');
  runner.assert(!hasTransformer('nonexistent'), 'Nonexistent transformer should not be available');
});

runner.test('should transform Tavily response to standard format', () => {
  const query = "test query";
  const result = transformToStandard('tavily', mockTavilyResponse, query, 150);

  runner.assertEqual(result.service, 'tavily', 'Service name should match');
  runner.assertEqual(result.query, query, 'Query should match');
  runner.assertEqual(result.results.length, 2, 'Should have 2 results');
  runner.assertEqual(result.answer, "This is a test answer", 'Answer should match');
  runner.assert(result.response_time > 0, 'Response time should be positive');
  runner.assert(result.success_rate > 0, 'Success rate should be positive');

  // Check first result
  const firstResult = result.results[0];
  runner.assertEqual(firstResult.title, "Test Result 1", 'Title should match');
  runner.assertEqual(firstResult.url, "https://example.com/1", 'URL should match');
  runner.assert(firstResult.score >= 0 && firstResult.score <= 1, 'Score should be normalized');
  runner.assert(firstResult.relevance_score >= 0 && firstResult.relevance_score <= 1, 'Relevance score should be normalized');
});

runner.test('should transform SearXNG response to standard format', () => {
  const query = "searxng test";
  const result = transformToStandard('searxng', mockSearXNGResponse, query, 200);

  runner.assertEqual(result.service, 'searxng', 'Service name should match');
  runner.assertEqual(result.results.length, 2, 'Should have 2 results');
  runner.assertEqual(result.answer, "SearXNG answer", 'Answer should match');
  runner.assertEqual(result.metadata.service_info.number_of_engines, 2, 'Should track engine count');

  // Check result transformation
  const firstResult = result.results[0];
  runner.assertEqual(firstResult.source, 'searxng', 'Source should be set to service name');
  runner.assert(firstResult.published_date, 'Should have normalized date');
});

runner.test('should transform DuckDuckGo response to standard format', () => {
  const query = "ddg test";
  const result = transformToStandard('duckduckgo-html', mockDuckDuckGoResponse, query, 100);

  runner.assertEqual(result.service, 'duckduckgo-html', 'Service name should match');
  runner.assertEqual(result.results.length, 1, 'Should have 1 result');
  runner.assertEqual(result.answer, null, 'Should not have answer for DuckDuckGo');
  runner.assert(result.metadata.service_info.parsed_html, 'Should indicate HTML parsing');
});

runner.test('should handle invalid service name', () => {
  try {
    transformToStandard('invalid-service', {}, 'test');
    runner.assert(false, 'Should throw error for invalid service');
  } catch (error) {
    runner.assert(error.message.includes('No transformer registered'), 'Should have appropriate error message');
  }
});

runner.test('should normalize scores correctly', () => {
  runner.assertEqual(normalizeScore(0.5), 0.5, 'Should preserve valid score');
  runner.assertEqual(normalizeScore(1.5), 1.0, 'Should clamp high scores');
  runner.assertEqual(normalizeScore(-0.5), 0.0, 'Should clamp low scores');
  runner.assertEqual(normalizeScore('0.75'), 0.75, 'Should parse string scores');
  runner.assertEqual(normalizeScore(null, 0, 5), 1.0, 'Should use position-based fallback');
  runner.assertEqual(normalizeScore(undefined, 2, 5), 0.6, 'Should use position-based fallback');
});

runner.test('should calculate relevance scores correctly', () => {
  const factors = {
    title: "JavaScript Tutorial",
    content: "Learn JavaScript programming",
    query: "JavaScript tutorial",
    position: 0,
    totalResults: 5,
    service: 'tavily'
  };

  const score = calculateRelevanceScore(factors);
  runner.assert(score >= 0 && score <= 1, 'Relevance score should be normalized');
  runner.assert(score > 0.5, 'Should have high relevance for matching content');
});

runner.test('should normalize dates correctly', () => {
  const date1 = normalizeDate('2023-12-01T00:00:00Z');
  runner.assert(date1, 'Should parse ISO date string');

  const date2 = normalizeDate(1701388800000);
  runner.assert(date2, 'Should parse timestamp');

  const date3 = normalizeDate(new Date('2023-12-01'));
  runner.assert(date3, 'Should handle Date object');

  const date4 = normalizeDate('invalid date');
  runner.assertEqual(date4, null, 'Should return null for invalid date');
});

runner.test('should create standard response template', () => {
  const response = createStandardResponse('test-service', 'test query');

  runner.assertEqual(response.service, 'test-service', 'Service should match');
  runner.assertEqual(response.query, 'test query', 'Query should match');
  runner.assertEqual(response.results.length, 0, 'Should start with empty results');
  runner.assertEqual(response.answer, null, 'Should start with null answer');
  runner.assertEqual(response.success_rate, 0.0, 'Should start with 0 success rate');
  runner.assert(response.metadata.query_processed_at, 'Should have timestamp');
});

runner.test('should validate responses correctly', () => {
  const validResponse = createStandardResponse('test', 'query');
  validResponse.results = [{
    title: 'Test',
    url: 'https://example.com',
    content: 'Content',
    score: 0.5,
    published_date: null,
    source: 'test',
    relevance_score: 0.6
  }];

  const validation = validateResponse(validResponse);
  runner.assert(validation.isValid, 'Valid response should pass validation');
  runner.assertEqual(validation.errors.length, 0, 'Should have no errors');
});

runner.test('should detect validation errors', () => {
  const invalidResponse = {
    // Missing required fields
    results: [
      {
        title: 'Test',
        // Missing url, content, score, etc.
      }
    ],
    success_rate: 2.0 // Invalid score range
  };

  const validation = validateResponse(invalidResponse, { strict: true });
  runner.assert(!validation.isValid, 'Invalid response should fail validation');
  runner.assert(validation.errors.length > 0, 'Should have errors');
});

runner.test('should batch transform responses', () => {
  const batch = [
    {
      serviceName: 'tavily',
      response: mockTavilyResponse,
      query: 'query1',
      responseTime: 100
    },
    {
      serviceName: 'searxng',
      response: mockSearXNGResponse,
      query: 'query2',
      responseTime: 200
    }
  ];

  const results = batchTransform(batch);
  runner.assertEqual(results.length, 2, 'Should transform all responses');
  runner.assertEqual(results[0].service, 'tavily', 'Should preserve service order');
  runner.assertEqual(results[1].service, 'searxng', 'Should preserve service order');
});

runner.test('should create error responses', () => {
  const error = new Error('Test error');
  error.code = 'TEST_ERROR';

  const errorResponse = createErrorResponse('test-service', 'test query', error, 50);

  runner.assertEqual(errorResponse.service, 'test-service', 'Service should match');
  runner.assertEqual(errorResponse.query, 'test query', 'Query should match');
  runner.assertEqual(errorResponse.results.length, 0, 'Should have no results');
  runner.assertEqual(errorResponse.success_rate, 0.0, 'Should have 0 success rate');
  runner.assert(errorResponse.metadata.service_info.error, 'Should indicate error');
  runner.assertEqual(errorResponse.response_time, 50, 'Should preserve response time');
});

runner.test('should analyze performance metrics', () => {
  const responses = [
    {
      ...createStandardResponse('service1', 'query1'),
      response_time: 100,
      results: [{ title: '1', url: '1', content: '1', score: 0.5, published_date: null, source: '1', relevance_score: 0.6 }]
    },
    {
      ...createStandardResponse('service2', 'query2'),
      response_time: 200,
      results: [{ title: '2', url: '2', content: '2', score: 0.7, published_date: null, source: '2', relevance_score: 0.8 }]
    }
  ];

  const metrics = analyzePerformance(responses);
  runner.assertEqual(metrics.responseTime.count, 2, 'Should count response times');
  runner.assertEqual(metrics.responseTime.average, 150, 'Should calculate average response time');
  runner.assertEqual(metrics.resultCount.count, 2, 'Should count result counts');
  runner.assertEqual(metrics.scores.count, 2, 'Should count scores');
});

runner.test('should validate batch of responses', () => {
  const responses = [
    createStandardResponse('valid', 'query'),
    { invalid: 'response' } // Invalid response
  ];

  // Add required fields to make first response valid
  responses[0].results = [{
    title: 'Test',
    url: 'https://example.com',
    content: 'Content',
    score: 0.5,
    published_date: null,
    source: 'test',
    relevance_score: 0.6
  }];

  const batchValidation = validateBatch(responses);
  runner.assertEqual(batchValidation.total, 2, 'Should process all responses');
  runner.assertEqual(batchValidation.valid, 1, 'Should count valid responses');
  runner.assertEqual(batchValidation.invalid, 1, 'Should count invalid responses');
  runner.assertEqual(batchValidation.successRate, 0.5, 'Should calculate success rate');
});

runner.test('should create validation report', () => {
  const response = createStandardResponse('test', 'query');
  const report = createValidationReport(response);

  runner.assert(report.includes('Response Validation Report'), 'Should include report title');
  runner.assert(report.includes('Warnings'), 'Should include warnings section');
});

// Run all tests
export async function runTests() {
  const success = await runner.run();
  return success;
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}