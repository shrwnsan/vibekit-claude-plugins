// Offline tests for the search provider chain in performHybridSearch().
// globalThis.fetch is stubbed with recorded, sanitized sample responses, and API keys
// are fake strings, so no network access or real keys are needed:
//   node --test tests/*.test.mjs
//
// Provider keys are read at module import time. Each case re-imports
// handle-web-search.mjs with a cache-busting query string so its key constants are
// re-read from process.env. content-extractor.mjs (where tavily.search reads its own
// key) is NOT re-evaluated by that query string, so it is pinned once below with a
// fake Tavily key; whether Tavily is tried is decided by handle-web-search's own gate.
// This relies on node --test running each test file in its own process (the default).
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

const PROVIDER_ENV = [
  'SEARCH_PLUS_SEARXNG_URL', 'SEARCH_PLUS_SEARXNG_API_KEY',
  'SEARCH_PLUS_TAVILY_API_KEY', 'TAVILY_API_KEY',
  'SEARCH_PLUS_BRAVE_API_KEY', 'BRAVE_API_KEY',
  'SEARCH_PLUS_EXA_API_KEY', 'EXA_API_KEY',
  'SEARCH_PLUS_JINA_API_KEY', 'SEARCH_PLUS_JINAAI_API_KEY', 'JINA_API_KEY', 'JINAAI_API_KEY',
  'SEARCH_PLUS_FIRECRAWL_API_KEY'
];

const FAKE = {
  tavily: 'tvly-fake-test-key',
  brave: 'brave-fake-test-key',
  exa: 'exa-fake-test-key',
  jina: 'jina_fake-test-key',
  firecrawl: 'fc-fake-test-key',
  searxng: 'searxng-fake-test-key'
};
const ALL_KEYS = {
  SEARCH_PLUS_TAVILY_API_KEY: FAKE.tavily,
  SEARCH_PLUS_BRAVE_API_KEY: FAKE.brave,
  SEARCH_PLUS_EXA_API_KEY: FAKE.exa,
  SEARCH_PLUS_JINA_API_KEY: FAKE.jina
};
const SEARXNG_BASE = 'http://localhost:8888';

// Library modules log progress; keep test output readable but capture it for assertions.
let logs = [];
const realFetch = globalThis.fetch;
const realLog = console.log;
const realWarn = console.warn;
beforeEach(() => {
  logs = [];
  console.log = console.warn = (...args) => { logs.push(args.join(' ')); };
});
afterEach(() => {
  globalThis.fetch = realFetch;
  console.log = realLog;
  console.warn = realWarn;
});

for (const name of PROVIDER_ENV) delete process.env[name];
process.env.SEARCH_PLUS_TAVILY_API_KEY = FAKE.tavily;
await import('../content-extractor.mjs');

let importCounter = 0;
async function loadSearch(env = {}) {
  for (const name of PROVIDER_ENV) delete process.env[name];
  Object.assign(process.env, env);
  const mod = await import(`../handle-web-search.mjs?case=${++importCounter}`);
  for (const name of PROVIDER_ENV) delete process.env[name];
  return mod.performHybridSearch;
}

// --- Recorded, sanitized sample responses (shapes match each provider's real API) ---

const SAMPLES = {
  tavily: {
    query: 'claude code hooks',
    answer: 'Claude Code hooks are user-defined shell commands that run at lifecycle events.',
    results: [
      {
        title: 'Hooks reference - Claude Code Docs',
        url: 'https://docs.example.com/claude-code/hooks',
        content: 'Hooks let you run shell commands before or after Claude Code tool calls.',
        score: 0.91,
        published_date: '2026-03-02T10:00:00Z'
      },
      {
        title: 'Get started with hooks',
        url: 'https://docs.example.com/claude-code/hooks-guide',
        content: 'A walkthrough of PreToolUse and PostToolUse hooks.',
        score: 0.74
      }
    ],
    response_time: 1.12
  },
  brave: {
    type: 'search',
    query: { original: 'claude code hooks' },
    web: {
      type: 'search',
      results: [
        {
          title: 'Hooks reference - Claude Code Docs',
          url: 'https://docs.example.com/claude-code/hooks',
          description: 'Configure <strong>hooks</strong> that run on Claude Code events.',
          page_age: '2026-03-02T10:00:00',
          age: 'March 2, 2026',
          extra_snippets: ['PreToolUse runs before a tool call.']
        },
        {
          title: 'Claude Code hooks examples',
          url: 'https://blog.example.org/claude-hooks',
          description: 'Practical examples of hooks for formatting and linting.'
        }
      ]
    }
  },
  exa: {
    requestId: 'req-fake-0001',
    resolvedSearchType: 'neural',
    results: [
      {
        id: 'https://docs.example.com/claude-code/hooks',
        title: 'Hooks reference - Claude Code Docs',
        url: 'https://docs.example.com/claude-code/hooks',
        publishedDate: '2026-02-14T00:00:00.000Z',
        author: 'Example Author',
        text: 'Hooks are shell commands that Claude Code runs at specific points.'
      },
      {
        id: 'https://blog.example.org/claude-hooks',
        title: 'Claude Code hooks examples',
        url: 'https://blog.example.org/claude-hooks',
        publishedDate: null,
        text: 'Use a PostToolUse hook to run a formatter after edits.'
      }
    ]
  },
  jina: {
    code: 200,
    status: 20000,
    data: [
      {
        title: 'Hooks reference - Claude Code Docs',
        url: 'https://docs.example.com/claude-code/hooks',
        description: 'Short description of hooks.',
        content: 'Full page content: hooks run shell commands on Claude Code events.',
        usage: { tokens: 120 }
      },
      {
        title: 'Claude Code hooks examples',
        url: 'https://blog.example.org/claude-hooks',
        description: 'Only a description is available for this result.'
      }
    ]
  },
  firecrawl: {
    success: true,
    data: {
      web: [
        {
          url: 'https://docs.example.com/claude-code/hooks',
          title: 'Hooks reference - Claude Code Docs',
          description: 'Configure hooks that run on Claude Code events.',
          position: 1
        },
        {
          url: 'https://blog.example.org/claude-hooks',
          title: 'Claude Code hooks examples',
          description: 'Practical examples of hooks.',
          position: 2
        }
      ]
    },
    creditsUsed: 2
  },
  searxng: {
    query: 'claude code hooks',
    number_of_results: 0,
    results: [
      {
        url: 'https://docs.example.com/claude-code/hooks',
        title: 'Hooks reference - Claude Code Docs',
        content: 'Configure hooks that run on Claude Code events.',
        engine: 'duckduckgo',
        engines: ['duckduckgo', 'brave'],
        score: 2.5,
        category: 'general',
        publishedDate: '2026-01-20T08:30:00'
      },
      {
        url: 'https://blog.example.org/claude-hooks',
        title: 'Claude Code hooks examples',
        content: 'Practical examples of hooks.',
        engine: 'google',
        publishedDate: null
      },
      {
        url: 'https://third.example.net/hooks',
        title: 'Third result',
        content: 'Should be cut by maxResults.',
        engine: 'bing'
      }
    ],
    answers: [],
    suggestions: [],
    unresponsive_engines: []
  }
};

const EMPTY = {
  searxng: { query: 'q', results: [] },
  tavily: { query: 'q', answer: null, results: [] },
  brave: { web: { results: [] } },
  exa: { results: [] },
  jina: { data: [] },
  firecrawl: { success: true, data: { web: [] } }
};

// --- fetch stub ---

function providerOf(url) {
  const u = new URL(url);
  if (url.startsWith(SEARXNG_BASE)) return 'searxng';
  return {
    'api.tavily.com': 'tavily',
    'api.search.brave.com': 'brave',
    'api.exa.ai': 'exa',
    's.jina.ai': 'jina',
    'api.firecrawl.dev': 'firecrawl'
  }[u.host] || `unknown:${u.host}`;
}

// Explicit error-response wrapper: sample bodies may themselves contain a `status`
// field (Jina's does), so error routes must not be inferred from shape.
class HttpStatus {
  constructor(status, body) { this.status = status; this.body = body; }
}
const http = (status, body = {}) => new HttpStatus(status, body);

/**
 * Stubs fetch. `routes` maps provider name → sample body, or http(status, body).
 * Unrouted providers fail with 500 so nothing reaches the network.
 */
function stubFetch(routes) {
  const calls = [];
  globalThis.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    const provider = providerOf(url);
    const headers = Object.fromEntries(new Headers(init.headers || {}).entries());
    calls.push({ provider, url, method: init.method || 'GET', headers, body: init.body ? JSON.parse(init.body) : undefined, signal: init.signal });
    const route = routes[provider];
    if (route === undefined) {
      return new Response(JSON.stringify({ error: 'not stubbed' }), { status: 500 });
    }
    const { status, body } = route instanceof HttpStatus ? route : { status: 200, body: route };
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' }
    });
  };
  return calls;
}

const PARAMS = { query: 'claude code hooks', maxResults: 2, includeAnswer: true };

// --- Tavily ---

test('Tavily: POSTs api_key/query to api.tavily.com and normalizes answer, results and date', async () => {
  const search = await loadSearch(ALL_KEYS);
  const calls = stubFetch({ tavily: SAMPLES.tavily });
  const result = await search(PARAMS);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.tavily.com/search');
  assert.equal(calls[0].method, 'POST');
  assert.equal(calls[0].body.api_key, FAKE.tavily);
  assert.equal(calls[0].body.query, 'claude code hooks');
  assert.equal(calls[0].body.max_results, 2);
  assert.ok(calls[0].signal, 'request has a timeout signal');

  assert.equal(result.service, 'tavily');
  assert.equal(result.data.service, 'tavily');
  assert.equal(result.data.answer, SAMPLES.tavily.answer);
  assert.equal(result.data.results.length, 2);
  assert.equal(result.data.results[0].title, 'Hooks reference - Claude Code Docs');
  assert.equal(result.data.results[0].url, 'https://docs.example.com/claude-code/hooks');
  assert.equal(result.data.results[0].content, SAMPLES.tavily.results[0].content);
  assert.equal(result.data.results[0].published_date, '2026-03-02T10:00:00.000Z');
  assert.equal(result.data.results[1].published_date, null);
});

test('Tavily: empty results move on to Brave', async () => {
  const search = await loadSearch(ALL_KEYS);
  const calls = stubFetch({ tavily: EMPTY.tavily, brave: SAMPLES.brave });
  const result = await search(PARAMS);
  assert.deepEqual(calls.map(c => c.provider), ['tavily', 'brave']);
  assert.equal(result.service, 'brave');
});

// --- Brave ---

test('Brave: GETs web/search with X-Subscription-Token and normalizes description → content', async () => {
  const search = await loadSearch({ SEARCH_PLUS_BRAVE_API_KEY: FAKE.brave });
  const calls = stubFetch({ brave: SAMPLES.brave });
  const result = await search(PARAMS);

  assert.equal(calls.length, 1);
  const url = new URL(calls[0].url);
  assert.equal(url.origin + url.pathname, 'https://api.search.brave.com/res/v1/web/search');
  assert.equal(url.searchParams.get('q'), 'claude code hooks');
  assert.equal(url.searchParams.get('count'), '2');
  assert.equal(calls[0].method, 'GET');
  assert.equal(calls[0].headers['x-subscription-token'], FAKE.brave);

  assert.equal(result.service, 'brave');
  assert.equal(result.data.service, 'brave');
  assert.equal(result.data.answer, null);
  assert.equal(result.data.results.length, 2);
  assert.equal(result.data.results[0].title, 'Hooks reference - Claude Code Docs');
  assert.equal(result.data.results[0].url, 'https://docs.example.com/claude-code/hooks');
  assert.equal(result.data.results[0].content, SAMPLES.brave.web.results[0].description);
  assert.equal(result.data.results[1].url, 'https://blog.example.org/claude-hooks');
});

test('Brave: empty results move on to Exa', async () => {
  const search = await loadSearch(ALL_KEYS);
  const calls = stubFetch({ tavily: http(500, {}), brave: EMPTY.brave, exa: SAMPLES.exa });
  const result = await search(PARAMS);
  assert.deepEqual(calls.map(c => c.provider), ['tavily', 'brave', 'exa']);
  assert.equal(result.service, 'exa');
});

// --- Exa ---

test('Exa: POSTs to api.exa.ai with x-api-key and normalizes text → content and publishedDate', async () => {
  const search = await loadSearch({ SEARCH_PLUS_EXA_API_KEY: FAKE.exa });
  const calls = stubFetch({ exa: SAMPLES.exa });
  const result = await search(PARAMS);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.exa.ai/search');
  assert.equal(calls[0].method, 'POST');
  assert.equal(calls[0].headers['x-api-key'], FAKE.exa);
  assert.equal(calls[0].body.query, 'claude code hooks');
  assert.equal(calls[0].body.numResults, 2);

  assert.equal(result.service, 'exa');
  assert.equal(result.data.service, 'exa');
  assert.equal(result.data.results[0].title, 'Hooks reference - Claude Code Docs');
  assert.equal(result.data.results[0].url, 'https://docs.example.com/claude-code/hooks');
  assert.equal(result.data.results[0].content, SAMPLES.exa.results[0].text);
  assert.equal(result.data.results[0].published_date, '2026-02-14T00:00:00.000Z');
  assert.equal(result.data.results[1].published_date, null);
});

test('Exa: empty results move on to Jina', async () => {
  const search = await loadSearch({ SEARCH_PLUS_EXA_API_KEY: FAKE.exa, SEARCH_PLUS_JINA_API_KEY: FAKE.jina });
  const calls = stubFetch({ exa: EMPTY.exa, jina: SAMPLES.jina });
  const result = await search(PARAMS);
  assert.deepEqual(calls.map(c => c.provider), ['exa', 'jina']);
  assert.equal(result.service, 'jina-search');
});

// --- Jina ---

test('Jina: GETs s.jina.ai/<query> with Bearer auth; content falls back to description', async () => {
  const search = await loadSearch({ SEARCH_PLUS_JINA_API_KEY: FAKE.jina });
  const calls = stubFetch({ jina: SAMPLES.jina });
  const result = await search(PARAMS);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://s.jina.ai/claude%20code%20hooks');
  assert.equal(calls[0].method, 'GET');
  assert.equal(calls[0].headers.authorization, `Bearer ${FAKE.jina}`);

  assert.equal(result.service, 'jina-search');
  assert.equal(result.data.service, 'jina-search');
  assert.equal(result.data.results[0].title, 'Hooks reference - Claude Code Docs');
  assert.equal(result.data.results[0].url, 'https://docs.example.com/claude-code/hooks');
  assert.equal(result.data.results[0].content, SAMPLES.jina.data[0].content);
  assert.equal(result.data.results[1].content, SAMPLES.jina.data[1].description);
});

test('Jina: legacy JINA_API_KEY still enables the provider', async () => {
  const search = await loadSearch({ JINA_API_KEY: FAKE.jina });
  const calls = stubFetch({ jina: SAMPLES.jina });
  const result = await search(PARAMS);
  assert.equal(result.service, 'jina-search');
  assert.equal(calls[0].headers.authorization, `Bearer ${FAKE.jina}`);
});

test('Jina: empty results move on to Firecrawl', async () => {
  const search = await loadSearch({ SEARCH_PLUS_JINA_API_KEY: FAKE.jina });
  const calls = stubFetch({ jina: EMPTY.jina, firecrawl: SAMPLES.firecrawl });
  const result = await search(PARAMS);
  assert.deepEqual(calls.map(c => c.provider), ['jina', 'firecrawl']);
  assert.equal(result.service, 'firecrawl');
});

// --- Firecrawl ---

test('Firecrawl: keyless POST has no Authorization header and normalizes data.web', async () => {
  const search = await loadSearch({});
  const calls = stubFetch({ firecrawl: SAMPLES.firecrawl });
  const result = await search(PARAMS);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.firecrawl.dev/v2/search');
  assert.equal(calls[0].method, 'POST');
  assert.equal(calls[0].headers.authorization, undefined);
  assert.deepEqual(calls[0].body, { query: 'claude code hooks', limit: 2 });

  assert.equal(result.service, 'firecrawl');
  assert.equal(result.data.service, 'firecrawl');
  assert.equal(result.data.results[0].title, 'Hooks reference - Claude Code Docs');
  assert.equal(result.data.results[0].url, 'https://docs.example.com/claude-code/hooks');
  assert.equal(result.data.results[0].content, SAMPLES.firecrawl.data.web[0].description);
});

test('Firecrawl: SEARCH_PLUS_FIRECRAWL_API_KEY is sent as a Bearer token', async () => {
  const search = await loadSearch({ SEARCH_PLUS_FIRECRAWL_API_KEY: FAKE.firecrawl });
  const calls = stubFetch({ firecrawl: SAMPLES.firecrawl });
  await search(PARAMS);
  assert.equal(calls[0].headers.authorization, `Bearer ${FAKE.firecrawl}`);
});

// --- Fallback order ---

test('fallback order: Tavily → Brave → Exa → Jina → Firecrawl when each earlier provider fails', async () => {
  const search = await loadSearch(ALL_KEYS);
  const calls = stubFetch({
    tavily: http(500, { error: 'server error' }),
    brave: http(429, {}),
    exa: EMPTY.exa,
    jina: http(401, {}),
    firecrawl: SAMPLES.firecrawl
  });
  const result = await search(PARAMS);
  assert.deepEqual(calls.map(c => c.provider), ['tavily', 'brave', 'exa', 'jina', 'firecrawl']);
  assert.equal(result.service, 'firecrawl');
});

test('fallback order: Tavily failure is answered by Brave before Exa or Jina are tried', async () => {
  const search = await loadSearch(ALL_KEYS);
  const calls = stubFetch({ tavily: http(500, {}), brave: SAMPLES.brave, exa: SAMPLES.exa, jina: SAMPLES.jina });
  const result = await search(PARAMS);
  assert.deepEqual(calls.map(c => c.provider), ['tavily', 'brave']);
  assert.equal(result.service, 'brave');
});

test('all providers failing throws an error listing every configuration option', async () => {
  const search = await loadSearch(ALL_KEYS);
  stubFetch({ firecrawl: EMPTY.firecrawl });
  await assert.rejects(search(PARAMS), (err) => {
    for (const name of ['SEARCH_PLUS_TAVILY_API_KEY', 'SEARCH_PLUS_BRAVE_API_KEY', 'SEARCH_PLUS_EXA_API_KEY',
      'SEARCH_PLUS_JINA_API_KEY', 'SEARCH_PLUS_FIRECRAWL_API_KEY', 'SEARCH_PLUS_SEARXNG_URL']) {
      assert.match(err.message, new RegExp(name));
    }
    return true;
  });
});

// --- SearXNG ---

test('SearXNG: GETs <base>/search?q=…&format=json (trailing slash trimmed, localhost allowed)', async () => {
  const search = await loadSearch({ SEARCH_PLUS_SEARXNG_URL: `${SEARXNG_BASE}/` });
  const calls = stubFetch({ searxng: SAMPLES.searxng });
  await search(PARAMS);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `${SEARXNG_BASE}/search?q=claude%20code%20hooks&format=json`);
  assert.equal(calls[0].method, 'GET');
  assert.equal(calls[0].headers.authorization, undefined, 'no auth header without an API key');
  assert.ok(calls[0].signal, 'request has a timeout signal');
});

test('SearXNG: SEARCH_PLUS_SEARXNG_API_KEY is sent as a Bearer token', async () => {
  const search = await loadSearch({ SEARCH_PLUS_SEARXNG_URL: SEARXNG_BASE, SEARCH_PLUS_SEARXNG_API_KEY: FAKE.searxng });
  const calls = stubFetch({ searxng: SAMPLES.searxng });
  await search(PARAMS);
  assert.equal(calls[0].headers.authorization, `Bearer ${FAKE.searxng}`);
});

test('SearXNG: normalizes title/url/content/publishedDate/engine and honors maxResults', async () => {
  const search = await loadSearch({ SEARCH_PLUS_SEARXNG_URL: SEARXNG_BASE });
  stubFetch({ searxng: SAMPLES.searxng });
  const result = await search(PARAMS);

  assert.equal(result.service, 'searxng');
  assert.equal(result.data.service, 'searxng');
  assert.equal(result.data.answer, null);
  assert.equal(result.data.results.length, 2, 'third result cut by maxResults');
  const [first, second] = result.data.results;
  assert.equal(first.title, 'Hooks reference - Claude Code Docs');
  assert.equal(first.url, 'https://docs.example.com/claude-code/hooks');
  assert.equal(first.content, 'Configure hooks that run on Claude Code events.');
  assert.equal(first.published_date, new Date('2026-01-20T08:30:00').toISOString());
  assert.equal(first.engine, 'duckduckgo');
  assert.equal(second.url, 'https://blog.example.org/claude-hooks');
  assert.equal(second.published_date, null);
});

test('SearXNG: tried first when configured, before Tavily and other keyed providers', async () => {
  const search = await loadSearch({ ...ALL_KEYS, SEARCH_PLUS_SEARXNG_URL: SEARXNG_BASE });
  const calls = stubFetch({ searxng: SAMPLES.searxng, tavily: SAMPLES.tavily, brave: SAMPLES.brave });
  const result = await search(PARAMS);
  assert.deepEqual(calls.map(c => c.provider), ['searxng']);
  assert.equal(result.service, 'searxng');
});

test('SearXNG: skipped when SEARCH_PLUS_SEARXNG_URL is unset', async () => {
  const search = await loadSearch(ALL_KEYS);
  const calls = stubFetch({ searxng: SAMPLES.searxng, tavily: SAMPLES.tavily });
  const result = await search(PARAMS);
  assert.deepEqual(calls.map(c => c.provider), ['tavily']);
  assert.equal(result.service, 'tavily');
});

test('SearXNG: empty results move on to Tavily', async () => {
  const search = await loadSearch({ ...ALL_KEYS, SEARCH_PLUS_SEARXNG_URL: SEARXNG_BASE });
  const calls = stubFetch({ searxng: EMPTY.searxng, tavily: SAMPLES.tavily });
  const result = await search(PARAMS);
  assert.deepEqual(calls.map(c => c.provider), ['searxng', 'tavily']);
  assert.equal(result.service, 'tavily');
});

test('SearXNG: 403 (JSON format disabled) explains the settings.yml fix and falls through', async () => {
  const search = await loadSearch({ SEARCH_PLUS_SEARXNG_URL: SEARXNG_BASE });
  const calls = stubFetch({ searxng: http(403, '403 Forbidden'), firecrawl: SAMPLES.firecrawl });
  const result = await search(PARAMS);
  assert.deepEqual(calls.map(c => c.provider), ['searxng', 'firecrawl']);
  assert.equal(result.service, 'firecrawl');
  const failure = logs.find(line => line.includes('SearXNG failed'));
  assert.ok(failure, 'SearXNG failure is logged');
  assert.match(failure, /403/);
  assert.match(failure, /json/);
  assert.match(failure, /settings\.yml/);
});
