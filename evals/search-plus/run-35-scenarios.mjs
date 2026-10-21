// Re-measurement of the eval-012 "35 scenarios" benchmark against current main.
// The original doc enumerates 4 search queries verbatim and describes the rest
// as searches + URL extractions across documentation sites, financial platforms,
// and social media. This suite reconstructs 35 scenarios in that shape and runs
// them through the real plugin code path (handleWebSearch), keyless, sequentially.
// Usage: node run-35-scenarios.mjs <out.json>
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';

const SCRIPTS = new URL('../../plugins/search-plus/skills/meta-search/scripts/', import.meta.url).pathname;
const { handleWebSearch } = await import(`${SCRIPTS}/handle-web-search.mjs`);

const SEARCHES = [
  // The 4 queries documented verbatim in eval-012
  'Claude Code plugin development best practices',
  'JavaScript async await documentation examples',
  'React Vue Angular Next.js Vite default development ports 2025',
  'PostgreSQL MySQL MongoDB Redis default ports development 2025',
  // Same spirit: developer documentation lookups
  'Node.js child_process spawn security best practices',
  'kubernetes pod restart policy documentation',
  'Python asyncio gather tutorial examples',
  'git rebase vs merge workflow comparison',
  'rust ownership borrowing explained documentation',
  'MDN fetch API error handling guide',
  'docker compose networking default ports documentation',
  // The documented problem domains: finance and social
  'financial data APIs free tier comparison 2025',
  'reddit claude code plugin recommendations',
  'SEC EDGAR company search API documentation',
  'site reliability engineering error budget examples',
  'TLS 1.3 handshake explanation documentation'
];

const EXTRACTIONS = [
  // Documentation sites
  'https://developer.mozilla.org/en-US/docs/Web/API/fetch',
  'https://react.dev/reference/react/hooks',
  'https://docs.python.org/3/library/asyncio.html',
  'https://nodejs.org/api/fs.html',
  'https://go.dev/doc/effective_go',
  'https://www.rust-lang.org/learn',
  // Financial platforms (classic 403-heavy)
  'https://finance.yahoo.com/quote/AAPL/',
  'https://www.bloomberg.com/markets',
  'https://www.reuters.com/markets/',
  'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0000320193',
  // Social media (heavy blockers)
  'https://news.ycombinator.com/news',
  'https://www.reddit.com/r/ClaudeAI/top/',
  'https://x.com/AnthropicAI',
  'https://mastodon.social/@anthropic',
  // Ordinary sites
  'https://en.wikipedia.org/wiki/Search_engine_indexing',
  'https://www.iana.org/domains/reserved',
  'https://httpbin.org/html',
  // Honest-failure controls: reserved domain (validator rejects by design)
  // and a clean 404 (structured failure through the chain incl. Wayback)
  'https://example.com/',
  'https://httpstat.us/404'
];

const SCENARIOS = [
  ...SEARCHES.map((q) => ({ kind: 'search', name: q, query: q })),
  ...EXTRACTIONS.map((u) => ({ kind: 'extract', name: u, query: u }))
];

function classify(result) {
  if (!result) return { success: false, silent: true, reason: 'no result' };
  if (result.error) return { success: false, silent: !result.message, reason: result.message?.slice(0, 160) };
  if (result.success === true) {
    // Search shape: { success, data: { results: [...] }, service }
    if (Array.isArray(result.data?.results)) {
      const count = result.data.results.length;
      const hasAnswer = Boolean(result.data.answer);
      if (count > 0 || hasAnswer) return { success: true, count, service: result.service };
      return { success: false, silent: false, reason: 'success=true but empty result set' };
    }
    // Extraction shape: { success, data: { content, service, url }, isURLExtraction }
    // or the raw extractContent result { success, content, contentLength, service }
    const content = result.data?.content ?? result.content;
    const len = result.data?.content?.length ?? result.contentLength ?? result.content?.length ?? 0;
    const service = result.data?.service ?? result.service;
    if (len >= 100 && typeof content === 'string') return { success: true, count: len, service };
    return { success: false, silent: false, reason: `success=true but content too short (${len})` };
  }
  const msg = result.message || result.error?.message;
  return { success: false, silent: !msg, reason: msg ? String(msg).slice(0, 160) : 'unstructured failure' };
}

const results = [];
for (const s of SCENARIOS) {
  const t0 = Date.now();
  const errs = [];
  const origErr = console.error;
  const origLog = console.log;
  console.error = (...m) => errs.push(m.join(' '));
  console.log = () => {};
  let result;
  try {
    result = await Promise.race([
      handleWebSearch({ query: s.query, timeout: 45000 }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('scenario wall-clock timeout (120s)')), 120000))
    ]);
  } catch (e) {
    result = { success: false, error: true, message: e.message };
  }
  console.error = origErr;
  console.log = origLog;
  const verdict = classify(result);
  const record = {
    kind: s.kind,
    scenario: s.name,
    ok: verdict.success,
    service: verdict.service ?? null,
    resultCount: verdict.count ?? null,
    ms: Date.now() - t0,
    silent: verdict.silent === true,
    reason: verdict.success ? null : verdict.reason,
    usedFallback: /jina|firecrawl|wayback|defuddle|brave|exa/i.test(errs.join(' '))
  };
  results.push(record);
  console.log(`${record.ok ? 'PASS' : 'FAIL'}  [${s.kind}]  ${String(record.ms).padStart(6)}ms  ${s.name.slice(0, 70)}${record.service ? `  (via ${record.service})` : ''}${record.ok ? '' : `  — ${record.reason ?? 'silent'}`}`);
}

const by = (k) => results.filter((r) => r.kind === k);
const summary = {
  date: new Date().toISOString(),
  version: '3.4.0 (main bb962cd + working tree clean)',
  config: 'keyless (no API keys set), sequential, real network',
  total: results.length,
  passed: results.filter((r) => r.ok).length,
  silent: results.filter((r) => r.silent).length,
  search: { total: by('search').length, passed: by('search').filter((r) => r.ok).length },
  extract: { total: by('extract').length, passed: by('extract').filter((r) => r.ok).length },
  controlsExpectedFail: ['https://example.com/', 'https://httpstat.us/404'],
  results
};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(summary, null, 2) + '\n');
console.log(`\n=== ${summary.passed}/${summary.total} passed  (search ${summary.search.passed}/${summary.search.total}, extract ${summary.extract.passed}/${summary.extract.total}, silent failures ${summary.silent})`);
