#!/usr/bin/env node
// heuristic-router.mjs — zero-cost tier-accuracy floor for the routing
// golden set (tasks-006 follow-up: heuristic baseline before any decision
// model is evaluated).
//
// The rules are ordered on principle, deliberately generic, and NOT tuned
// against the golden labels: (1) documentation/comment surface -> tier 0;
// (2) risk keywords (security, concurrency, migration, architecture,
// behavior-preserving refactor) -> tier 2; (3) trivial keywords -> tier 0;
// (4) everything else -> tier 1. Whatever accuracy this scores is the
// floor a decision model must beat to justify a per-task call.
//
// Usage: node heuristic-router.mjs [--set routing-golden.json]
import { readFileSync } from 'node:fs';
import path from 'node:path';

const setArgIdx = process.argv.indexOf('--set');
const setFile = setArgIdx >= 0 ? process.argv[setArgIdx + 1] : 'routing-golden.json';
const g = JSON.parse(readFileSync(path.resolve(process.cwd(), setFile), 'utf8'));

function predictTier(task) {
  const t = task.toLowerCase();
  // 1. documentation/comment surface: whatever it mentions, the change is copy
  if (/\b(docs|documentation|contributor guide|comment|readme|heading|markdown link)\b/.test(t)) return 0;
  // 2. risk signals: security surface, concurrency, data lifecycle, architecture
  if (/\b(auth\b|authenticat|token|credential|password|hashing|signing|encrypt|argon|hmac|multi-tenant|isolation|rate[ .]limit\w*|concurr|migration|migrate|sqlite|middleware)\b/.test(t)) return 2;
  if (/\b(refactor|split|rewrite|share (their |the )?common|deduplicat|preserv\w* behavior)\b/.test(t)) return 2;
  // 3. trivial signals
  if (/\b(typo|misspell|copy tweak|one-line|one line|rename the local|log message|heading|constant|version string|stale comment|port)\b/.test(t)) return 0;
  // 4. default: standard change
  return 1;
}

const results = g.cases.map((c) => ({ id: c.id, tier: c.tier, predicted: predictTier(c.task) }));
for (const r of results) {
  console.log(`${r.id.padEnd(24)} tier ${r.tier} predicted ${r.predicted}  ${r.predicted === r.tier ? 'ok' : 'MISS'}`);
}
const pass = results.filter((r) => r.predicted === r.tier).length;
const byTier = {};
for (const r of results) {
  byTier[r.tier] = byTier[r.tier] || { n: 0, ok: 0 };
  byTier[r.tier].n++;
  if (r.predicted === r.tier) byTier[r.tier].ok++;
}
console.log(`\nheuristic accuracy: ${pass}/${results.length} (${Math.round((pass / results.length) * 100)}%)`);
for (const t of Object.keys(byTier).sort()) console.log(`  tier ${t}: ${byTier[t].ok}/${byTier[t].n}`);
