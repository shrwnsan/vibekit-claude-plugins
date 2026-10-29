// Offline SSRF regression tests for the direct markdown fetch and URL validation.
// No network, no DNS: provider fetches are served by a globalThis.fetch stub,
// the direct transport is swapped via _setDirectTransportForTests, and DNS is
// stubbed through dns.promises.lookup (including a rebinding scenario).
//   node --test tests/*.test.mjs
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import dnsDefault from 'node:dns';

import * as ce from '../content-extractor.mjs';
const { extractContent } = ce;
const isPrivateIP = ce.isPrivateIP ?? (() => { throw new Error('isPrivateIP not exported'); });

const PRIVATE = [
  '127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1',
  '169.254.169.254', '0.0.0.0', '100.64.0.1', '100.127.255.255',
  '::1', '::', 'fc00::1', 'fd12::1', 'fe80::1', '::ffff:127.0.0.1', '::ffff:10.0.0.1',
  '::ffff:7f00:1',
  // IPv4 special-purpose ranges (IANA): protocol assignments, TEST-NETs,
  // benchmarking, multicast, reserved/broadcast
  '192.0.0.1', '192.0.2.1', '198.18.0.1', '198.19.255.255', '198.51.100.1',
  '203.0.113.1', '224.0.0.1', '239.255.255.255', '240.0.0.1', '255.255.255.255',
  // IPv4-compatible, 6to4/NAT64 with embedded private IPv4, Teredo,
  // documentation range, multicast
  '::127.0.0.1', '::7f00:1', '::a00:1', '2002:7f00:1::', '64:ff9b::7f00:1',
  '2001:0:4136:e378:8000::f', '2001:db8::1', 'ff02::1', 'ff0e::1'
];
const PUBLIC = [
  '172.15.255.255', '172.32.0.1', '100.63.255.255', '100.128.0.1', '8.8.8.8',
  '2606:4700::1111', '::ffff:8.8.8.8',
  // Neighbors of the blocked specials, plus public embedded/transition addresses
  '198.17.255.255', '198.20.0.1', '223.255.255.255',
  '::8.8.8.8', '2002:808:808::', '64:ff9b::808:808', '2001:4860:4860::8888'
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
    // Rebinding attacker: validation resolves a public IP, the fetch itself
    // "connects" to the attacker's server and serves markdown
    if (new URL(url).hostname === 'rebind.attacker.test') {
      return new Response('# PWNED', { status: 200, headers: { 'Content-Type': 'text/markdown' } });
    }
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

// --- DNS stub (dns.promises.lookup): serves one answer per call ---

const realLookup = dnsDefault.promises.lookup;
function stubLookup(answers) {
  let calls = 0;
  dnsDefault.promises.lookup = async () => answers[Math.min(calls++, answers.length - 1)];
  return () => { dnsDefault.promises.lookup = realLookup; };
}

test('direct fetch does not follow a redirect to a private address', async () => {
  assert.equal(typeof ce._setDirectTransportForTests, 'function',
    'transport override hook missing: redirect hops cannot be exercised offline');
  const restoreDns = stubLookup([{ address: '93.184.216.34', family: 4 }]);
  const calls = [];
  ce._setDirectTransportForTests(async (u, init = {}) => {
    calls.push({
      url: String(u),
      accept: init.headers?.Accept,
      hasUserAgent: typeof init.headers?.['User-Agent'] === 'string' && init.headers['User-Agent'].length > 0
    });
    if (String(u) === PUBLIC_URL) {
      return {
        status: 302,
        headers: { get: (n) => (n === 'location' ? 'http://127.0.0.1:9/secret' : null) },
        text: async () => '',
        cancel() {}
      };
    }
    return {
      status: 200,
      headers: { get: (n) => (n === 'content-type' ? 'text/markdown' : null) },
      text: async () => '# SECRET',
      cancel() {}
    };
  });
  try {
    const result = await extractContent(PUBLIC_URL);
    assert.deepEqual(calls, [{
      url: PUBLIC_URL,
      accept: 'text/markdown',
      hasUserAgent: true
    }], `unexpected transport calls: ${JSON.stringify(calls)}`);
    const direct = result.allResults.find(r => r.service === 'direct');
    assert.equal(direct.success, false, 'direct attempt must fail');
    assert.equal(direct.error.code, 'UNSAFE_REDIRECT');
    assert.ok(!String(result.content || '').includes('SECRET'), 'private body must not be returned');
  } finally {
    ce._setDirectTransportForTests();
    restoreDns();
  }
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

test('subdomains of localhost are rejected before DNS resolution', async () => {
  const result = await extractContent('http://foo.localhost/x');
  assert.equal(result.success, false);
  assert.equal(result.error.code, 'INVALID_URL');
  assert.match(result.error.message, /Hostname 'foo\.localhost' is forbidden/);
  assert.deepEqual(requested, []);
});

test('trailing-dot localhost is rejected before DNS resolution', async () => {
  const result = await extractContent('http://localhost.:9/x');
  assert.equal(result.success, false);
  assert.equal(result.error.code, 'INVALID_URL');
  assert.match(result.error.message, /Hostname 'localhost' is forbidden/);
  assert.deepEqual(requested, []);
});

test('rebinding: a private answer at connect time is blocked after validation saw a public IP', async () => {
  const restore = stubLookup([
    { address: '93.184.216.34', family: 4 }, // validateAndNormalizeURL: public
    { address: '127.0.0.2', family: 4 }      // connect-time lookup: private (DNS rebinding)
  ]);
  try {
    const result = await extractContent('https://rebind.attacker.test/doc.md');
    const direct = result.allResults.find(r => r.service === 'direct');
    assert.equal(direct.success, false,
      'direct must fail when the connect-time resolution lands on a private address');
    assert.equal(direct.error.code, 'INVALID_URL');
    assert.match(direct.error.message, /forbidden address 127\.0\.0\.2/);
    assert.ok(!String(result.content || '').includes('PWNED'), 'rebound body must not be returned');
  } finally {
    restore();
  }
});

test('declared Content-Length over the cap is refused without downloading the body', async () => {
  assert.equal(typeof ce._setDirectTransportForTests, 'function',
    'transport override hook missing: oversized declarations cannot be exercised offline');
  const restoreDns = stubLookup([{ address: '93.184.216.34', family: 4 }]);
  let cancelled = false;
  let downloaded = false;
  ce._setDirectTransportForTests(async () => ({
    status: 200,
    headers: {
      get: (n) => (n === 'content-type' ? 'text/markdown'
        : n === 'content-length' ? String(64 * 1024 * 1024) : null)
    },
    text: async () => { downloaded = true; return 'x'; },
    cancel: () => { cancelled = true; }
  }));
  try {
    const result = await extractContent('https://oversized.test/x.md');
    const direct = result.allResults.find(r => r.service === 'direct');
    assert.equal(direct.success, false);
    assert.equal(direct.error.code, 'TOO_LARGE');
    assert.equal(downloaded, false, 'body must not be downloaded');
    assert.equal(cancelled, true, 'connection must be cancelled');
  } finally {
    ce._setDirectTransportForTests();
    restoreDns();
  }
});

test('transport errors with empty messages keep their error code visible', async () => {
  assert.equal(typeof ce._setDirectTransportForTests, 'function',
    'transport override hook missing: error formatting cannot be exercised offline');
  const restoreDns = stubLookup([{ address: '93.184.216.34', family: 4 }]);
  ce._setDirectTransportForTests(async () => {
    // Node network errors such as AggregateError can carry an empty message
    throw Object.assign(new Error(''), { code: 'ETIMEDOUT' });
  });
  try {
    const result = await extractContent('https://unreachable.test/x.md');
    const direct = result.allResults.find(r => r.service === 'direct');
    assert.equal(direct.success, false);
    assert.match(direct.error.message, /ETIMEDOUT/, 'the error code must survive the empty message');
    assert.equal(direct.error.code, 'TIMEOUT');
  } finally {
    ce._setDirectTransportForTests();
    restoreDns();
  }
});

// --- problematic-pattern gate: hostname shapes must not flag real domains (#87) ---

function assertReachedExtraction(result, url) {
  assert.notEqual(result.error?.code, 'INVALID_URL',
    `${url} was rejected by validation: ${result.error?.message}`);
  assert.doesNotMatch(String(result.error?.message), /suspicious or test domain/,
    `${url} was flagged as a suspicious domain`);
  const direct = result.allResults.find(r => r.service === 'direct');
  assert.ok(direct, `${url} was never attempted by the fetch chain`);
  assert.notEqual(direct.error?.code, 'INVALID_URL',
    'the direct attempt must fail for fetch reasons, not URL validation');
}

test('ccTLD second-level domains (.com.au, .com.hk) pass validation (#87)', async () => {
  const restoreDns = stubLookup([{ address: '93.184.216.34', family: 4 }]);
  try {
    for (const url of ['https://www.amazon.com.au/dp/B0EXAMPLE', 'https://www.carousell.com.hk/listing']) {
      assertReachedExtraction(await extractContent(url), url);
    }
  } finally {
    restoreDns();
  }
});

test('a host merely ending in the substring example.com is not flagged (#87)', async () => {
  const restoreDns = stubLookup([{ address: '93.184.216.34', family: 4 }]);
  try {
    assertReachedExtraction(await extractContent('https://notexample.com/guide'), 'https://notexample.com/guide');
  } finally {
    restoreDns();
  }
});

test('a suspicious-looking query string does not flag a ccTLD hostname (#87)', async () => {
  const restoreDns = stubLookup([{ address: '93.184.216.34', family: 4 }]);
  try {
    const url = 'https://www.amazon.com.au/s?ref=example.com.bad';
    assertReachedExtraction(await extractContent(url), url);
  } finally {
    restoreDns();
  }
});

test('reserved example.com/net/org hosts are still rejected', async () => {
  const result = await extractContent('https://example.com/page');
  assert.equal(result.success, false);
  assert.equal(result.error.code, 'INVALID_URL');
  assert.match(result.error.message, /reserved test domain/);
  assert.deepEqual(requested, []);
});

test('malformed .com TLDs of 3+ letters are still rejected', async () => {
  const restoreDns = stubLookup([{ address: '93.184.216.34', family: 4 }]);
  try {
    for (const url of ['https://example.com.bad/page', 'https://test.com.xyz/']) {
      const result = await extractContent(url);
      assert.equal(result.error.code, 'INVALID_URL', `${url} should be rejected`);
      assert.match(result.error.message, /suspicious or test domain/);
    }
    assert.deepEqual(requested, []);
  } finally {
    restoreDns();
  }
});
