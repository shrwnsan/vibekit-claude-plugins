#!/usr/bin/env node
// CI check for tempo's dual manifests:
//   plugins/tempo/.claude-plugin/plugin.json  (Claude Code plugin manifest)
//   plugins/tempo/plugin.json                 (Agent Plugins v1.0.0 manifest)
// Validates the Agent Plugins manifest structurally against the v1.0.0
// specification (closed top-level field set, canonical $schema, name
// charset rules) and asserts name/version/description stay in sync across
// both manifests. Zero dependencies.
//
// Usage: node scripts/check-tempo-manifests.mjs [plugin-dir]  (default plugins/tempo)
import { readFileSync } from 'node:fs';
import path from 'node:path';

const pluginDir = process.argv[2] ?? 'plugins/tempo';
const AP_SCHEMA = 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json';
// Closed top-level field set per Agent Plugins v1.0.0 §5.2.
const AP_FIELDS = new Set([
  '$schema', 'name', 'version', 'description', 'author',
  'homepage', 'repository', 'license', 'keywords', 'extensions',
]);

const errors = [];
const read = (p) => {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch (e) {
    errors.push(`${p}: invalid JSON (${e.message})`);
    return null;
  }
};

const ap = read(path.join(pluginDir, 'plugin.json'));
const cc = read(path.join(pluginDir, '.claude-plugin', 'plugin.json'));
if (!ap || !cc) {
  console.error('manifest check FAILED:');
  for (const e of errors) console.error(` - ${e}`);
  process.exit(1);
}

// Agent Plugins manifest structure (§5).
if (ap.$schema !== AP_SCHEMA) {
  errors.push(`plugin.json: $schema must be exactly ${AP_SCHEMA}`);
}
for (const f of Object.keys(ap)) {
  if (!AP_FIELDS.has(f)) errors.push(`plugin.json: unknown top-level field "${f}" (schema is closed)`);
}
const name = ap.name;
const nameOk =
  typeof name === 'string' && name.length >= 1 && name.length <= 64 &&
  /^[a-z0-9.-]+$/.test(name) &&
  /^[a-z0-9]/.test(name) && /[a-z0-9]$/.test(name) &&
  !name.includes('--') && !name.includes('..');
if (!nameOk) errors.push(`plugin.json: invalid name "${name}" (1-64 chars, a-z 0-9 . -, must start/end alphanumeric, no -- or ..)`);
for (const f of ['version', 'description', 'license']) {
  if (ap[f] !== undefined && typeof ap[f] !== 'string') errors.push(`plugin.json: ${f} must be a string`);
}
if (ap.keywords !== undefined && (!Array.isArray(ap.keywords) || ap.keywords.some((k) => typeof k !== 'string'))) {
  errors.push('plugin.json: keywords must be an array of strings');
}
if (ap.author !== undefined) {
  const a = ap.author;
  const ok = a !== null && typeof a === 'object' && !Array.isArray(a) &&
    Object.keys(a).every((k) => ['name', 'email', 'url'].includes(k) && typeof a[k] === 'string');
  if (!ok) errors.push('plugin.json: author must be an object with only string name/email/url fields');
}

// Sync with the Claude Code manifest.
for (const f of ['name', 'version', 'description']) {
  if (ap[f] !== cc[f]) {
    errors.push(`manifest drift: ${f} differs — plugin.json "${ap[f]}" vs .claude-plugin/plugin.json "${cc[f]}"`);
  }
}

if (errors.length) {
  console.error('manifest check FAILED:');
  for (const e of errors) console.error(` - ${e}`);
  process.exit(1);
}
console.log(`manifests OK: name=${ap.name} version=${ap.version} (Claude Code and Agent Plugins v1.0.0 in sync)`);
