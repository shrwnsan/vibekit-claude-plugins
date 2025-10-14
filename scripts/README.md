# Marketplace Testing Suite

This directory contains testing infrastructure for all plugins in the Claude Code marketplace repository.

## Structure

```
scripts/
├── test-search-plus.mjs     # Search-plus plugin tests (54 test cases)
├── test-[plugin-name].mjs   # Future plugin tests
├── run-all-tests.mjs        # Master test runner
└── README.md               # This file
```

## Usage

### Run All Plugin Tests
```bash
node scripts/run-all-tests.mjs
```

### Run Specific Plugin Tests
```bash
# Run search-plus tests
node scripts/test-search-plus.mjs

# Alternative using master runner
node scripts/run-all-tests.mjs search-plus
```

### Discover Available Tests
```bash
ls scripts/test-*.mjs
```

## Test Coverage

### Search-Plus Plugin (54 test cases)
- **URL Detection**: 28 test cases including historical problematic URLs, standardized httpbin.org endpoints, documentation sites, API endpoints
- **Error Handling**: Retry logic validation for 403, 429, ECONNREFUSED, ETIMEDOUT errors
- **Header Rotation**: User-Agent diversity and header manipulation verification
- **Flow Tracing**: Complete request flow visualization with detailed logging
- **Content Extraction**: Real-world URL extraction scenarios

### Historical vs Standardized Test URLs

#### Historical URLs (Real Problem Scenarios)
These URLs represent actual problems the search-plus plugin solved during evaluation:
- **Foundation Center**: Platform rebranding from foundationcenter.org to Candid.org (403 → successful alternative discovery)
- **Research Professional**: Institutional access barriers and SSO redirection (403 → status confirmed)
- **ResearchGrantMatcher**: Complete platform shutdown and domain expiration (ECONNREFUSED → correctly diagnosed)
- **Pivot COS**: Domain migration to Clarivate infrastructure (ECONNREFUSED → alternative access found)

#### Standardized URLs (Reliable Testing)
- **httpbin.org endpoints**: Guaranteed error responses for consistent testing
- **Practice sites**: quotes.toscrape.com, books.toscrape.com for web scraping validation
- **Documentation sites**: MDN, Anthropic docs, Node.js docs for realistic content extraction
- **API endpoints**: GitHub API, JSONPlaceholder for API vs content detection

### Test Results Reference
Based on evaluation document findings:
- **403 Forbidden**: 80% success rate with header manipulation and retry logic
- **429 Rate Limit**: 90% success rate with exponential backoff
- **ECONNREFUSED**: 50% success rate (depends on temporary vs permanent issues)
- **NXDOMAIN**: 100% successful diagnosis of permanent failures

## Adding New Plugin Tests

### Naming Convention
Follow the pattern: `test-{plugin-name}.mjs`

Example:
- Plugin: `awesome-tool/` → Test file: `test-awesome-tool.mjs`

### Test Template
```javascript
#!/usr/bin/env node

// Test template for new plugins
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const hooksDir = join(__dirname, 'plugins', 'your-plugin-name', 'hooks');

// Test results tracking
let testsPassed = 0;
let testsTotal = 0;

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

// Your test functions here...

// Main test runner
async function runTests() {
  console.log('🚀 Your Plugin Test Suite');
  console.log('='.repeat(50));

  // Add your tests here...

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results Summary');
  console.log(`✅ Passed: ${testsPassed}/${testsTotal}`);
  console.log(`❌ Failed: ${testsTotal - testsPassed}/${testsTotal}`);

  if (testsPassed === testsTotal) {
    console.log('🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('💥 Some tests failed!');
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}
```

## Continuous Integration

The master test runner (`run-all-tests.mjs`) is designed for:
- **Local Development**: Quick validation of all plugin changes
- **CI/CD Pipelines**: Automated testing in GitHub Actions or similar
- **Pre-commit Validation**: Ensuring plugin quality before distribution

## Output Examples

### Successful Test Run
```
🚀 Marketplace Test Suite - All Plugins
============================================================
📋 Found 1 test file(s):
  - test-search-plus.mjs

🧪 Running test-search-plus.mjs...
============================================================
🚀 Search-Plus Plugin Test Suite
==================================================
...
✅ test-search-plus.mjs completed in 1234ms

============================================================
📊 Overall Test Results Summary
✅ Passed: 1/1 test files
❌ Failed: 0/1 test files
🎉 All tests passed!
```

## Best Practices

1. **Descriptive Test Names**: Use clear, specific test descriptions
2. **Consistent Assertions**: Use the provided `assert()` helper
3. **Error Scenarios**: Test both success and failure cases
4. **Real-World Data**: Use actual URLs and scenarios from your plugin evaluation
5. **Flow Tracing**: Include detailed logging for debugging
6. **Isolation**: Tests should not depend on external services when possible
7. **Historical Context**: Include URLs that represent real problems your plugin solved

## Troubleshooting

### Test Discovery Issues
- Ensure test files follow the `test-*.mjs` naming pattern
- Check file permissions: `chmod +x scripts/test-*.mjs`

### Path Resolution
- Test files should use relative paths to plugin hooks
- Use the provided template for consistent path handling

### Import Errors
- Verify Node.js version supports ES modules (Node 14+)
- Check that all imports use `.mjs` extension or proper package.json configuration