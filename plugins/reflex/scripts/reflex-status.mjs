#!/usr/bin/env node
/**
 * reflex-status — read-only health + metrics reader for the reflex gate.
 *
 *   node plugins/reflex/scripts/reflex-status.mjs [--since DAYS|all]
 *   node plugins/reflex/scripts/reflex-status.mjs --check
 *
 * Report mode (default): reads the verdict log (REFLEX_LOG, default
 * ~/.local/share/reflex/verdicts.jsonl) and failstate (REFLEX_STATE_FILE)
 * and prints a compact report: gate health (kill switch, provider failstate,
 * log perms), windowed metrics (decision counts, ask rate, fast-path/model
 * split, latency percentiles, pattern labels), outcome-label tallies
 * (written by the repo-side correlator), and version drift — the running
 * gate's vintage inferred from the newest verdict line's field shape vs the
 * installed manifest, because hooks pin at session start and lag plugin
 * updates.
 *
 * --check mode: the scriptable trip-detector. Silent + exit 0 when healthy;
 * one line per finding, exit 1 when anything needs attention. Trips are
 * protection/integrity states: a deny overridden (hard boundary crossed —
 * the headline), the kill switch on, PERMS WIDE, a provider in active
 * failstate, running-gate drift, or an unparseable config file. Deliberate
 * accounting states are INFO, never trips: REFLEX_LOG=off (accounting dark
 * by choice — noted once, because it also blinds the deny-override watch).
 * Exit codes make it composable: cron, CI, launchers — harness-agnostic.
 *
 * Privacy: the report carries counts, generic pattern labels, providers,
 * timings, and paths — never command text, reasons, or snippets (the log
 * stores verbatim command text; this reader must be safe to paste into an
 * issue). Read-only sidecar, deliberately outside the gate process: zero
 * hot-path cost, zero new failure modes in the hook. Report mode always
 * exits 0 — a health report that fails is worse than one that reports the
 * failure (--check is the exception by design).
 */
import { readFileSync, realpathSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const DAY_MS = 24 * 60 * 60 * 1000;

// Same abbreviation the gate applies to its authored paths — the report must
// be paste-safe, and the default log path itself carries the username.
const homeCandidates = (() => {
	const h = homedir();
	try {
		const r = realpathSync(h);
		return r === h ? [h] : [h, r];
	} catch { return [h]; }
})();
const tildify = (p) => {
	for (const home of homeCandidates) {
		if (p === home) return "~";
		if (p.startsWith(home + sep)) return "~" + p.slice(home.length);
	}
	return p;
};

function parseArgs(argv) {
	const args = { sinceDays: 7, check: false };
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === "--since") {
			const v = argv[++i];
			if (v === "all") args.sinceDays = Infinity;
			else if (Number.isFinite(Number(v)) && Number(v) >= 0) args.sinceDays = Number(v);
		} else if (argv[i] === "--check") args.check = true;
	}
	return args;
}

// Same config semantics as the gate's resolveConfig: env > file > defaults;
// malformed → carried as an error string, never thrown. Shared so --check
// and the report describe the config identically.
function loadUserConfig(env) {
	const configPath = env.REFLEX_CONFIG ?? join(homedir(), ".claude", "reflex-config.json");
	let user = {};
	let configError = null;
	try {
		const parsed = JSON.parse(readFileSync(configPath, "utf8"));
		if (parsed && typeof parsed === "object") user = parsed;
		else configError = "config is not a JSON object";
	} catch (err) {
		if (err?.code !== "ENOENT") configError = `config unreadable: ${String(err?.message ?? err).slice(0, 80)}`;
	}
	const disabledClasses = Array.isArray(user.disabledClasses)
		? user.disabledClasses.filter((c) => typeof c === "string" && c)
		: [];
	return { configPath, configError, disabledClasses, user };
}

const num = (v, dflt) => {
	const n = Number(v);
	return Number.isFinite(n) ? n : dflt;
};

function readJsonLines(path) {
	try {
		return readFileSync(path, "utf8").split("\n").map((l) => {
			try { return JSON.parse(l); } catch { return null; } // malformed line: skipped
		}).filter(Boolean);
	} catch {
		return null;
	}
}

// Nearest-rank percentile of a numeric array (sorted copy); n=0 → null.
function pctl(values, p) {
	if (values.length === 0) return null;
	const s = [...values].sort((a, b) => a - b);
	return s[Math.ceil((p / 100) * s.length) - 1];
}

// Running-gate vintage from the newest verdict line's field shape:
// `mode` logged since 0.1.3, `~`-abbreviated cwd since 0.1.6. Verbatim
// fields are identical across versions, so these two are the hard signals.
function inferGateVersion(v) {
	if (!v) return null;
	if (!("mode" in v)) return "<0.1.3";
	if (typeof v.cwd === "string" && v.cwd.startsWith("~")) return ">=0.1.6";
	return ">=0.1.3, <0.1.6";
}

// Semver-ish ≥ on three-part numeric strings; used for the drift rule
// (installed manifest ≥0.1.6 → the field-shape inference is meaningful).
const atLeast = (v, ref) => {
	const a = String(v).split(".").map(Number), b = String(ref).split(".").map(Number);
	for (let i = 0; i < 3; i++) {
		if (!Number.isFinite(a[i]) || a[i] !== b[i]) return Number.isFinite(a[i]) && a[i] > b[i];
	}
	return true;
};

// -- --check mode: trips vs infos ------------------------------------------------
// Trips (exit 1) are protection/integrity states that need attention; infos
// (still exit 0) are deliberate accounting states noted once. Taxonomy in
// the header. Silent stdout + exit 0 is the healthy signature.

function runCheck(cfg, env, manifestVersion) {
	const trips = [], infos = [];
	if (env.REFLEX_DISABLED === "1") trips.push("kill switch ON (REFLEX_DISABLED=1) — the gate is off entirely");
	if (cfg.configError) trips.push(`config unusable: ${cfg.configError} — defaults in effect`);
	if (cfg.logOff) {
		infos.push("verdict log off by config (REFLEX_LOG=off) — accounting dark by choice; the deny-override watch is blind while it is off");
	} else {
		const lines = readJsonLines(cfg.log);
		if (lines === null) {
			infos.push(`no verdict log yet (${cfg.log}) — the watch starts when the gate first fires`);
		} else {
			// The headline: a verdict the gate refused was executed anyway.
			const denyOverridden = lines.some((l) => l.kind === "outcome" && l.verdict === "deny" && l.outcome === "overridden");
			if (denyOverridden) trips.push("deny overridden — a refused command ran anyway; the hard boundary has been crossed");
			try {
				const m = statSync(cfg.log).mode & 0o777;
				if (m & 0o077) trips.push(`verdict log PERMS WIDE (${m.toString(8)} — expected 600)`);
			} catch { /* platform without mode bits */ }
			const verdicts = lines.filter((l) => l.kind === "verdict");
			const inferred = inferGateVersion(verdicts[verdicts.length - 1]);
			if (inferred && manifestVersion !== "unknown" && inferred !== ">=0.1.6" && atLeast(manifestVersion, "0.1.6")) {
				trips.push(`running gate ${inferred} DRIFT vs installed ${manifestVersion} — hooks pin at session start; update the plugin and start a fresh session`);
			}
		}
	}
	let failstate = {};
	try { failstate = JSON.parse(readFileSync(cfg.stateFile, "utf8")); } catch { /* fresh or unreadable: treated as empty */ }
	const now = Date.now();
	for (const p of cfg.providers) {
		if (providerDisabled(failstate[p], cfg.maxFailures, cfg.recoveryMs, now)) {
			trips.push(`provider ${p} disabled in failstate (${failstate[p].count} failures, cooldown active)`);
		}
	}
	for (const t of trips) console.log(`TRIP: ${t}`);
	for (const i of infos) console.log(`INFO: ${i}`);
	process.exit(trips.length > 0 ? 1 : 0);
}

// True when a failstate entry disables its provider — same rule as the gate.
function providerDisabled(entry, maxFailures, recoveryMs, now) {
	return typeof entry?.count === "number" && typeof entry?.since === "number"
		&& entry.count >= maxFailures && now - entry.since < recoveryMs;
}

function tallyDecisions(verdicts) {
	const t = { allow: 0, ask: 0, deny: 0 };
	for (const v of verdicts) if (v.decision in t) t[v.decision]++;
	return t;
}

function topLabels(verdicts, n = 5) {
	const counts = new Map();
	for (const v of verdicts) {
		if (typeof v.pattern !== "string") continue;
		counts.set(v.pattern, (counts.get(v.pattern) ?? 0) + 1);
	}
	return [...counts].sort((a, b) => b[1] - a[1]).slice(0, n);
}

function outcomeTally(outcomeLines) {
	const byVerdict = { ask: { agreed: 0, overridden: 0, "no-match": 0 }, deny: { agreed: 0, overridden: 0, "no-match": 0 }, allow: { agreed: 0, overridden: 0, "no-match": 0 } };
	let total = { agreed: 0, overridden: 0, "no-match": 0 };
	for (const o of outcomeLines) {
		const d = byVerdict[o.verdict];
		if (!d || !(o.outcome in d)) continue;
		d[o.outcome]++;
		total[o.outcome]++;
	}
	return { byVerdict, total };
}

const fmtRate = (n, d) => (d === 0 ? "—" : `${Math.round((n / d) * 100)}% (${n}/${d})`);

// -- Main ----------------------------------------------------------------------

const args = parseArgs(process.argv.slice(2));
const env = process.env;
const userConfig = loadUserConfig(env);
const cfgDeny = Number.isFinite(Number(userConfig.user?.thresholds?.deny)) ? Number(userConfig.user.thresholds.deny) : 0.85;
const cfgAsk = Number.isFinite(Number(userConfig.user?.thresholds?.ask)) ? Number(userConfig.user.thresholds.ask) : 0.55;
const cfg = {
	logOff: env.REFLEX_LOG === "off",
	log: env.REFLEX_LOG === "off" ? null : (env.REFLEX_LOG ?? join(homedir(), ".local", "share", "reflex", "verdicts.jsonl")),
	stateFile: env.REFLEX_STATE_FILE ?? join(homedir(), ".local", "share", "reflex", "failstate.json"),
	providers: (env.REFLEX_PROVIDERS ?? "typesafe,liquid").split(",").map((s) => s.trim()).filter(Boolean),
	maxFailures: num(env.REFLEX_MAX_FAILURES, 3),
	recoveryMs: num(env.REFLEX_RECOVERY_MS, 30 * 60 * 1000),
	denyP: num(env.REFLEX_THRESHOLD_DENY, cfgDeny),
	askP: num(env.REFLEX_THRESHOLD_ASK, cfgAsk),
	...userConfig,
};
const manifestVersion = (() => {
	try {
		return JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", ".claude-plugin", "plugin.json"), "utf8")).version;
	} catch { return "unknown"; }
})();

if (args.check) runCheck(cfg, env, manifestVersion);

console.log(`reflex status — installed ${manifestVersion}`);

// Health: scope, kill switch, providers, failstate.
const scope = env.REFLEX_ALL_MODES === "1" ? "all modes (ask/deny only; bypass always excluded)" : "auto mode only";
const parts = [];
if (env.REFLEX_DISABLED === "1") parts.push("kill switch ON (REFLEX_DISABLED=1) — gate is silent");
console.log(`gate: ${parts.length ? parts.join("; ") + "; " : ""}scope ${scope}`);
console.log(`thresholds: deny ≥${cfg.denyP}, ask ≥${cfg.askP}`);
if (cfg.configError) {
	console.log(`config: UNUSABLE — ${cfg.configError} (defaults in effect)`);
} else if (cfg.disabledClasses.length > 0) {
	console.log(`config: ${tildify(cfg.configPath)} — ${cfg.disabledClasses.length} class(es) disabled: ${cfg.disabledClasses.join(", ")}`);
}

let failstate = {};
try { failstate = JSON.parse(readFileSync(cfg.stateFile, "utf8")); } catch { /* fresh install or unreadable: treated as empty */ }
const now = Date.now();
const providerStates = cfg.providers.map((p) => {
	const e = failstate[p];
	return providerDisabled(e, cfg.maxFailures, cfg.recoveryMs, now)
		? `${p} disabled (${e.count} failures, cooldown ~${Math.max(0, Math.ceil((cfg.recoveryMs - (now - e.since)) / 60000))}m left)`
		: (typeof e?.count === "number" && e.count > 0 ? `${p} ok (${e.count} recent failures)` : `${p} ok`);
});
console.log(`providers: ${providerStates.join(" → ")}`);

// Log file: existence, size, perms (0600/0700 by construction — wider is a
// finding). REFLEX_LOG=off: accounting dark by choice — say so once and stop;
// report mode still exits 0.
if (cfg.logOff) {
	console.log("verdict log: off by config (REFLEX_LOG=off) — accounting dark; deny-override watch and analytics are blind");
	console.log("outcomes: unavailable while the log is off — run /reflex:tune for gate-level stats only");
	process.exit(0);
}
let logLines = null;
try { logLines = readJsonLines(cfg.log); } catch { /* handled below */ }
let logDesc = `verdict log: not found (${tildify(cfg.log)})`;
if (logLines !== null) {
	let permsNote = "perms ok";
	try {
		const m = statSync(cfg.log).mode & 0o777;
		if (m & 0o077) permsNote = `PERMS WIDE (${m.toString(8)} — expected 600)`;
	} catch { /* platform without mode bits: skip */ }
	let sizeNote = "";
	try { sizeNote = ` (${(statSync(cfg.log).size / 1024).toFixed(0)} KB, ${logLines.length} lines)`; } catch { /* gone mid-run */ }
	logDesc = `verdict log: ${tildify(cfg.log)}${sizeNote} — ${permsNote}`;
}
console.log(logDesc);

if (logLines === null) {
	console.log("no verdicts yet — reflex records once the PreToolUse hook first fires");
	process.exit(0);
}

const verdicts = logLines.filter((l) => l.kind === "verdict" && (l.decision === "allow" || l.decision === "ask" || l.decision === "deny"));
const providerErrors = logLines.filter((l) => l.kind === "provider-error");
const outcomeLines = logLines.filter((l) => l.kind === "outcome");

// Last provider error: provider + time only — never the error string.
const lastErr = providerErrors[providerErrors.length - 1];
if (lastErr) console.log(`last provider error: ${lastErr.provider} at ${lastErr.ts} (${providerErrors.length} total)`);

// Version drift: hooks pin at session start, so the gate that produced the
// newest verdict may lag the installed plugin. Inferred from field shape
// (atLeast lives with the other helpers above — --check uses it too).
const newest = verdicts[verdicts.length - 1];
const inferred = inferGateVersion(newest);
if (inferred === null) {
	console.log("running gate: no verdicts to infer from");
} else if (manifestVersion === "unknown") {
	console.log(`running gate: ${inferred} (installed manifest unreadable — cannot compare)`);
} else if (inferred === ">=0.1.6" || !atLeast(manifestVersion, "0.1.6")) {
	console.log(`running gate: ${inferred} — matches installed ${manifestVersion}`);
} else {
	console.log(`running gate: ${inferred} — DRIFT vs installed ${manifestVersion}: hooks pin at session start; update the plugin and start a fresh session`);
}

// Windowed metrics (default 7d) + all-time totals.
const floor = Number.isFinite(args.sinceDays) ? now - args.sinceDays * DAY_MS : -Infinity;
const inWindow = (ts) => Number.isFinite(Date.parse(ts)) && Date.parse(ts) >= floor;
const wVerdicts = verdicts.filter((v) => inWindow(v.ts));
const wOutcomes = outcomeLines.filter((o) => inWindow(o.verdictTs ?? o.ts));

const wLabel = Number.isFinite(args.sinceDays) ? `${args.sinceDays}d` : "all";
for (const [label, set, detail] of [[wLabel, wVerdicts, true], ["all-time", verdicts, false]]) {
	if (set.length === 0) { console.log(`verdicts (${label}): 0`); continue; }
	const t = tallyDecisions(set);
	const fast = set.filter((v) => v.fastpath).length;
	const model = set.filter((v) => v.provider).length;
	const askRate = t.allow + t.ask + t.deny > 0 ? Math.round((t.ask / set.length) * 100) : 0;
	console.log(`verdicts (${label}): ${set.length} total — allow ${t.allow} / ask ${t.ask} / deny ${t.deny} — ask rate ${askRate}%`);
	console.log(`  split: fast-path ${fast} / model ${model}`);
	if (detail) { // latency and pattern detail: windowed scope only, keep all-time compact
		const ms = set.map((v) => v.ms).filter(Number.isFinite);
		const callMs = set.map((v) => v.callMs).filter(Number.isFinite);
		if (ms.length) console.log(`  hook ms p50 ${pctl(ms, 50)} p95 ${pctl(ms, 95)}`);
		if (callMs.length) console.log(`  provider callMs p50 ${pctl(callMs, 50)} p95 ${pctl(callMs, 95)}`);
		const top = topLabels(set);
		if (top.length) console.log(`  top patterns: ${top.map(([p, c]) => `${p} ×${c}`).join(", ")}`);
	}
}

// Outcome labels (the correlator's output, read here — never computed).
const { byVerdict, total } = outcomeTally(wOutcomes);
if (wOutcomes.length > 0) {
	const ask = byVerdict.ask;
	console.log(`outcomes (windowed): agreed ${total.agreed} / overridden ${total.overridden} / no-match ${total["no-match"]}`);
	console.log(`  ask override rate ${fmtRate(ask.overridden, ask.agreed + ask.overridden)} — high rates mean ask patterns over-fit and train habituation`);
} else {
	console.log("outcomes: none in window — /reflex:tune shows per-class ask stats from the log; override rates additionally need outcome labels (repo-side: evals/reflex/correlate-outcomes.mjs)");
}
