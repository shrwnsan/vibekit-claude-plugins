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
// Exports predictTier() for other eval scripts. The canonical floor rules
// live in the shipped plugin (plugins/tempo/scripts/triage-router.mjs,
// floorDecide) — this CLI imports them so the eval floor and the runtime
// fast path can never drift.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { floorDecide } from '../../plugins/tempo/scripts/triage-router.mjs';

export const predictTier = (task) => floorDecide(task).tier;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const setArgIdx = process.argv.indexOf('--set');
  const setFile = setArgIdx >= 0 ? process.argv[setArgIdx + 1] : 'routing-golden.json';
  const g = JSON.parse(readFileSync(path.resolve(process.cwd(), setFile), 'utf8'));

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
}
