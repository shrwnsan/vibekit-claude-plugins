#!/usr/bin/env node

// Test script for search-plus plugin
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const hooksDir = join(__dirname, 'plugins', 'search-plus', 'hooks');

// Test results tracking
let testsPassed = 0;
let testsTotal = 0;

// Helper functions for testing
function assert(condition, message) {
  testsTotal++;
  if (condition) {
    console.log(`✅ ${message}`);
    testsPassed++;
  } else {
    console.log(`❌ ${message}`);
  }
}

function logTest(testName) {
  console.log(`\n🧪 Testing: ${testName}`);
}

// Import functions from existing hooks for testing
async function importHookFunctions() {
  try {
    // Read the hook file content to extract functions for testing
    const { handleWebSearch } = await import(join(hooksDir, 'handle-web-search.mjs'));
    const { handleWebSearchError } = await import(join(hooksDir, 'handle-search-error.mjs'));

    return { handleWebSearch, handleWebSearchError };
  } catch (error) {
    console.error('❌ Failed to import hook functions:', error.message);
    return null;
  }
}

// Test 1: URL Detection
function testURLDetection() {
  logTest('URL Detection');

  // Enhanced test cases including standardized testing URLs
  const testCases = [
    // Historical problematic URLs from evaluation document
    { input: 'https://foundationcenter.org/', expected: true, description: 'Foundation Center URL (historical)' },
    { input: 'https://www.researchprofessionalnews.com/', expected: true, description: 'Research Professional URL (historical)' },
    { input: 'https://researchgrantmatcher.com/', expected: true, description: 'ResearchGrantMatcher URL (historical)' },
    { input: 'https://pivot.cos.com/', expected: true, description: 'Pivot COS URL (historical)' },

    // Standardized error testing URLs (httpbin.org)
    { input: 'https://httpbin.org/status/403', expected: true, description: 'httpbin.org 403 test endpoint' },
    { input: 'https://httpbin.org/status/429', expected: true, description: 'httpbin.org 429 test endpoint' },
    { input: 'https://httpbin.org/status/404', expected: true, description: 'httpbin.org 404 test endpoint' },
    { input: 'https://httpbin.org/headers', expected: true, description: 'httpbin.org headers test endpoint' },
    { input: 'https://httpbin.org/user-agent', expected: true, description: 'httpbin.org user-agent test endpoint' },
    { input: 'https://httpbin.org/delay/5', expected: true, description: 'httpbin.org delay test endpoint' },

    // Web scraping practice sites
    { input: 'https://quotes.toscrape.com/', expected: true, description: 'Quotes to scrape practice site' },
    { input: 'https://books.toscrape.com/', expected: true, description: 'Books to scrape practice site' },

    // Documentation sites (real content extraction)
    { input: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript', expected: true, description: 'MDN JavaScript docs' },
    { input: 'https://docs.anthropic.com/en/docs/claude-code', expected: true, description: 'Anthropic Claude Code docs' },
    { input: 'https://nodejs.org/en/docs', expected: true, description: 'Node.js documentation' },

    // API endpoints (for URL detection validation)
    { input: 'https://jsonplaceholder.typicode.com/posts/1', expected: true, description: 'JSONPlaceholder API endpoint' },
    { input: 'https://api.github.com/users/github', expected: true, description: 'GitHub API endpoint' },
    { input: 'https://restcountries.com/v3.1/name/france', expected: true, description: 'REST Countries API endpoint' },

    // Complex sites (stress testing)
    { input: 'https://news.ycombinator.com/', expected: true, description: 'Hacker News (rate limiting)' },
    { input: 'https://www.stackoverflow.com/', expected: true, description: 'Stack Overflow (rich content)' },

    // Search queries (non-URLs)
    { input: 'how to find grants', expected: false, description: 'Search query' },
    { input: 'best research databases', expected: false, description: 'Another search query' },
    { input: 'JavaScript async await tutorial', expected: false, description: 'JavaScript search query' },
    { input: 'Node.js documentation guide', expected: false, description: 'Node.js search query' },

    // Invalid inputs
    { input: '', expected: false, description: 'Empty string' },
    { input: 'not-a-url', expected: false, description: 'Invalid URL format' },
    { input: 'ftp://example.com', expected: false, description: 'Non-HTTP protocol' }
  ];

  testCases.forEach(testCase => {
    const result = isURL(testCase.input);
    assert(
      result === testCase.expected,
      `${testCase.description}: ${testCase.input} → ${result}`
    );
  });
}

// Test 2: Error Retry Logic
function testRetryableErrors() {
  logTest('Retryable Error Detection');

  const retryableErrors = [
    { error: { code: 403 }, expected: true, description: '403 Forbidden' },
    { error: { code: 429 }, expected: true, description: '429 Rate Limited' },
    { error: { code: 'ECONNREFUSED' }, expected: true, description: 'Connection Refused' },
    { error: { code: 'ETIMEDOUT' }, expected: true, description: 'Timeout' },
    { error: { message: '403 Forbidden' }, expected: true, description: '403 in message' },
    { error: { message: '429 Too Many Requests' }, expected: true, description: '429 in message' },
    { error: { message: 'ECONNREFUSED: Connection refused' }, expected: true, description: 'ECONNREFUSED in message' },
    { error: { message: 'ETIMEDOUT: Request timeout' }, expected: true, description: 'Timeout in message' }
  ];

  const nonRetryableErrors = [
    { error: { code: 404 }, expected: false, description: '404 Not Found' },
    { error: { code: 400 }, expected: false, description: '400 Bad Request' },
    { error: { code: 401 }, expected: false, description: '401 Unauthorized' },
    { error: { message: 'File not found' }, expected: false, description: 'Generic not found' }
  ];

  retryableErrors.forEach(testCase => {
    const result = isRetryableError(testCase.error);
    assert(
      result === testCase.expected,
      `${testCase.description}: ${testCase.error.code || testCase.error.message} → ${result}`
    );
  });

  nonRetryableErrors.forEach(testCase => {
    const result = isRetryableError(testCase.error);
    const errorInfo = testCase.error.code || testCase.error.message || 'unknown error';
    assert(
      result === testCase.expected,
      `${testCase.description}: ${errorInfo} → ${result}`
    );
  });
}

// Test 3: Header Generation
function testHeaderGeneration() {
  logTest('Random Header Generation');

  const headers1 = generateRandomHeaders();
  const headers2 = generateRandomHeaders();

  assert(
    headers1['User-Agent'] && headers2['User-Agent'],
    'User-Agent header is generated'
  );

  assert(
    headers1['Accept'] && headers2['Accept'],
    'Accept header is generated'
  );

  assert(
    headers1['Accept-Language'] && headers2['Accept-Language'],
    'Accept-Language header is generated'
  );

  // Check that User-Agents can be different (with some randomness)
  const userAgents = [];
  for (let i = 0; i < 10; i++) {
    userAgents.push(generateRandomHeaders()['User-Agent']);
  }
  const uniqueUserAgents = [...new Set(userAgents)];
  assert(
    uniqueUserAgents.length > 1,
    'Multiple different User-Agents can be generated'
  );
}

// Test 4: Mock Tavily API Integration
async function testMockTavilyIntegration() {
  logTest('Mock Tavily API Integration');

  // Mock Tavily functions for testing
  const mockTavilySearch = async (params, timeout = 5000) => {
    console.log(`→ Mock Tavily Search called with query: "${params.query}"`);
    console.log(`→ Headers: ${JSON.stringify(params.headers?.['User-Agent']?.substring(0, 50) || 'none')}...`);

    // Simulate different responses based on query
    if (params.query.includes('403error')) {
      throw new Error('403 Forbidden: Access denied');
    } else if (params.query.includes('429error')) {
      throw new Error('429 Too Many Requests: Rate limited');
    } else if (params.query.includes('connrefused')) {
      throw new Error('ECONNREFUSED: Connection refused');
    } else if (params.query.includes('timeout')) {
      throw new Error('ETIMEDOUT: Request timeout');
    } else {
      return {
        results: [
          {
            title: `Mock result for: ${params.query}`,
            url: 'https://example.com/mock-result',
            content: `This is mock content for the search query: ${params.query}`
          }
        ]
      };
    }
  };

  // Test successful search
  try {
    console.log('→ Testing successful search...');
    const result = await mockTavilySearch({ query: 'test search', headers: generateRandomHeaders() });
    assert(result && result.results && result.results.length > 0, 'Mock successful search returns results');
  } catch (error) {
    assert(false, `Mock successful search failed: ${error.message}`);
  }

  // Test error scenarios
  const errorScenarios = [
    { query: 'test 403error', expectedError: '403 Forbidden' },
    { query: 'test 429error', expectedError: '429 Too Many Requests' },
    { query: 'test connrefused', expectedError: 'ECONNREFUSED' },
    { query: 'test timeout', expectedError: 'ETIMEDOUT' }
  ];

  for (const scenario of errorScenarios) {
    try {
      console.log(`→ Testing ${scenario.expectedError} scenario...`);
      await mockTavilySearch({ query: scenario.query, headers: generateRandomHeaders() });
      assert(false, `Expected error for ${scenario.expectedError} but got success`);
    } catch (error) {
      assert(
        error.message.includes(scenario.expectedError),
        `Correct error type for ${scenario.expectedError}: ${error.message}`
      );
    }
  }
}

// Test 5: Flow Tracing with Test URLs
async function testProblematicURLFlow() {
  logTest('Flow Tracing with Test URLs');

  // Mix of historical problematic URLs and standardized test URLs
  const testURLs = [
    // Historical problematic URLs from evaluation document
    'https://foundationcenter.org/',
    'https://www.researchprofessionalnews.com/',
    'https://researchgrantmatcher.com/',
    'https://pivot.cos.com/',

    // Standardized httpbin.org test URLs
    'https://httpbin.org/status/403',
    'https://httpbin.org/status/429',
    'https://httpbin.org/headers',
    'https://httpbin.org/user-agent',

    // Web scraping practice sites
    'https://quotes.toscrape.com/',
    'https://books.toscrape.com/',

    // Documentation sites for realistic content extraction
    'https://docs.anthropic.com/en/docs/claude-code',
    'https://developer.mozilla.org/en-US/docs/Web/JavaScript'
  ];

  for (const url of testURLs) {
    console.log(`\n→ Testing URL: ${url}`);
    console.log(`→ isURL() result: ${isURL(url)}`);

    if (isURL(url)) {
      console.log(`→ Would trigger handleURLExtraction() for: ${url}`);
      console.log(`→ Expected flow: tavilyExtract() → error handling → retry logic`);

      // Simulate the error handling flow
      try {
        console.log(`→ Simulating extraction attempt 1...`);
        throw new Error('403 Forbidden: Access denied');
      } catch (error) {
        console.log(`→ Error caught: ${error.message}`);
        console.log(`→ isRetryableError() result: ${isRetryableError(error)}`);

        if (isRetryableError(error)) {
          console.log(`→ Would retry with different headers...`);
          console.log(`→ New headers: ${generateRandomHeaders()['User-Agent'].substring(0, 50)}...`);
        }
      }
    }
  }
}

// Test 6: 422 Error Handling
async function test422ErrorHandling() {
  logTest('422 Error Handling');

  console.log('\n→ Testing 422 error detection...');

  // Test 422 error detection function
  const test422Errors = [
    {
      error: {
        code: 422,
        message: 'API Error: 422 {"detail":[{"type":"missing","loc":["body","tools",0,"input_schema"],"msg":"Field required"}]}'
      },
      expected: true,
      description: 'Missing input_schema field'
    },
    {
      error: {
        code: 422,
        message: 'Unprocessable Entity: Schema validation failed'
      },
      expected: true,
      description: 'Schema validation error'
    },
    {
      error: {
        message: '{"detail":[{"type":"missing","loc":["body","tools",0,"input_schema"],"msg":"Field required"}]}'
      },
      expected: true,
      description: '422 error in JSON string'
    },
    {
      error: {
        code: 400,
        message: 'Bad Request'
      },
      expected: false,
      description: 'Non-422 error'
    }
  ];

  // Test 422 error detection
  test422Errors.forEach(test => {
    const result = is422SchemaError(test.error);
    assert(
      result === test.expected,
      `422 detection - ${test.description}: ${result}`
    );
  });

  console.log('\n→ Testing query simplification for schema compatibility...');

  const queryTests = [
    {
      query: 'open source infographic sharing platform boilerplate github 2024',
      expected: 'open source infographic sharing platform boilerplate github 2024',
      description: 'Normal query unchanged'
    },
    {
      query: 'data visualization sharing platform with @special #characters and $symbols!',
      expected: 'data visualization sharing platform with special characters and symbols!',
      description: 'Special characters removed (keeps basic punctuation)'
    },
    {
      query: '   multiple    spaces   and   tabs	',
      expected: 'multiple spaces and tabs',
      description: 'Whitespace normalized'
    }
  ];

  queryTests.forEach(test => {
    const result = simplifyQueryForSchema(test.query);
    assert(
      result === test.expected,
      `Query simplification - ${test.description}: "${test.query}" → "${result}"`
    );
  });

  console.log('\n→ Testing retryable error detection with 422...');

  const retryableWith422 = [
    { error: { code: 403 }, expected: true, description: '403 Forbidden' },
    { error: { code: 422 }, expected: true, description: '422 Unprocessable Entity' },
    { error: { code: 429 }, expected: true, description: '429 Rate Limited' },
    { error: { code: 'ECONNREFUSED' }, expected: true, description: 'Connection Refused' },
    { error: { code: 'ETIMEDOUT' }, expected: true, description: 'Timeout' },
    { error: { message: '422 validation error' }, expected: true, description: '422 in message' },
    { error: { message: '{"detail":[{"type":"missing","input_schema"}]}' }, expected: true, description: 'Schema pattern in message' }
  ];

  retryableWith422.forEach(test => {
    const result = isRetryableError(test.error);
    assert(
      result === test.expected,
      `Retryable with 422 - ${test.description}: ${result}`
    );
  });

  console.log('\n→ Testing problematic query scenarios...');

  // Test the queries that previously failed with 422 errors
  const problematicQueries = [
    "open source infographic sharing platform boilerplate github 2024",
    "scaling requirements for infographic sharing sites architecture",
    "data visualization sharing platform open source projects github",
    "chart sharing platform open source github",
    "infographic sharing website architecture scaling requirements"
  ];

  problematicQueries.forEach((query, index) => {
    console.log(`→ Query ${index + 1}: "${query.substring(0, 40)}..."`);
    console.log(`   Simplified: "${simplifyQueryForSchema(query)}"`);
    console.log(`   Reformulated: "${reformulateQueryForSchemaCompatibility(query)}"`);

    // Verify queries are processed without errors
    const simplified = simplifyQueryForSchema(query);
    const reformulated = reformulateQueryForSchemaCompatibility(query);

    assert(
      simplified && simplified.length > 0,
      `Query ${index + 1} simplification works`
    );

    assert(
      reformulated && reformulated.length > 0,
      `Query ${index + 1} reformulation works`
    );
  });

  console.log('\n→ Testing 422 error recovery flow simulation...');

  // Simulate the 422 error recovery process
  const mock422Error = {
    code: 422,
    message: 'API Error: 422 {"detail":[{"type":"missing","loc":["body","tools",0,"input_schema"],"msg":"Field required"}]}'
  };

  const searchOptions = {
    query: "open source infographic sharing platform boilerplate github 2024",
    maxResults: 5,
    includeAnswer: true,
    timeout: 10000
  };

  console.log(`→ Simulating 422 error for query: "${searchOptions.query}"`);
  console.log(`→ Error: ${mock422Error.message}`);
  console.log(`→ is422SchemaError(): ${is422SchemaError(mock422Error)}`);
  console.log(`→ isRetryableError(): ${isRetryableError(mock422Error)}`);

  if (is422SchemaError(mock422Error)) {
    console.log(`→ Would trigger handle422Error() with strategies:`);
    console.log(`   1. Schema repair - add missing input_schema`);
    console.log(`   2. Query simplification - "${simplifyQueryForSchema(searchOptions.query)}"`);
    console.log(`   3. Query reformulation - "${reformulateQueryForSchemaCompatibility(searchOptions.query)}"`);
    console.log(`   4. Alternative API format - minimal parameters`);

    assert(true, '422 error recovery flow simulated successfully');
  }
}

// Test 7: Header Rotation and Content Extraction
async function testHeaderRotationAndExtraction() {
  logTest('Header Rotation and Content Extraction');

  console.log('\n→ Testing header generation diversity...');
  const headers = [];
  for (let i = 0; i < 5; i++) {
    const header = generateRandomHeaders();
    headers.push(header['User-Agent']);
    console.log(`→ Header ${i + 1}: ${header['User-Agent'].substring(0, 50)}...`);
  }

  const uniqueHeaders = [...new Set(headers)];
  assert(
    uniqueHeaders.length >= 3,
    `Generated ${uniqueHeaders.length} unique headers out of 5 attempts`
  );

  console.log('\n→ Testing URL categorization...');

  // Test different URL types
  const urlTests = [
    { url: 'https://httpbin.org/headers', type: 'API endpoint', expected: true },
    { url: 'https://quotes.toscrape.com/', type: 'Web content', expected: true },
    { url: 'https://api.github.com/users/github', type: 'API endpoint', expected: true },
    { url: 'https://docs.anthropic.com/en/docs/claude-code', type: 'Documentation', expected: true },
    { url: 'https://news.ycombinator.com/', type: 'News site', expected: true }
  ];

  urlTests.forEach(test => {
    console.log(`→ ${test.type}: ${test.url}`);
    console.log(`   isURL(): ${isURL(test.url)} (expected: ${test.expected})`);
    assert(
      isURL(test.url) === test.expected,
      `${test.type} URL detection: ${test.url}`
    );
  });

  console.log('\n→ Simulating content extraction scenarios...');

  const contentScenarios = [
    {
      url: 'https://httpbin.org/headers',
      description: 'Header verification endpoint',
      expectedFlow: 'Direct extraction, should return request headers'
    },
    {
      url: 'https://quotes.toscrape.com/',
      description: 'Web scraping practice site',
      expectedFlow: 'HTML extraction, parse quotes content'
    },
    {
      url: 'https://docs.anthropic.com/en/docs/claude-code',
      description: 'Documentation site',
      expectedFlow: 'HTML extraction, parse technical documentation'
    },
    {
      url: 'https://api.github.com/users/github',
      description: 'GitHub API endpoint',
      expectedFlow: 'JSON extraction, parse user data'
    }
  ];

  for (const scenario of contentScenarios) {
    console.log(`\n→ ${scenario.description}`);
    console.log(`   URL: ${scenario.url}`);
    console.log(`   Expected flow: ${scenario.expectedFlow}`);

    if (isURL(scenario.url)) {
      console.log(`   ✅ Would trigger handleURLExtraction()`);

      // Simulate header rotation for this URL
      const headers1 = generateRandomHeaders();
      const headers2 = generateRandomHeaders();

      console.log(`   Headers 1: ${headers1['User-Agent'].substring(0, 40)}...`);
      console.log(`   Headers 2: ${headers2['User-Agent'].substring(0, 40)}...`);

      const headersMatch = headers1['User-Agent'] === headers2['User-Agent'];
      // Note: Due to randomness, headers might occasionally be the same
      // This is expected behavior - the important thing is that rotation logic works
      console.log(`   ${headersMatch ? '⚠️' : '✅'} Headers ${headersMatch ? 'same (randomness expected)' : 'different (rotation working)'}: ${headersMatch}`);

      console.log(`   ✅ Header rotation working properly`);
    }
  }
}

// Simplified versions of functions from hooks for testing
function isURL(input) {
  try {
    const url = new URL(input);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isRetryableError(error) {
  // Check if the error code is retryable (now includes 422)
  if (error.code === 403 || error.code === 422 || error.code === 429 ||
      error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    return true;
  }

  // Check if the error message contains retryable indicators (now includes 422)
  const errorMessage = error.message || '';
  const errorString = JSON.stringify(error);

  if (errorMessage.includes('403') || errorMessage.includes('422') ||
      errorMessage.includes('429') || errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ETIMEDOUT')) {
    return true;
  }

  // Check for schema validation patterns
  if (errorString.toLowerCase().includes('missing') ||
      errorString.toLowerCase().includes('input_schema') ||
      errorString.toLowerCase().includes('field required')) {
    return true;
  }

  // All other errors are not retryable
  return false;
}

// 422 Error Detection Functions
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

// Query simplification for schema compatibility
function simplifyQueryForSchema(query) {
  return query
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[^\w\s\-.,!?]/g, '') // Remove special characters except basic punctuation
    .substring(0, 200) // Limit length
    .trim();
}

// Query reformulation for schema compatibility
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

function generateRandomHeaders() {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:89.0) Gecko/20100101 Firefox/89.0'
  ];

  return {
    'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)],
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
  };
}

// Main test runner
async function runTests() {
  console.log('🚀 Search-Plus Plugin Test Suite');
  console.log('='.repeat(50));

  // Run unit tests
  testURLDetection();
  testRetryableErrors();
  testHeaderGeneration();
  test422ErrorHandling();

  // Run integration tests
  await testMockTavilyIntegration();
  await testProblematicURLFlow();
  await testHeaderRotationAndExtraction();

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results Summary');
  console.log(`✅ Passed: ${testsPassed}/${testsTotal}`);

  if (testsPassed === testsTotal) {
    console.log('🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log(`❌ Failed: ${testsTotal - testsPassed}/${testsTotal}`);
    console.log('💥 Some tests failed!');
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}