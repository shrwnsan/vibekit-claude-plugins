// Offline regression tests for the meta-search hook decision logic and output
// formatting. No network access and no API keys required:
//   node --test tests/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { detectFailure, extractQuery } from '../hook-entry.mjs';
import { formatResult } from '../handle-web-search.mjs';
import { validateMeaningfulContent, isDirectMarkdownResponse } from '../content-extractor.mjs';

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url)) + '/..';

// --- detectFailure: PostToolUseFailure (real WebFetch/WebSearch errors) ---

test('PostToolUseFailure with an HTTP status reports that status', () => {
  const input = { hook_event_name: 'PostToolUseFailure', error: 'Error: fetch failed with 403' };
  assert.equal(detectFailure(input), '403');
});

test('PostToolUseFailure without a status still reports a generic error', () => {
  const input = { hook_event_name: 'PostToolUseFailure', error: 'Error: something broke' };
  assert.equal(detectFailure(input), 'error');
});

test('PostToolUseFailure user interrupt is ignored', () => {
  const input = { hook_event_name: 'PostToolUseFailure', is_interrupt: true, error: '403' };
  assert.equal(detectFailure(input), null);
});

// --- detectFailure: false positives (a working page that mentions failure words) ---

test('WebFetch success page mentioning 429/empty does NOT trigger recovery', () => {
  const input = {
    hook_event_name: 'PostToolUse',
    tool_name: 'WebFetch',
    tool_response: { code: 200, result: 'The API returned 429 errors and empty pages in our tests.' },
  };
  assert.equal(detectFailure(input), null);
});

test('WebSearch results mentioning 429/empty but carrying links do NOT trigger recovery', () => {
  const input = {
    hook_event_name: 'PostToolUse',
    tool_name: 'WebSearch',
    tool_response: [{ title: 'Rate limits (429)', url: 'https://example.com/limits' }],
  };
  assert.equal(detectFailure(input), null);
});

// --- detectFailure: genuine PostToolUse failures ---

test('WebFetch response with code >= 400 is a failure', () => {
  const input = { hook_event_name: 'PostToolUse', tool_name: 'WebFetch', tool_response: { code: 403 } };
  assert.equal(detectFailure(input), '403');
});

test('WebSearch "did 0 searches" is a failure', () => {
  const input = { hook_event_name: 'PostToolUse', tool_name: 'WebSearch', tool_response: 'I did 0 searches.' };
  assert.equal(detectFailure(input), 'did 0 searches');
});

test('WebSearch object without any link is empty results', () => {
  const input = { hook_event_name: 'PostToolUse', tool_name: 'WebSearch', tool_response: [{ title: 'no link here' }] };
  assert.equal(detectFailure(input), 'empty results');
});

test('missing tool_response is not a failure', () => {
  assert.equal(detectFailure({ hook_event_name: 'PostToolUse', tool_name: 'WebFetch' }), null);
});

// --- extractQuery ---

test('extractQuery reads url for WebFetch and query for WebSearch', () => {
  assert.equal(extractQuery({ tool_name: 'WebFetch', tool_input: { url: 'https://example.com' } }), 'https://example.com');
  assert.equal(extractQuery({ tool_name: 'WebSearch', tool_input: { query: 'rate limits' } }), 'rate limits');
  assert.equal(extractQuery({ tool_name: 'WebFetch' }), null);
});

// --- formatResult: compact markdown, never raw JSON dumps ---

test('formatResult renders URL extraction as title + source + content', () => {
  const md = formatResult({
    isURLExtraction: true,
    data: { url: 'https://example.com', service: 'firecrawl', metadata: { title: 'Example' }, content: '  Hello  ' },
  });
  assert.equal(md, '# Example\nSource: https://example.com (via firecrawl)\n\nHello');
});

test('formatResult renders search results as a numbered markdown list', () => {
  const md = formatResult({
    data: {
      query: 'test', service: 'firecrawl', answer: null,
      results: [{ title: 'A', url: 'https://a.example', content: 'snippet' }],
    },
  });
  assert.match(md, /^Search results for "test" \(via firecrawl\)/);
  assert.match(md, /1\. \[A\]\(https:\/\/a\.example\)/);
  assert.match(md, /snippet/);
});

test('formatResult truncates snippets over 800 chars', () => {
  const md = formatResult({
    data: {
      query: 'q', results: [{ title: 't', url: 'https://x', content: 'x'.repeat(900) }],
    },
  });
  const snippetLine = md.split('\n').find(l => l.startsWith('   '));
  assert.ok(snippetLine.length < 810, `snippet too long: ${snippetLine.length}`);
  assert.ok(snippetLine.endsWith('…'));
});

// --- subprocess behavior: hooks must never emit non-JSON or non-zero exits ---

function runScript(script, stdin) {
  return execFileSync('node', [join(SCRIPTS_DIR, script)], {
    input: stdin, encoding: 'utf8', env: { ...process.env, SEARCH_PLUS_DEBUG: '' },
  });
}

test('hook-entry exits 0 with EMPTY stdout on a healthy result (false positive)', () => {
  const out = runScript('hook-entry.mjs', JSON.stringify({
    hook_event_name: 'PostToolUse',
    tool_name: 'WebFetch',
    tool_input: { url: 'https://example.com' },
    tool_response: { code: 200, result: 'page mentioning 429 and empty things' },
  }));
  assert.equal(out, '');
});

test('hook-entry stdout is valid hookSpecificOutput JSON or empty, never prose', () => {
  // Status-code failure triggers recovery; on this offline/no-key machine the
  // recovery cannot succeed, so stdout must stay empty — but either way it can
  // never be a progress log or a partial JSON.
  const out = runScript('hook-entry.mjs', JSON.stringify({
    hook_event_name: 'PostToolUse',
    tool_name: 'WebFetch',
    tool_input: { url: 'https://example.com' },
    tool_response: { code: 403 },
  }));
  if (out !== '') {
    const parsed = JSON.parse(out); // throws if progress text leaked into stdout
    assert.ok(parsed.hookSpecificOutput.additionalContext.length <= 10000);
  }
});

test('hook-entry runs main() when invoked through a symlinked plugin root', () => {
  // A healthy-result test can't catch a broken entry guard (empty stdout either way),
  // so assert main() actually ran: with debug on, recovery logs to stderr. A localhost
  // URL is rejected by SSRF validation before any network call.
  const dir = mkdtempSync(join(tmpdir(), 'sp-link-'));
  try {
    const link = join(dir, 'scripts');
    symlinkSync(SCRIPTS_DIR, link, 'dir');
    const res = spawnSync('node', [join(link, 'hook-entry.mjs')], {
      encoding: 'utf8',
      env: { ...process.env, SEARCH_PLUS_DEBUG: '1' },
      input: JSON.stringify({
        hook_event_name: 'PostToolUseFailure',
        tool_name: 'WebFetch',
        tool_input: { url: 'http://localhost/x' },
        error: 'Request failed with status code 403',
      }),
    });
    assert.equal(res.status, 0);
    assert.equal(res.stdout, '');
    assert.match(res.stderr, /Extracting content from URL/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('search.mjs without arguments exits 1 with usage on stderr and clean stdout', () => {
  assert.throws(
    () => execFileSync('node', [join(SCRIPTS_DIR, 'search.mjs')], { encoding: 'utf8' }),
    (err) => {
      assert.equal(err.status, 1);
      assert.match(err.stderr, /Usage/);
      assert.equal(err.stdout, '');
      return true;
    },
  );
});

// --- URL gate: reserved test domains are rejected with an actionable message ---

test('search.mjs rejects example.com as a reserved test domain, exit 1 with wording on stderr', () => {
  assert.throws(
    () => execFileSync('node', [join(SCRIPTS_DIR, 'search.mjs'), 'https://example.com'], {
      encoding: 'utf8', env: { ...process.env, SEARCH_PLUS_DEBUG: '' },
    }),
    (err) => {
      assert.equal(err.status, 1);
      assert.match(err.stderr, /reserved test domain/);
      assert.match(err.stderr, /example\.com/);
      assert.equal(err.stdout, '');
      return true;
    },
  );
});

// --- validateMeaningfulContent: provider-output false signals ---

test('Jina Reader frontmatter keys are not treated as failure patterns', () => {
  const jinaOutput = [
    'Title: Plugin Marketplace Guide',
    'URL Source: https://example.com/guide',
    'Markdown Content:',
    '',
    'This guide explains how to structure a plugin marketplace with more than',
    'enough real prose to pass every length and uniqueness check that the',
    'validator applies to extracted pages of this kind.'
  ].join('\n');
  const result = validateMeaningfulContent(jinaOutput, 'jina');
  assert.equal(result.isMeaningful, true, `expected meaningful, got: ${JSON.stringify(result)}`);
});

test('Wayback banner chrome does not fail validation for wayback-sourced content', () => {
  const waybackContent = [
    'The Wayback Machine - http://web.archive.org/web/20070106041556/http://homepage.mac.com/a.arai/index.html',
    '',
    'このページは2004年頃の個人的なホームページのアーカイブです。ブログへのリンク、',
    'カウンター画像、著作権表示が含まれており、アーカイブバナーの下には当時の本当の',
    'コンテンツが残っています。回収された内容は本来のページそのものです。'
  ].join('\n');
  const result = validateMeaningfulContent(waybackContent, 'wayback (via defuddle)');
  assert.equal(result.isMeaningful, true, `expected meaningful, got: ${JSON.stringify(result)}`);
});

test('Wayback and archive patterns still fail validation for non-wayback sources', () => {
  const content = 'The Wayback Machine has no snapshot of this page and archive.org could not help. '.repeat(4);
  const result = validateMeaningfulContent(content, 'jina');
  assert.equal(result.isMeaningful, false);
  assert.equal(result.reason, 'useless_pattern_detected');
});

test('Parked-domain for-sale spam fails validation', () => {
  const spam = [
    'Buy this domain — premium domain name available now.',
    'This domain is for sale through our escrow service.',
    'Domain appraisal and broker consultation available on request.',
    'Related links: sponsored listings, whois lookup, trademark notice.',
    'Make an offer today; serious inquiries only, financing available.',
    'Kineticharbor.com — copyright notice, privacy policy, contact webmaster.'
  ].join(' ').repeat(3);
  const result = validateMeaningfulContent(spam, 'firecrawl');
  assert.equal(result.isMeaningful, false, `expected useless, got: ${JSON.stringify(result)}`);
  assert.equal(result.pattern, 'buy this domain');
});

// --- isDirectMarkdownResponse: guard for the direct Accept: text/markdown fetch ---

test('direct markdown guard accepts 200 text/markdown with a body', () => {
  assert.equal(isDirectMarkdownResponse(200, 'text/markdown', '# Hello world'), true);
});

test('direct markdown guard accepts charset parameters on the content type', () => {
  assert.equal(isDirectMarkdownResponse(200, 'text/markdown; charset=utf-8', '# Hello world'), true);
});

test('direct markdown guard rejects 200 HTML (servers that ignore the Accept header)', () => {
  assert.equal(isDirectMarkdownResponse(200, 'text/html; charset=utf-8', '<html><body>page</body></html>'), false);
});

test('direct markdown guard rejects empty bodies', () => {
  assert.equal(isDirectMarkdownResponse(200, 'text/markdown', ''), false);
});

test('direct markdown guard rejects non-200 statuses even with a markdown content type', () => {
  assert.equal(isDirectMarkdownResponse(404, 'text/markdown', '# missing'), false);
});
