// Docs-sync checks (PRD-009 F4): every fixed provider host the scripts fetch
// must be in SKILL.md's sandbox `allowedDomains`, and every canonical
// SEARCH_PLUS_* env var the scripts read must be documented.
//
// Offline and static: the scripts are read as text, never imported, so no
// provider code (or network access) runs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPTS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKILL_DIR = join(SCRIPTS_DIR, '..');
const PLUGIN_DIR = join(SKILL_DIR, '..', '..');
const REPO_ROOT = join(PLUGIN_DIR, '..', '..');

const SKILL_MD = join(SKILL_DIR, 'SKILL.md');
const SKILL_README = join(SKILL_DIR, 'README.md');
const CONFIGURATION_MD = join(PLUGIN_DIR, 'docs', 'CONFIGURATION.md');

const rel = (p) => relative(REPO_ROOT, p);
const read = (p) => readFileSync(p, 'utf8');

const scripts = readdirSync(SCRIPTS_DIR)
  .filter((f) => f.endsWith('.mjs'))
  .map((f) => ({ file: f, source: read(join(SCRIPTS_DIR, f)) }));

// Hosts that appear at the start of an https:// string literal in the scripts
// but are never fetched by them. Each entry needs a reason.
const IGNORED_HOSTS = {
  // Docs link in the "no providers configured" error message, not an endpoint.
  'github.com': 'documentation link in error text',
};

// Prefixed names kept only as deprecated aliases of a canonical variable.
// Unprefixed legacy names (TAVILY_API_KEY, ...) never match SEARCH_PLUS_*.
const LEGACY_ENV_VARS = {
  SEARCH_PLUS_JINAAI_API_KEY: 'deprecated alias of SEARCH_PLUS_JINA_API_KEY',
};

/**
 * Hosts of hard-coded https endpoints: string/template literals that *start*
 * with https://<host>. URLs embedded mid-string (error text, comments without
 * quotes) are not endpoints, and user-supplied URLs (direct markdown fetch,
 * user-configured SearXNG) have no literal host, so neither is collected.
 */
function collectEndpointHosts() {
  const hosts = new Map(); // host -> Set of files
  const literalUrl = /['"`]https:\/\/([A-Za-z0-9.-]+\.[A-Za-z]{2,})(?=[/:?'"`]|\$\{)/g;
  for (const { file, source } of scripts) {
    for (const [, rawHost] of source.matchAll(literalUrl)) {
      const host = rawHost.toLowerCase();
      if (host in IGNORED_HOSTS) continue;
      if (!hosts.has(host)) hosts.set(host, new Set());
      hosts.get(host).add(file);
    }
  }
  return hosts;
}

function collectEnvVars() {
  const vars = new Map(); // name -> Set of files
  const envRead = /process\.env(?:\.|\[\s*['"`])(SEARCH_PLUS_[A-Z0-9_]+)/g;
  for (const { file, source } of scripts) {
    for (const [, name] of source.matchAll(envRead)) {
      if (!vars.has(name)) vars.set(name, new Set());
      vars.get(name).add(file);
    }
  }
  return vars;
}

/** allowedDomains from the first ```jsonc block in a markdown file. */
function parseAllowedDomains(path) {
  const block = read(path).match(/```jsonc\n([\s\S]*?)```/);
  assert.ok(block, `${rel(path)}: no \`\`\`jsonc sandbox settings block found`);
  const json = block[1].replace(/^\s*\/\/.*$/gm, '');
  const domains = JSON.parse(json)?.sandbox?.network?.allowedDomains;
  assert.ok(Array.isArray(domains), `${rel(path)}: jsonc block has no sandbox.network.allowedDomains array`);
  return domains.map((d) => d.toLowerCase().replace(/:\d+$/, ''));
}

// Claude Code sandbox semantics: an entry matches its exact host; only an
// explicit wildcard (`*.example.com`) matches subdomains. A bare parent
// domain ("archive.org") does not cover "web.archive.org".
function isAllowed(host, domains) {
  return domains.some((d) => d === host || (d.startsWith('*.') && host.endsWith(d.slice(1))));
}

/** Variable names in the first column of the skill README's markdown table. */
function readmeTableVars() {
  const names = new Set();
  for (const [, name] of read(SKILL_README).matchAll(/^\|\s*`(SEARCH_PLUS_[A-Z0-9_]+)`\s*\|/gm)) {
    names.add(name);
  }
  return names;
}

const fmt = (map, keys) => keys.map((k) => `${k} (used in ${[...map.get(k)].join(', ')})`).join('\n  ');

test('scanner finds the known provider endpoints (guards against a broken regex)', () => {
  const hosts = collectEndpointHosts();
  for (const known of ['api.tavily.com', 'r.jina.ai', 'api.firecrawl.dev', 'archive.org']) {
    assert.ok(hosts.has(known), `endpoint scanner no longer detects ${known}; fix collectEndpointHosts()`);
  }
  const vars = collectEnvVars();
  assert.ok(vars.has('SEARCH_PLUS_TAVILY_API_KEY'), 'env var scanner no longer detects SEARCH_PLUS_TAVILY_API_KEY');
});

test('every provider endpoint host is in SKILL.md sandbox allowedDomains', () => {
  const hosts = collectEndpointHosts();
  const domains = parseAllowedDomains(SKILL_MD);
  const missing = [...hosts.keys()].filter((h) => !isAllowed(h, domains)).sort();
  assert.deepEqual(
    missing,
    [],
    `Add these hosts to the "allowedDomains" list in ${rel(SKILL_MD)} (and the copy in ${rel(SKILL_README)}):\n  ` +
      fmt(hosts, missing) +
      `\nIf a host is not actually fetched, add it to IGNORED_HOSTS in this test with a reason.`
  );
});

test('skill README sandbox example matches SKILL.md allowedDomains', () => {
  const skill = new Set(parseAllowedDomains(SKILL_MD));
  const readme = new Set(parseAllowedDomains(SKILL_README));
  const onlySkill = [...skill].filter((d) => !readme.has(d)).sort();
  const onlyReadme = [...readme].filter((d) => !skill.has(d)).sort();
  assert.deepEqual(
    { missingFromReadme: onlySkill, missingFromSkillMd: onlyReadme },
    { missingFromReadme: [], missingFromSkillMd: [] },
    `The allowedDomains blocks in ${rel(SKILL_MD)} and ${rel(SKILL_README)} have drifted; make them identical.`
  );
});

test('every canonical SEARCH_PLUS_* env var is documented', () => {
  const vars = collectEnvVars();
  const table = readmeTableVars();
  const configuration = read(CONFIGURATION_MD);
  const canonical = [...vars.keys()].filter((v) => !(v in LEGACY_ENV_VARS)).sort();

  // Provider settings (API keys, endpoint URLs) belong in the skill README's
  // env var table, which ships with the skill.
  const providerVars = canonical.filter((v) => /_(API_KEY|URL)$/.test(v));
  const missingProvider = providerVars.filter((v) => !table.has(v));
  assert.deepEqual(
    missingProvider,
    [],
    `Add a row for each of these to the "Environment variables" table in ${rel(SKILL_README)}:\n  ` +
      fmt(vars, missingProvider)
  );

  // Tuning and feature flags may live in either the skill README table or
  // the plugin's CONFIGURATION.md reference.
  const otherVars = canonical.filter((v) => !providerVars.includes(v));
  const missingOther = otherVars.filter((v) => !table.has(v) && !configuration.includes(v));
  assert.deepEqual(
    missingOther,
    [],
    `Document these in the "Environment variables" table in ${rel(SKILL_README)} ` +
      `or in ${rel(CONFIGURATION_MD)}:\n  ` +
      fmt(vars, missingOther)
  );
});
