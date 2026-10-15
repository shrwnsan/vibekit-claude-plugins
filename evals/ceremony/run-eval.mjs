#!/usr/bin/env node
// run-eval.mjs — ceremony-cost eval runner for the tempo plugin (tasks-005).
//
// Runs golden tasks headlessly (claude -p --output-format stream-json) under
// controlled plugin conditions, in disposable sandboxes under $TMPDIR, and
// writes one JSON result row per run into test-results/.
//
//   node run-eval.mjs --smoke
//   node run-eval.mjs --condition bare
//   node run-eval.mjs --condition superpowers --tier 2
//   node run-eval.mjs --condition bare --task t1-slugify
//   node run-eval.mjs --list
//
// Conditions (conditions.json):
//   bare        — all user-scope plugins disabled via sandbox project settings
//   superpowers — same, plus superpowers loaded with --plugin-dir from the
//                 local marketplace cache
//   tempo       — (future) same, plus the tempo plugin directory

import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseSession } from './collect.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(HERE, '..', '..');
const RESULTS = path.join(REPO, 'test-results');
const FIXTURES = path.join(HERE, 'fixtures');
const GOLDEN = JSON.parse(readFileSync(path.join(HERE, 'golden-tasks.json'), 'utf8'));
const CONDITIONS = JSON.parse(readFileSync(path.join(HERE, 'conditions.json'), 'utf8'));

function installedPluginIds() {
  // Exact "name@marketplace" keys from the user's install state, so the
  // sandbox can disable every user-scope plugin for isolation.
  const f = path.join(homedir(), '.claude', 'plugins', 'installed_plugins.json');
  try {
    return Object.keys(JSON.parse(readFileSync(f, 'utf8')).plugins || {});
  } catch {
    return [];
  }
}

function gitIn(dir, args, extraOk = false) {
  const r = spawnSync('git', ['-c', 'user.name=tempo-eval', '-c', 'user.email=eval@tempo.invalid', ...args], {
    cwd: dir,
    encoding: 'utf8',
  });
  if (r.status !== 0 && !extraOk) {
    throw new Error(`git ${args.join(' ')} failed: ${r.stderr?.slice(0, 300)}`);
  }
  return r;
}

function runSession(task, conditionName) {
  const cond = CONDITIONS[conditionName];
  const sandbox = mkdtempSync(path.join(tmpdir(), 'tempo-ceremony-'));

  if (task.fixture) {
    cpSync(path.join(FIXTURES, task.fixture, 'repo'), sandbox, { recursive: true });
  }

  // Isolation: disable every user-scope plugin; conditions add back only what
  // they study (via pluginDirs / pluginUrl flags, never user install state).
  const enabledPlugins = Object.fromEntries(installedPluginIds().map((id) => [id, false]));
  mkdirSync(path.join(sandbox, '.claude'), { recursive: true });
  writeFileSync(
    path.join(sandbox, '.claude', 'settings.json'),
    JSON.stringify({ enabledPlugins }, null, 2),
  );

  if (task.fixture) {
    gitIn(sandbox, ['init', '-q']);
    gitIn(sandbox, ['add', '-A']);
    gitIn(sandbox, ['commit', '-qm', 'fixture']);
  }
  const initSha = task.fixture
    ? gitIn(sandbox, ['rev-parse', 'HEAD']).stdout.trim()
    : null;

  // Identical, bounded permissions for every condition — fairness requires the
  // same affordances, not maximum freedom. acceptEdits + allowlist keeps the
  // approval-gate semantics intact while letting code tasks run headlessly.
  const args = [
    '-p', task.prompt,
    '--output-format', 'stream-json',
    '--verbose',
    '--max-turns', String(task.max_turns ?? 40),
    '--permission-mode', 'acceptEdits',
    '--allowedTools',
    [
      'Read', 'Write', 'Edit', 'Glob', 'Grep', 'TodoWrite',
      'Bash(node:*)', 'Bash(git:*)', 'Bash(npm:*)',
      'Bash(ls:*)', 'Bash(cat:*)', 'Bash(mkdir:*)',
    ].join(' '),
  ];
  for (const dir of cond.pluginDirs || []) {
    const resolved = dir.startsWith('~/')
      ? path.join(homedir(), dir.slice(2))
      : path.resolve(HERE, dir);
    args.push('--plugin-dir', resolved);
  }
  for (const url of cond.pluginUrls || []) {
    args.push('--plugin-url', url);
  }

  const started = Date.now();
  const r = spawnSync('claude', args, {
    cwd: sandbox,
    encoding: 'utf8',
    timeout: task.timeout_ms ?? 900_000,
    maxBuffer: 256 * 1024 * 1024,
    env: process.env,
  });
  const wall_ms = Date.now() - started;
  const log = r.stdout ?? '';
  writeFileSync(`${sandbox}.session.jsonl`, log);

  // Diffstat of what the session changed (before hidden tests land).
  let git = null;
  if (task.fixture) {
    const st = gitIn(sandbox, ['status', '--porcelain'], true);
    if (st.stdout.trim()) {
      gitIn(sandbox, ['add', '-A'], true);
      gitIn(sandbox, ['commit', '-qm', 'run'], true);
    }
    const num = gitIn(
      sandbox,
      ['diff', '--numstat', initSha, 'HEAD', '--', '.', ':(exclude).claude'],
      true,
    ).stdout.trim();
    const files = num ? num.split('\n') : [];
    git = {
      files_changed: files.length,
      insertions: files.reduce((a, l) => a + (parseInt(l.split('\t')[0], 10) || 0), 0),
      deletions: files.reduce((a, l) => a + (parseInt(l.split('\t')[1], 10) || 0), 0),
    };
  }

  // Verification with hidden tests the agent never saw.
  let verify = null;
  if (task.fixture && task.verify !== false) {
    const hidden = path.join(FIXTURES, task.fixture, 'verify', 'hidden');
    if (existsSync(hidden)) {
      mkdirSync(path.join(sandbox, 'test', 'hidden'), { recursive: true });
      cpSync(hidden, path.join(sandbox, 'test', 'hidden'), { recursive: true });
    }
    const v = spawnSync(process.execPath, ['--test'], {
      cwd: sandbox,
      encoding: 'utf8',
      timeout: 120_000,
      maxBuffer: 16 * 1024 * 1024,
    });
    verify = {
      passed: v.status === 0,
      exit: v.status,
      output_tail: (v.stdout || '').slice(-800),
    };
  }

  const metrics = parseSession(log);
  const completed =
    r.status === 0 && r.signal === null && metrics.result_subtype === 'success';

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const row = {
    schema: 1,
    harness: 'tasks-005',
    ts,
    task_id: task.id,
    tier: task.tier ?? null,
    condition: conditionName,
    claude_version: CLAUDE_VERSION,
    model_env_set: Boolean(process.env.ANTHROPIC_MODEL),
    wall_ms,
    timeout_hit: r.signal === 'SIGTERM',
    completed,
    verify,
    git,
    metrics,
    sandbox: sandbox,
  };
  mkdirSync(RESULTS, { recursive: true });
  const outFile = path.join(RESULTS, `ceremony-${ts}-${conditionName}-${task.id}.json`);
  writeFileSync(outFile, JSON.stringify(row, null, 2));

  const toks = metrics.tokens.total.toLocaleString();
  const vflag = verify ? (verify.passed ? 'PASS' : 'FAIL') : '-';
  console.log(
    `${conditionName.padEnd(12)} ${task.id.padEnd(16)} tier ${task.tier ?? '-'}  ` +
    `${String(metrics.turns).padStart(3)} turns  ${toks.padStart(9)} tok  ` +
    `${(wall_ms / 1000).toFixed(0).padStart(4)}s  ${completed ? 'done' : 'INCOMPLETE'}  verify: ${vflag}`,
  );
  return row;
}

const CLAUDE_VERSION = spawnSync('claude', ['--version'], { encoding: 'utf8' }).stdout.trim();

function pick(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : null;
}

const task = pick('--task');
const tier = pick('--tier');
const condArg = pick('--condition');
const smoke = process.argv.includes('--smoke');
const list = process.argv.includes('--list');

if (list) {
  for (const t of GOLDEN.tasks) console.log(`${t.id.padEnd(16)} tier ${t.tier ?? 'probe'}`);
  process.exit(0);
}

if (smoke) {
  for (const c of ['bare', 'superpowers']) {
    runSession(GOLDEN.tasks.find((t) => t.id === 'probe'), c);
    runSession(GOLDEN.tasks.find((t) => t.id === 't0-typo'), c);
  }
  process.exit(0);
}

if (!condArg || !CONDITIONS[condArg]) {
  console.error(`usage: run-eval.mjs --condition <${Object.keys(CONDITIONS).join('|')}> [--task ID] [--tier N] | --smoke | --list | (collect.mjs --summary)`);
  process.exit(1);
}

let tasks = GOLDEN.tasks.filter((t) => t.fixture); // probes are smoke-only
if (task) tasks = tasks.filter((t) => t.id === task);
if (tier !== null) tasks = tasks.filter((t) => String(t.tier) === tier);
for (const t of tasks) runSession(t, condArg);
