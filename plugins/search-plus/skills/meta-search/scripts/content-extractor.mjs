// scripts/content-extractor.mjs
import { promises as dns } from 'dns';
import net from 'net';

/**
 * Enhanced Content Extractor with Service Selection Strategy
 *
 * Implements optimal fallback strategy based on comprehensive testing:
 * Primary: Tavily Extract API (100% success rate, 863ms avg) - FASTEST AND MOST RELIABLE
 * Fallback: Jina.ai Public Endpoint (75% success rate, 1,066ms avg) - Good for documentation
 * Optional: Jina.ai API (88% success rate, 2,331ms avg) - Slower, for cost tracking only
 */

// Archive fallback: Wayback Machine availability API (Google/Bing caches were shut down in 2024)
async function findWaybackSnapshot(url) {
  try {
    const response = await fetch(`https://archive.org/wayback/available?url=${encodeURIComponent(url)}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) {
      log(`⚠️ Wayback availability API unavailable (HTTP ${response.status}); skipping snapshot lookup`);
      return null;
    }
    const data = await response.json();
    const snapshotURL = data?.archived_snapshots?.closest?.available ? data.archived_snapshots.closest.url : null;
    if (!snapshotURL) {
      log(`⚠️ No Wayback snapshot available`);
    }
    return snapshotURL;
  } catch {
    // Network error, timeout, or unusable response body — an outage, not a missing snapshot
    log(`⚠️ Wayback availability API unavailable; skipping snapshot lookup`);
    return null;
  }
}

// Service configuration with fallback for backward compatibility
const TAVILY_API_KEY = process.env.SEARCH_PLUS_TAVILY_API_KEY || process.env.TAVILY_API_KEY || null;
const JINA_API_KEY = process.env.SEARCH_PLUS_JINA_API_KEY || process.env.JINA_API_KEY || null;
const FIRECRAWL_API_KEY = process.env.SEARCH_PLUS_FIRECRAWL_API_KEY || null;

// Show deprecation warning if using old variables
if (!process.env.SEARCH_PLUS_TAVILY_API_KEY && process.env.TAVILY_API_KEY) {
  console.warn('⚠️  TAVILY_API_KEY is deprecated. Please update to SEARCH_PLUS_TAVILY_API_KEY');
}
if (!process.env.SEARCH_PLUS_JINA_API_KEY && process.env.JINA_API_KEY) {
  console.warn('⚠️  JINA_API_KEY is deprecated. Please update to SEARCH_PLUS_JINA_API_KEY');
}
const TAVILY_EXTRACT_URL = 'https://api.tavily.com/extract';
const JINA_READER_PUBLIC_URL = 'https://r.jina.ai/';
const JINA_READER_API_URL = 'https://r.jina.ai/';

// Service configuration based on research findings
const SERVICES = {
  tavily: {
    name: 'Tavily Extract API',
    url: TAVILY_EXTRACT_URL,
    successRate: 100,
    avgResponseTime: 863,
    cost: 'paid',
    requiresAuth: true,
    bestFor: ['general', 'problematic_domains', 'financial', 'social_media', 'primary_choice']
  },
  jinaPublic: {
    name: 'Jina.ai Public Reader',
    url: JINA_READER_PUBLIC_URL,
    successRate: 75,
    avgResponseTime: 1066,
    cost: 'free',
    requiresAuth: false,
    bestFor: ['documentation', 'api_docs', 'technical_content']
  },
  jinaAPI: {
    name: 'Jina.ai API Reader',
    url: JINA_READER_API_URL,
    successRate: 88,
    avgResponseTime: 2331,
    cost: 'free',
    requiresAuth: true,
    bestFor: ['enhanced_metadata', 'reliability'] // 2.7x slower - provides detailed analytics
  }
};

/**
 * Determines if a URL is likely to be documentation-heavy
 * Based on research showing Jina.ai excels at documentation extraction
 */
function isDocumentationSite(url) {
  const docPatterns = [
    /docs?\./,
    /documentation/,
    /api.*docs/,
    /developer/,
    /reference/,
    /guide/,
    /tutorial/,
    /swagger/,
    /openapi/,
    /postman/,
    /readthedocs/,
    /gitbook/
  ];

  return docPatterns.some(pattern => pattern.test(url.toLowerCase()));
}

/**
 * Determines if a URL is likely to be problematic for direct access
 * Based on research showing Tavily handles these domains better
 */
function isProblematicDomain(url) {
  const problematicPatterns = [
    /reddit\.com/,
    /finance\.yahoo\.com/,
    /twitter\.com/,
    /facebook\.com/,
    /instagram\.com/,
    /linkedin\.com/,
    /medium\.com/,
    /news\./,
    /coingecko\.com/,
    /binance\.com/
  ];

  return problematicPatterns.some(pattern => pattern.test(url.toLowerCase()));
}

/**
 * Validates Tavily API key with a simple test call
 */
async function validateTavilyAPIKey() {
  if (!TAVILY_API_KEY) {
    return { valid: false, reason: 'API key not configured' };
  }

  try {
    const testResponse = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query: 'test',
        max_results: 1
      }),
      signal: AbortSignal.timeout(5000)
    });

    if (testResponse.status === 401 || testResponse.status === 403) {
      const errorData = await testResponse.json().catch(() => ({}));
      return {
        valid: false,
        reason: `Invalid API key: ${errorData.detail?.error || 'Unauthorized'}`
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      reason: `API key validation failed: ${error.message}`
    };
  }
}

/**
 * Extracts content using Tavily Extract API
 */
async function extractWithTavily(url, options = {}, timeoutMs = 15000) {
  const startTime = Date.now();

  if (!TAVILY_API_KEY) {
    throw new Error('Tavily API key not configured');
  }

  const requestBody = {
    api_key: TAVILY_API_KEY,
    urls: [url.trim()]
  };

  // Add optional parameters
  if (options.includeImages) requestBody.include_images = options.includeImages;
  if (options.extractDepth) requestBody.extract_depth = options.extractDepth;

  try {
    const response = await fetch(TAVILY_EXTRACT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(timeoutMs)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Tavily API error: ${response.status} - ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    const content = data.results && data.results[0] ?
                   data.results[0].content || data.results[0].raw_content :
                   '';

    return {
      success: true,
      content,
      contentLength: content.length,
      service: 'tavily',
      url,
      responseTime: Date.now() - startTime,
      metadata: {
        service: SERVICES.tavily,
        responseData: data,
        hasResults: data.results && data.results.length > 0,
        title: data.results && data.results[0] ? data.results[0].title : null
      }
    };

  } catch (error) {
    return {
      success: false,
      error: {
        code: extractErrorCode(error.message),
        message: error.message
      },
      service: 'tavily',
      url,
      responseTime: Date.now() - startTime,
      content: '',
      metadata: {
        service: SERVICES.tavily,
        errorType: error.name
      }
    };
  }
}

/**
 * Extracts content using Jina.ai Public Endpoint
 */
async function extractWithJinaPublic(url, options = {}, timeoutMs = 10000) {
  const startTime = Date.now();

  try {
    const jinaUrl = `${JINA_READER_PUBLIC_URL}${url}`;

    const response = await fetch(jinaUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Search-Plus-Content-Extractor/1.0)',
        ...options.headers
      },
      signal: AbortSignal.timeout(timeoutMs)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jina.ai Public error: ${response.status} - ${errorText}`);
    }

    const content = await response.text();

    return {
      success: true,
      content,
      contentLength: content.length,
      service: 'jinaPublic',
      url,
      responseTime: Date.now() - startTime,
      metadata: {
        service: SERVICES.jinaPublic,
        responseStatus: response.status,
        contentType: response.headers.get('content-type')
      }
    };

  } catch (error) {
    return {
      success: false,
      error: {
        code: extractErrorCode(error.message),
        message: error.message
      },
      service: 'jinaPublic',
      url,
      responseTime: Date.now() - startTime,
      content: '',
      metadata: {
        service: SERVICES.jinaPublic,
        errorType: error.name
      }
    };
  }
}

/**
 * Extracts content using Jina.ai API (provides enhanced metadata and reliability)
 */
async function extractWithJinaAPI(url, options = {}, timeoutMs = 10000) {
  const startTime = Date.now();

  if (!JINA_API_KEY) {
    throw new Error('Jina.ai API key not configured');
  }

  try {
    const response = await fetch(JINA_READER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${JINA_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers
      },
      body: JSON.stringify({
        url: url,
        ...options.jinaOptions
      }),
      signal: AbortSignal.timeout(timeoutMs)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jina.ai API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.data?.content || data.content || data.data || JSON.stringify(data);

    return {
      success: true,
      content,
      contentLength: content.length,
      service: 'jinaAPI',
      url,
      responseTime: Date.now() - startTime,
      metadata: {
        service: SERVICES.jinaAPI,
        responseData: data,
        tokenUsage: data.meta?.usage?.tokens || data.usage?.tokens,
        title: data.data?.title
      }
    };

  } catch (error) {
    return {
      success: false,
      error: {
        code: extractErrorCode(error.message),
        message: error.message
      },
      service: 'jinaAPI',
      url,
      responseTime: Date.now() - startTime,
      content: '',
      metadata: {
        service: SERVICES.jinaAPI,
        errorType: error.name
      }
    };
  }
}

/**
 * Keyless extractor: Firecrawl scrape (uses SEARCH_PLUS_FIRECRAWL_API_KEY when set,
 * otherwise Firecrawl's keyless tier, rate-limited per IP).
 */
async function extractWithFirecrawl(url, options = {}, timeoutMs = 20000) {
  const startTime = Date.now();
  try {
    const response = await fetch('https://api.firecrawl.dev/v2/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(FIRECRAWL_API_KEY ? { 'Authorization': `Bearer ${FIRECRAWL_API_KEY}` } : {})
      },
      body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: true }),
      signal: AbortSignal.timeout(timeoutMs)
    });
    if (!response.ok) {
      throw new Error(`Firecrawl error: ${response.status} - ${(await response.text()).slice(0, 200)}`);
    }
    const data = await response.json();
    const content = data.data?.markdown || '';
    return {
      success: true,
      content,
      contentLength: content.length,
      service: 'firecrawl',
      url,
      responseTime: Date.now() - startTime,
      metadata: { title: data.data?.metadata?.title || null }
    };
  } catch (error) {
    return {
      success: false,
      error: { code: extractErrorCode(error.message), message: error.message },
      service: 'firecrawl', url, responseTime: Date.now() - startTime, content: '', contentLength: 0, metadata: {}
    };
  }
}

/**
 * Keyless extractor: defuddle.md (independent of Jina/Firecrawl infrastructure)
 */
async function extractWithDefuddle(url, options = {}, timeoutMs = 20000) {
  const startTime = Date.now();
  try {
    const response = await fetch(`https://defuddle.md/${url}`, {
      headers: { 'Accept': 'text/markdown' },
      signal: AbortSignal.timeout(timeoutMs)
    });
    if (!response.ok) {
      throw new Error(`Defuddle error: ${response.status} - ${(await response.text()).slice(0, 200)}`);
    }
    const content = await response.text();
    return {
      success: true,
      content,
      contentLength: content.length,
      service: 'defuddle',
      url,
      responseTime: Date.now() - startTime,
      metadata: { title: content.match(/^title:\s*"?(.+?)"?\s*$/m)?.[1] || null }
    };
  } catch (error) {
    return {
      success: false,
      error: { code: extractErrorCode(error.message), message: error.message },
      service: 'defuddle', url, responseTime: Date.now() - startTime, content: '', contentLength: 0, metadata: {}
    };
  }
}

/**
 * Last-resort fallback: fetch the closest Wayback Machine snapshot via Defuddle
 */
async function tryUltraResilientFallbacks(url, originalOptions, results) {
  if (originalOptions.maxArchiveAttempts === 0) {
    return { success: false, result: results[results.length - 1] };
  }

  log(`🕐️ Looking up Wayback Machine snapshot...`);
  const snapshotURL = await findWaybackSnapshot(url);
  if (!snapshotURL) {
    return { success: false, result: results[results.length - 1] };
  }

  // r.jina.ai is blocked for web.archive.org until 2035 (Jina-side
  // AbuseAlleviationError), so Defuddle is the only viable snapshot extractor
  let archiveResult;
  for (const extractor of [extractWithDefuddle]) {
    archiveResult = await extractor(snapshotURL);
    results.push(archiveResult);
    if (archiveResult.success && archiveResult.contentLength > 100) {
      archiveResult.metadata.snapshotURL = snapshotURL;
      archiveResult.service = `wayback (via ${archiveResult.service})`;
      log(`✅ Wayback snapshot extraction successful`);
      return { success: true, result: archiveResult };
    }
  }

  log(`❌ Wayback snapshot extraction failed`);
  return { success: false, result: archiveResult };
}

/**
 * Extracts error code from error message for classification
 */
function extractErrorCode(errorMessage) {
  if (errorMessage.includes('403')) return '403';
  if (errorMessage.includes('429')) return '429';
  if (errorMessage.includes('451')) return '451';
  if (errorMessage.includes('400')) return '400';
  if (errorMessage.includes('404')) return '404';
  if (errorMessage.includes('timeout')) return 'TIMEOUT';
  if (errorMessage.includes('ECONNREFUSED')) return 'ECONNREFUSED';
  if (errorMessage.includes('incorrect header check')) return 'HEADER_CHECK';
  if (errorMessage.includes('SecurityCompromiseError')) return 'SECURITY_COMPROMISE';
  if (errorMessage.includes('Forbidden')) return 'FORBIDDEN';
  return 'UNKNOWN';
}

/**
 * Smart 404 Configuration System
 * Provides intelligent 404 handling with user-configurable modes
 */

// Mode presets for different 404 handling strategies
const MODE_PRESETS = {
  disabled: {
    enabled: false,
    archiveProbability: 0.0,
    maxArchiveAttempts: 0,
    description: 'Skip all archive attempts for 404 errors (fastest)'
  },
  conservative: {
    enabled: true,
    archiveProbability: 0.3,
    maxArchiveAttempts: 1,
    description: 'Try archives for 30% of 404s, high-value domains only'
  },
  normal: {
    enabled: true,
    archiveProbability: 0.7,
    maxArchiveAttempts: 2,
    description: 'Balanced approach for most use cases'
  },
  aggressive: {
    enabled: true,
    archiveProbability: 1.0,
    maxArchiveAttempts: 3,
    description: 'Try all archives for every 404 (maximum recovery)'
  }
};

/**
 * Creates 404 configuration from user options
 */
function create404Config(options = {}) {
  // Check environment variable first, then options, then default to normal mode
  let mode = process.env.SEARCH_PLUS_404_MODE || options.mode || 'normal';

  // Log if environment variable is being used
  if (process.env.SEARCH_PLUS_404_MODE) {
    log(`🌍 404 mode from environment variable: ${process.env.SEARCH_PLUS_404_MODE}`);
  }

  // Validate mode
  if (!MODE_PRESETS[mode]) {
    log(`⚠️ Invalid 404 mode "${mode}", falling back to "normal"`);
    mode = 'normal';
  }

  // Start with preset configuration
  let config = { ...MODE_PRESETS[mode] };

  // Override with specific options (power user customization)
  if (options.archiveProbability !== undefined) {
    config.archiveProbability = Math.max(0.0, Math.min(1.0, options.archiveProbability));
  }

  if (options.maxArchiveAttempts !== undefined) {
    config.maxArchiveAttempts = Math.max(0, Math.min(5, options.maxArchiveAttempts));
  }

  if (options.enabled !== undefined) {
    config.enabled = options.enabled;
  }

  // Add domain classifications
  config.highValueDomains = options.highValueDomains || [
    'docs.', 'documentation.', 'help.', 'support.',
    'news.', 'blog.', 'article.', 'research.',
    'wikipedia.', 'github.', 'stackoverflow.',
    'medium.', 'dev.to', 'hashnode.'
  ];

  config.lowValuePatterns = options.lowValuePatterns || [
    'api.', 'analytics.', 'ads.', 'tracking.',
    'cdn.', 'static.', 'assets.', 'temp-',
    'cache-', 'session-', 'token-'
  ];

  config.customRules = options.customRules || {};

  return config;
}

/**
 * Detects 404 status from URL patterns (when content extraction fails)
 */
function detect404FromURL(url) {
  if (!url || typeof url !== 'string') return {
    detected: false,
    patterns: [],
    source: 'url'
  };

  const urlLower = url.toLowerCase();

  // URL patterns that strongly indicate 404 status
  const urlPatterns = [
    '/status/404',
    '/error/404',
    '/404.html',
    '/not-found',
    '/page-not-found'
  ];

  const detectedPatterns = urlPatterns.filter(pattern => urlLower.includes(pattern));

  return {
    detected: detectedPatterns.length > 0,
    patterns: detectedPatterns,
    source: 'url',
    confidence: detectedPatterns.length > 0 ? 0.8 : 0.0
  };
}

/**
 * Detects if content contains 404 error patterns
 * Now used for intelligent decision-making instead of blocking
 */
function detect404Error(content) {
  if (!content || typeof content !== 'string') return {
    detected: false,
    patterns: []
  };

  const contentLower = content.toLowerCase();

  // 404 indicator patterns
  const patterns404 = [
    '404: not found',
    'error 404: not found',
    'this page can\'t be found',
    'page not found',
    'lost in space',
    'the page you\'re seeking might no longer exist',
    'target url returned error 404',
    'http 404',
    'status: 404',
    'this httpbin.org page can\'t be found'
  ];

  const detectedPatterns = [];

  // Check for 404 patterns
  for (const pattern of patterns404) {
    if (contentLower.includes(pattern)) {
      detectedPatterns.push(pattern);
    }
  }

  return {
    detected: detectedPatterns.length > 0,
    patterns: detectedPatterns,
    confidence: Math.min(detectedPatterns.length / 3, 1.0)
  };
}

/**
 * Determines if a URL should get archive recovery attempts
 */
function shouldTryArchives(url, detectionResult, config) {
  // Quick disable checks
  if (!config.enabled) return false;
  if (!detectionResult.detected) return true; // Not a 404, always try

  // Probability check
  if (Math.random() > config.archiveProbability) return false;

  // High-value domain check (always try for these)
  if (isHighValueDomain(url, config)) return true;

  // Low-value pattern check (skip these unless aggressive mode)
  if (isLowValueContent(url, config) && config.archiveProbability < 1.0) return false;

  // Custom rules check
  for (const [domain, rule] of Object.entries(config.customRules)) {
    if (url.includes(domain)) {
      return rule === 'always' || (rule === 'try' && Math.random() < 0.5);
    }
  }

  return true;
}

/**
 * Checks if URL is from a high-value domain that deserves archive recovery
 */
function isHighValueDomain(url, config) {
  const urlLower = url.toLowerCase();
  return config.highValueDomains.some(domain => urlLower.includes(domain));
}

/**
 * Checks if URL is low-value content that doesn't need archive recovery
 */
function isLowValueContent(url, config) {
  const urlLower = url.toLowerCase();
  return config.lowValuePatterns.some(pattern => urlLower.includes(pattern));
}

/**
 * Validates if extracted content is meaningful or just service error pages
 */
export function validateMeaningfulContent(content, source = 'unknown') {
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return {
      isMeaningful: false,
      reason: 'empty_content',
      source
    };
  }

  const contentLower = content.toLowerCase();

  // Patterns that indicate non-meaningful content (error pages, "no results" pages, etc.)
  // Note: provider frontmatter keys ("Title:", "URL Source:", "Markdown Content:")
  // are deliberately NOT patterns — every successful Jina Reader extraction
  // embeds them, so matching them would reject all Jina output.
  const uselessPatterns = [
    // Google Cache/Search error patterns (caches shut down 2024; kept for
    // cached-page remnants that still circulate)
    'did not match any documents',
    'no cached version available',
    'accessibility links',
    'google apps',
    'your search -',
    'suggestions:',
    'make sure all words are spelled correctly',
    'footer links',

    // Jina.ai error patterns
    'jina ai reader',
    'failed to extract content',
    'extraction failed',
    'unable to access',
    'error 404',
    'error 403',
    'error 429',
    'error 451',
    'timeouterror',
    'navigation timeout',

    // Generic error patterns
    'page not found',
    'access denied',
    'forbidden',
    'rate limit',
    'service unavailable',
    'connection refused',

    // Parked-domain spam (squatting pages extracted as if they were content)
    'buy this domain',
    'this domain is for sale',

    // Cache/archive service error patterns
    'this page is not available',
    'cached page',
    'webcache.googleusercontent.com'
  ];

  // Wayback chrome appears in EVERY snapshot (Defuddle output embeds the
  // "The Wayback Machine - ..." banner), so the archive patterns are failure
  // signals only for non-wayback sources.
  const patterns = source.startsWith('wayback')
    ? uselessPatterns
    : [...uselessPatterns, 'wayback machine', 'archive.org'];

  // Check for useless patterns
  for (const pattern of patterns) {
    if (contentLower.includes(pattern)) {
      return {
        isMeaningful: false,
        reason: 'useless_pattern_detected',
        pattern: pattern,
        source
      };
    }
  }

  // Check for extremely short content (likely error pages)
  const contentLength = content.trim().length;
  if (contentLength < 100) {
    return {
      isMeaningful: false,
      reason: 'content_too_short',
      length: contentLength,
      source
    };
  }

  // Check for content that's mostly HTML/structure without meaningful text
  const textContent = content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  if (textContent.length < 50) {
    return {
      isMeaningful: false,
      reason: 'insufficient_text_content',
      textLength: textContent.length,
      source
    };
  }

  // Check for repetitive content (indicates error pages or broken extraction)
  const words = textContent.split(' ').filter(w => w.length > 3);
  const uniqueWords = new Set(words);
  if (words.length > 10 && uniqueWords.size / words.length < 0.3) {
    return {
      isMeaningful: false,
      reason: 'repetitive_content',
      uniqueWordsRatio: uniqueWords.size / words.length,
      source
    };
  }

  return {
    isMeaningful: true,
    reason: 'meaningful_content_detected',
    contentLength: contentLength,
    textLength: textContent.length,
    source
  };
}

/**
 * Determines the fallback level based on service used and number of attempts
 */
function determineFallbackLevel(service, totalAttempts) {
  if (service === 'tavily') return 'primary';
  if (service === 'jinaPublic') return 'secondary';
  if (service === 'jinaAPI') return 'tertiary';
  if (totalAttempts > 4) return 'ultra_resilient';
  return 'unknown';
}

/**
 * Determines the extraction strategy used
 */
function determineStrategy(isDoc, useEnhancedMetadata) {
  if (useEnhancedMetadata) return 'tavily_first_enhanced_metadata';
  if (isDoc) return 'tavily_first_optimal_fallback';
  return 'tavily_first_default';
}

/**
 * Checks if an IP address is in a private or reserved range.
 * @param {string} ip - The IP address to check.
 * @returns {boolean} - True if the IP is private, false otherwise.
 */
function isPrivateIP(ip) {
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(part => parseInt(part, 10));
    // 127.0.0.0/8 - Loopback
    if (parts[0] === 127) return true;
    // 10.0.0.0/8 - Private
    if (parts[0] === 10) return true;
    // 172.16.0.0/12 - Private
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16 - Private
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 169.254.0.0/16 - Link-local (includes AWS metadata service)
    if (parts[0] === 169 && parts[1] === 254) return true;
  }
  // No IPv6 checks for now as per requirements, but can be added.
  return false;
}

/**
 * Validates and normalizes malformed URLs before extraction
 */
async function validateAndNormalizeURL(url) {
  const issues = [];
  let normalizedURL = url;

  // Check for double protocol issues
  if (url.includes('http://https://') || url.includes('https://http://')) {
    issues.push('double_protocol');
    // Fix double protocol
    normalizedURL = url.replace(/https?:\/\/https?:\/\//, 'https://');
  }

  // Check for spaces in URL (common issue from "textise dot iitty")
  if (url.includes(' dot ') || url.includes(' ')) {
    issues.push('spaces_in_domain');
    // Try to fix common patterns
    normalizedURL = normalizedURL.replace(/ dot /g, '.').replace(/\s+/g, '');
  }

  // Check for malformed Jina AI URLs
  if (url.includes('r.jina.ai/http://') && !url.includes('r.jina.ai/http://https://')) {
    issues.push('malformed_jina_url');
    // This is actually the correct pattern for Jina AI
  }

  // Basic URL validation and SSRF Protection
  let parsedURL;
  try {
    parsedURL = new URL(normalizedURL);
  } catch (error) {
    issues.push('invalid_url_format');
    return {
      valid: false,
      issues,
      error: `Invalid URL format: ${error.message}`,
      originalURL: url,
      normalizedURL: null
    };
  }

  // SSRF Protection Step 1: Protocol check
  if (parsedURL.protocol !== 'http:' && parsedURL.protocol !== 'https:') {
    issues.push('invalid_protocol');
    return {
        valid: false,
        issues,
        error: `SSRF attack detected: Invalid protocol '${parsedURL.protocol}'. Only HTTP and HTTPS are allowed.`,
        originalURL: url,
        normalizedURL
    };
  }

  const { hostname } = parsedURL;

  // SSRF Protection Step 2: Hostname check
  if (hostname === 'localhost' || hostname.endsWith('.local')) {
      issues.push('forbidden_hostname');
      return {
          valid: false,
          issues,
          error: `SSRF attack detected: Hostname '${hostname}' is forbidden.`,
          originalURL: url,
          normalizedURL
      };
  }

  // Reserved test domains (RFC 2606) never host real content; reject by host
  // before DNS so the gate does not depend on the network
  if (/(^|\.)example\.(com|net|org)$/i.test(hostname)) {
      issues.push('suspicious_domain_pattern');
      return {
          valid: false,
          issues,
          error: `URL rejected: '${hostname}' is a reserved test domain (example.com/net/org). Provide a real URL to extract.`,
          originalURL: url,
          normalizedURL
      };
  }

  // SSRF Protection Step 3: Resolve hostname to IP and check
  let ipAddress;
  if (net.isIP(hostname)) {
      ipAddress = hostname;
  } else {
      try {
          const { address } = await dns.lookup(hostname);
          ipAddress = address;
      } catch (error) {
          issues.push('dns_lookup_failed');
          return {
              valid: false,
              issues,
              error: `DNS lookup failed for hostname: ${hostname}. ${error.message}`,
              originalURL: url,
              normalizedURL: null
          };
      }
  }

  if (isPrivateIP(ipAddress)) {
      issues.push('private_ip_detected');
      return {
          valid: false,
          issues,
          error: `SSRF attack detected: IP address ${ipAddress} is in a forbidden range.`,
          originalURL: url,
          normalizedURL
      };
  }


  // Check for obviously problematic domains that would cause API failures
  const problematicPatterns = [
    /textise dot iitty/i,
    /textise\.iitty/i,  // The normalized version is still invalid
    /example dot com/i,
    /example\.com$/i,  // Generic example domain
    /test dot /i,
    /\.com\.[a-z]/i,  // Likely malformed TLD
    /r\.jina\.ai\/http:\/\/[^/]*\.[a-z]{2,}\/?$/i  // Jina AI with obviously fake domain
  ];

  for (const pattern of problematicPatterns) {
    if (pattern.test(normalizedURL)) {
      issues.push('suspicious_domain_pattern');
      break;
    }
  }

  // If we have suspicious patterns that can't be trusted, mark as invalid
  if (issues.includes('suspicious_domain_pattern')) {
    return {
      valid: false,
      issues,
      error: `Unfixable URL issues: suspicious or test domain detected`,
      originalURL: url,
      normalizedURL: null
    };
  }

  // If we have issues but can normalize, return the fixed version
  if (issues.length > 0 && normalizedURL !== url) {
    return {
      valid: true,
      issues,
      originalURL: url,
      normalizedURL,
      hasFixes: true,
      message: `URL normalized: ${issues.join(', ')}`
    };
  }

  // If we have issues that can't be automatically fixed
  if (issues.length > 0) {
    return {
      valid: false,
      issues,
      error: `Unfixable URL issues: ${issues.join(', ')}`,
      originalURL: url,
      normalizedURL: null
    };
  }

  // URL is valid
  return {
    valid: true,
    issues: [],
    originalURL: url,
    normalizedURL: url,
    hasFixes: false
  };
}

/**
 * Performs comprehensive service health check
 */
async function performServiceHealthCheck() {
  const healthStatus = {
    tavily: { available: false, error: null },
    jinaPublic: { available: false, error: null },
    jinaAPI: { available: false, error: null }
  };

  // Check Tavily API
  const tavilyValidation = await validateTavilyAPIKey();
  healthStatus.tavily.available = tavilyValidation.valid;
  healthStatus.tavily.error = tavilyValidation.reason;

  // Check Jina Public
  try {
    const jinaTest = await fetch('https://r.jina.ai/http://example.com', {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    healthStatus.jinaPublic.available = jinaTest.ok;
    if (!jinaTest.ok) {
      healthStatus.jinaPublic.error = `HTTP ${jinaTest.status}`;
    }
  } catch (error) {
    healthStatus.jinaPublic.error = error.message;
  }

  // Check Jina API (if key is available)
  if (JINA_API_KEY) {
    try {
      const jinaAPITest = await fetch('https://r.jina.ai/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${JINA_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: 'http://example.com' }),
        signal: AbortSignal.timeout(5000)
      });
      healthStatus.jinaAPI.available = jinaAPITest.ok;
      if (!jinaAPITest.ok) {
        healthStatus.jinaAPI.error = `HTTP ${jinaAPITest.status}`;
      }
    } catch (error) {
      healthStatus.jinaAPI.error = error.message;
    }
  } else {
    healthStatus.jinaAPI.available = false;
    healthStatus.jinaAPI.error = 'API key not configured';
  }

  return healthStatus;
}

/**
 * Enhanced content extraction with optimal service selection strategy
 *
 * Strategy based on comprehensive research:
 * 1. Always start with Tavily (100% success rate, 863ms fastest) - PRIMARY CHOICE
 * 2. Documentation sites: Tavily First → Jina Public Fallback (better content for docs)
 * 3. Cost tracking: Tavily First → Jina API Fallback (only for token tracking)
 */
export async function extractContent(url, options = {}) {
  const startTime = Date.now();
  const results = [];

  // Perform service health check at the start
  // Opt-in only: the health check spends a Tavily credit and Jina tokens on every call
  if (options.performHealthCheck === true) {
    log(`🔍 Performing service health check...`);
    const healthStatus = await performServiceHealthCheck();

    log(`📊 Service Health Status:`);
    log(`   Tavily: ${healthStatus.tavily.available ? '✅ Available' : '❌ Unavailable - ' + healthStatus.tavily.error}`);
    log(`   Jina Public: ${healthStatus.jinaPublic.available ? '✅ Available' : '❌ Unavailable - ' + healthStatus.jinaPublic.error}`);
    log(`   Jina API: ${healthStatus.jinaAPI.available ? '✅ Available' : '❌ Unavailable - ' + healthStatus.jinaAPI.error}`);

    // If no services are available, fail early
    if (!healthStatus.tavily.available && !healthStatus.jinaPublic.available && !healthStatus.jinaAPI.available) {
      return {
        success: false,
        error: { code: 'ALL_SERVICES_DOWN', message: 'All extraction services are unavailable' },
        content: '',
        contentLength: 0,
        service: 'none',
        url,
        responseTime: Date.now() - startTime,
        totalAttempts: 0,
        totalResponseTime: Date.now() - startTime,
        healthStatus,
        metadata: {
          extractionStrategy: 'all_services_failed',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  // Initialize 404 configuration for smart handling
  const config404 = create404Config(options.config404 || { mode: 'normal' });
  log(`🎯 404 Handling: ${config404.description}`);

  // Pre-validate and normalize URL before extraction
  const urlValidation = await validateAndNormalizeURL(url);
  let extractionURL = url;

  if (!urlValidation.valid) {
    log(`❌ URL validation failed: ${urlValidation.error}`);
    return {
      success: false,
      error: {
        code: 'INVALID_URL',
        message: urlValidation.error,
        issues: urlValidation.issues
      },
      content: '',
      contentLength: 0,
      service: 'validation',
      url,
      responseTime: Date.now() - startTime,
      totalAttempts: 0,
      totalResponseTime: Date.now() - startTime,
      metadata: {
        extractionStrategy: 'url_validation_failed',
        timestamp: new Date().toISOString(),
        originalURL: urlValidation.originalURL,
        validationIssues: urlValidation.issues
      }
    };
  }

  if (urlValidation.hasFixes) {
    log(`🔧 URL normalized: ${urlValidation.message}`);
    log(`   Original: ${urlValidation.originalURL}`);
    log(`   Normalized: ${urlValidation.normalizedURL}`);
    extractionURL = urlValidation.normalizedURL;
  }

  // Determine optimal strategy based on URL characteristics
  const isDoc = isDocumentationSite(extractionURL);
  const isProblematic = isProblematicDomain(extractionURL);
  const useEnhancedMetadata = options.enhancedMetadata || options.highVolume;

  log(`🎯 Extracting content from: ${extractionURL}`);
  if (extractionURL !== url) {
    log(`   (Original URL: ${url})`);
  }
  log(`   URL Type: ${isDoc ? 'Documentation site' : isProblematic ? 'Problematic domain' : 'General URL'}`);
  log(`   Enhanced Metadata: ${useEnhancedMetadata ? 'enabled' : 'disabled'}`);

  let result;

  // Strategy 1: Always start with Tavily (research shows it's fastest and most reliable)
  log(`🚀 Using Tavily first...`);
  try {
    result = await extractWithTavily(extractionURL, options);
    results.push(result);
  } catch (error) {
    result = {
      success: false,
      error: { code: 'EXCEPTION', message: error.message },
      service: 'tavily',
      url: extractionURL,
      originalURL: url,
      responseTime: Date.now() - startTime,
      content: '',
      contentLength: 0
    };
    results.push(result);
    log(`❌ Tavily extraction failed with exception: ${error.message}`);
  }

  // Determine fallback service based on specific needs and service availability
  let fallbackService = 'jinaPublic'; // Default fallback
  let fallbackReason = 'default';

  if (useEnhancedMetadata && JINA_API_KEY) {
    fallbackService = 'jinaAPI';
    fallbackReason = 'enhanced metadata requested';
  } else if (isDoc) {
    fallbackService = 'jinaPublic';
    fallbackReason = 'documentation site';
  }

  // Enhanced fallback logic with better error detection
  const needsFallback = !result.success ||
                       result.error?.code === '401' ||  // Invalid API key
                       result.error?.code === '403' ||  // Forbidden
                       result.error?.code === '429' ||  // Rate limited
                       result.error?.code === 'EXCEPTION' || // Exception occurred
                       (result.contentLength === 0 && !options.skipEmptyFallback) ||
                       (useEnhancedMetadata && !result.success);

  if (needsFallback) {
    log(`⚠️ Tavily failed or returned empty, trying ${fallbackService} (${fallbackReason})...`);
    log(`   Failure reason: ${result.error?.code || result.error?.message || 'Empty content'}`);

    let fallbackResult;
    try {
      if (fallbackService === 'jinaAPI' && JINA_API_KEY) {
        fallbackResult = await extractWithJinaAPI(extractionURL, options);
      } else {
        fallbackResult = await extractWithJinaPublic(extractionURL, options);
      }
      results.push(fallbackResult);

      // Use fallback if it succeeded
      if (fallbackResult.success && (fallbackResult.contentLength > 0 || useEnhancedMetadata)) {
        result = fallbackResult;
        log(`✅ Fallback to ${fallbackService} successful`);

        // Smart 404 detection for logging and metrics
        const detection404 = detect404Error(result.content);
        if (detection404.detected) {
          log(`🔍 404 patterns detected: ${detection404.patterns.join(', ')}`);
          result.fallback404Detection = detection404;
        }
      } else {
        log(`❌ Fallback to ${fallbackService} failed: ${fallbackResult.error?.message || 'Empty content'}`);
      }
    } catch (error) {
      log(`❌ Fallback to ${fallbackService} failed with exception: ${error.message}`);
      fallbackResult = {
        success: false,
        error: { code: 'EXCEPTION', message: error.message },
        service: fallbackService,
        url: extractionURL,
        originalURL: url,
        responseTime: Date.now() - startTime,
        content: '',
        contentLength: 0
      };
      results.push(fallbackResult);
    }
  }

  // Final fallback if needed (try the remaining service)
  if ((!result.success || result.contentLength === 0) && !useEnhancedMetadata && JINA_API_KEY) {
    const finalService = fallbackService === 'jinaPublic' ? 'jinaAPI' : 'jinaPublic';
    log(`🔄 Final fallback to ${finalService}...`);

    try {
      const finalFallback = finalService === 'jinaAPI' ?
        await extractWithJinaAPI(extractionURL, options) :
        await extractWithJinaPublic(extractionURL, options);

      results.push(finalFallback);

      if (finalFallback.success && finalFallback.contentLength > 0) {
        result = finalFallback;
        log(`✅ Final fallback to ${finalService} successful`);

        // Smart 404 detection for logging and metrics
        const detection404 = detect404Error(result.content);
        if (detection404.detected) {
          log(`🔍 404 patterns detected: ${detection404.patterns.join(', ')}`);
          result.finalFallback404Detection = detection404;
        }
      } else {
        log(`❌ Final fallback to ${finalService} failed`);
      }
    } catch (error) {
      log(`❌ Final fallback to ${finalService} failed with exception: ${error.message}`);
      results.push({
        success: false,
        error: { code: 'EXCEPTION', message: error.message },
        service: finalService,
        url: extractionURL,
        originalURL: url,
        responseTime: Date.now() - startTime,
        content: '',
        contentLength: 0
      });
    }
  }

  // Keyless fallbacks on independent infrastructure: Firecrawl, then Defuddle
  for (const [name, extractor] of [['firecrawl', extractWithFirecrawl], ['defuddle', extractWithDefuddle]]) {
    if (result.success && result.contentLength > 0) break;
    log(`🔄 Trying ${name}...`);
    const freeResult = await extractor(extractionURL, options);
    results.push(freeResult);
    if (freeResult.success && freeResult.contentLength > 0) {
      result = freeResult;
      log(`✅ ${name} extraction successful`);
    } else {
      log(`❌ ${name} failed: ${freeResult.error?.message || 'Empty content'}`);
    }
  }

  // Ultra-resilient fallback: Try pattern-based alternative approaches if all standard services failed
  // Use smart 404 configuration to decide whether to attempt recovery
  if (!result.success || result.contentLength === 0) {
    // Get the best 404 detection result we have
    let detection404 = result.fallback404Detection || result.finalFallback404Detection || { detected: false };

    // If no content-based detection worked, try URL-based detection
    if (!detection404.detected) {
      detection404 = detect404FromURL(extractionURL);
    }

    // Determine if we should try archive recovery
    const shouldTry = shouldTryArchives(extractionURL, detection404, config404);

    if (shouldTry) {
      log(`🚨 Trying ultra-resilient fallbacks with 404 configuration...`);
      log(`   404 detected: ${detection404.detected} (source: ${detection404.source || 'content'}), Archive probability: ${config404.archiveProbability}`);

      // Pass 404 config to the ultra-resilient fallback system
      const ultraResilientOptions = {
        ...options,
        config404,
        maxArchiveAttempts: config404.maxArchiveAttempts
      };

      const ultraResilientResult = await tryUltraResilientFallbacks(extractionURL, ultraResilientOptions, results);
      if (ultraResilientResult.success) {
        result = ultraResilientResult.result;
        log(`✅ Ultra-resilient fallback successful via ${ultraResilientResult.result.service}`);
      } else {
        log(`❌ Ultra-resilient fallbacks also failed`);
      }
    } else {
      if (detection404.detected) {
        log(`⏭️ Skipping ultra-resilient fallbacks (404 detected, configuration: ${config404.mode})`);
      } else {
        log(`⏭️ Skipping ultra-resilient fallbacks (disabled by configuration)`);
      }
    }
  }

  const totalTime = Date.now() - startTime;

  // Return the successful result or the last attempted result
  // But only consider it successful if at least one service actually worked
  const hasAnySuccessfulService = results.some(r => r.success && (r.contentLength > 0 || useEnhancedMetadata));
  const successfulResult = hasAnySuccessfulService ?
    results.find(r => r.success && (r.contentLength > 0 || useEnhancedMetadata)) :
    result;

  // Validate if the content is actually meaningful
  const contentValidation = validateMeaningfulContent(successfulResult.content, successfulResult.service);

  // Detect 404 patterns for metrics and intelligent handling
  const detection404 = detect404Error(successfulResult.content);

  // Determine honest success metrics
  const technicalSuccess = successfulResult.success && successfulResult.contentLength > 0;
  const meaningfulSuccess = technicalSuccess && contentValidation.isMeaningful;
  const fallbackLevel = determineFallbackLevel(successfulResult.service, results.length);

  // Log content validation results for debugging
  if (technicalSuccess && !meaningfulSuccess) {
    log(`⚠️ Technical success but content validation failed:`);
    log(`   Reason: ${contentValidation.reason}${contentValidation.pattern ? ` (${contentValidation.pattern})` : ''}`);
    log(`   Source: ${contentValidation.source}`);
  } else if (meaningfulSuccess) {
    log(`✅ Meaningful content extracted successfully (${contentValidation.contentLength} chars)`);
  }

  const finalResult = {
    ...successfulResult,
    // Legacy success field (for backwards compatibility)
    success: hasAnySuccessfulService,

    // Enhanced success reporting
    technicalSuccess,
    meaningfulSuccess,
    contentValidation,
    fallbackLevel,

    totalAttempts: results.length,
    totalResponseTime: totalTime,
    strategy: {
      isDocumentationSite: isDoc,
      isProblematicDomain: isProblematic,
      enhancedMetadataEnabled: useEnhancedMetadata,
      primaryService: 'tavily', // ALWAYS Tavily first
      fallbackService,
      fallbackReason
    },
    allResults: results,
    metadata: {
      ...successfulResult.metadata,
      extractionStrategy: 'tavily_first_optimal_fallback',
      timestamp: new Date().toISOString(),
      totalTokensUsed: results.reduce((sum, r) => sum + (r.metadata?.tokenUsage || 0), 0),
      urlValidation: {
        originalURL: url,
        normalizedURL: extractionURL,
        wasNormalized: urlValidation.hasFixes,
        validationIssues: urlValidation.issues,
        validationMessage: urlValidation.message
      },
      allServicesFailed: !hasAnySuccessfulService,
      ultraResilientAttempts: results.length > 3 ? results.length - 3 : 0,
      attemptedServices: results.map(r => r.service),
      successfulService: hasAnySuccessfulService ? results.find(r => r.success && (r.contentLength > 0 || useEnhancedMetadata))?.service : null,
      // New meaningful content metrics
      honestSuccessMetrics: {
        technicalSuccess,
        meaningfulSuccess,
        fallbackLevel,
        contentQuality: contentValidation.isMeaningful ? 'meaningful' : 'useless',
        contentIssues: contentValidation.isMeaningful ? null : {
          reason: contentValidation.reason,
          pattern: contentValidation.pattern,
          source: contentValidation.source
        },
        // 404 handling metrics
        handling404: {
          detected404: detection404?.detected || false,
          fourOFourPatterns: (detection404 && detection404.patterns) ? detection404.patterns : [],
          fourOFourConfidence: detection404?.confidence || 0,
          attemptedArchives: shouldTryArchives(extractionURL, detection404 || { detected: false }, config404),
          archiveMode: config404.mode,
          archiveProbability: config404.archiveProbability,
          maxArchiveAttempts: config404.maxArchiveAttempts,
          isHighValueDomain: isHighValueDomain(extractionURL, config404),
          isLowValueContent: isLowValueContent(extractionURL, config404)
        }
      }
    }
  };

  // If all services failed, add appropriate error information
  if (!hasAnySuccessfulService) {
    finalResult.error = {
      code: 'ALL_SERVICES_FAILED',
      message: 'All extraction services failed to retrieve content',
      attempts: results.length,
      serviceResults: results.map(r => ({ service: r.service, success: r.success, error: r.error?.code })),
      ultraResilientAttempts: results.length > 3 ? results.length - 3 : 0
    };
  }

  return finalResult;
}

/**
 * Performs a search using the Tavily API with enhanced error handling
 * @param {Object} params - Search parameters
 * @param {number} timeoutMs - Request timeout in milliseconds
 * @returns {Object} Search results
 */
export const tavily = {
  search: async function tavilySearch(params, timeoutMs = 15000) {
    const startTime = Date.now();

    if (!TAVILY_API_KEY) {
    throw new Error('Tavily API key not configured');
  }

  // Construct the request payload
  const requestBody = {
    api_key: TAVILY_API_KEY,
    query: params.query,
    max_results: params.maxResults || 5,
    include_answer: params.includeAnswer !== false, // Default to true
    include_raw_content: params.includeRawContent || false,
    num_days: params.numDays || 30, // Look back 30 days by default
  };

  // Add headers if provided
  const headers = {
    'Content-Type': 'application/json',
    ...params.headers
  };

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(timeoutMs)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Tavily API error: ${response.status} - ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    return data;

  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    } else if (error.code === 'ECONNREFUSED') {
      throw new Error(`Connection refused when trying to reach Tavily API: ${error.message}`);
    } else {
      throw error;
    }
  }
  }
};

/**
 * Simple logging function (can be replaced with proper logging)
 */
function log(message) {
  console.log(`[ContentExtractor] ${message}`);
}

/**
 * Batch content extraction for multiple URLs
 */
export async function extractContentBatch(urls, options = {}) {
  const results = [];
  const concurrency = options.concurrency || 3;

  log(`📦 Batch extracting ${urls.length} URLs with concurrency ${concurrency}`);

  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchPromises = batch.map(url => extractContent(url, options));

    const batchResults = await Promise.allSettled(batchPromises);

    batchResults.forEach((result, index) => {
      const url = batch[index];
      if (result.status === 'fulfilled') {
        results.push({ url, ...result.value });
      } else {
        results.push({
          url,
          success: false,
          error: { code: 'BATCH_ERROR', message: result.reason.message },
          content: '',
          contentLength: 0,
          service: 'batch_failed'
        });
      }
    });

    // Small delay between batches to be respectful to rate limits
    if (i + concurrency < urls.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  const successCount = results.filter(r => r.success && (r.contentLength > 0 || options.enhancedMetadata)).length;
  log(`✅ Batch extraction complete: ${successCount}/${urls.length} successful`);

  return {
    results,
    summary: {
      total: urls.length,
      successful: successCount,
      failed: urls.length - successCount,
      successRate: Math.round((successCount / urls.length) * 100)
    }
  };
}

export default {
  extractContent,
  extractContentBatch,
  tavily,
  SERVICES,
  isDocumentationSite,
  isProblematicDomain
};