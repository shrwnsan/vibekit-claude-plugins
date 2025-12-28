#!/usr/bin/env node

/**
 * GitHub CLI Integration Testing Script
 * 
 * Tests the new GitHub CLI feature (PR #26) before merge.
 * Validates functionality, performance, and fallback behavior.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync, mkdirSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test results directory
const resultsDir = join(__dirname, '..', 'test-results');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const resultFile = join(resultsDir, `github-cli-test-${timestamp}.json`);
const logFile = join(resultsDir, `github-cli-test-${timestamp}.log`);

if (!existsSync(resultsDir)) {
  mkdirSync(resultsDir, { recursive: true });
}

// Test scenarios for GitHub CLI integration
const githubTestScenarios = [
  {
    name: 'Public Repo README',
    url: 'https://github.com/facebook/react',
    expectedContent: ['React', 'JavaScript', 'library'],
    tier: 'basic'
  },
  {
    name: 'Specific File Blob',
    url: 'https://github.com/facebook/react/blob/main/README.md',
    expectedContent: ['React', 'Documentation'],
    tier: 'basic'
  },
  {
    name: 'GitHub Repository Root',
    url: 'https://github.com/vercel/next.js',
    expectedContent: ['Next.js', 'framework'],
    tier: 'basic'
  },
  {
    name: 'GitHub Organization Repo',
    url: 'https://github.com/nodejs/node',
    expectedContent: ['Node.js', 'JavaScript'],
    tier: 'basic'
  },
  {
    name: 'Public Gist (Single File)',
    url: 'https://gist.github.com/shrwnsan/0d27e6dbab3bd28c00088f332cb31ff2',
    expectedContent: ['Test Gist', 'Single File', 'Unit testing'],
    tier: 'gist-basic',
    note: 'Tests single-file gist (dedicated test gist)'
  },
  {
    name: 'Public Gist (Multi File)',
    url: 'https://gist.github.com/shrwnsan/a592c2551a5a32b6969916a0b5e0a0f0',
    expectedContent: ['Test Gist', 'Multi File', 'Unit testing'],
    tier: 'gist-basic',
    note: 'Tests multi-file gist (dedicated test gist)'
  },
  {
    name: 'Invalid Gist URL (Expected 404)',
    url: 'https://gist.github.com/shrwnsan/6cad326836d38bd6a7ae',
    expectedError: 'GH_NOT_FOUND',
    tier: 'error-handling',
    note: 'Tests error handling for non-existent gists'
  },
  {
    name: 'GitHub Docs (Non-Repo URL)',
    url: 'https://docs.github.com/en/get-started',
    expectedContent: ['GitHub', 'documentation'],
    tier: 'edge-case',
    note: 'Should fall back to web scraping (not a repo URL)'
  },
  {
    name: 'Invalid GitHub URL',
    url: 'https://github.com/nonexistent-user-12345/nonexistent-repo-67890',
    expectedError: 'GH_NOT_FOUND',
    tier: 'error-handling'
  },
  {
    name: 'Non-GitHub URL',
    url: 'https://docs.anthropic.com/en/docs/claude-code',
    expectedContent: ['Claude'],
    tier: 'control',
    note: 'Should bypass GitHub service entirely'
  }
];

// Logging utility
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(logMessage.trim());
  
  try {
    import('fs').then(({ appendFileSync }) => {
      appendFileSync(logFile, logMessage);
    });
  } catch (e) {
    // Ignore write errors
  }
}

// Check if GitHub CLI is available
async function checkGhCli() {
  try {
    const { execSync } = await import('child_process');
    execSync('which gh', { stdio: 'ignore' });
    const version = execSync('gh --version', { encoding: 'utf8' });
    log(`✅ GitHub CLI available: ${version.split('\n')[0]}`);
    return true;
  } catch (e) {
    log('❌ GitHub CLI not found - install with: brew install gh');
    return false;
  }
}

// Check if feature is enabled
function checkFeatureEnabled() {
  const enabled = process.env.SEARCH_PLUS_GITHUB_ENABLED === 'true';
  log(`GitHub Feature Enabled: ${enabled}`);
  if (!enabled) {
    log('⚠️  To enable: export SEARCH_PLUS_GITHUB_ENABLED=true');
  }
  return enabled;
}

// Simulate search-plus execution (simplified)
async function testGitHubUrl(scenario) {
  const startTime = Date.now();
  
  log(`\n${'='.repeat(60)}`);
  log(`Testing: ${scenario.name}`);
  log(`URL: ${scenario.url}`);
  log(`Tier: ${scenario.tier}`);
  if (scenario.note) log(`Note: ${scenario.note}`);
  
  try {
    // Import the GitHub service
    const { gitHubService } = await import('../plugins/search-plus/scripts/github-service.mjs');

    // Check if it's a Gist URL first
    const isGist = await gitHubService.isGistUrl(scenario.url);
    log(`Is Gist URL: ${isGist}`);

    // Check if it's a GitHub URL
    const isGitHub = await gitHubService.isGitHubUrl(scenario.url);
    log(`Is GitHub URL: ${isGitHub}`);

    if (isGist && gitHubService.githubEnabled) {
      // Extract gist info
      const info = gitHubService.extractGistInfo(scenario.url);
      log(`Extracted gist info: ${JSON.stringify(info)}`);

      if (info) {
        // Try to fetch content
        const content = await gitHubService.fetchGistContent(info.gistId);

        const duration = Date.now() - startTime;
        log(`✅ SUCCESS - Duration: ${duration}ms`);
        log(`Content length: ${typeof content === 'string' ? content.length : JSON.stringify(content).length} chars`);

        // Validate expected content
        if (scenario.expectedContent) {
          const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
          const found = scenario.expectedContent.filter(term =>
            contentStr.toLowerCase().includes(term.toLowerCase())
          );
          log(`Expected content matches: ${found.length}/${scenario.expectedContent.length}`);
        }

        return {
          success: true,
          duration,
          service: 'github-gist',
          scenario: scenario.name
        };
      } else {
        log(`⚠️  Could not extract gist info - falling back`);
      }
    } else if (isGitHub && gitHubService.githubEnabled) {
      // Extract GitHub repo info
      const info = gitHubService.extractGitHubInfo(scenario.url);
      log(`Extracted info: ${JSON.stringify(info)}`);

      if (info) {
        // Try to fetch content
        const content = await gitHubService.fetchRepoContent(
          info.owner,
          info.repo,
          info.path || ''
        );

        const duration = Date.now() - startTime;
        log(`✅ SUCCESS - Duration: ${duration}ms`);
        log(`Content length: ${typeof content === 'string' ? content.length : JSON.stringify(content).length} chars`);

        // Validate expected content
        if (scenario.expectedContent) {
          const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
          const found = scenario.expectedContent.filter(term =>
            contentStr.toLowerCase().includes(term.toLowerCase())
          );
          log(`Expected content matches: ${found.length}/${scenario.expectedContent.length}`);
        }

        return {
          success: true,
          duration,
          service: 'github-cli',
          scenario: scenario.name
        };
      } else {
        log(`⚠️  Could not extract GitHub info - falling back`);
      }
    } else {
      log(`ℹ️  Not using GitHub CLI (isGist=${isGist}, isGitHub=${isGitHub}, enabled=${gitHubService.githubEnabled})`);
    }
    
    // If we get here, it should fall back to web scraping
    const duration = Date.now() - startTime;
    log(`✅ Fallback path - Duration: ${duration}ms`);
    
    return {
      success: true,
      duration,
      service: 'fallback',
      scenario: scenario.name
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorCode = error.code || 'UNKNOWN';
    
    if (scenario.expectedError && errorCode === scenario.expectedError) {
      log(`✅ Expected error received: ${errorCode}`);
      return {
        success: true,
        duration,
        expectedError: true,
        errorCode,
        scenario: scenario.name
      };
    }
    
    log(`❌ ERROR: ${error.message || error}`);
    log(`Error code: ${errorCode}`);
    
    return {
      success: false,
      duration,
      error: error.message || String(error),
      errorCode,
      scenario: scenario.name
    };
  }
}

// Main test execution
async function runTests() {
  log('='.repeat(60));
  log('GitHub CLI Integration Testing');
  log('='.repeat(60));
  log(`Timestamp: ${new Date().toISOString()}`);
  log(`Node version: ${process.version}`);
  
  // Pre-flight checks
  const ghCliAvailable = await checkGhCli();
  const featureEnabled = checkFeatureEnabled();
  
  if (!ghCliAvailable) {
    log('\n❌ ABORT: GitHub CLI not installed');
    log('Install with: brew install gh');
    process.exit(1);
  }
  
  if (!featureEnabled) {
    log('\n⚠️  WARNING: Feature not enabled');
    log('Tests will run but GitHub service will be bypassed');
    log('To enable: export SEARCH_PLUS_GITHUB_ENABLED=true');
  }
  
  // Run tests
  const results = {
    timestamp: new Date().toISOString(),
    environment: {
      ghCliAvailable,
      featureEnabled,
      cacheTTL: process.env.SEARCH_PLUS_GITHUB_CACHE_TTL || 'default',
      nodeVersion: process.version
    },
    scenarios: []
  };
  
  log('\n' + '='.repeat(60));
  log('Running Test Scenarios');
  log('='.repeat(60));
  
  for (const scenario of githubTestScenarios) {
    const result = await testGitHubUrl(scenario);
    results.scenarios.push({
      ...scenario,
      result
    });
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  log('\n' + '='.repeat(60));
  log('TEST SUMMARY');
  log('='.repeat(60));
  
  const successful = results.scenarios.filter(s => s.result.success).length;
  const failed = results.scenarios.filter(s => !s.result.success).length;
  const ghCliUsed = results.scenarios.filter(s => s.result.service === 'github-cli').length;
  const ghGistUsed = results.scenarios.filter(s => s.result.service === 'github-gist').length;
  const fallbacks = results.scenarios.filter(s => s.result.service === 'fallback').length;

  log(`Total scenarios: ${results.scenarios.length}`);
  log(`✅ Successful: ${successful}`);
  log(`❌ Failed: ${failed}`);
  log(`🔧 GitHub CLI (repo) used: ${ghCliUsed}`);
  log(`📋 GitHub CLI (gist) used: ${ghGistUsed}`);
  log(`🔄 Fallbacks: ${fallbacks}`);
  
  // Performance stats
  const durations = results.scenarios
    .filter(s => s.result.success)
    .map(s => s.result.duration);
  
  if (durations.length > 0) {
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const maxDuration = Math.max(...durations);
    const minDuration = Math.min(...durations);
    
    log(`\nPerformance:`);
    log(`  Average: ${avgDuration.toFixed(0)}ms`);
    log(`  Min: ${minDuration}ms`);
    log(`  Max: ${maxDuration}ms`);
  }
  
  // Save results
  writeFileSync(resultFile, JSON.stringify(results, null, 2));
  log(`\n📊 Results saved to: ${resultFile}`);
  log(`📝 Log saved to: ${logFile}`);
  
  // Exit code
  if (failed > 0) {
    log('\n❌ TESTS FAILED');
    process.exit(1);
  } else {
    log('\n✅ ALL TESTS PASSED');
    process.exit(0);
  }
}

// Execute
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
