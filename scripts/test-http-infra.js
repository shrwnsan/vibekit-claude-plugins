#!/usr/bin/env node

/**
 * HTTP Infrastructure Validation Script
 *
 * Purpose: Find and validate clean alternatives to problematic httpbin.org endpoints
 * This helps eliminate 451 errors in test-search-plus.mjs while maintaining test coverage
 *
 * Usage: node scripts/test-http-infra.js
 */

const https = require('https');
const http = require('http');
const { writeFileSync, existsSync, mkdirSync } = require('fs');

// Current httpbin endpoints used in test-search-plus.mjs
const HTTPBIN_ENDPOINTS = [
    {
        name: '403 Status Test',
        originalUrl: 'https://httpbin.org/status/403',
        expectedStatus: 403,
        category: 'status-code'
    },
    {
        name: '404 Status Test',
        originalUrl: 'https://httpbin.org/status/404',
        expectedStatus: 404,
        category: 'status-code'
    },
    {
        name: '429 Status Test',
        originalUrl: 'https://httpbin.org/status/429',
        expectedStatus: 429,
        category: 'status-code'
    },
    {
        name: '451 Status Test',
        originalUrl: 'https://httpbin.org/status/451',
        expectedStatus: 451,
        category: 'status-code'
    },
    {
        name: '500 Status Test',
        originalUrl: 'https://httpbin.org/status/500',
        expectedStatus: 500,
        category: 'status-code'
    },
    {
        name: '502 Status Test',
        originalUrl: 'https://httpbin.org/status/502',
        expectedStatus: 502,
        category: 'status-code'
    },
    {
        name: '503 Status Test',
        originalUrl: 'https://httpbin.org/status/503',
        expectedStatus: 503,
        category: 'status-code'
    },
    {
        name: 'Headers Test',
        originalUrl: 'https://httpbin.org/headers',
        expectedStatus: 200,
        category: 'content-test'
    },
    {
        name: 'User-Agent Test',
        originalUrl: 'https://httpbin.org/user-agent',
        expectedStatus: 200,
        category: 'content-test'
    },
    {
        name: 'GET Request Test',
        originalUrl: 'https://httpbin.org/get',
        expectedStatus: 200,
        category: 'content-test'
    }
];

// Comprehensive alternative endpoints from research
const ALTERNATIVE_ENDPOINTS = {
    // Primary: httpstat.us (Perfect status code control)
    'httpstat.us': {
        baseUrl: 'https://httpstat.us',
        statusEndpoints: [
            '/status/403', '/status/404', '/status/429', '/status/500',
            '/status/502', '/status/503', '/status/451'
        ],
        contentEndpoints: [],
        notes: 'Provides exact status code control via URL parameter'
    },

    // Direct httpbin replacement
    'httpbingo.org': {
        baseUrl: 'https://httpbingo.org',
        statusEndpoints: [
            '/status/403', '/status/404', '/status/429', '/status/500',
            '/status/502', '/status/503', '/status/451'
        ],
        contentEndpoints: [
            '/headers', '/user-agent', '/get'
        ],
        notes: 'Direct httpbin clone with full feature parity'
    },

    // Mock API with custom responses
    'mockbin.org': {
        baseUrl: 'https://mockbin.org',
        statusEndpoints: [
            '/status/403', '/status/404', '/status/429', '/status/500',
            '/status/502', '/status/503', '/status/451'
        ],
        contentEndpoints: [
            '/request', '/headers'
        ],
        notes: 'Custom mock response creation with detailed request inspection'
    },

    // JSON-based REST APIs (for 200/404 tests)
    'jsonplaceholder.typicode.com': {
        baseUrl: 'https://jsonplaceholder.typicode.com',
        statusEndpoints: [
            '/posts/99999',     // 404 for non-existent post
            '/posts/999999'     // 404 alternative
        ],
        contentEndpoints: [
            '/posts/1',         // 200 with JSON content
            '/users/1',         // 200 with user data
            '/comments/1'       // 200 with comments
        ],
        notes: 'Reliable JSON API for content testing'
    },

    // User API with various responses
    'reqres.in': {
        baseUrl: 'https://reqres.in',
        statusEndpoints: [
            '/api/users/99999', // 404 for non-existent user
            '/api/unknown/999'  // 404 for unknown resource
        ],
        contentEndpoints: [
            '/api/users',       // 200 with user list
            '/api/users/1'      // 200 with single user
        ],
        notes: 'User management API for testing'
    }
};

class HTTPInfrastructureValidator {
    constructor() {
        this.results = [];
        this.timeouts = 8000; // 8 second timeout
    }

    /**
     * Log detailed service testing result
     */
    logServiceResult(serviceName, url, result) {
        if (result.success) {
            const statusIcon = result.status === result.expectedStatus ? '✅' : '⚠️';
            console.log(`     ${statusIcon} ${serviceName}: ${result.status} (${result.responseTime}ms) ${url}`);
        } else {
            const errorIcon = result.status === 'ERROR' ? '❌' : result.status === 'TIMEOUT' ? '⏰' : '❌';
            console.log(`     ${errorIcon} ${serviceName}: ${result.status} - ${result.error || 'Unknown error'} ${url}`);
        }
    }

    /**
     * Test a single URL endpoint
     */
    async testEndpoint(url, expectedStatus = null, testName = 'Unknown') {
        return new Promise((resolve) => {
            const startTime = Date.now();
            const protocol = url.startsWith('https') ? https : http;

            const req = protocol.get(url, {
                headers: {
                    'User-Agent': 'HTTP-Infra-Validator/1.0'
                },
                timeout: this.timeouts
            }, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    const responseTime = Date.now() - startTime;
                    const success = !expectedStatus || res.statusCode === expectedStatus;

                    resolve({
                        url,
                        testName,
                        status: res.statusCode,
                        expectedStatus,
                        success,
                        responseTime,
                        contentLength: data.length,
                        contentType: res.headers['content-type'] || 'unknown',
                        dataPreview: data.substring(0, 200),
                        timestamp: new Date().toISOString()
                    });
                });
            });

            req.on('error', (err) => {
                resolve({
                    url,
                    testName,
                    status: 'ERROR',
                    expectedStatus,
                    success: false,
                    responseTime: Date.now() - startTime,
                    error: err.message,
                    timestamp: new Date().toISOString()
                });
            });

            req.on('timeout', () => {
                req.destroy();
                resolve({
                    url,
                    testName,
                    status: 'TIMEOUT',
                    expectedStatus,
                    success: false,
                    responseTime: this.timeouts,
                    error: 'Request timeout',
                    timestamp: new Date().toISOString()
                });
            });
        });
    }

    /**
     * Find alternatives for a specific httpbin endpoint
     */
    async findAlternativesForEndpoint(endpoint) {
        console.log(`\n🔍 Finding alternatives for: ${endpoint.name}`);
        console.log(`   Original: ${endpoint.originalUrl}`);
        console.log(`   Expected: ${endpoint.expectedStatus}`);

        const alternatives = [];

        // Test services in priority order
        const servicePriority = [
            'httpstat.us',      // Best for status codes
            'httpbingo.org',    // Direct httpbin replacement
            'mockbin.org',      // Custom mock responses
            'jsonplaceholder.typicode.com', // For 200/404
            'reqres.in'         // User API testing
        ];

        for (const serviceName of servicePriority) {
            if (!ALTERNATIVE_ENDPOINTS[serviceName]) continue;

            const service = ALTERNATIVE_ENDPOINTS[serviceName];
            console.log(`   Testing ${serviceName}...`);

            if (endpoint.category === 'status-code') {
                // For status code tests, try to find exact matches first
                if (service.statusEndpoints.length > 0) {
                    // httpstat.us uses /status/{code} format
                    if (serviceName === 'httpstat.us') {
                        const url = `${service.baseUrl}/status/${endpoint.expectedStatus}`;
                        const result = await this.testEndpoint(url, endpoint.expectedStatus, endpoint.name);

                        // Log the result
                        this.logServiceResult(serviceName, url, result);

                        alternatives.push({
                            service: serviceName,
                            url,
                            result,
                            isExactMatch: true,
                            priority: 1
                        });
                    }
                    // For other services, try direct status endpoints
                    else {
                        const statusPath = `/status/${endpoint.expectedStatus}`;
                        if (service.statusEndpoints.includes(statusPath)) {
                            const url = service.baseUrl + statusPath;
                            const result = await this.testEndpoint(url, endpoint.expectedStatus, endpoint.name);

                            // Log the result
                            this.logServiceResult(serviceName, url, result);

                            alternatives.push({
                                service: serviceName,
                                url,
                                result,
                                isExactMatch: true,
                                priority: serviceName === 'httpbingo.org' ? 2 : 3
                            });
                        }
                    }
                }
            } else {
                // For content tests (headers, user-agent, get)
                if (service.contentEndpoints.length > 0) {
                    for (const path of service.contentEndpoints) {
                        const url = service.baseUrl + path;
                        const result = await this.testEndpoint(url, endpoint.expectedStatus, endpoint.name);

                        // Log the result
                        this.logServiceResult(serviceName, url, result);

                        alternatives.push({
                            service: serviceName,
                            url,
                            result,
                            isExactMatch: serviceName === 'httpbingo.org' || serviceName === 'mockbin.org',
                            priority: serviceName === 'httpbingo.org' ? 1 : 3
                        });
                    }
                }
            }
        }

        return {
            originalEndpoint: endpoint,
            alternatives: alternatives.filter(alt => alt.result.success),
            bestAlternative: this.selectBestAlternative(alternatives, endpoint.expectedStatus)
        };
    }

    /**
     * Select the best alternative from tested options
     */
    selectBestAlternative(alternatives, expectedStatus) {
        const successful = alternatives.filter(alt => alt.result.success);

        if (successful.length === 0) {
            return null;
        }

        // Prioritize: 1) Exact status match, 2) Service priority, 3) Fast response time
        successful.sort((a, b) => {
            // Exact status matches first
            if (a.isExactMatch && !b.isExactMatch) return -1;
            if (!a.isExactMatch && b.isExactMatch) return 1;

            // Then by service priority (lower number = higher priority)
            if (a.priority !== b.priority) return a.priority - b.priority;

            // Finally by response time
            return a.result.responseTime - b.result.responseTime;
        });

        return successful[0];
    }

    /**
     * Run complete validation test
     */
    async runValidation() {
        console.log('🚀 HTTP Infrastructure Validation Started');
        console.log('='.repeat(60));
        console.log(`📊 Testing ${HTTPBIN_ENDPOINTS.length} httpbin endpoints`);
        console.log('🔄 Searching for 451-error-free alternatives\n');

        const validationResults = {
            timestamp: new Date().toISOString(),
            summary: {
                totalEndpoints: HTTPBIN_ENDPOINTS.length,
                successfulReplacements: 0,
                failedReplacements: 0,
                avgResponseTime: 0
            },
            endpointResults: []
        };

        for (const endpoint of HTTPBIN_ENDPOINTS) {
            const result = await this.findAlternativesForEndpoint(endpoint);
            validationResults.endpointResults.push(result);

            if (result.bestAlternative) {
                validationResults.summary.successfulReplacements++;
                console.log(`✅ ${endpoint.name}: Found ${result.bestAlternative.service} alternative`);
                console.log(`   → ${result.bestAlternative.url} (${result.bestAlternative.result.responseTime}ms)`);
            } else {
                validationResults.summary.failedReplacements++;
                console.log(`❌ ${endpoint.name}: No viable alternatives found`);
            }
        }

        // Calculate average response time
        const allSuccessful = validationResults.endpointResults
            .filter(r => r.bestAlternative)
            .map(r => r.bestAlternative.result.responseTime);

        if (allSuccessful.length > 0) {
            validationResults.summary.avgResponseTime =
                Math.round(allSuccessful.reduce((a, b) => a + b, 0) / allSuccessful.length);
        }

        return validationResults;
    }

    /**
     * Generate test-search-plus.mjs update recommendations
     */
    generateUpdateRecommendations(validationResults) {
        const recommendations = {
            timestamp: new Date().toISOString(),
            summary: {
                endpointsToUpdate: validationResults.summary.successfulReplacements,
                endpointsToRemove: validationResults.summary.failedReplacements
            },
            updates: [],
            removals: []
        };

        for (const result of validationResults.endpointResults) {
            if (result.bestAlternative) {
                recommendations.updates.push({
                    testName: result.originalEndpoint.name,
                    originalUrl: result.originalEndpoint.originalUrl,
                    recommendedUrl: result.bestAlternative.url,
                    expectedStatus: result.originalEndpoint.expectedStatus,
                    service: result.bestAlternative.service,
                    responseTime: result.bestAlternative.result.responseTime,
                    priority: result.bestAlternative.priority,
                    note: `Replaces problematic httpbin.org with clean alternative`
                });
            } else {
                recommendations.removals.push({
                    testName: result.originalEndpoint.name,
                    originalUrl: result.originalEndpoint.originalUrl,
                    expectedStatus: result.originalEndpoint.expectedStatus,
                    note: 'No viable alternative found - consider removing or replacing with different test'
                });
            }
        }

        // Sort updates by priority
        recommendations.updates.sort((a, b) => (a.priority || 99) - (b.priority || 99));

        return recommendations;
    }

    /**
     * Save results to files
     */
    saveResults(validationResults, recommendations) {
        const resultsDir = 'test-results';
        if (!existsSync(resultsDir)) {
            mkdirSync(resultsDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        // Save validation results
        const validationFile = `${resultsDir}/http-infra-validation-${timestamp}.json`;
        writeFileSync(validationFile, JSON.stringify(validationResults, null, 2));

        // Save recommendations
        const recommendationsFile = `${resultsDir}/http-infra-recommendations-${timestamp}.json`;
        writeFileSync(recommendationsFile, JSON.stringify(recommendations, null, 2));

        return { validationFile, recommendationsFile };
    }

    /**
     * Print final summary
     */
    printSummary(validationResults, recommendations, files) {
        console.log('\n📊 VALIDATION SUMMARY');
        console.log('='.repeat(50));

        console.log(`✅ Successful replacements: ${validationResults.summary.successfulReplacements}/${validationResults.summary.totalEndpoints}`);
        console.log(`❌ Failed replacements: ${validationResults.summary.failedReplacements}/${validationResults.summary.totalEndpoints}`);
        console.log(`⚡ Average response time: ${validationResults.summary.avgResponseTime}ms`);
        console.log(`📁 Results saved to: ${files.validationFile}`);
        console.log(`📝 Recommendations saved to: ${files.recommendationsFile}`);

        if (recommendations.updates.length > 0) {
            console.log('\n🎯 TOP RECOMMENDED UPDATES:');
            recommendations.updates.slice(0, 5).forEach(update => {
                const priorityIcon = update.priority === 1 ? '🥇' : update.priority === 2 ? '🥈' : '🥉';
                console.log(`   ${priorityIcon} ${update.testName}:`);
                console.log(`     ${update.originalUrl}`);
                console.log(`     → ${update.recommendedUrl}`);
                console.log(`     (${update.service}, ${update.responseTime}ms)`);
            });
            if (recommendations.updates.length > 5) {
                console.log(`   ... and ${recommendations.updates.length - 5} more`);
            }
        }

        if (recommendations.removals.length > 0) {
            console.log('\n⚠️ ENDPOINTS TO REMOVE:');
            recommendations.removals.forEach(removal => {
                console.log(`   ${removal.testName}: ${removal.note}`);
            });
        }

        console.log('\n✨ Next Steps:');
        console.log('1. Review recommendations file for detailed update guidance');
        console.log('2. Apply updates to test-search-plus.mjs');
        console.log('3. Run updated tests to verify 451 error elimination');
    }
}

// Main execution
async function runValidation() {
    const validator = new HTTPInfrastructureValidator();

    try {
        // Run validation
        const validationResults = await validator.runValidation();

        // Generate recommendations
        const recommendations = validator.generateUpdateRecommendations(validationResults);

        // Save results
        const files = validator.saveResults(validationResults, recommendations);

        // Print summary
        validator.printSummary(validationResults, recommendations, files);

        console.log('\n🎉 HTTP Infrastructure Validation Complete!');

    } catch (error) {
        console.error('❌ Validation failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    runValidation();
}

module.exports = HTTPInfrastructureValidator;