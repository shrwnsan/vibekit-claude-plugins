#!/usr/bin/env node

/**
 * Service Decision Matrix Testing Framework
 *
 * Tests Tavily vs Jina.ai service selection strategies for the search-plus plugin.
 * Validates fallback logic, cost optimization, and error recovery patterns.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync, mkdirSync, existsSync, appendFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test results directory setup
const resultsDir = join(__dirname, '..', 'test-results');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const resultsFile = join(resultsDir, `service-matrix-${timestamp}.json`);
const logFile = join(resultsDir, `service-matrix-${timestamp}.log`);

// Ensure results directory exists
if (!existsSync(resultsDir)) {
  mkdirSync(resultsDir, { recursive: true });
}

// Test URL scenarios from our research
const testUrls = [
  // Previously failing URLs (from user reports)
  {
    name: 'CoinGecko API Documentation',
    url: 'https://www.coingecko.com/en/api/documentation',
    originalError: '403 Forbidden',
    expectedWithJina: 'success',
    category: 'api_docs'
  },
  {
    name: 'CoinGecko API v3',
    url: 'https://www.coingecko.com/api/docs/v3',
    originalError: '403 Forbidden',
    expectedWithJina: 'success',
    category: 'api_docs'
  },
  {
    name: 'Reddit Algotrading',
    url: 'https://www.reddit.com/r/algotrading/',
    originalError: 'Claude Code unable to fetch Reddit',
    expectedWithJina: 'fail',
    category: 'social_media'
  },
  {
    name: 'Yahoo Finance TOS',
    url: 'https://finance.yahoo.com/tos',
    originalError: 'incorrect header check',
    expectedWithJina: 'fail',
    category: 'financial'
  },

  // Control URLs (should work with most services)
  {
    name: 'Example Domain',
    url: 'https://example.com',
    originalError: 'none',
    expectedWithJina: 'success',
    category: 'control'
  },
  {
    name: 'HTTPBin JSON',
    url: 'https://httpbin.org/json',
    originalError: 'none',
    expectedWithJina: 'success',
    category: 'control'
  },

  // Additional test cases
  {
    name: 'GitHub Public Repo',
    url: 'https://github.com/microsoft/vscode',
    originalError: 'unknown',
    expectedWithJina: 'success',
    category: 'development'
  },
  {
    name: 'Stack Overflow Question',
    url: 'https://stackoverflow.com/questions/11227809/why-is-it-called-a-fox',
    originalError: 'unknown',
    expectedWithJina: 'success',
    category: 'qa'
  }
];

// Service configuration
const services = {
  jinaPublic: {
    name: 'Jina.ai Public (r.jina.ai)',
    url: 'https://r.jina.ai/',
    requiresAuth: false,
    rateLimit: 'unknown',
    cost: 'free'
  },
  jinaAPI: {
    name: 'Jina.ai API',
    url: 'https://api.jina.ai/v1/reader',
    requiresAuth: true,
    rateLimit: '200 RPM',
    cost: 'free_tier_available'
  },
  tavily: {
    name: 'Tavily Extract API',
    url: 'https://api.tavily.com/extract',
    requiresAuth: true,
    rateLimit: 'plan_dependent',
    cost: 'paid'
  }
};

// Helper functions
function log(message) {
  console.log(message);
  const logMessage = `[${new Date().toISOString()}] ${message}\n`;
  try {
    appendFileSync(logFile, logMessage);
  } catch (error) {
    console.error('Failed to write to log file:', error.message);
  }
}

function saveResults(filename, data) {
  try {
    writeFileSync(filename, JSON.stringify(data, null, 2));
    log(`📁 Results saved to: ${filename}`);
  } catch (error) {
    log(`❌ Failed to save results to ${filename}: ${error.message}`);
  }
}

function extractErrorCode(errorMessage) {
  if (errorMessage.includes('403')) return '403';
  if (errorMessage.includes('429')) return '429';
  if (errorMessage.includes('451')) return '451';
  if (errorMessage.includes('timeout')) return 'TIMEOUT';
  if (errorMessage.includes('ECONNREFUSED')) return 'ECONNREFUSED';
  if (errorMessage.includes('incorrect header check')) return 'HEADER_CHECK';
  if (errorMessage.includes('SecurityCompromiseError')) return 'SECURITY_COMPROMISE';
  if (errorMessage.includes('Forbidden')) return 'FORBIDDEN';
  return 'UNKNOWN';
}

// Service testing functions
async function testJinaPublic(url, timeoutMs = 10000) {
  const startTime = Date.now();

  try {
    const jinaUrl = `${services.jinaPublic.url}${url}`;
    log(`🔍 Testing Jina.ai Public: ${jinaUrl}`);

    const response = await fetch(jinaUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Search-Plus-Test/1.0)'
      },
      signal: AbortSignal.timeout(timeoutMs)
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: {
          code: extractErrorCode(errorText),
          message: errorText,
          status: response.status
        },
        responseTime,
        service: 'jinaPublic',
        url,
        metadata: {
          service: services.jinaPublic,
          responseStatus: response.status,
          responseHeaders: Object.fromEntries(response.headers.entries())
        }
      };
    }

    const content = await response.text();

    return {
      success: true,
      responseTime,
      content,
      contentLength: content.length,
      service: 'jinaPublic',
      url,
      metadata: {
        service: services.jinaPublic,
        responseStatus: response.status,
        contentType: response.headers.get('content-type'),
        contentPreview: content.substring(0, 200) + (content.length > 200 ? '...' : '')
      }
    };

  } catch (error) {
    return {
      success: false,
      error: {
        code: extractErrorCode(error.message),
        message: error.message
      },
      responseTime: Date.now() - startTime,
      service: 'jinaPublic',
      url,
      metadata: {
        service: services.jinaPublic,
        errorType: error.name
      }
    };
  }
}

async function testJinaAPI(url, apiKey, timeoutMs = 10000) {
  const startTime = Date.now();

  if (!apiKey) {
    return {
      success: false,
      error: {
        code: 'NO_API_KEY',
        message: 'Jina.ai API key not provided'
      },
      responseTime: 0,
      service: 'jinaAPI',
      url,
      metadata: {
        service: services.jinaAPI,
        note: 'Test skipped - no API key'
      }
    };
  }

  try {
    log(`🔍 Testing Jina.ai API: ${url}`);

    // Jina.ai Reader API endpoint and request format
    const response = await fetch('https://r.jina.ai/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        url: url
      }),
      signal: AbortSignal.timeout(timeoutMs)
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: {
          code: extractErrorCode(errorText),
          message: errorText,
          status: response.status
        },
        responseTime,
        service: 'jinaAPI',
        url,
        metadata: {
          service: services.jinaAPI,
          responseStatus: response.status,
          responseHeaders: Object.fromEntries(response.headers.entries())
        }
      };
    }

    const data = await response.json();
    const content = data.data?.content || data.content || data.data || JSON.stringify(data);

    return {
      success: true,
      responseTime,
      content,
      contentLength: content.length,
      service: 'jinaAPI',
      url,
      metadata: {
        service: services.jinaAPI,
        responseStatus: response.status,
        contentType: response.headers.get('content-type'),
        responseData: data,
        contentPreview: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
        // Additional API-specific metadata
        tokenUsage: data.usage || null,
        model: data.model || null
      }
    };

  } catch (error) {
    return {
      success: false,
      error: {
        code: extractErrorCode(error.message),
        message: error.message
      },
      responseTime: Date.now() - startTime,
      service: 'jinaAPI',
      url,
      metadata: {
        service: services.jinaAPI,
        errorType: error.name
      }
    };
  }
}

async function testTavily(url, apiKey, timeoutMs = 15000) {
  const startTime = Date.now();

  if (!apiKey) {
    return {
      success: false,
      error: {
        code: 'NO_API_KEY',
        message: 'Tavily API key not provided'
      },
      responseTime: 0,
      service: 'tavily',
      url,
      metadata: {
        service: services.tavily,
        note: 'Test skipped - no API key'
      }
    };
  }

  try {
    log(`🔍 Testing Tavily Extract: ${url}`);

    const response = await fetch(services.tavily.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        api_key: apiKey,
        urls: [url]
      }),
      signal: AbortSignal.timeout(timeoutMs)
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: {
          code: extractErrorCode(errorText),
          message: errorText,
          status: response.status
        },
        responseTime,
        service: 'tavily',
        url,
        metadata: {
          service: services.tavily,
          responseStatus: response.status,
          responseHeaders: Object.fromEntries(response.headers.entries())
        }
      };
    }

    const data = await response.json();
    const content = data.results && data.results[0] ?
                   data.results[0].content || data.results[0].raw_content :
                   '';

    return {
      success: true,
      responseTime,
      content,
      contentLength: content.length,
      service: 'tavily',
      url,
      metadata: {
        service: services.tavily,
        responseStatus: response.status,
        responseData: data,
        contentPreview: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
        hasResults: data.results && data.results.length > 0
      }
    };

  } catch (error) {
    return {
      success: false,
      error: {
        code: extractErrorCode(error.message),
        message: error.message
      },
      responseTime: Date.now() - startTime,
      service: 'tavily',
      url,
      metadata: {
        service: services.tavily,
        errorType: error.name
      }
    };
  }
}

// Decision matrix testing
async function testFallbackStrategy(url, jinaApiKey, tavilyApiKey) {
  const results = [];

  // Strategy 1: Jina Public First → Tavily Fallback
  log(`\n🔄 Testing fallback strategy: Jina Public → Tavily`);

  const jinaPublicResult = await testJinaPublic(url);
  results.push({ strategy: 'jina_first', step: 1, service: 'jinaPublic', result: jinaPublicResult });

  if (!jinaPublicResult.success) {
    const tavilyFallbackResult = await testTavily(url, tavilyApiKey);
    results.push({ strategy: 'jina_first', step: 2, service: 'tavily', result: tavilyFallbackResult });
  }

  // Strategy 2: Tavily First → Jina Public Fallback
  log(`\n🔄 Testing fallback strategy: Tavily → Jina Public`);

  const tavilyResult = await testTavily(url, tavilyApiKey);
  results.push({ strategy: 'tavily_first', step: 1, service: 'tavily', result: tavilyResult });

  if (!tavilyResult.success) {
    const jinaFallbackResult = await testJinaPublic(url);
    results.push({ strategy: 'tavily_first', step: 2, service: 'jinaPublic', result: jinaFallbackResult });
  }

  // Strategy 3: Jina API First (if available) → Tavily Fallback
  if (jinaApiKey) {
    log(`\n🔄 Testing fallback strategy: Jina API → Tavily`);

    const jinaApiResult = await testJinaAPI(url, jinaApiKey);
    results.push({ strategy: 'jina_api_first', step: 1, service: 'jinaAPI', result: jinaApiResult });

    if (!jinaApiResult.success) {
      const tavilyFallbackResult = await testTavily(url, tavilyApiKey);
      results.push({ strategy: 'jina_api_first', step: 2, service: 'tavily', result: tavilyFallbackResult });
    }
  }

  return results;
}

// Jina Public vs API direct comparison
async function testJinaComparison(url, jinaApiKey) {
  if (!jinaApiKey) {
    return { note: 'Jina API key not available for comparison' };
  }

  log(`\n🔬 Direct Jina Comparison: Public vs API`);

  const publicResult = await testJinaPublic(url);
  const apiResult = await testJinaAPI(url, jinaApiKey);

  return {
    url,
    public: publicResult,
    api: apiResult,
    comparison: {
      speedWinner: publicResult.responseTime < apiResult.responseTime ? 'public' : 'api',
      speedDifference: Math.abs(publicResult.responseTime - apiResult.responseTime),
      bothSuccessful: publicResult.success && apiResult.success,
      onlyPublicSucceeded: publicResult.success && !apiResult.success,
      onlyApiSucceeded: !publicResult.success && apiResult.success,
      bothFailed: !publicResult.success && !apiResult.success,
      contentLengthDifference: apiResult.contentLength - publicResult.contentLength
    }
  };
}

// Cost analysis
function calculateCostAnalysis(testResults) {
  const analysis = {
    totalTests: 0,
    successfulExtractions: 0,
    totalResponseTime: 0,
    serviceUsage: {
      jinaPublic: { count: 0, success: 0, avgResponseTime: 0 },
      jinaAPI: { count: 0, success: 0, avgResponseTime: 0 },
      tavily: { count: 0, success: 0, avgResponseTime: 0 }
    },
    fallbackRates: {
      jina_first: { total: 0, fallbacks: 0, fallbackRate: 0 },
      tavily_first: { total: 0, fallbacks: 0, fallbackRate: 0 }
    }
  };

  testResults.forEach(urlResult => {
    analysis.totalTests++;

    urlResult.serviceTests?.forEach(serviceResult => {
      const serviceName = serviceResult.result.service;
      if (analysis.serviceUsage[serviceName]) {
        analysis.serviceUsage[serviceName].count++;
        if (serviceResult.result.success) {
          analysis.serviceUsage[serviceName].success++;
          analysis.successfulExtractions++;
        }
        analysis.serviceUsage[serviceName].avgResponseTime += serviceResult.result.responseTime;
      }
    });

    urlResult.fallbackTests?.forEach(fallbackResult => {
      const strategy = fallbackResult.strategy;
      if (analysis.fallbackRates[strategy]) {
        analysis.fallbackRates[strategy].total++;
        if (fallbackResult.step === 2) {
          analysis.fallbackRates[strategy].fallbacks++;
        }
      }
    });
  });

  // Calculate averages and rates
  Object.keys(analysis.serviceUsage).forEach(service => {
    const usage = analysis.serviceUsage[service];
    if (usage.count > 0) {
      usage.avgResponseTime = Math.round(usage.avgResponseTime / usage.count);
      usage.successRate = Math.round((usage.success / usage.count) * 100);
    }
  });

  Object.keys(analysis.fallbackRates).forEach(strategy => {
    const rate = analysis.fallbackRates[strategy];
    if (rate.total > 0) {
      rate.fallbackRate = Math.round((rate.fallbacks / rate.total) * 100);
    }
  });

  analysis.overallSuccessRate = Math.round((analysis.successfulExtractions / analysis.totalTests) * 100);

  return analysis;
}

// Main test execution
async function runServiceDecisionMatrixTests() {
  console.log('🚀 Service Decision Matrix Testing Framework');
  console.log('⏰ Started at', new Date().toLocaleString());
  console.log('🎯 Purpose: Test Tavily vs Jina.ai service selection strategies');

  // Initialize log file
  writeFileSync(logFile, `Service Decision Matrix Test Log\nStarted: ${new Date().toISOString()}\n\n`);

  // Get API keys from environment
  const jinaApiKey = process.env.JINA_API_KEY;
  const tavilyApiKey = process.env.TAVILY_API_KEY;

  log('🔑 API Configuration:');
  log(`   Jina.ai API Key: ${jinaApiKey ? '✅ Configured' : '❌ Not configured'}`);
  log(`   Tavily API Key: ${tavilyApiKey ? '✅ Configured' : '❌ Not configured'}`);

  const testResults = [];

  for (const urlTest of testUrls) {
    log(`\n📋 Testing URL: ${urlTest.name}`);
    log(`   URL: ${urlTest.url}`);
    log(`   Category: ${urlTest.category}`);
    log(`   Original Error: ${urlTest.originalError}`);

    const urlResult = {
      urlInfo: urlTest,
      serviceTests: [],
      fallbackTests: []
    };

    // Test individual services
    log('\n🔍 Testing individual services...');

    const jinaPublicTest = await testJinaPublic(urlTest.url);
    urlResult.serviceTests.push({ service: 'jinaPublic', result: jinaPublicTest });

    if (jinaApiKey) {
      const jinaAPITest = await testJinaAPI(urlTest.url, jinaApiKey);
      urlResult.serviceTests.push({ service: 'jinaAPI', result: jinaAPITest });
    }

    if (tavilyApiKey) {
      const tavilyTest = await testTavily(urlTest.url, tavilyApiKey);
      urlResult.serviceTests.push({ service: 'tavily', result: tavilyTest });
    }

    // Test fallback strategies (if we have at least one working service)
    if (jinaApiKey || tavilyApiKey) {
      log('\n🔄 Testing fallback strategies...');
      const fallbackResults = await testFallbackStrategy(urlTest.url, jinaApiKey, tavilyApiKey);
      urlResult.fallbackTests = fallbackResults;
    }

    // Test Jina Public vs API comparison (if API key available)
    if (jinaApiKey) {
      log('\n🔬 Testing Jina Public vs API comparison...');
      const jinaComparison = await testJinaComparison(urlTest.url, jinaApiKey);
      urlResult.jinaComparison = jinaComparison;
    }

    testResults.push(urlResult);

    // Small delay between tests to be respectful
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Generate cost analysis
  log('\n📊 Generating cost analysis...');
  const costAnalysis = calculateCostAnalysis(testResults);

  // Compile final results
  const finalResults = {
    metadata: {
      testType: 'service_decision_matrix',
      timestamp: new Date().toISOString(),
      totalUrls: testUrls.length,
      apiConfiguration: {
        jinaConfigured: !!jinaApiKey,
        tavilyConfigured: !!tavilyApiKey
      }
    },
    testResults,
    costAnalysis,
    recommendations: generateRecommendations(costAnalysis, testResults)
  };

  saveResults(resultsFile, finalResults);

  // Print summary
  console.log('\n✅ Testing Complete!');
  console.log('📊 Summary:');
  console.log(`   Total URLs Tested: ${testUrls.length}`);
  console.log(`   Overall Success Rate: ${costAnalysis.overallSuccessRate}%`);
  console.log(`   Results saved to: ${resultsFile}`);

  printServiceComparison(costAnalysis);
}

function generateRecommendations(analysis, results) {
  const recommendations = {
    primaryStrategy: '',
    servicePriorities: [],
    costOptimizations: [],
    reliabilityNotes: []
  };

  // Determine best strategy based on success rates and fallback rates
  const jinaFirstRate = analysis.fallbackRates.jina_first.fallbackRate;
  const tavilyFirstRate = analysis.fallbackRates.tavily_first.fallbackRate;

  if (jinaFirstRate < tavilyFirstRate) {
    recommendations.primaryStrategy = 'jina_first';
    recommendations.servicePriorities = ['jinaPublic', 'tavily'];
  } else {
    recommendations.primaryStrategy = 'tavily_first';
    recommendations.servicePriorities = ['tavily', 'jinaPublic'];
  }

  // Cost optimization recommendations
  if (analysis.serviceUsage.jinaPublic.successRate > 50) {
    recommendations.costOptimizations.push('Use Jina.ai public endpoint for cost-sensitive operations');
  }

  if (analysis.serviceUsage.tavily.successRate > 80) {
    recommendations.costOptimizations.push('Keep Tavily as premium fallback for critical extractions');
  }

  // Reliability notes
  results.forEach(urlResult => {
    const jinaSuccess = urlResult.serviceTests.find(t => t.service === 'jinaPublic')?.result.success;
    const tavilySuccess = urlResult.serviceTests.find(t => t.service === 'tavily')?.result.success;

    if (jinaSuccess && !tavilySuccess) {
      recommendations.reliabilityNotes.push(`${urlResult.urlInfo.name}: Jina.ai works where Tavily fails`);
    } else if (tavilySuccess && !jinaSuccess) {
      recommendations.reliabilityNotes.push(`${urlResult.urlInfo.name}: Tavily works where Jina.ai fails`);
    }
  });

  return recommendations;
}

function printServiceComparison(analysis) {
  console.log('\n🔍 Service Performance Comparison:');

  Object.entries(analysis.serviceUsage).forEach(([service, usage]) => {
    if (usage.count > 0) {
      console.log(`   ${service}:`);
      console.log(`     Success Rate: ${usage.successRate}% (${usage.success}/${usage.count})`);
      console.log(`     Avg Response Time: ${usage.avgResponseTime}ms`);
    }
  });

  console.log('\n🔄 Fallback Strategy Performance:');
  Object.entries(analysis.fallbackRates).forEach(([strategy, rate]) => {
    console.log(`   ${strategy}:`);
    console.log(`     Fallback Rate: ${rate.fallbackRate}% (${rate.fallbacks}/${rate.total})`);
  });
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runServiceDecisionMatrixTests().catch(console.error);
}

export { runServiceDecisionMatrixTests, testJinaPublic, testJinaAPI, testTavily };