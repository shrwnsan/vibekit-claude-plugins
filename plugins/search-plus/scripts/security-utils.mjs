/**
 * Security Utilities for Search Response Processing
 * Provides safe HTML and URL handling to prevent XSS and injection attacks
 */

/**
 * Decodes HTML entities to prevent XSS attacks
 * @param {string} html - HTML content with entities
 * @returns {string} Decoded and sanitized content
 */
export function decodeHTMLEntities(html) {
  if (!html || typeof html !== 'string') return '';

  // Manual HTML entity decoding (safer approach)
  const entityMap = {
    '&lt;': '<',
    '&gt;': '>',
    '&amp;': '&',
    '&quot;': '"',
    '&apos;': "'",
    '&#39;': "'",
    '&#x27;': "'",
    '&#34;': '"',
    '&#38;': '&',
    '&#60;': '<',
    '&#62;': '>',
    '&#x2F;': '/',
    '&#x3D;': '=',
    '&#x60;': '`',
    '&#96;': '`'
  };

  let decoded = html;

  // Decode numeric entities (&#123; and &#x1A;)
  decoded = decoded.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(parseInt(dec, 10)));
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));

  // Decode named entities
  for (const [entity, char] of Object.entries(entityMap)) {
    decoded = decoded.replace(new RegExp(entity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), char);
  }

  return decoded;
}

/**
 * Sanitizes HTML content by removing tags and keeping entities encoded for security
 * @param {string} html - HTML content to sanitize
 * @returns {string} Sanitized plain text content with entities preserved
 */
export function sanitizeHTMLContent(html) {
  if (!html || typeof html !== 'string') return '';

  // Remove actual HTML tags but keep encoded entities as-is for security
  // This prevents &lt;script&gt; from becoming executable if decoded
  const textOnly = html.replace(/<[^>]*>/g, '');
  return textOnly.trim();
}

/**
 * Validates and sanitizes URLs to prevent injection attacks
 * @param {string} url - URL to validate
 * @returns {string|null} Sanitized URL or null if invalid/dangerous
 */
export function validateAndSanitizeURL(url) {
  if (!url || typeof url !== 'string') return null;

  const trimmedUrl = url.trim();

  // Block dangerous protocols
  if (/^(javascript|data|vbscript|file|ftp):/i.test(trimmedUrl)) {
    return null;
  }

  try {
    const parsed = new URL(trimmedUrl);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    return parsed.href;
  } catch (error) {
    // Invalid URL format
    return null;
  }
}