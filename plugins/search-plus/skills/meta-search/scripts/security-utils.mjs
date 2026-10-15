/**
 * Security Utilities for Search Response Processing
 * Provides safe HTML and URL handling to prevent XSS and injection attacks,
 * plus IP address classification for SSRF protection
 */
import net from 'net';

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
 * Sanitizes HTML content by removing tags and dangerous content
 * @param {string} html - HTML content to sanitize
 * @returns {string} Sanitized plain text content with entities preserved
 */
export function sanitizeHTMLContent(html) {
  if (!html || typeof html !== 'string') return '';

  // Remove actual HTML tags
  let textOnly = html.replace(/<[^>]*>/g, '');

  // Remove dangerous content patterns that might bypass tag removal
  // Note: Don't remove event handlers from text content (only from actual HTML)
  textOnly = textOnly
    .replace(/javascript:/gi, 'removed:')
    .replace(/data:text\/html/gi, 'removed:')
    .replace(/url\s*\([^)]*javascript:/gi, 'url("removed:'); // Remove javascript: in url()

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

/**
 * Checks if an IP address is in a private or reserved range.
 * @param {string} ip - The IP address to check.
 * @returns {boolean} - True if the IP is private, false otherwise.
 */
export function isPrivateIP(ip) {
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(part => parseInt(part, 10));
    // 0.0.0.0/8 - "This network" (0.0.0.0 reaches localhost on many systems)
    if (parts[0] === 0) return true;
    // 127.0.0.0/8 - Loopback
    if (parts[0] === 127) return true;
    // 10.0.0.0/8 - Private
    if (parts[0] === 10) return true;
    // 100.64.0.0/10 - Carrier-grade NAT (shared address space)
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
    // 172.16.0.0/12 - Private
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16 - Private
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 169.254.0.0/16 - Link-local (includes AWS metadata service)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // 192.0.0.0/24 - IETF protocol assignments
    if (parts[0] === 192 && parts[1] === 0 && parts[2] === 0) return true;
    // 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24 - TEST-NET-1/2/3 (RFC 5737)
    if ((parts[0] === 192 && parts[1] === 0 && parts[2] === 2) ||
        (parts[0] === 198 && parts[1] === 51 && parts[2] === 100) ||
        (parts[0] === 203 && parts[1] === 0 && parts[2] === 113)) return true;
    // 198.18.0.0/15 - Benchmarking (RFC 2544)
    if (parts[0] === 198 && (parts[1] === 18 || parts[1] === 19)) return true;
    // 224.0.0.0/4 - Multicast
    if (parts[0] >= 224 && parts[0] <= 239) return true;
    // 240.0.0.0/4 - Reserved (includes the 255.255.255.255 broadcast)
    if (parts[0] >= 240) return true;
    return false;
  }
  if (net.isIPv6(ip)) {
    const h = expandIPv6(ip);
    if (!h) return true; // Unparseable: fail closed
    const embeddedV4 = (hi, lo) => `${hi >> 8}.${hi & 0xff}.${lo >> 8}.${lo & 0xff}`;
    const leadingZeros = h.slice(0, 5).every(x => x === 0);
    // :: (unspecified) and ::1 (loopback)
    if (leadingZeros && h[5] === 0 && h[6] === 0 && (h[7] === 0 || h[7] === 1)) return true;
    // ::/96 IPv4-compatible and ::ffff:0:0/96 IPv4-mapped: the embedded address
    // decides (a mapped 8.8.8.8 is public; a compatible 127.0.0.1 is not)
    if (leadingZeros && (h[5] === 0 || h[5] === 0xffff)) {
      return isPrivateIP(embeddedV4(h[6], h[7]));
    }
    // 2002::/16 - 6to4 with embedded IPv4
    if (h[0] === 0x2002) return isPrivateIP(embeddedV4(h[2], h[3]));
    // 64:ff9b::/96 - NAT64 with embedded IPv4
    if (h[0] === 0x0064 && h[1] === 0xff9b) return isPrivateIP(embeddedV4(h[6], h[7]));
    // 2001:0::/32 - Teredo; 2001:db8::/32 - documentation
    if (h[0] === 0x2001 && (h[1] === 0 || h[1] === 0x0db8)) return true;
    // fc00::/7 - Unique local
    if ((h[0] & 0xfe00) === 0xfc00) return true;
    // fe80::/10 - Link-local
    if ((h[0] & 0xffc0) === 0xfe80) return true;
    // ff00::/8 - Multicast
    if ((h[0] & 0xff00) === 0xff00) return true;
  }
  return false;
}

/**
 * Expands an IPv6 address (including embedded dotted IPv4) into 8 numeric hextets.
 * @returns {number[]|null}
 */
function expandIPv6(ip) {
  let addr = ip.split('%')[0].toLowerCase();
  const dotted = addr.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) {
    const p = dotted[1].split('.').map(n => parseInt(n, 10));
    addr = addr.slice(0, -dotted[1].length) + `${((p[0] << 8) | p[1]).toString(16)}:${((p[2] << 8) | p[3]).toString(16)}`;
  }
  const [head, tail] = addr.split('::');
  const headParts = head ? head.split(':') : [];
  const tailParts = tail ? tail.split(':') : [];
  const fill = addr.includes('::') ? 8 - headParts.length - tailParts.length : 0;
  const hextets = [...headParts, ...Array(fill).fill('0'), ...tailParts].map(x => parseInt(x, 16));
  return hextets.length === 8 && hextets.every(x => x >= 0 && x <= 0xffff) ? hextets : null;
}