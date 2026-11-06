#!/usr/bin/env node
// jev-router.mjs — decision-model spike (tasks-006 follow-up / prd-010 §3.3).
//
// Poses each routing-golden case to TypeSafe's Jev (System One) as a
// pick-from-candidates choice question, following the haku D10 pattern
// (eval-provider only, pinned served version, none as an explicit option).
// Scores Jev's choice against the golden labels and reports accuracy next
// to the heuristic floor (heuristic-router.mjs).
//
// Candidates are the three tier flows; descriptions are read from the live
// SKILL.md frontmatter so the spike always tests what the plugin ships.
// Tier-0 cases pass on `tier-0-trivial` OR `none` (tier 0's design is that
// no flow loads; the choice question needs an answer either way).
//
// Auth: TYPESAFE_API_KEY from the environment (never stored here), or the
// local OneCLI gateway at the proxy boundary.
//
// Usage: node jev-router.mjs [--set routing-golden.json] [--skills plugins/tempo/skills]
import { readFileSync } from 'node:fs';
import path from 'node:path';

const arg = (name, dflt) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : dflt;
};
const setFile = arg('--set', 'routing-golden.json');
const skillsDir = arg('--skills', '../../plugins/tempo/skills');
const g = JSON.parse(readFileSync(path.resolve(process.cwd(), setFile), 'utf8'));

const TIER_DESCS = {};
for (const name of ['tier-0-trivial', 'tier-1-standard', 'tier-2-risky']) {
  const md = readFileSync(path.resolve(process.cwd(), skillsDir, name, 'SKILL.md'), 'utf8');
  TIER_DESCS[name] = md.match(/^description: (.+)$/m)?.[1] ?? '';
}

const JEV_API = 'https://api.typesafe.ai/v1/systemone';
const JEV_MODEL = 'jev-1.13.0'; // pinned served version, not the floating alias
const NONE = 'none';
const FLOW_FOR = { 'tier-0-trivial': 0, 'tier-1-standard': 1, 'tier-2-risky': 2 };

const criteria = {};
for (const [name, d] of Object.entries(TIER_DESCS)) criteria[name] = `tier skill: ${d}`;
criteria[NONE] = 'No tier flow is an appropriate match; the task is trivial enough to just do it';

async function askJev(userMessage) {
  const body = {
    state: {
      user_message: userMessage,
      rules:
        'Pick the single tier skill that should handle the described task, judging only on the skill descriptions. Do not invent capabilities. If the task is trivial enough that no flow should load, pick none.',
    },
    model: JEV_MODEL,
    questions: {
      tier: {
        type: 'choice',
        instructions: 'Which tier skill should handle this task?',
        criteria,
      },
    },
  };
  const headers = { 'Content-Type': 'application/json' };
  if (process.env.TYPESAFE_API_KEY) headers.Authorization = `Bearer ${process.env.TYPESAFE_API_KEY}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    let res;
    try {
      res = await fetch(JEV_API, { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(30000) });
    } catch (e) {
      if (attempt === 3) throw new Error(`jev request failed: ${e.message}`);
      await new Promise((r) => setTimeout(r, 1500 + attempt * 2500));
      continue;
    }
    const json = await res.json().catch(() => ({}));
    if (res.status === 429 || res.status === 529 || res.status >= 500) {
      if (attempt === 3) throw new Error(`jev HTTP ${res.status} after retry`);
      await new Promise((r) => setTimeout(r, 1500 + attempt * 2500));
      continue;
    }
    if (!res.ok) throw new Error(`jev HTTP ${res.status}: ${JSON.stringify(json).slice(0, 120)}`);
    const a = json.answers?.tier;
    if (!a || typeof a.choice !== 'string') throw new Error('jev returned no choice answer');
    return { choice: a.choice, confidence: a.confidence };
  }
}

const rows = [];
for (const c of g.cases) {
  const { choice, confidence } = await askJev(c.task);
  // tier-0 passes on tier-0-trivial OR none (tier 0's design: no flow loads);
  // tier 1/2 pass when Jev picks the matching flow.
  const ok = c.tier === 0
    ? choice === 'tier-0-trivial' || choice === NONE
    : choice === c.expect_flow;
  rows.push({ id: c.id, tier: c.tier, choice, confidence, ok });
  console.log(`${c.id.padEnd(24)} tier ${c.tier}  jev: ${choice.padEnd(20)} conf: ${String(confidence ?? '?').padEnd(6)} ${ok ? 'ok' : 'MISS'}`);
}
const pass = rows.filter((r) => r.ok).length;
const byTier = {};
for (const r of rows) {
  byTier[r.tier] = byTier[r.tier] || { n: 0, ok: 0 };
  byTier[r.tier].n++;
  if (r.ok) byTier[r.tier].ok++;
}
console.log(`\njev (${JEV_MODEL}) accuracy: ${pass}/${rows.length} (${Math.round((pass / rows.length) * 100)}%)`);
for (const t of Object.keys(byTier).sort()) console.log(`  tier ${t}: ${byTier[t].ok}/${byTier[t].n}`);
const misses = rows.filter((r) => !r.ok).map((r) => r.id);
if (misses.length) console.log(`misses: ${misses.join(', ')}`);
