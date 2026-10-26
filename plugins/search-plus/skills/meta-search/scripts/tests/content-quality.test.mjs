// Offline tests for extraction-chain content quality gating (PRD-009 F2):
// high-confidence failures (parked pages, blank bodies, provider error pages)
// must fall through to the next provider; generic error words must not.
//   node --test tests/*.test.mjs
// No API keys and no provider traffic: globalThis.fetch is stubbed. The only
// real network call is the DNS lookup in URL validation.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { promises as dns } from 'node:dns';

// API key constants are read at import time, so clear them before importing.
for (const key of Object.keys(process.env)) {
  if (/^(SEARCH_PLUS_|TAVILY_API_KEY$|JINA_API_KEY$)/.test(key)) delete process.env[key];
}
const { extractContent, isHardContentFailure } = await import('../content-extractor.mjs');
// A second instance with a TinyFish key (the query string forces a fresh module evaluation).
process.env.SEARCH_PLUS_TINYFISH_API_KEY = 'tinyfish-fake-test-key';
const { extractContent: extractContentWithTinyfish } = await import('../content-extractor.mjs?tinyfish');
delete process.env.SEARCH_PLUS_TINYFISH_API_KEY;

const TARGET = 'https://info.cern.ch/';

let dnsSkip = false;
try {
  await dns.lookup('info.cern.ch');
} catch (error) {
  dnsSkip = `DNS unavailable (${error.code || error.message}); extractContent validates hostnames via DNS`;
}

const PARKED = `# info.cern.ch

This domain is for sale! Buy this domain today. Contact the owner for pricing.
Related searches: hosting, web design, cheap domains, email marketing.`;

const ARTICLE = `# The World Wide Web project

The WorldWideWeb (W3) is a wide-area hypermedia information retrieval initiative
aiming to give universal access to a large universe of documents. Everything there
is online about W3 is linked directly or indirectly to this document, including an
executive summary of the project, mailing lists, policy, November's W3 news and
frequently asked questions.`;

const ARTICLE_WITH_ERROR_WORDS = `# Debugging HTTP clients

When a server answers 403 Forbidden, the client is authenticated but lacks
permission. A 429 response means you hit a rate limit and should back off with
exponential retries. Some proxies return "access denied" or "service unavailable"
pages, and a page not found error usually indicates a stale link. This article
walks through how to tell these cases apart and log them properly.`;

const realFetch = globalThis.fetch;
const realLog = console.log;
let calls;
let requests;

// routes: { direct, jina, tinyfish, firecrawl, defuddle, wayback } -> Response factories
function installFetch(routes) {
  calls = [];
  requests = {};
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    let route;
    if (url.startsWith('https://r.jina.ai/')) route = 'jina';
    else if (url.startsWith('https://api.fetch.tinyfish.ai')) route = 'tinyfish';
    else if (url.startsWith('https://api.firecrawl.dev/')) route = 'firecrawl';
    else if (url.startsWith('https://defuddle.md/')) route = 'defuddle';
    else if (url.startsWith('https://archive.org/wayback/available')) route = 'wayback';
    else if (url.startsWith(TARGET)) route = 'direct';
    else route = 'other';
    calls.push(route);
    requests[route] = init;
    const factory = routes[route];
    if (!factory) return new Response('not stubbed', { status: 503 });
    return factory(url);
  };
}

const text = (body, type = 'text/plain') => () => new Response(body, { status: 200, headers: { 'content-type': type } });
const firecrawlJSON = (markdown) => () => new Response(
  JSON.stringify({ success: true, data: { markdown, metadata: { title: 'T' } } }),
  { status: 200, headers: { 'content-type': 'application/json' } }
);
const htmlPage = () => new Response('<html><body>hi</body></html>', { status: 200, headers: { 'content-type': 'text/html' } });
const noSnapshot = () => new Response(JSON.stringify({ archived_snapshots: {} }), { status: 200, headers: { 'content-type': 'application/json' } });

before(() => { console.log = () => {}; });
after(() => { console.log = realLog; globalThis.fetch = realFetch; });

// --- isHardContentFailure unit tests ---

test('isHardContentFailure flags parked pages, blank bodies and provider error bodies', () => {
  assert.equal(isHardContentFailure(PARKED, 'jinaPublic'), true);
  assert.equal(isHardContentFailure('   \n\t ', 'firecrawl'), true);
  assert.equal(isHardContentFailure('', 'defuddle'), true);
  assert.equal(isHardContentFailure('{"data":null,"code":422,"name":"AssertionFailureError","message":"Failed to goto"}', 'jinaPublic'), true);
  assert.equal(isHardContentFailure('Error: Failed to fetch the page', 'defuddle'), true);
});

test('isHardContentFailure does not flag real articles that mention error words', () => {
  assert.equal(isHardContentFailure(ARTICLE, 'jinaPublic'), false);
  assert.equal(isHardContentFailure(ARTICLE_WITH_ERROR_WORDS, 'firecrawl'), false);
  assert.equal(isHardContentFailure('Error 403 and rate limit handling in practice: ' + ARTICLE, 'defuddle'), false);
  // Wayback banner chrome is not a hard failure for wayback-sourced content
  assert.equal(isHardContentFailure('The Wayback Machine - https://web.archive.org/...\n' + ARTICLE, 'wayback (via defuddle)'), false);
});

// --- extractContent chain behaviour ---

test('parked page from first provider falls through to a later provider', { skip: dnsSkip }, async () => {
  installFetch({
    direct: htmlPage,
    jina: text(PARKED),
    firecrawl: firecrawlJSON(ARTICLE),
    defuddle: text(ARTICLE, 'text/markdown'),
    wayback: noSnapshot
  });
  const result = await extractContent(TARGET);
  assert.equal(result.success, true);
  assert.equal(result.service, 'firecrawl');
  assert.match(result.content, /WorldWideWeb/);
  const jina = result.allResults.find(r => r.service === 'jinaPublic');
  assert.equal(jina.success, false);
  assert.match(jina.error.message, /parked\/placeholder page/);
  assert.ok(calls.includes('jina') && calls.includes('firecrawl'));
  assert.ok(!calls.includes('tinyfish'), 'TinyFish is skipped without a key');
});

test('article mentioning "403 Forbidden" and "rate limit" is accepted from the first provider', { skip: dnsSkip }, async () => {
  installFetch({
    direct: htmlPage,
    jina: text(ARTICLE_WITH_ERROR_WORDS),
    firecrawl: firecrawlJSON(ARTICLE),
    defuddle: text(ARTICLE, 'text/markdown'),
    wayback: noSnapshot
  });
  const result = await extractContent(TARGET);
  assert.equal(result.success, true);
  assert.equal(result.service, 'jinaPublic');
  assert.ok(!calls.includes('firecrawl'), 'should not fall through past Jina');
});

test('all providers returning parked content fails honestly', { skip: dnsSkip }, async () => {
  installFetch({
    direct: text(PARKED, 'text/markdown'),
    jina: text(PARKED),
    firecrawl: firecrawlJSON(PARKED),
    defuddle: text(PARKED, 'text/markdown'),
    wayback: noSnapshot
  });
  const result = await extractContent(TARGET);
  assert.equal(result.success, false);
  assert.equal(result.error.code, 'ALL_SERVICES_FAILED');
  assert.doesNotMatch(result.content || '', /buy this domain/i);
  for (const service of ['direct', 'jinaPublic', 'firecrawl', 'defuddle']) {
    const attempt = result.allResults.find(r => r.service === service);
    assert.equal(attempt.success, false, `${service} should be recorded as failed`);
  }
});

// --- TinyFish (keyed) ---

const tinyfishJSON = (body) => () => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

test('TinyFish: with a key, runs before Firecrawl and its markdown is used', { skip: dnsSkip }, async () => {
  installFetch({
    direct: htmlPage,
    tinyfish: tinyfishJSON({ results: [{ url: TARGET, final_url: TARGET, title: 'The WWW project', text: ARTICLE, format: 'markdown' }], errors: [] }),
    firecrawl: firecrawlJSON(ARTICLE),
    wayback: noSnapshot
  });
  const result = await extractContentWithTinyfish(TARGET);
  assert.equal(result.success, true);
  assert.equal(result.service, 'tinyfish');
  assert.match(result.content, /WorldWideWeb/);
  assert.ok(!calls.includes('firecrawl'), 'should not fall through past TinyFish');
  assert.equal(new Headers(requests.tinyfish.headers).get('x-api-key'), 'tinyfish-fake-test-key');
  assert.deepEqual(JSON.parse(requests.tinyfish.body), { urls: [TARGET], format: 'markdown' });
});

test('TinyFish: a per-URL error in a 200 response (bot_blocked) falls through to Firecrawl', { skip: dnsSkip }, async () => {
  installFetch({
    direct: htmlPage,
    tinyfish: tinyfishJSON({ results: [], errors: [{ url: TARGET, error: 'bot_blocked' }] }),
    firecrawl: firecrawlJSON(ARTICLE),
    wayback: noSnapshot
  });
  const result = await extractContentWithTinyfish(TARGET);
  assert.equal(result.success, true);
  assert.equal(result.service, 'firecrawl');
  const tinyfish = result.allResults.find(r => r.service === 'tinyfish');
  assert.equal(tinyfish.success, false);
  assert.match(tinyfish.error.message, /bot_blocked/);
});
