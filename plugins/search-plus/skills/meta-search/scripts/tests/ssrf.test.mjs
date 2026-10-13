// Offline SSRF regression tests for the direct markdown fetch and URL validation.
// globalThis.fetch is stubbed, so no request leaves the machine and no API keys
// are needed. The redirect test needs DNS for a public hostname and skips without it.
//   node --test tests/*.test.mjs
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { promises as dns } from 'node:dns';

import * as ce from '../content-extractor.mjs';
const { extractContent } = ce;
const isPrivateIP = ce.isPrivateIP ?? (() => { throw new Error('isPrivateIP not exported'); });

const PRIVATE = [
  '127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1',
  '169.254.169.254', '0.0.0.0', '100.64.0.1', '100.127.255.255',
  '::1', '::', 'fc00::1', 'fd12::1', 'fe80::1', '::ffff:127.0.0.1', '::ffff:10.0.0.1',
  '::ffff:7f00:1'
];
const PUBLIC = [
  '172.15.255.255', '172.32.0.1', '100.63.255.255', '100.128.0.1', '8.8.8.8',
  '2606:4700::1111', '::ffff:8.8.8.8'
];

for (const ip of PRIVATE) {
  test(`isPrivateIP(${ip}) is true`, () => assert.equal(isPrivateIP(ip), true));
}
for (const ip of PUBLIC) {
  test(`isPrivateIP(${ip}) is false`, () => assert.equal(isPrivateIP(ip), false));
}

// --- fetch stub: records every requested URL; fails all third-party providers ---

const PUBLIC_URL = 'https://info.cern.ch/';
let requested;
let realFetch;
let realLog;

beforeEach(() => {
  requested = [];
  realFetch = globalThis.fetch;
  realLog = console.log;
  console.log = () => {};
  const stub = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.url ?? String(input);
    requested.push(url);
    if (url === PUBLIC_URL) {
      const location = 'http://127.0.0.1:9/secret';
      // Emulate fetch's default redirect: 'follow' so unguarded callers are caught
      if (init.redirect !== 'manual') return stub(location, init);
      return new Response(null, { status: 302, headers: { Location: location } });
    }
    if (new URL(url).hostname === '127.0.0.1' || new URL(url).hostname === '0.0.0.0') {
      return new Response('# SECRET', { status: 200, headers: { 'Content-Type': 'text/markdown' } });
    }
    return new Response('unavailable', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  };
  globalThis.fetch = stub;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  console.log = realLog;
});

test('direct fetch does not follow a redirect to a private address', async (t) => {
  try {
    await dns.lookup('info.cern.ch');
  } catch {
    t.skip('DNS unavailable: cannot resolve info.cern.ch for validateAndNormalizeURL');
    return;
  }
  const result = await extractContent(PUBLIC_URL);
  const privateHits = requested.filter(u => u.includes('127.0.0.1'));
  assert.deepEqual(privateHits, [], `private address was requested: ${privateHits.join(', ')}`);
  assert.equal(requested[0], PUBLIC_URL, 'direct fetch should hit the public URL first');
  const direct = result.allResults.find(r => r.service === 'direct');
  assert.equal(direct.success, false, 'direct attempt must fail');
  assert.equal(direct.error.code, 'UNSAFE_REDIRECT');
  assert.ok(!String(result.content || '').includes('SECRET'), 'private body must not be returned');
});

test('0.0.0.0 URL is rejected before any fetch', async () => {
  const result = await extractContent('http://0.0.0.0:9/secret');
  assert.equal(result.success, false);
  assert.equal(result.error.code, 'INVALID_URL');
  assert.deepEqual(requested, []);
});

test('bracketed IPv6 loopback URL is rejected before any fetch', async () => {
  const result = await extractContent('http://[::1]:9/secret');
  assert.equal(result.success, false);
  assert.equal(result.error.code, 'INVALID_URL');
  assert.match(result.error.message, /forbidden range/);
  assert.deepEqual(requested, []);
});
