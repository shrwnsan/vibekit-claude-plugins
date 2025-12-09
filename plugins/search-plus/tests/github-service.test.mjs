// plugins/search-plus/tests/github-service.test.mjs
import assert from 'assert';

// Mock execAsync before importing the service
import * as gitHubServiceModule from '../hooks/github-service.mjs';
const { __internal, GitHubRateLimiter } = gitHubServiceModule;

const originalExecAsync = __internal.execAsync;
let execShouldThrow = null;
let rateLimitRemaining = 5000;
let rateLimitReset = Math.floor(Date.now() / 1000) + 3600;

__internal.execAsync = async (command, args) => {
    if (execShouldThrow) {
        if (execShouldThrow.timeout) {
            await new Promise(resolve => setTimeout(resolve, execShouldThrow.timeout));
            throw new Error('GH_TIMEOUT');
        }
        const error = new Error(execShouldThrow.message);
        error.stderr = execShouldThrow.stderr || '';
        error.code = execShouldThrow.code || '';
        throw error;
    }

    if (command === 'gh' && args.includes('rate_limit')) {
        return {
            stdout: JSON.stringify({
                resources: {
                    core: { remaining: rateLimitRemaining, reset: rateLimitReset },
                },
            }),
        };
    }

    const responseBody = JSON.stringify({
        name: 'test-file.txt',
        path: 'test-file.txt',
        content: Buffer.from('Hello from GitHub!').toString('base64'),
        encoding: 'base64',
    });

    const headers = [
        'HTTP/2 200',
        `x-ratelimit-remaining: ${--rateLimitRemaining}`,
        `x-ratelimit-reset: ${rateLimitReset}`,
    ].join('\r\n');

    return { stdout: `${headers}\r\n\r\n${responseBody}` };
};

// Now import the service
const { gitHubService } = gitHubServiceModule;


async function runTests() {
    console.log('Running GitHub Service Tests...');
    gitHubService.githubEnabled = true;

    // Test 1: Initialization and reset
    console.log('Test 1: Rate limiter initialization and reset');
    rateLimitRemaining = 5000;
    rateLimitReset = Math.floor(Date.now() / 1000) - 1; // Expired
    await gitHubService.rateLimiter.checkLimits();
    assert.strictEqual(gitHubService.rateLimiter.limits.core.remaining, 5000);
    console.log('✅ Passed');

    // Test 2: Base repo URL
    console.log('Test 2: Base repo URL');
    const info = gitHubService.extractGitHubInfo('https://github.com/owner/repo');
    assert.deepStrictEqual(info, { owner: 'owner', repo: 'repo', type: 'repo', path: '' });
    console.log('✅ Passed');

    // Test 3: gh not installed during init
    console.log('Test 3: gh not installed during init');
    execShouldThrow = { message: 'enoent', code: 'ENOENT' };
    const newRateLimiter = new GitHubRateLimiter();
    await newRateLimiter.initializationPromise;
    assert.strictEqual(newRateLimiter.limits.core.remaining, 0);
    execShouldThrow = null;
    console.log('✅ Passed');

    // Restore
    __internal.execAsync = originalExecAsync;
    console.log('All tests passed!');
}

runTests().catch(err => {
    console.error('Tests failed:', err);
    process.exit(1);
});
