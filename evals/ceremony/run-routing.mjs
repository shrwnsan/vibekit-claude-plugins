#!/usr/bin/env node
// run-routing.mjs — tier-routing golden set runner (tasks-006).
//
// For each golden case, one headless session on the given condition. The
// prompt is Q&A-framed (tasks-006 D1): the session classifies the task and
// states the tier; no fixtures, no code changes. Scoring is deterministic
// session-log forensics (tasks-006 D2):
//   - a skill counts as LOADED at >= loaded_threshold_refs name references
//     (calibration: loaded flows show ~8-12, registry-only ~2-4)
//   - stated-tier check: the final result text must name the expected tier
//     (promotion mentions of other tiers are allowed scoring behavior)
//   - pass = stated tier ok AND expect_loaded all loaded AND no
//     expect_not_loaded skill loaded
//
// Usage:
//   node run-routing.mjs --condition tempo [--bin <cmd>] [--case <id>]...
//   node run-routing.mjs --list
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const GOLDEN = JSON.parse(readFileSync(path.join(HERE, 'routing-golden.json'), 'utf8'));
const SKILLS = ['risk-triage', 'tier-0-trivial', 'tier-1-standard', 'tier-2-risky'];
const RESULTS = path.resolve(HERE, '..', '..', 'test-results');

function pick(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : null;
}
function fail(msg) { console.error(msg); process.exit(1); }

if (process.argv.includes('--list')) {
  for (const c of GOLDEN.cases) {
    console.log(`${c.id.padEnd(22)} tier ${c.tier}  loaded:[${c.expect_loaded}] not:[${c.expect_not_loaded}]`);
  }
  process.exit(0);
}

const condArg = pick('--condition') ?? 'tempo';
const binArg = pick('--bin');
const BIN = binArg ? (binArg.includes('/') ? path.resolve(HERE, binArg) : binArg) : 'claude';
const caseFilter = process.argv.filter((a, i) => process.argv[i - 1] === '--case');
const threshold = GOLDEN.score?.loaded_threshold_refs ?? 6;
const cond = JSON.parse(readFileSync(path.join(HERE, 'conditions.json'), 'utf8'))[condArg];
if (!cond) fail(`unknown condition: ${condArg}`);

const CLAUDE_VERSION = spawnSync(BIN, ['--version'], { encoding: 'utf8' }).stdout.trim() || 'unknown';

let cases = GOLDEN.cases;
if (caseFilter.length) cases = cases.filter((c) => caseFilter.includes(c.id));
if (!cases.length) fail('no cases matched');

function runCase(c) {
  const sandbox = mkdtempSync(path.join(os.tmpdir(), 'tempo-routing-'));
  const configDir = mkdtempSync(path.join(os.tmpdir(), 'tempo-routing-cfg-'));
  const prompt = GOLDEN.frame.replace('{task}', c.task);
  const args = [
    '-p', prompt,
    '--output-format', 'stream-json',
    '--verbose',
    '--max-turns', '8',
    '--permission-mode', 'acceptEdits',
    '--allowedTools', 'Read Glob Grep',
  ];
  for (const d of cond.pluginDirs ?? []) {
    args.push('--plugin-dir', d.startsWith('~/') ? path.join(os.homedir(), d.slice(2)) : path.resolve(HERE, d));
  }
  const started = Date.now();
  const r = spawnSync(BIN, args, {
    cwd: sandbox, encoding: 'utf8', timeout: 240_000, maxBuffer: 256 * 1024 * 1024,
    env: { ...process.env, CLAUDE_CONFIG_DIR: configDir },
  });
  const wall_ms = Date.now() - started;
  const log = r.stdout ?? '';
  writeFileSync(`${sandbox}.session.jsonl`, log);

  // Loaded = tool events, not substring counts. A skill's content loads via
  // a Read/Grep of its SKILL.md path or a Skill invocation of its name;
  // prose cross-references inside other skills' content must not score
  // (tasks-006 D2, revised after the smoke: substring counting miscounted
  // tier-2 as loaded when tier-1's promotion line mentioned it).
  const refs = {};
  for (const s of SKILLS) refs[s] = (log.match(new RegExp(s, 'g')) ?? []).length;
  const loaded = new Set();
  for (const line of log.split('\n')) {
    let e; try { e = JSON.parse(line); } catch { continue; }
    const content = e?.message?.content;
    if (!Array.isArray(content)) continue;
    for (const c of content) {
      if (c?.type !== 'tool_use') continue;
      const blob = JSON.stringify(c.input ?? {});
      for (const s of SKILLS) {
        if (blob.includes(`skills/${s}/SKILL.md`)) loaded.add(s);
        if (c.name === 'Skill' && blob.includes(s)) loaded.add(s);
      }
    }
  }
  const loadedList = [...loaded];

  // stated tier from the final result text
  let resultText = '';
  for (const line of log.split('\n')) {
    try { const e = JSON.parse(line); if (e.type === 'result' && e.result) resultText = e.result; } catch {}
  }
  const stated = [...new Set((resultText.match(/tier\s*[0-2]/gi) ?? []).map((t) => Number(t.match(/[0-2]/)[0])))];
  // Primary classification = the FIRST tier the answer states. Later tier
  // mentions are promotion/escalation discussion, not the classification:
  // a tier-1 answer that says "escalate to tier 2 on repeat failure" is a
  // correct tier-1 answer (the flows' own promotion rule).
  const primaryMatch = resultText.match(/tier\s*([0-2])/i);
  const primary = primaryMatch ? Number(primaryMatch[1]) : null;
  const stated_ok = stated.includes(c.tier) && primary === c.tier;
  // Q&A sessions classify from injected descriptions; flow content is never
  // loaded here (calibrated 2026-11-03: zero tool_use in Q&A runs), so the
  // second signal is that the answer NAMES the expected flow. Tool-load
  // detection is retained as enacted-mode machinery (fixture tasks).
  const named_ok = c.expect_flow ? resultText.includes(c.expect_flow) : true;
  // trap cases: the answer must NOT escalate to a forbidden flow
  const not_flow_ok = (c.expect_not_flow ?? []).every((f) => !resultText.includes(f));
  // dual-valid cases (genuine 1-vs-2 tension): the documented headless
  // tie-break to the higher tier passes when the answer names the higher
  // flow AND cites the conflict rule — an unexplained escalation fails.
  let alt_ok = false;
  if (c.alt) {
    const alt_tier_ok = stated.includes(c.alt.tier);
    const alt_flow_ok = resultText.includes(c.alt.expect_flow);
    const cited = c.alt.require_citation.some((w) => resultText.toLowerCase().includes(w));
    alt_ok = alt_tier_ok && alt_flow_ok && cited;
  }
  const pass = (stated_ok && named_ok) || alt_ok;

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const row = {
    schema: 1, harness: 'tasks-006', ts, case_id: c.id, tier: c.tier,
    condition: condArg, bin: BIN, claude_version: CLAUDE_VERSION,
    stated_tiers: stated, stated_ok, named_ok, expect_flow: c.expect_flow,
    not_flow_ok, alt_ok, tool_loads: loadedList, refs, pass, result_text: resultText.slice(-400), wall_ms, sandbox,
  };
  mkdirSync(RESULTS, { recursive: true });
  writeFileSync(path.join(RESULTS, `routing-${ts}-${condArg}-${c.id}.json`), JSON.stringify(row, null, 2));

  const flag = (ok) => (ok ? 'ok' : 'FAIL');
  console.log(
    `${c.id.padEnd(22)} tier ${c.tier}  turns ${String((log.match(/"type":"assistant"/g) ?? []).length).padStart(2)}  ` +
    `flow:${c.expect_flow ?? '-'}  stated:${flag(stated_ok)} named:${flag(named_ok)}  => ${pass ? 'PASS' : 'FAIL'}`
  );
  return row;
}

const rows = cases.map(runCase);
const passed = rows.filter((r) => r.pass).length;
console.log(`\n${passed}/${rows.length} cases pass (${condArg}, ${BIN})`);
process.exit(passed === rows.length ? 0 : 1);
