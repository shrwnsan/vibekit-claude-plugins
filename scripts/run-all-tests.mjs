#!/usr/bin/env node

// Master test runner for all plugins in the marketplace
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdir } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function discoverTestFiles() {
  const scriptsDir = __dirname;
  const files = await readdir(scriptsDir);

  // Find all test-*.mjs files
  const testFiles = files
    .filter(file => file.startsWith('test-') && file.endsWith('.mjs'))
    .sort(); // Sort for consistent execution order

  return testFiles;
}

async function runTestFile(testFile) {
  console.log(`\n🧪 Running ${testFile}...`);
  console.log('='.repeat(60));

  try {
    const startTime = Date.now();
    const { default: testModule } = await import(join(__dirname, testFile));

    // If the test file exports a run function, use it
    if (typeof testModule === 'function') {
      await testModule();
    }

    const duration = Date.now() - startTime;
    console.log(`✅ ${testFile} completed in ${duration}ms`);
    return { success: true, duration, file: testFile };

  } catch (error) {
    console.error(`❌ ${testFile} failed:`);
    console.error(error.message);
    return { success: false, error: error.message, file: testFile };
  }
}

async function runAllTests() {
  console.log('🚀 Marketplace Test Suite - All Plugins');
  console.log(`⏰ Started at ${new Date().toLocaleString()}`);
  console.log('='.repeat(60));

  const testFiles = await discoverTestFiles();

  if (testFiles.length === 0) {
    console.log('⚠️ No test files found in scripts/ directory');
    console.log('Looking for files matching pattern: test-*.mjs');
    return;
  }

  console.log(`📋 Found ${testFiles.length} test file(s):`);
  testFiles.forEach(file => console.log(`  - ${file}`));
  console.log('');

  const results = [];
  let totalPassed = 0;
  let totalFailed = 0;

  for (const testFile of testFiles) {
    const result = await runTestFile(testFile);
    results.push(result);

    if (result.success) {
      totalPassed++;
    } else {
      totalFailed++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Overall Test Results Summary');
  console.log(`✅ Passed: ${totalPassed}/${testFiles.length} test files`);

  if (totalFailed > 0) {
    console.log(`❌ Failed: ${totalFailed} test files`);
    console.log('\n❌ Failed Tests:');
    results
      .filter(r => !r.success)
      .forEach(r => console.log(`  - ${r.file}: ${r.error}`));
    console.log(`\n🏁 Total duration: ${results.reduce((sum, r) => sum + (r.duration || 0), 0)}ms`);
    console.log('💥 Some tests failed!');
    process.exit(1);
  } else {
    console.log(`\n🏁 Total duration: ${results.reduce((sum, r) => sum + (r.duration || 0), 0)}ms`);
    console.log('🎉 All tests passed!');
    process.exit(0);
  }
}

// Run specific test if provided as argument
const specificTest = process.argv[2];
if (specificTest) {
  const testFile = specificTest.startsWith('test-') ? specificTest : `test-${specificTest}`;
  const fullTestPath = join(__dirname, `${testFile}.mjs`);

  try {
    await import(fullTestPath);
    console.log(`✅ ${testFile} completed successfully`);
  } catch (error) {
    console.error(`❌ ${testFile} failed:`, error.message);
    process.exit(1);
  }
} else {
  // Run all tests by default
  runAllTests().catch(console.error);
}