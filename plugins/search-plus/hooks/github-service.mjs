// plugins/search-plus/hooks/github-service.mjs
import { execFile } from 'child_process';
import { promisify } from 'util';

export const __internal = {
    execAsync: promisify(execFile)
};

// Configuration from environment variables
const GITHUB_ENABLED = process.env.SEARCH_PLUS_GITHUB_ENABLED === 'true';
const CACHE_TTL = parseInt(process.env.SEARCH_PLUS_GITHUB_CACHE_TTL || '300', 10) * 1000; // In milliseconds

class GitHubRateLimiter {
    async fetchCurrentLimits() {
        try {
            const { stdout } = await __internal.execAsync('gh', ['api', 'rate_limit']);
            const data = JSON.parse(stdout);
            return {
                core: {
                    limit: data.resources.core.limit,
                    remaining: data.resources.core.remaining,
                    reset: data.resources.core.reset,
                },
                search: {
                    limit: data.resources.search.limit,
                    remaining: data.resources.search.remaining,
                    reset: data.resources.search.reset,
                },
            };
        } catch (error) {
            console.error('Failed to fetch GitHub rate limits:', error);
            return null;
        }
    }

    async checkLimits() {
        const limits = await this.fetchCurrentLimits();
        if (!limits) return false;
        return limits.core.remaining > 10 && limits.search.remaining > 2;
    }
}

class GitHubService {
    constructor() {
        this.rateLimiter = new GitHubRateLimiter();
        this.cache = new Map();
        this.githubEnabled = GITHUB_ENABLED;
    }

    async isGitHubUrl(url) {
        try {
            const urlObject = new URL(url);
            return urlObject.hostname === 'github.com';
        } catch (error) {
            return false;
        }
    }

    extractGitHubInfo(url) {
        if (!this.isGitHubUrl(url)) {
            return null;
        }
        const pathParts = new URL(url).pathname.split('/').filter(Boolean);
        if (pathParts.length < 2) {
            return null;
        }
        const [owner, repo, type, branch, ...filePathParts] = pathParts;
        const path = filePathParts.join('/');

        if (type !== 'blob' && type !== 'tree') {
            return { owner, repo, type: 'repo', path: '' }; // It's a repo URL
        }

        return { owner, repo, type, branch, path };
    }

    async getCached(key) {
        const cached = this.cache.get(key);
        if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    setCache(key, data) {
        this.cache.set(key, { data, timestamp: Date.now() });
    }

    async fetchRepoContent(owner, repo, path) {
        const cacheKey = `content:${owner}/${repo}/${path}`;
        const cachedContent = await this.getCached(cacheKey);
        if (cachedContent) {
            console.log(`[GitHub Service] Cache hit for ${cacheKey}`);
            return cachedContent;
        }

        if (this.githubEnabled && !await this.rateLimiter.checkLimits()) {
            throw new Error('GitHub rate limit check failed or limits are low.');
        }

        console.log(`[GitHub Service] Fetching content for ${owner}/${repo}/${path}`);
        const apiPath = `repos/${owner}/${repo}/contents/${path}`;
        try {
            const { stdout } = await __internal.execAsync('gh', ['api', apiPath]);
            const response = JSON.parse(stdout);

            if (response.encoding === 'base64') {
                const content = Buffer.from(response.content, 'base64').toString('utf-8');
                this.setCache(cacheKey, content);
                return content;
            }
            // For directory listings or other content types
            this.setCache(cacheKey, response);
            return response;

        } catch (error) {
            console.error(`[GitHub Service] Failed to fetch content from ${owner}/${repo}/${path}:`, error);
            throw error;
        }
    }
}

export const gitHubService = new GitHubService();
