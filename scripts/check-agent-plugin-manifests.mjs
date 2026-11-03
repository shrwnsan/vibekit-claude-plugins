#!/usr/bin/env node
// CI check for dual-manifest plugins: each covered plugin ships BOTH a
// Claude Code manifest (.claude-plugin/plugin.json) and an Agent Plugins
// v1.0.0 manifest (plugin.json). Validates each Agent Plugins manifest
// structurally per the v1.0.0 specification (closed top-level field set,
// canonical $schema, name charset rules) and asserts name/version/description
// stay in sync across the two manifests. Zero dependencies.
//
// Usage:
//   node scripts/check-agent-plugin-manifests.mjs            # all covered plugins
//   node scripts/check-agent-plugin-manifests.mjs plugins/x  # one plugin
//
// Covered: tempo, base, search-plus — their skills are the portable payload.
// Not covered: ping (no skills or MCP servers, so its portable package would
// be empty) and haku (vendored from shrwnsan/haku; the manifest belongs
// upstream).
import { readFileSync } from 'node:fs';
import path from 'node:path';

const COVERED = ['plugins/tempo', 'plugins/base', 'plugins/search-plus'];
const AP_SCHEMA = 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json';
// Closed top-level field set per Agent Plugins v1.0.0 §5.2.
const AP_FIELDS = new Set([
  '$schema', 'name', 'version', 'description', 'author',
  'homepage', 'repository', 'license', 'keywords', 'extensions',
]);

const read = (p, errors) => {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch (e) {
    errors.push(`${p}: invalid JSON (${e.message})`);
    return null;
  }
};

function checkPlugin(dir) {
  const errors = [];
  const ap = read(path.join(dir, 'plugin.json'), errors);
  const cc = read(path.join(dir, '.claude-plugin', 'plugin.json'), errors);
  if (!ap || !cc) return errors;

  // Agent Plugins manifest structure (§5).
  if (ap.$schema !== AP_SCHEMA) {
    errors.push(`$schema must be exactly ${AP_SCHEMA}`);
  }
  for (const f of Object.keys(ap)) {
    if (!AP_FIELDS.has(f)) errors.push(`unknown top-level field "${f}" (schema is closed)`);
  }
  const name = ap.name;
  const nameOk =
    typeof name === 'string' && name.length >= 1 && name.length <= 64 &&
    /^[a-z0-9.-]+$/.test(name) &&
    /^[a-z0-9]/.test(name) && /[a-z0-9]$/.test(name) &&
    !name.includes('--') && !name.includes('..');
  if (!nameOk) errors.push(`invalid name "${name}" (1-64 chars, a-z 0-9 . -, must start/end alphanumeric, no -- or ..)`);
  for (const f of ['version', 'description', 'license']) {
    if (ap[f] !== undefined && typeof ap[f] !== 'string') errors.push(`${f} must be a string`);
  }
  if (ap.keywords !== undefined && (!Array.isArray(ap.keywords) || ap.keywords.some((k) => typeof k !== 'string'))) {
    errors.push('keywords must be an array of strings');
  }
  if (ap.author !== undefined) {
    const a = ap.author;
    const ok = a !== null && typeof a === 'object' && !Array.isArray(a) &&
      Object.keys(a).every((k) => ['name', 'email', 'url'].includes(k) && typeof a[k] === 'string');
    if (!ok) errors.push('author must be an object with only string name/email/url fields');
  }

  // Sync with the Claude Code manifest.
  for (const f of ['name', 'version', 'description']) {
    if (ap[f] !== cc[f]) {
      errors.push(`manifest drift: ${f} differs — plugin.json "${ap[f]}" vs .claude-plugin/plugin.json "${cc[f]}"`);
    }
  }
  return errors;
}

const dirs = process.argv[2] ? [process.argv[2]] : COVERED;
let failed = 0;
for (const dir of dirs) {
  const errors = checkPlugin(dir);
  if (errors.length) {
    failed++;
    console.error(`${dir}: FAILED`);
    for (const e of errors) console.error(`  - ${e}`);
  } else {
    const ap = JSON.parse(readFileSync(path.join(dir, 'plugin.json'), 'utf8'));
    console.log(`${dir}: OK (name=${ap.name} version=${ap.version})`);
  }
}
process.exit(failed ? 1 : 0);
