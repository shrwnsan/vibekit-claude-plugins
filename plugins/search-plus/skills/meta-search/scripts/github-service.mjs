// plugins/search-plus/hooks/github-service.mjs
import { execFile } from 'child_process';
import { promisify } from 'util';

export const __internal = {
    execAsync: promisify(execFile)
};

function validateGitHubConfig() {
    const enabled = process.env.SEARCH_PLUS_GITHUB_ENABLED === 'true';
    let cacheTTL = parseInt(process.env.SEARCH_PLUS_GITHUB_CACHE_TTL || '300', 10) * 1000;

    if (isNaN(cacheTTL) || cacheTTL < 0 || cacheTTL > 86400000) { // Max 24 hours
        console.warn(`Invalid SEARCH_PLUS_GITHUB_CACHE_TTL provided. Using default 300s.`);
        cacheTTL = 300000;
    }
    return { enabled, cacheTTL };
}

const { enabled: GITHUB_ENABLED, cacheTTL: CACHE_TTL } = validateGitHubConfig();

export class GitHubRateLimiter {
    constructor() {
        this.limits = {
            core: { remaining: 0, reset: 0 },
        };
        this.initializationPromise = this.initialize();
    }

    async initialize() {
        try {
            const { stdout } = await __internal.execAsync('gh', ['api', 'rate_limit']);
            const data = JSON.parse(stdout);
            this.limits.core.remaining = data.resources.core.remaining;
            this.limits.core.reset = data.resources.core.reset;
        } catch (error) {
            console.error('Failed to initialize GitHub rate limits:', error);
            this.limits.core.remaining = 100; // Conservative default
            this.limits.core.reset = Math.floor(Date.now() / 1000) + 3600; // Reset in 1 hour
        }
    }

    updateLimitsFromHeaders(headers) {
        if (headers['x-ratelimit-remaining']) {
            this.limits.core.remaining = parseInt(headers['x-ratelimit-remaining'], 10);
        }
        if (headers['x-ratelimit-reset']) {
            this.limits.core.reset = parseInt(headers['x-ratelimit-reset'], 10);
        }
    }

    async checkLimits() {
        await this.initializationPromise;
        const now = Math.floor(Date.now() / 1000);
        if (now > this.limits.core.reset) {
            await this.initialize();
        }
        return this.limits.core.remaining > 10;
    }
}

class GitHubService {
    constructor() {
        this.rateLimiter = new GitHubRateLimiter();
        this.cache = new Map();
        this.githubEnabled = GITHUB_ENABLED;
    }

    /**
     * Checks if a given URL is a GitHub URL.
     * @param {string} url The URL to check.
     * @returns {boolean} True if the URL is a GitHub URL, false otherwise.
     */
    async isGitHubUrl(url) {
        try {
            const urlObject = new URL(url);
            return urlObject.hostname === 'github.com';
        } catch (error) {
            return false;
        }
    }

    /**
     * Checks if a given URL is a GitHub Gist URL.
     * @param {string} url The URL to check.
     * @returns {boolean} True if the URL is a gist.github.com URL, false otherwise.
     */
    async isGistUrl(url) {
        try {
            const urlObject = new URL(url);
            return urlObject.hostname === 'gist.github.com';
        } catch (error) {
            return false;
        }
    }

    /**
     * Extracts repository information from a GitHub URL.
     * @param {string} url The GitHub URL to parse.
     * @returns {object|null} An object containing the owner, repo, type, branch, and path, or null if the URL is invalid.
     */
    extractGitHubInfo(url) {
        try {
            const parsedUrl = new URL(url);
            if (parsedUrl.hostname !== 'github.com') {
                return null;
            }

            const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
            if (pathParts.length < 2) {
                return null;
            }

            const [owner, repo, type, branch, ...filePathParts] = pathParts;
            const path = filePathParts.join('/');

            // Validate owner and repo to prevent command injection
            if (!/^[a-zA-Z0-9._-]+$/.test(owner) || !/^[a-zA-Z0-9._-]+$/.test(repo)) {
                console.error(`Invalid owner or repo format: ${owner}/${repo}`);
                return null;
            }

            const pathSegments = path.split('/');
            if (pathSegments.includes('..')) {
                console.error(`Invalid path format: contains '..' segments.`);
                return null;
            }

            if (type !== 'blob' && type !== 'tree' && type) { // type can be undefined for base repo URLs
                return null;
            }

            return { owner, repo, type: type || 'repo', branch, path };
        } catch (error) {
            return null;
        }
    }

    /**
     * Extracts gist information from a gist.github.com URL.
     * @param {string} url The gist URL to parse.
     * @returns {object|null} An object containing the owner and gistId, or null if the URL is invalid.
     */
    extractGistInfo(url) {
        try {
            const parsedUrl = new URL(url);
            if (parsedUrl.hostname !== 'gist.github.com') {
                return null;
            }

            const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
            if (pathParts.length < 2) {
                return null;
            }

            const [owner, gistId, ...rest] = pathParts;

            // Validate owner and gistId to prevent command injection
            // Gist IDs can be: numeric (old gists), 32-char hex (newer gists), or variable length
            if (!/^[a-zA-Z0-9_.-]+$/.test(owner) || !/^[a-zA-Z0-9]{8,}$/.test(gistId)) {
                console.error(`Invalid owner or gistId format: ${owner}/${gistId}`);
                return null;
            }

            // Check for revision URLs (we don't need the revision for fetching the latest content)
            // https://gist.github.com/{owner}/{gist_id}/revision/{revision}
            const hasRevision = rest.length >= 2 && rest[0] === 'revision';

            return { owner, gistId, hasRevision };
        } catch (error) {
            return null;
        }
    }

    /**
     * Retrieves cached content for a given key if it exists and is not expired.
     * @param {string} key The cache key.
     * @returns {any|null} The cached data or null if not found or expired.
     */
    async getCached(key) {
        const cached = this.cache.get(key);
        if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    /**
     * Sets a value in the cache with the current timestamp.
     * @param {string} key The cache key.
     * @param {any} data The data to cache.
     */
    setCache(key, data) {
        this.cache.set(key, { data, timestamp: Date.now() });
    }

    /**
     * Fetches content from a GitHub repository using the gh CLI.
     * @param {string} owner The repository owner.
     * @param {string} repo The repository name.
     * @param {string} path The path to the file or directory.
     * @param {number} timeout The timeout in milliseconds.
     * @returns {Promise<string|object>} The file content or directory listing.
     * @throws {Error} If the gh CLI command fails.
     */
    async fetchRepoContent(owner, repo, path, timeout = 5000) {
        const cacheKey = `content:${owner}/${repo}/${path}`;
        const cachedContent = await this.getCached(cacheKey);
        if (cachedContent) {
            this.emitMetric('github_fetch_cache_hit', 1);
            console.log(`[GitHub Service] Cache hit for ${cacheKey}`);
            return cachedContent;
        }
        this.emitMetric('github_fetch_cache_miss', 1);

        const startTime = Date.now();
        let success = false;
        try {
            if (this.githubEnabled) {
                if (!await this.rateLimiter.checkLimits()) {
                    throw new Error('GitHub rate limit check failed or limits are low.');
                }
            }

            console.log(`[GitHub Service] Fetching content for ${owner}/${repo}/${path}`);
            const apiPath = `repos/${owner}/${repo}/contents/${path}`;
            const { stdout } = await Promise.race([
                __internal.execAsync('gh', ['api', '--include', apiPath]),
                new Promise((_, reject) => setTimeout(() => reject(new Error('GH_TIMEOUT')), timeout))
            ]);

            const { headers, body } = this.parseGhResponse(stdout);
            this.rateLimiter.updateLimitsFromHeaders(headers);

            const response = JSON.parse(body);

            if (response.encoding === 'base64') {
                const content = Buffer.from(response.content, 'base64').toString('utf-8');
                this.setCache(cacheKey, content);
                success = true;
                return content;
            }
            // For directory listings or other content types
            this.setCache(cacheKey, response);
            success = true;
            return response;

        } catch (error) {
            console.error(`[GitHub Service] Failed to fetch content from ${owner}/${repo}/${path}:`, error);
            throw this.normalizeGitHubError(error);
        } finally {
            this.emitMetric('github_fetch_duration_ms', Date.now() - startTime, { success });
        }
    }

    /**
     * Fetches content from a GitHub Gist using the gh CLI.
     * @param {string} gistId The gist ID.
     * @param {number} timeout The timeout in milliseconds.
     * @returns {Promise<string>} The combined content of all files in the gist.
     * @throws {Error} If the gh CLI command fails.
     */
    async fetchGistContent(gistId, timeout = 5000) {
        const cacheKey = `gist:${gistId}`;
        const cachedContent = await this.getCached(cacheKey);
        if (cachedContent) {
            this.emitMetric('gist_fetch_cache_hit', 1);
            console.log(`[GitHub Service] Cache hit for gist ${gistId}`);
            return cachedContent;
        }
        this.emitMetric('gist_fetch_cache_miss', 1);

        const startTime = Date.now();
        let success = false;
        try {
            if (this.githubEnabled) {
                if (!await this.rateLimiter.checkLimits()) {
                    throw new Error('GitHub rate limit check failed or limits are low.');
                }
            }

            console.log(`[GitHub Service] Fetching gist ${gistId}`);
            const apiPath = `gists/${gistId}`;
            const { stdout } = await Promise.race([
                __internal.execAsync('gh', ['api', '--include', apiPath]),
                new Promise((_, reject) => setTimeout(() => reject(new Error('GH_TIMEOUT')), timeout))
            ]);

            const { headers, body } = this.parseGhResponse(stdout);
            this.rateLimiter.updateLimitsFromHeaders(headers);

            const response = JSON.parse(body);

            // Gists have a 'files' object with file entries
            if (response.files) {
                const fileNames = Object.keys(response.files);
                if (fileNames.length === 0) {
                    throw new Error('Gist has no files');
                }

                // Combine all files into a single string with file headers
                let combinedContent = '';
                for (const fileName of fileNames) {
                    const file = response.files[fileName];
                    if (file.content) {
                        combinedContent += `// File: ${fileName}\n`;
                        combinedContent += `${file.content}\n\n`;
                    } else if (file.raw_url) {
                        // If content is not directly available, we'd need to fetch raw_url
                        // For now, note this limitation
                        combinedContent += `// File: ${fileName} (content not available via API)\n`;
                    }
                }

                this.setCache(cacheKey, combinedContent);
                success = true;
                return combinedContent.trim();
            }

            throw new Error('Gist response has no files');
        } catch (error) {
            console.error(`[GitHub Service] Failed to fetch gist ${gistId}:`, error);
            throw this.normalizeGitHubError(error);
        } finally {
            this.emitMetric('gist_fetch_duration_ms', Date.now() - startTime, { success });
        }
    }

    normalizeGitHubError(error) {
        const errorMessage = error.message.toLowerCase();
        const stderr = error.stderr ? error.stderr.toLowerCase() : '';

        let errorCode = 'GH_UNKNOWN_ERROR';
        if (errorMessage.includes('gh_timeout')) {
            errorCode = 'GH_TIMEOUT';
        } else if (errorMessage.includes('enoent') || errorMessage.includes('command not found')) {
            errorCode = 'GH_NOT_INSTALLED';
        } else if (errorMessage.includes('rate limit check failed')) {
            errorCode = 'GH_RATE_LIMITED';
        } else if (stderr.includes('not found')) {
            errorCode = 'GH_NOT_FOUND';
        } else if (stderr.includes('authentication required') || stderr.includes('bad credentials')) {
            errorCode = 'GH_AUTH_FAILED';
        }

        this.emitMetric('github_fetch_error', 1, { error_code: errorCode });
        return { code: errorCode, message: error.message };
    }

    parseGhResponse(stdout) {
        if (!stdout.includes('\r\n\r\n')) {
            return { headers: {}, body: stdout };
        }
        const [headerPart, bodyPart] = stdout.split('\r\n\r\n');
        const headers = {};
        const headerLines = headerPart.split('\r\n');
        headerLines.slice(1).forEach(line => {
            const [key, value] = line.split(': ');
            if (key && value) {
                headers[key.toLowerCase()] = value;
            }
        });
        if (!bodyPart) {
            throw new Error('Invalid response: missing body');
        }
        return { headers, body: bodyPart };
    }

    emitMetric(name, value, tags = {}) {
        const timestamp = new Date().toISOString();
        const tagString = Object.entries(tags)
            .map(([k, v]) => `${k}=${v}`)
            .join(',');

        console.log(`[METRIC] ${timestamp} ${name}=${value} ${tagString}`);
    }
}

export const gitHubService = new GitHubService();
