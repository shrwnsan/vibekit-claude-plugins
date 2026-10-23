// Head-to-head: Tavily vs TinyFish search, to decide their order in performHybridSearch().
// Each query runs through the real plugin code path (performHybridSearch) once per
// provider, with only that provider's key set; Brave and Exa run the same query as
// a reference set for consensus overlap. Expected authoritative domains are fixed
// below, before any run, so the domain-hit metric is not tuned to the results.
// Usage (repo root): node evals/search-plus/compare-search-tavily-tinyfish.mjs <out.json>
// Needs SEARCH_PLUS_TAVILY_API_KEY and SEARCH_PLUS_TINYFISH_API_KEY; Brave/Exa keys optional.
import { writeFileSync } from 'fs';

const SCRIPTS = new URL('../../plugins/search-plus/skills/meta-search/scripts/', import.meta.url).pathname;
const MAX_RESULTS = 5; // plugin default

// [query, expected authoritative domains (null = no single authority)]
// The first 16 are eval-027's search scenarios; the rest add recency,
// error-message, and package lookups, which the hook sees in practice.
const QUERIES = [
  ['Claude Code plugin development best practices', ['code.claude.com', 'docs.claude.com', 'docs.anthropic.com', 'anthropic.com']],
  ['JavaScript async await documentation examples', ['developer.mozilla.org']],
  ['React Vue Angular Next.js Vite default development ports 2025', ['vite.dev', 'vitejs.dev', 'nextjs.org', 'angular.dev', 'vuejs.org', 'react.dev']],
  ['PostgreSQL MySQL MongoDB Redis default ports development 2025', ['postgresql.org', 'dev.mysql.com', 'mongodb.com', 'redis.io']],
  ['Node.js child_process spawn security best practices', ['nodejs.org']],
  ['kubernetes pod restart policy documentation', ['kubernetes.io']],
  ['Python asyncio gather tutorial examples', ['docs.python.org']],
  ['git rebase vs merge workflow comparison', ['git-scm.com', 'atlassian.com']],
  ['rust ownership borrowing explained documentation', ['doc.rust-lang.org']],
  ['MDN fetch API error handling guide', ['developer.mozilla.org']],
  ['docker compose networking default ports documentation', ['docs.docker.com']],
  ['financial data APIs free tier comparison 2025', null],
  ['reddit claude code plugin recommendations', ['reddit.com']],
  ['SEC EDGAR company search API documentation', ['sec.gov']],
  ['site reliability engineering error budget examples', ['sre.google']],
  ['TLS 1.3 handshake explanation documentation', ['rfc-editor.org', 'datatracker.ietf.org', 'cloudflare.com']],
  ['latest Node.js LTS release', ['nodejs.org']],
  ['TypeScript 5.9 release notes', ['typescriptlang.org', 'devblogs.microsoft.com']],
  ['Python 3.14 what\'s new', ['docs.python.org']],
  ['TypeError: Cannot read properties of undefined (reading \'map\') react', ['stackoverflow.com']],
  ['ERR_REQUIRE_ESM node fix', ['stackoverflow.com', 'nodejs.org']],
  ['zod npm package', ['npmjs.com', 'zod.dev', 'github.com']],
  ['ripgrep github', ['github.com']],
  ['postgres jsonb index gin vs btree', ['postgresql.org']],
  ['nginx reverse proxy websocket configuration', ['nginx.org', 'nginx.com']],
  ['github actions cache node_modules', ['docs.github.com', 'github.com']],
  ['claude code hooks PostToolUse', ['code.claude.com', 'docs.claude.com', 'docs.anthropic.com']],
  ['AWS S3 presigned URL expiration limit', ['docs.aws.amazon.com']],
  ['CSS container queries browser support', ['caniuse.com', 'developer.mozilla.org']],
  ['OpenTelemetry collector configuration exporters', ['opentelemetry.io']]
];

const KEY_ENV = {
  tavily: 'SEARCH_PLUS_TAVILY_API_KEY',
  tinyfish: 'SEARCH_PLUS_TINYFISH_API_KEY',
  brave: 'SEARCH_PLUS_BRAVE_API_KEY',
  exa: 'SEARCH_PLUS_EXA_API_KEY'
};
const PROVIDER_ENV = [
  ...Object.values(KEY_ENV), 'TAVILY_API_KEY', 'BRAVE_API_KEY', 'EXA_API_KEY',
  'SEARCH_PLUS_JINA_API_KEY', 'SEARCH_PLUS_JINAAI_API_KEY', 'JINA_API_KEY', 'JINAAI_API_KEY',
  'SEARCH_PLUS_SEARXNG_URL', 'SEARCH_PLUS_FIRECRAWL_API_KEY'
];
const savedKeys = Object.fromEntries(Object.entries(KEY_ENV).map(([p, name]) => [p, process.env[name]]));
for (const p of ['tavily', 'tinyfish']) {
  if (!savedKeys[p]) throw new Error(`${KEY_ENV[p]} is required`);
}

// content-extractor.mjs (where tavily.search reads its key) is imported once, by
// the first handle-web-search instance; pin the Tavily key before that import.
for (const name of PROVIDER_ENV) delete process.env[name];
process.env.SEARCH_PLUS_TAVILY_API_KEY = savedKeys.tavily;
await import(`${SCRIPTS}content-extractor.mjs`);

// One handle-web-search instance per provider, with only that provider's key set.
// Keys are read at import time; the query string forces a fresh evaluation.
const search = {};
for (const p of Object.keys(KEY_ENV)) {
  if (!savedKeys[p]) continue;
  for (const name of PROVIDER_ENV) delete process.env[name];
  process.env[KEY_ENV[p]] = savedKeys[p];
  search[p] = (await import(`${SCRIPTS}handle-web-search.mjs?only=${p}`)).performHybridSearch;
}
for (const name of PROVIDER_ENV) delete process.env[name];

const host = (url) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } };
const norm = (url) => { try { const u = new URL(url); return `${u.hostname.replace(/^www\./, '')}${u.pathname.replace(/\/+$/, '')}`; } catch { return url; } };
const matches = (h, domains) => domains.some((d) => h === d || h.endsWith(`.${d}`));

// search.mjs (the CLI the skill runs) uses 10s per provider; the hook uses 8s.
const TIMEOUT_MS = 10000;
const LABEL = { tavily: 'Tavily', tinyfish: 'TinyFish Search', brave: 'Brave Search', exa: 'Exa Search' };

async function run(provider, query) {
  const t0 = Date.now();
  const log = console.log;
  const lines = [];
  console.log = (...m) => lines.push(m.join(' '));
  try {
    const r = await search[provider]({ query, maxResults: MAX_RESULTS, includeAnswer: true }, TIMEOUT_MS);
    // Keyless Firecrawl is the chain's last resort; a Firecrawl answer means this provider failed.
    if (r.service !== provider) {
      const reason = lines.find((l) => l.includes(`${LABEL[provider]} failed:`))?.split('failed: ')[1];
      return { ok: false, ms: Date.now() - t0, error: reason || `fell through to ${r.service}`, results: [] };
    }
    return {
      ok: true,
      ms: Date.now() - t0,
      answer: r.data.answer || null,
      results: r.data.results.map((x) => ({ title: x.title, url: x.url, snippet: x.content, date: x.published_date }))
    };
  } catch (e) {
    return { ok: false, ms: Date.now() - t0, error: e.message.split('\n')[0], results: [] };
  } finally {
    console.log = log;
  }
}

const rows = [];
for (const [query, expected] of QUERIES) {
  const row = { query, expected, providers: {} };
  for (const p of Object.keys(search)) {
    row.providers[p] = await run(p, query);
    await new Promise((r) => setTimeout(r, 300)); // stay well under TinyFish's 30 req/min
  }
  const reference = new Set(['brave', 'exa'].flatMap((p) => (row.providers[p]?.results || []).map((x) => norm(x.url))));
  for (const p of ['tavily', 'tinyfish']) {
    const r = row.providers[p];
    const rank = expected ? r.results.findIndex((x) => matches(host(x.url), expected)) + 1 : null;
    r.authorityRank = rank === 0 ? null : rank; // 1-based rank of first expected-domain hit
    r.referenceOverlap = reference.size ? r.results.filter((x) => reference.has(norm(x.url))).length : null;
    r.avgSnippetChars = r.results.length ? Math.round(r.results.reduce((n, x) => n + (x.snippet || '').length, 0) / r.results.length) : 0;
  }
  const overlap = (() => {
    const a = new Set(row.providers.tavily.results.map((x) => norm(x.url)));
    return row.providers.tinyfish.results.filter((x) => a.has(norm(x.url))).length;
  })();
  row.tavilyTinyfishOverlap = overlap;
  rows.push(row);
  const fmt = (p) => {
    const r = row.providers[p];
    return r.ok ? `${p} ${String(r.ms).padStart(5)}ms n=${r.results.length} auth@${r.authorityRank ?? '-'} ref=${r.referenceOverlap ?? '-'}` : `${p} FAIL (${r.error})`;
  };
  console.log(`${fmt('tavily')} | ${fmt('tinyfish')} | overlap=${overlap}  ${query.slice(0, 60)}`);
}

const stats = (p) => {
  const rs = rows.map((r) => r.providers[p]);
  const ok = rs.filter((r) => r.ok);
  const scored = rows.filter((r) => r.expected && r.providers[p].ok);
  const ms = ok.map((r) => r.ms).sort((a, b) => a - b);
  return {
    ok: ok.length,
    total: rs.length,
    medianMs: ms[Math.floor(ms.length / 2)] ?? null,
    p90Ms: ms[Math.floor(ms.length * 0.9)] ?? null,
    authorityHitTop1: scored.filter((r) => r.providers[p].authorityRank === 1).length,
    authorityHitTop3: scored.filter((r) => r.providers[p].authorityRank && r.providers[p].authorityRank <= 3).length,
    authorityHitTop5: scored.filter((r) => r.providers[p].authorityRank).length,
    authorityScored: scored.length,
    meanReferenceOverlap: ok.length && ok[0].referenceOverlap !== null ? +(ok.reduce((n, r) => n + r.referenceOverlap, 0) / ok.length).toFixed(2) : null,
    meanSnippetChars: ok.length ? Math.round(ok.reduce((n, r) => n + r.avgSnippetChars, 0) / ok.length) : null,
    answers: ok.filter((r) => r.answer).length
  };
};
const summary = {
  date: new Date().toISOString(),
  maxResults: MAX_RESULTS,
  reference: Object.keys(search).filter((p) => p === 'brave' || p === 'exa'),
  tavily: stats('tavily'),
  tinyfish: stats('tinyfish'),
  meanTavilyTinyfishOverlap: +(rows.reduce((n, r) => n + r.tavilyTinyfishOverlap, 0) / rows.length).toFixed(2),
  rows
};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(summary, null, 2) + '\n');
const { rows: _rows, ...headline } = summary;
console.log('\n' + JSON.stringify(headline, null, 2));
