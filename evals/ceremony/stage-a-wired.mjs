#!/usr/bin/env node
// stage-a-wired.mjs — Stage A acceptance gate for the wired triage router
// (tasks-007): run plugins/tempo/scripts/triage-router.mjs over the frozen
// 28-case routing golden set. The script under test IS the shipped blend —
// keyword floor (fast path, no call) → provider → confidence deferral —
// so this gate measures exactly what users run.
//
// Gate: blended accuracy ≥ 27/28 (the heuristic floor's committed score) —
// the router must match-or-beat the free floor to ship (tasks-007 §Design 5).
//
// Needs a live provider key (TYPESAFE_API_KEY / LIQUID_API_KEY); skips with
// a notice when absent, matching the repo's live-smoke convention. For a
// decision-citing run pin the model:
//   TEMPO_MODEL_TYPESAFE=jev-1.14.0 node stage-a-wired.mjs
//
// Usage: node stage-a-wired.mjs [--set routing-golden.json] [--model-answers file]
// Verdict log for the run is redirected into test-results/ (the runtime
// ~/.local/share/tempo log stays untouched by evals).
// Deferred cases (router confidence < threshold) are scored against the
// model condition's recorded per-case answers when --model-answers
// <routing-*.json> is given; otherwise against the floor's tier-1 default
// as a documented proxy.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { triage, floorDecide } from '../../plugins/tempo/scripts/triage-router.mjs';

const arg = (name, dflt) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : dflt;
};
const setFile = arg('--set', 'routing-golden.json');
const g = JSON.parse(readFileSync(path.resolve(process.cwd(), setFile), 'utf8'));

if (!process.env.TYPESAFE_API_KEY && !process.env.LIQUID_API_KEY && !process.env.TEMPO_LOCAL_URL) {
  console.log('stage-a-wired: no provider key set — live run skipped (set TYPESAFE_API_KEY or LIQUID_API_KEY)');
  process.exit(0);
}

// model-condition per-case answers for deferral scoring, when recorded
let modelAnswers = null;
const maFile = arg('--model-answers', null);
if (maFile) {
  const ma = JSON.parse(readFileSync(path.resolve(process.cwd(), maFile), 'utf8'));
  modelAnswers = Object.fromEntries((ma.cases ?? []).map((r) => [r.id, r.tier]));
}

const RESULTS = path.resolve(process.cwd(), '..', '..', 'test-results');
const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const runEnv = { ...process.env, TEMPO_LOG: path.join(RESULTS, `routing-stage-a-log-${ts}.jsonl`), TRIAGE_MODE: 'stage-a' };

const rows = [];
for (const c of g.cases) {
  const v = await triage(c.task, { env: runEnv });
  if (v.status === 'tier') {
    const source = v.source === 'floor' ? 'floor' : 'router';
    rows.push({ id: c.id, tier: c.tier, source, predicted: v.tier, provider: v.provider, model: v.servedModel ?? v.model, confidence: v.confidence, ok: v.tier === c.tier });
  } else if (v.status === 'defer') {
    // without recorded model answers, the proxy for "main model decides" is
    // the floor's answer (its tier-1 default for these no-signal cases)
    const predicted = modelAnswers ? modelAnswers[c.id] : floorDecide(c.task).tier;
    rows.push({ id: c.id, tier: c.tier, source: 'defer', predicted, deferredTo: modelAnswers ? 'model-recorded' : 'floor-proxy', choice: v.choice, confidence: v.confidence, provider: v.provider, ok: predicted === c.tier });
  } else {
    const fallback = floorDecide(c.task).tier; // documented fail-safe: floor default
    rows.push({ id: c.id, tier: c.tier, source: 'error', predicted: fallback, error: v.error, ok: fallback === c.tier });
  }
}

for (const r of rows) {
  const extra = r.source === 'router' ? `conf ${r.confidence?.toFixed(2)}` : r.source === 'defer' ? `deferred@${r.confidence?.toFixed(2)}` : r.source;
  console.log(`${r.id.padEnd(24)} tier ${r.tier}  ${r.source.padEnd(10)} ${extra ?? ''}  ${r.ok ? 'ok' : 'MISS'}`);
}
const pass = rows.filter((r) => r.ok).length;
const bySource = {};
for (const r of rows) bySource[r.source] = (bySource[r.source] ?? 0) + 1;
const byTier = {};
for (const r of rows) {
  byTier[r.tier] = byTier[r.tier] ?? { n: 0, ok: 0 };
  byTier[r.tier].n++;
  if (r.ok) byTier[r.tier].ok++;
}
console.log(`\nblend accuracy: ${pass}/${rows.length} (${Math.round((pass / rows.length) * 100)}%)`);
console.log(`  sources: ${Object.entries(bySource).map(([k, n]) => `${k} ${n}`).join(', ')}`);
for (const t of Object.keys(byTier).sort()) console.log(`  tier ${t}: ${byTier[t].ok}/${byTier[t].n}`);
const misses = rows.filter((r) => !r.ok).map((r) => r.id);
if (misses.length) console.log(`misses: ${misses.join(', ')}`);
const gate = pass >= Math.ceil((27 / 28) * rows.length);
console.log(`\ngate (≥ floor 27/28): ${gate ? 'PASS' : 'FAIL'}`);

mkdirSync(RESULTS, { recursive: true });
writeFileSync(
  path.join(RESULTS, `routing-stage-a-wired-${ts}.json`),
  JSON.stringify(
    {
      schema: 1,
      harness: 'tasks-007-stage-a',
      threshold: process.env.TEMPO_TRIAGE_THRESHOLD ?? 0.7,
      modelPin: { typesafe: process.env.TEMPO_MODEL_TYPESAFE ?? 'jev-latest', liquid: process.env.TEMPO_MODEL_LIQUID ?? 'd1.1' },
      modelAnswers: maFile ?? 'floor-proxy',
      cases: rows,
      summary: { pass, total: rows.length, gate },
    },
    null,
    2,
  ),
);
console.log(`rows: routing-stage-a-wired-${ts}.json`);
if (!gate) process.exit(1);
