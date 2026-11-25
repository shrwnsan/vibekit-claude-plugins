#!/usr/bin/env node
// triage-router.mjs — optional decision-model triage layer for tempo
// (tasks-007, prd-010 §3.3).
//
// Provider-agnostic on the Jev-compatible "systemone" protocol: TypeSafe
// Jev, Liquid d1, or a self-hosted open-weight endpoint (Clef / d1-3B).
// Opt-in: inert unless a provider API key (or TEMPO_LOCAL_URL) is present —
// unconfigured sessions behave exactly as before this layer existed.
//
// Proposes, never disposes: confidence below the threshold, provider
// failure, or the kill switch defers to main-model self-triage. The
// verify gate, the conflict rule, and fail-twice promotion are never
// bypassed by this script's output.
//
// Env:
//   TEMPO_TRIAGE=0               kill switch (kills triage AND promote checks)
//   TEMPO_PROVIDERS              csv cycle order (default "typesafe,liquid";
//                                "local" joins automatically when TEMPO_LOCAL_URL is set)
//   TEMPO_TRIAGE_THRESHOLD       adopt-if-confidence-≥ (default 0.7, clamp 0.3–0.95)
//   TEMPO_PROMOTE_THRESHOLD      promote-check adopt-if-p-≥ (default 0.6, clamp 0.3–0.95)
//   TEMPO_EVIDENCE_REFLEX=1      feed recent same-cwd reflex deny verdicts into
//                                the promote check's evidence (default off)
//   TEMPO_EVIDENCE_WINDOW_MS     deny-recency window (default 1h)
//   TEMPO_MODEL_TYPESAFE / _LIQUID / TEMPO_LOCAL_MODEL    per-provider model override
//   TEMPO_LOCAL_URL              self-hosted systemone endpoint (adds "local")
//   TEMPO_LOCAL_API_KEY          optional bearer token for the local endpoint
//   TEMPO_LOG / TEMPO_STATE_FILE runtime state (default ~/.local/share/tempo/*;
//                                TEMPO_LOG=off disables logging — the router
//                                still decides, only the accounting goes dark)
//
// Usage: node triage-router.mjs --task "Fix the typo in the README heading."
//        echo "task text" | node triage-router.mjs
//        node triage-router.mjs --promote --task "<task>" --evidence "<what failed>"
// Prints one JSON line. Exits 0 for every operational outcome (fail-safe:
// never block the flow), 2 only for usage errors. Importable as a module.
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// -- Providers ---------------------------------------------------------------
// Same transport reflex-gate.mjs proved live (typesafe + liquid). New
// providers need no code change: any Jev-API-compatible endpoint registers
// via env —
//   TEMPO_PROVIDERS=clef                        (explicit: adds it to the cycle)
//   TEMPO_PROVIDER_CLEF_URL=https://...         (required — https only)
//   TEMPO_PROVIDER_CLEF_MODEL=clef-flash        (optional, default jev-latest)
//   TEMPO_PROVIDER_CLEF_KEY=...                 (optional bearer; public
//                                                local endpoints need none)
// The built-in `local` provider (TEMPO_LOCAL_URL) follows the same rules:
// https-only, and active only when named in TEMPO_PROVIDERS — setting the
// URL is not itself consent, because unlike an API key (which consents to
// sending to a fixed, audited host) it chooses the destination itself.
// Security posture (SSRF/exfil review): env-registered customs activate
// ONLY when explicitly named in TEMPO_PROVIDERS or when
// TEMPO_CUSTOM_PROVIDERS=1 is set, and only over https:// — env is
// merged from sources the script cannot distinguish (user shell vs
// project-scoped settings), so activation is an explicit act. Every
// provider call logs its destination host for egress visibility.
// Built-ins keep their fixed env names for reflex parity; models are
// overridable per provider (TEMPO_MODEL_TYPESAFE etc.), so version bumps
// are config, not commits.
const PROVIDERS = {
  typesafe: {
    url: 'https://api.typesafe.ai/v1/systemone',
    model: 'jev-latest', // runtime default; evals pin via TEMPO_MODEL_TYPESAFE
    apiKeyEnv: 'TYPESAFE_API_KEY',
    modelEnv: 'TEMPO_MODEL_TYPESAFE',
  },
  liquid: {
    url: 'https://api.liquid.ai/decisions/v1/systemone',
    model: 'd1.1',
    apiKeyEnv: 'LIQUID_API_KEY',
    modelEnv: 'TEMPO_MODEL_LIQUID',
  },
  local: {
    url: null, // from TEMPO_LOCAL_URL
    model: 'd1-3B',
    apiKeyEnv: 'TEMPO_LOCAL_API_KEY', // optional
    modelEnv: 'TEMPO_LOCAL_MODEL',
    urlEnv: 'TEMPO_LOCAL_URL',
  },
};

// Env-registered custom providers (TEMPO_PROVIDER_<NAME>_URL ...). Scanned,
// not enumerated — adding one never touches this file. https only: a custom
// endpoint is egress for task text, and plaintext-HTTP egress doubles as
// an SSRF probe primitive.
function customProviders(env) {
  const found = {};
  for (const key of Object.keys(env)) {
    const m = key.match(/^TEMPO_PROVIDER_([A-Z0-9_]+)_URL$/);
    if (!m) continue;
    let url;
    try {
      url = new URL(env[key]);
    } catch {
      continue; // malformed — ignore, never throw on env noise
    }
    if (url.protocol !== 'https:') continue;
    found[m[1].toLowerCase()] = {
      url: env[key],
      model: env[`TEMPO_PROVIDER_${m[1]}_MODEL`] ?? 'jev-latest',
      apiKeyEnv: `TEMPO_PROVIDER_${m[1]}_KEY`, // optional: absence = no auth header
      modelEnv: `TEMPO_PROVIDER_${m[1]}_MODEL`,
      activatesBy: 'url', // explicit naming in TEMPO_PROVIDERS or the consent flag
    };
  }
  return found;
}

// -- Keyword floor (fast path, zero cost) ------------------------------------
// Canonical copy — evals/ceremony/heuristic-router.mjs imports this so the
// shipped router and the eval floor can never drift. Rules ordered on
// principle, deliberately generic, NOT tuned against golden labels.
export function floorDecide(task) {
  const t = task.toLowerCase();
  // 1. documentation/comment surface: whatever it mentions, the change is copy
  if (/\b(docs|documentation|contributor guide|comment|readme|heading|markdown link)\b/.test(t)) return { tier: 0, matched: true };
  // 2. risk signals: security surface, concurrency, data lifecycle, architecture
  if (/\b(auth\b|authenticat|token|credential|password|hashing|signing|encrypt|argon|hmac|multi-tenant|isolation|rate[ .]limit\w*|concurr|migration|migrate|sqlite|middleware)\b/.test(t)) return { tier: 2, matched: true };
  if (/\b(refactor|split|rewrite|share (their |the )?common|deduplicat|preserv\w* behavior)\b/.test(t)) return { tier: 2, matched: true };
  // 3. trivial signals
  if (/\b(typo|misspell|copy tweak|one-line|one line|rename the local|log message|heading|constant|version string|stale comment|port)\b/.test(t)) return { tier: 0, matched: true };
  // 4. default: standard change — no signal, hand upward
  return { tier: 1, matched: false };
}

const FLOW_TIER = { 'tier-0-trivial': 0, none: 0, 'tier-1-standard': 1, 'tier-2-risky': 2 };

const RULES =
  'Pick the single tier skill that should handle the described task, judging only on the skill descriptions. ' +
  'Do not invent capabilities. If the task is trivial enough that no flow should load, pick none.';

// Fail-once promotion detector (prd-010 §3.3.4, tasks-008). Noul wire shape
// is the one reflex proved live (type "noul" → answers.<q>.noul, probability
// or bool — Number() coerces both). Deliberately NO keyword floor here: a
// deterministic early-escalation rule would be guessing; the skill's
// fail-twice rule is the floor and always stands regardless of this check.
const PROMOTE_RULES =
  'One attempt at the task just failed under its current tier flow (tier 0 trivial, 1 standard, 2 risky/heaviest). ' +
  'Judge ONLY whether this failure is evidence the task was under-tiered — that the next-heavier flow should take ' +
  'over NOW — versus an ordinary failure the current flow is designed to absorb. Escalate on signal (the failure ' +
  'implicates risk surfaces: security, auth, concurrency, data lifecycle, architecture, hidden scope), not on the ' +
  'mere fact of failure.';

const PROMOTE_QUESTION = {
  escalate: {
    type: 'noul',
    instructions: 'A task failed once at its current tier. Should it escalate to the next heavier tier flow right now?',
    criteria: {
      true: 'The failure reveals under-tiering: a risk surface (security/auth/concurrency/data/architecture), hidden scope beyond the stated task, or a dead end the current flow cannot absorb',
      false: 'Ordinary first failure — wrong variable, missing fixture, incomplete fix — that the current flow’s debug-and-retest loop handles',
    },
  },
};

// Fallback criteria if the sibling SKILL.md files are unreadable (they ship
// with the plugin, so this is a safety net). Keep in sync with
// skills/<flow>/SKILL.md frontmatter — descriptions are the elicitation.
const FALLBACK_DESCS = {
  'tier-0-trivial':
    'Tier-0 trivial-change rules (typo, copy tweak, one-line fix, docs update). Rarely needs loading — the rules below are the whole flow; consult only when unsure a change qualifies as trivial.',
  'tier-1-standard':
    'Tier-1 standard-change flow — one-line plan note, test-first, single agent, systematic debugging on failures. Use for normal feature work and bug fixes with clear requirements.',
  'tier-2-risky':
    'Tier-2 risky-change flow — short plan file, deliberate build, review gate and verify gate before done. Use for architectural changes, concurrency and rate-limiting work, public API changes, ambiguous requirements, security/auth/data work, or after a tier-1 task failed twice.',
  none: 'No tier flow is an appropriate match; the task is trivial enough to just do it',
};

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const homeAbbrev = (p) => (p && p.startsWith(homedir()) ? `~${p.slice(homedir().length)}` : p);

function resolveConfig(env = process.env) {
  return {
    enabled: env.TEMPO_TRIAGE !== '0',
    threshold: clamp(Number(env.TEMPO_TRIAGE_THRESHOLD ?? 0.7), 0.3, 0.95),
    promoteThreshold: clamp(Number(env.TEMPO_PROMOTE_THRESHOLD ?? 0.6), 0.3, 0.95),
    order: env.TEMPO_PROVIDERS?.split(',').map((s) => s.trim()).filter(Boolean) ?? ['typesafe', 'liquid'],
    log: env.TEMPO_LOG === 'off' ? null : (env.TEMPO_LOG ?? path.join(homedir(), '.local', 'share', 'tempo', 'verdicts.jsonl')),
    stateFile: env.TEMPO_STATE_FILE ?? path.join(homedir(), '.local', 'share', 'tempo', 'failstate.json'),
    backoffMs: 5 * 60 * 1000,
    env,
  };
}

// https-only for every env-supplied destination URL (customs and local
// alike): malformed or non-https values are ignored, never fatal.
const isHttps = (u) => {
  try {
    return new URL(u).protocol === 'https:';
  } catch {
    return false;
  }
};

function configuredProviders(cfg) {
  const all = { ...customProviders(cfg.env), ...PROVIDERS };
  let list = [...cfg.order];
  if (!cfg.env.TEMPO_PROVIDERS) {
    // ambient auto-discovery of customs requires explicit consent; naming
    // one in TEMPO_PROVIDERS is itself consent, so that path needs no flag.
    // `local` has no ambient path at all — naming it in TEMPO_PROVIDERS is
    // the consent (its URL chooses the destination, so URL-presence alone
    // must not activate it).
    if (cfg.env.TEMPO_CUSTOM_PROVIDERS === '1') list = [...list, ...Object.keys(customProviders(cfg.env)).sort()];
  }
  return list
    .map((name) => (all[name] ? { name, ...all[name] } : null))
    .filter(Boolean)
    .filter((p) => (p.urlEnv ? isHttps(cfg.env[p.urlEnv]) : p.activatesBy === 'url' ? true : Boolean(cfg.env[p.apiKeyEnv])));
}

// Live tier descriptions from the plugin's own skills — the elicitation
// must test what the plugin ships (same principle as jev-router.mjs).
function loadCriteria(skillsDir = path.resolve(path.dirname(pathToFileURL(import.meta.url).pathname), '..', 'skills')) {
  const criteria = {};
  for (const name of ['tier-0-trivial', 'tier-1-standard', 'tier-2-risky']) {
    let desc = FALLBACK_DESCS[name];
    try {
      const md = readFileSync(path.join(skillsDir, name, 'SKILL.md'), 'utf8');
      desc = md.match(/^description: (.+)$/m)?.[1] ?? desc;
    } catch {
      /* keep fallback */
    }
    criteria[name] = `tier skill: ${desc}`;
  }
  criteria.none = FALLBACK_DESCS.none;
  return criteria;
}

// -- Failstate (provider health for the fail-safe cycle) ---------------------
function readFailstate(cfg, now) {
  try {
    const s = JSON.parse(readFileSync(cfg.stateFile, 'utf8'));
    const healthy = {};
    for (const [name, v] of Object.entries(s.providers ?? {})) {
      if (new Date(v.until).getTime() > now) healthy[name] = v;
    }
    return healthy;
  } catch {
    return {};
  }
}

function writeFailstate(cfg, state) {
  try {
    mkdirSync(path.dirname(cfg.stateFile), { recursive: true, mode: 0o700 });
    writeFileSync(cfg.stateFile, JSON.stringify({ v: 1, providers: state }, null, 2) + '\n', { mode: 0o600 });
  } catch {
    /* state tracking is best-effort; never block a verdict on it */
  }
}

// -- Provider call -----------------------------------------------------------
async function callProvider(cfg, provider, name, task, criteria, fetchImpl, now) {
  const body = {
    state: { user_message: task, rules: RULES },
    model: cfg.env[provider.modelEnv] ?? provider.model,
    questions: { tier: { type: 'choice', instructions: 'Which tier skill should handle this task?', criteria } },
  };
  const headers = { 'Content-Type': 'application/json' };
  const key = cfg.env[provider.apiKeyEnv];
  if (key) headers.Authorization = `Bearer ${key}`;
  const url = provider.urlEnv ? cfg.env[provider.urlEnv] : provider.url;
  const model = body.model;

  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 1000));
    let res;
    try {
      res = await fetchImpl(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      });
    } catch (e) {
      if (attempt) throw new Error(`${name} request failed: ${e.message}`);
      continue;
    }
    const json = await res.json().catch(() => ({}));
    if (res.status === 429 || res.status === 529 || res.status >= 500) {
      if (attempt) throw new Error(`${name} HTTP ${res.status} after retry`);
      continue;
    }
    if (!res.ok) throw new Error(`${name} HTTP ${res.status}: ${JSON.stringify(json).slice(0, 120)}`);
    const a = json.answers?.tier;
    if (!a || typeof a.choice !== 'string') throw new Error(`${name} returned no choice answer`);
    if (!(a.choice in FLOW_TIER)) throw new Error(`${name} returned unknown choice "${a.choice}"`);
    return { choice: a.choice, confidence: Number(a.confidence ?? 0), model, servedModel: json.model ?? model, usage: json.usage };
  }
  throw new Error(`${name} exhausted retries`); // unreachable; for shape
}

// Noul variant of callProvider for the promote check — same retry skeleton,
// kept separate rather than parameterizing the shipped Choice path (zero
// regression surface on the triage transport; the shapes diverge only in
// question and answer parsing).
async function callNoul(cfg, provider, name, task, evidence, fetchImpl, now) {
  const body = {
    state: { user_message: task, evidence, rules: PROMOTE_RULES },
    model: cfg.env[provider.modelEnv] ?? provider.model,
    questions: PROMOTE_QUESTION,
  };
  const headers = { 'Content-Type': 'application/json' };
  const key = cfg.env[provider.apiKeyEnv];
  if (key) headers.Authorization = `Bearer ${key}`;
  const url = provider.urlEnv ? cfg.env[provider.urlEnv] : provider.url;
  const model = body.model;

  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 1000));
    let res;
    try {
      res = await fetchImpl(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      });
    } catch (e) {
      if (attempt) throw new Error(`${name} request failed: ${e.message}`);
      continue;
    }
    const json = await res.json().catch(() => ({}));
    if (res.status === 429 || res.status === 529 || res.status >= 500) {
      if (attempt) throw new Error(`${name} HTTP ${res.status} after retry`);
      continue;
    }
    if (!res.ok) throw new Error(`${name} HTTP ${res.status}: ${JSON.stringify(json).slice(0, 120)}`);
    const p = Number(json.answers?.escalate?.noul);
    if (!Number.isFinite(p)) throw new Error(`${name} returned no noul answer`);
    return { p, model, servedModel: json.model ?? model, usage: json.usage };
  }
  throw new Error(`${name} exhausted retries`); // unreachable; for shape
}

// -- Verdict log -------------------------------------------------------------
// One line per actual call outcome (tier/defer/error). Unconfigured and
// disabled make no call, so they log nothing. Task text stays verbatim
// (replay + outcome joins); every path field is $HOME-abbreviated.
function logVerdict(cfg, entry) {
  if (!cfg.log) return; // TEMPO_LOG=off: decisions unaffected, accounting dark
  try {
    mkdirSync(path.dirname(cfg.log), { recursive: true, mode: 0o700 });
    appendFileSync(cfg.log, JSON.stringify({ v: 1, plugin: 'tempo', ...entry }) + '\n', { mode: 0o600 });
  } catch {
    /* logging is best-effort */
  }
}

// -- Triage ------------------------------------------------------------------
// Returns { status, tier?, choice?, confidence?, provider?, model?, servedModel?, ms, error? }
// status: disabled | unconfigured | tier | defer | error
async function triage(task, opts = {}) {
  const { env = process.env, fetchImpl = globalThis.fetch.bind(globalThis), now = Date.now } = opts;
  const cfg = resolveConfig(env);
  const start = now();
  const common = { task, cwd: homeAbbrev(process.cwd()), mode: env.TRIAGE_MODE ?? 'cli' };

  if (!cfg.enabled) return { status: 'disabled', ms: now() - start };

  // keyword floor first — local, free, works with zero keys; a hit decides
  // for no cost, no call, no log (same shape as reflex's regex fast paths
  // before its provider chain)
  const floor = floorDecide(task);
  if (floor.matched) return { status: 'tier', tier: floor.tier, source: 'floor', ms: now() - start };

  const providers = configuredProviders(cfg);
  if (!providers.length) return { status: 'unconfigured', ms: now() - start };

  const criteria = loadCriteria(opts.skillsDir);
  const health = readFailstate(cfg, now());
  const errors = [];
  for (const p of providers) {
    const { name } = p;
    if (health[name]) {
      errors.push(`${name} skipped: backing off until ${health[name].until}`);
      continue;
    }
    let outcome;
    try {
      outcome = await callProvider(cfg, p, name, task, criteria, fetchImpl, now);
    } catch (e) {
      errors.push(e.message);
      const prev = readFailstate(cfg, now())[name] ?? { fails: 0 };
      writeFailstate(cfg, { ...readFailstate(cfg, now()), [name]: { fails: prev.fails + 1, until: new Date(now() + cfg.backoffMs).toISOString() } });
      continue;
    }
    // success clears any stale health entry
    const currentHealth = readFailstate(cfg, now());
    if (currentHealth[name]) {
      const { [name]: _drop, ...rest } = currentHealth;
      writeFailstate(cfg, rest);
    }

    const tier = FLOW_TIER[outcome.choice];
    const verdict =
      outcome.confidence >= cfg.threshold
        ? { status: 'tier', tier, choice: outcome.choice, confidence: outcome.confidence }
        : { status: 'defer', choice: outcome.choice, confidence: outcome.confidence };
    // egress visibility: every provider call logs where it went
    let host = null;
    try {
      host = new URL(p.urlEnv ? cfg.env[p.urlEnv] : p.url).host;
    } catch {
      /* unreachable for configured providers */
    }
    // usage: provider's own per-call metering (OTel gen-ai observables; absent
    // on endpoints that don't report it — dropped by JSON.stringify)
    const full = { ...verdict, source: 'provider', provider: name, host, model: outcome.model, servedModel: outcome.servedModel, ms: now() - start, input_tokens: outcome.usage?.input_tokens, output_tokens: outcome.usage?.output_tokens };
    logVerdict(cfg, { t: new Date(now()).toISOString(), status: full.status, tier: full.tier ?? null, ...full, ...common });
    return full;
  }
  const full = { status: 'error', ms: now() - start, error: errors.join('; ') };
  logVerdict(cfg, { t: new Date(now()).toISOString(), status: 'error', tier: null, ...full, ...common });
  return full; // fail-safe: caller self-triages
}

// -- Reflex denial evidence --------------------------------------------------
// Why: permission-gate denials are failed attempts the promotion rule can't
// see on its own (issues #169/#170). Privacy: reflex log lines carry verbatim
// commands, so only the deny reasons merge in — never raw commands.
function reflexDenialEvidence(env, now) {
  if (env.TEMPO_EVIDENCE_REFLEX !== '1') return null;
  const logPath = env.REFLEX_LOG ?? path.join(homedir(), '.local', 'share', 'reflex', 'verdicts.jsonl');
  let raw;
  try {
    raw = readFileSync(logPath, 'utf8');
  } catch {
    return null;
  }
  const windowMs = Number(env.TEMPO_EVIDENCE_WINDOW_MS ?? 60 * 60 * 1000);
  const cutoff = now() - (Number.isFinite(windowMs) && windowMs > 0 ? windowMs : 60 * 60 * 1000);
  const cwd = homeAbbrev(process.cwd());
  const denies = [];
  const lines = raw.split('\n');
  for (let i = lines.length - 1; i >= 0 && denies.length < 5; i--) {
    if (!lines[i]) continue;
    let e;
    try {
      e = JSON.parse(lines[i]);
    } catch {
      continue;
    }
    if (e?.kind !== 'verdict' || e.decision !== 'deny') continue;
    const t = Date.parse(e.ts);
    if (!Number.isFinite(t) || t < cutoff) continue; // outside the window: skipped, not scan-ending — the scan is whole-file by design (ts order is an append-time assumption, not a guarantee)
    if (e.cwd && e.cwd !== cwd) continue;
    // enforce the privacy line, don't assert it: fast-path deny reasons end
    // with a ≤60-char matched-command fragment after ': "' — strip from the
    // delimiter so only pattern labels and model risk scores can egress
    if (e.reason) denies.push(String(e.reason).split(': "')[0].slice(0, 120));
  }
  if (!denies.length) return null;
  return `${denies.length} reflex-gate command denial${denies.length === 1 ? '' : 's'} in this cwd recently: ${denies.join('; ')}`;
}

// -- Promote check (fail-once escalation, prd-010 §3.3.4) --------------------
// Returns { status, p?, provider?, host?, model?, servedModel?, ms, error? }
// status: disabled | unconfigured | escalate | hold | error
// Every non-escalate outcome means the same thing to the caller: the skill's
// existing promotion rule stands untouched. The detector can only ever move
// the escalation EARLIER, never suppress or delay the fail-twice backstop.
async function promoteCheck(task, evidence, opts = {}) {
  const { env = process.env, fetchImpl = globalThis.fetch.bind(globalThis), now = Date.now } = opts;
  const cfg = resolveConfig(env);
  const start = now();
  const mergedEvidence = [evidence, reflexDenialEvidence(env, now)].filter(Boolean).join('\n');
  const common = { task, evidence: mergedEvidence, cwd: homeAbbrev(process.cwd()), mode: 'promote' };

  if (!cfg.enabled) return { status: 'disabled', ms: now() - start };

  const providers = configuredProviders(cfg);
  if (!providers.length) return { status: 'unconfigured', ms: now() - start };

  const health = readFailstate(cfg, now());
  const errors = [];
  for (const p of providers) {
    const { name } = p;
    if (health[name]) {
      errors.push(`${name} skipped: backing off until ${health[name].until}`);
      continue;
    }
    let outcome;
    try {
      outcome = await callNoul(cfg, p, name, task, mergedEvidence, fetchImpl, now);
    } catch (e) {
      errors.push(e.message);
      const prev = readFailstate(cfg, now())[name] ?? { fails: 0 };
      writeFailstate(cfg, { ...readFailstate(cfg, now()), [name]: { fails: prev.fails + 1, until: new Date(now() + cfg.backoffMs).toISOString() } });
      continue;
    }
    const currentHealth = readFailstate(cfg, now());
    if (currentHealth[name]) {
      const { [name]: _drop, ...rest } = currentHealth;
      writeFailstate(cfg, rest);
    }

    const verdict = outcome.p >= cfg.promoteThreshold ? { status: 'escalate' } : { status: 'hold' };
    let host = null;
    try {
      host = new URL(p.urlEnv ? cfg.env[p.urlEnv] : p.url).host;
    } catch {
      /* unreachable for configured providers */
    }
    const full = { ...verdict, p: outcome.p, source: 'provider', provider: name, host, model: outcome.model, servedModel: outcome.servedModel, ms: now() - start, input_tokens: outcome.usage?.input_tokens, output_tokens: outcome.usage?.output_tokens };
    logVerdict(cfg, { t: new Date(now()).toISOString(), status: full.status, p: full.p, ...full, ...common });
    return full;
  }
  const full = { status: 'error', ms: now() - start, error: errors.join('; ') };
  logVerdict(cfg, { t: new Date(now()).toISOString(), status: 'error', ...full, ...common });
  return full; // fail-safe: caller keeps the standard promotion rule
}

// -- CLI ---------------------------------------------------------------------
async function main() {
  const i = process.argv.indexOf('--task');
  const e = process.argv.indexOf('--evidence');
  let task = i >= 0 ? process.argv[i + 1] : null;
  const evidence = e >= 0 ? process.argv[e + 1] : null;
  if (task == null && !process.stdin.isTTY) task = readFileSync(0, 'utf8').trim();
  const usage =
    'usage: triage-router.mjs --task "<task text>"  (or pipe task text on stdin)\n' +
    '       triage-router.mjs --promote --task "<task>" --evidence "<what failed on the first attempt>"';
  if (process.argv.includes('--promote')) {
    if (!task || !evidence) {
      console.error(usage);
      process.exit(2);
    }
    console.log(JSON.stringify(await promoteCheck(task, evidence)));
    return;
  }
  if (!task || evidence) {
    console.error(usage);
    process.exit(2);
  }
  console.log(JSON.stringify(await triage(task)));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();

export { PROVIDERS, FLOW_TIER, RULES, resolveConfig, configuredProviders, customProviders, loadCriteria, triage, promoteCheck, homeAbbrev };
