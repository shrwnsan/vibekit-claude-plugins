// scripts/direct-fetch.mjs
//
// Transport for the direct `Accept: text/markdown` fetch — the most
// security-sensitive piece of the plugin, kept in its own module so it can be
// security-reviewed in isolation. It deliberately does NOT use fetch():
// undici cannot be given a resolver, but http.request can, and owning the
// resolver call is what makes connect-time SSRF validation possible.
import { promises as dns } from 'dns';
import http from 'http';
import https from 'https';
import zlib from 'zlib';

import { isPrivateIP } from './security-utils.mjs';

// Markdown bodies are text; anything larger is not a document but a download
export const MAX_DIRECT_BODY_BYTES = 2 * 1024 * 1024;
// Some origins reject UA-less requests outright, which would silently waste
// the direct chain head; send an honest one (fetch previously sent undici's)
export const DIRECT_FETCH_USER_AGENT = 'vibekit-search-plus meta-search (direct markdown fetch)';

/**
 * DNS lookup hook for the direct fetch: validates every address at connect
 * time, inside the resolver call the connection itself uses.
 * validateAndNormalizeURL (in content-extractor) checks one resolution
 * earlier; without this hook the connection re-resolves on its own, and a
 * short-TTL answer can hand the socket a private address the earlier check
 * never saw (DNS rebinding).
 * Honors both resolver contracts: single (err, address, family) and
 * Node >= 20 autoSelectFamily's (err, [{ address, family }]) via options.all.
 */
export function ssrfGuardedLookup(hostname, options, callback) {
  const lookupOptions = { family: options?.family ?? 0, hints: options?.hints };
  if (options?.all) lookupOptions.all = true;
  dns.lookup(hostname, lookupOptions)
    .then((result) => {
      if (options?.all) {
        const addresses = Array.isArray(result) ? result : [result];
        const forbidden = addresses.find((a) => isPrivateIP(a.address));
        if (forbidden) {
          callback(new Error(`SSRF attack detected: ${hostname} resolves to forbidden address ${forbidden.address}`), null);
          return;
        }
        callback(null, addresses);
        return;
      }
      const { address, family } = result;
      if (isPrivateIP(address)) {
        callback(new Error(`SSRF attack detected: ${hostname} resolves to forbidden address ${address}`), null);
        return;
      }
      callback(null, address, family);
    })
    .catch(callback);
}

/**
 * Reads a response body as UTF-8 text, refusing to buffer more than maxBytes.
 * A stream that crosses the cap is destroyed, so an oversized body is never
 * held in memory or returned.
 */
export function readBodyWithCap(stream, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let received = 0;
    let settled = false;
    const finish = (settle, value) => { if (!settled) { settled = true; settle(value); } };
    stream.on('data', (chunk) => {
      received += chunk.length;
      if (received > maxBytes) {
        stream.destroy();
        finish(reject, new Error(`Response body exceeded ${maxBytes} bytes`));
        return;
      }
      chunks.push(chunk);
    });
    stream.on('end', () => finish(resolve, Buffer.concat(chunks).toString('utf8')));
    stream.on('error', (error) => finish(reject, error));
    stream.on('close', () => finish(reject, new Error('Response stream closed before completion')));
  });
}

/**
 * Direct-fetch transport over http/https with the SSRF-guarded DNS lookup.
 * Redirects are NOT followed here; the caller follows them manually so every
 * hop is re-validated.
 */
function directHttpTransport(urlString, { headers, signal, timeoutMs = 10000 } = {}) {
  return new Promise((resolve, reject) => {
    let target;
    try {
      target = new URL(urlString);
    } catch (error) {
      reject(error);
      return;
    }
    const transport = target.protocol === 'https:' ? https : http;
    const request = transport.request(target, {
      headers,
      lookup: ssrfGuardedLookup,
      signal,
      timeout: timeoutMs,
      agent: false
    }, (response) => {
      resolve({
        status: response.statusCode,
        headers: {
          get: (name) => {
            const value = response.headers[String(name).toLowerCase()];
            return value === undefined ? null : (Array.isArray(value) ? value.join(', ') : value);
          }
        },
        cancel: () => response.destroy(),
        text: () => {
          // Serve compressed responses decoded; the cap applies to the decoded
          // bytes so a compression bomb cannot slip past it
          const encoding = String(response.headers['content-encoding'] || '').trim().toLowerCase();
          let source = response;
          if (encoding === 'gzip' || encoding === 'deflate' || encoding === 'br') {
            source = encoding === 'gzip' ? zlib.createGunzip()
              : encoding === 'deflate' ? zlib.createInflate()
              : zlib.createBrotliDecompress();
            response.on('error', (error) => source.destroy(error));
            response.pipe(source);
          }
          const reading = readBodyWithCap(source, MAX_DIRECT_BODY_BYTES);
          reading.catch(() => response.destroy());
          return reading;
        }
      });
    });
    request.on('timeout', () => request.destroy(new Error(`Direct fetch timeout after ${timeoutMs}ms`)));
    request.on('error', reject);
    request.end();
  });
}

// Test seam: swapped out by the tests so redirect and guard logic runs
// without any network. Production path is directHttpTransport above.
let directTransport = directHttpTransport;

export function _setDirectTransportForTests(transport = null) {
  directTransport = transport ?? directHttpTransport;
}

/** Single entry point used by the extraction chain; honors the test seam. */
export function fetchDirect(urlString, init) {
  return directTransport(urlString, init);
}
