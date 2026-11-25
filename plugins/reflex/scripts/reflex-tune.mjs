#!/usr/bin/env node
/**
 * reflex-tune — per-class ask-layer stats + prune candidates. Read-only by
 * default; --record appends one kind:"tuning" audit line.
 *
 *   node plugins/reflex/scripts/reflex-tune.mjs [--json] [--window DAYS|all]
 *   node plugins/reflex/scripts/reflex-tune.mjs --record '{"action":"...","note":"..."}'
 *
 * Reads the verdict log (REFLEX_LOG, default ~/.local/share/reflex/
 * verdicts.jsonl; REFLEX_LOG=off → {"status":"log-off"}, exit 0) and
 * aggregates ask verdicts per class (fastpath:secrets:<label> /
 * fastpath:ask:<label> / model:<provider>): decision counts, distinct
 * sessions, outcome-label tallies, per-class token metering (input_tokens ×
 * REFLEX_COST_PER_MTOK, default 0.042 $/M — TypeSafe input-only metering,
 * output free; classes whose provider doesn't report usage show no cost),
 * and approval latency when outcome lines carry resultTs (written by the
 * repo-side correlator since its resultTs feature; absent → latency is
 * reported as unavailable, not guessed).
 *
 * The override rate is CONDITIONAL on labels: unlabeled verdicts are missing
 * data, not consent — a rate over 3 of 40 asks is not "7%", it is "no
 * signal". Candidates are proposals only: a class is flagged when its
 * labeled override rate ≥ 0.9 across ≥5 distinct sessions and ≥10 asks, or
 * when approval-latency p95 < 1000 ms over ≥5 labeled asks (rubber-stamp
 * signature). Nothing applies without a human — the /reflex:tune command
 * turns a candidate into a config-file edit the user approves.
 *
 * Privacy: labels, counts, rates, durations, session counts, costs — never
 * command text or reason snippets. Read-only over everything except
 * --record, which honors REFLEX_LOG=off by refusing: audit needs accounting.
 */
import { appendFileSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";

const DAY_MS = 24 * 60 * 60 * 1000;
const COST_PER_MTOK_DEFAULT = 0.042; // TypeSafe input-only $/Mtok; output free

function parseArgs(argv) {
	const args = { json: false, windowDays: Infinity, record: null };
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === "--json") args.json = true;
		else if (argv[i] === "--window") {
			const v = argv[++i];
			if (v === "all") args.windowDays = Infinity;
			else if (Number.isFinite(Number(v)) && Number(v) >= 0) args.windowDays = Number(v);
		} else if (argv[i] === "--record") args.record = argv[++i];
	}
	return args;
}

function readJsonLines(path) {
	try {
		return readFileSync(path, "utf8").split("\n").map((l) => {
			try { return JSON.parse(l); } catch { return null; }
		}).filter(Boolean);
	} catch {
		return null;
	}
}

function pctl(values, p) {
	if (values.length === 0) return null;
	const s = [...values].sort((a, b) => a - b);
	return s[Math.ceil((p / 100) * s.length) - 1];
}

function verdictClass(v) {
	if (v.fastpath) return `fastpath:${v.fastpath}${v.pattern ? `:${v.pattern}` : ""}`;
	if (v.provider) return `model:${v.provider}`;
	return "other";
}

function classStats() {
	return { asks: 0, sessions: new Set(), days: new Set(), tokensIn: 0, tokensOut: 0, tokenCalls: 0, labeled: 0, agreed: 0, overridden: 0, latencies: [] };
}

// -- Main ----------------------------------------------------------------------

const args = parseArgs(process.argv.slice(2));
const env = process.env;
const logOff = env.REFLEX_LOG === "off";
const logPath = logOff ? null : (env.REFLEX_LOG ?? join(homedir(), ".local", "share", "reflex", "verdicts.jsonl"));
const costPerMTok = Number.isFinite(Number(env.REFLEX_COST_PER_MTOK)) && Number(env.REFLEX_COST_PER_MTOK) >= 0
	? Number(env.REFLEX_COST_PER_MTOK)
	: COST_PER_MTOK_DEFAULT;

// --record: append one audit line, then stop. Refused under LOG=off — an
// audit trail written nowhere is theater.
if (args.record !== null && args.record !== undefined) {
	if (logOff) {
		console.error("reflex-tune: --record refused — REFLEX_LOG=off; the audit line would be written nowhere");
		process.exit(1);
	}
	let entry;
	try {
		entry = JSON.parse(args.record);
		if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error("not a JSON object");
	} catch (err) {
		console.error(`reflex-tune: --record needs a JSON object: ${err.message}`);
		process.exit(2);
	}
	try {
		mkdirSync(dirname(logPath), { recursive: true, mode: 0o700 });
		appendFileSync(logPath, JSON.stringify({ ts: new Date().toISOString(), kind: "tuning", ...entry }) + "\n", { mode: 0o600 });
		console.log(`recorded tuning line to ${logPath}`);
		process.exit(0);
	} catch (err) {
		console.error(`reflex-tune: cannot append to ${logPath}: ${err?.message ?? err}`);
		process.exit(1);
	}
}

if (logOff) {
	const out = { status: "log-off", note: "REFLEX_LOG=off — no stats exist; decisions are unaffected but accounting is dark" };
	console.log(JSON.stringify(out));
	if (!args.json) console.log(`verdict log: off by config — no stats to tune on (decisions unaffected)`);
	process.exit(0);
}

const lines = readJsonLines(logPath);
if (lines === null) {
	const out = { status: "no-log", logPath };
	console.log(JSON.stringify(out));
	if (!args.json) console.log(`verdict log: not found (${logPath}) — the watch starts when the gate first fires`);
	process.exit(0);
}

const now = Date.now();
const floor = Number.isFinite(args.windowDays) ? now - args.windowDays * DAY_MS : -Infinity;
const inWindow = (ts) => Number.isFinite(Date.parse(ts)) && Date.parse(ts) >= floor;

const verdicts = lines.filter((l) => l.kind === "verdict" && (l.decision === "allow" || l.decision === "ask" || l.decision === "deny")).filter((v) => inWindow(v.ts));
const outcomeByKey = new Map();
for (const l of lines) {
	if (l.kind !== "outcome") continue;
	outcomeByKey.set(`${l.verdictTs}|${l.tool_use_id}`, l); // rerun overwrites: latest label wins
}

const denyOverridden = outcomeByKey.size > 0
	? [...outcomeByKey.values()].filter((o) => o.verdict === "deny" && o.outcome === "overridden").length
	: 0;

const classes = new Map();
let askTotal = 0;
for (const v of verdicts) {
	if (v.decision !== "ask") continue;
	askTotal++;
	const cls = verdictClass(v);
	const t = classes.get(cls) ?? classStats();
	t.asks++;
	if (typeof v.session_id === "string") t.sessions.add(v.session_id);
	if (typeof v.ts === "string") t.days.add(v.ts.slice(0, 10));
	if (Number.isFinite(v.input_tokens)) { t.tokensIn += v.input_tokens; t.tokenCalls++; }
	if (Number.isFinite(v.output_tokens)) t.tokensOut += v.output_tokens;
	const o = outcomeByKey.get(`${v.ts}|${v.tool_use_id}`);
	if (o && (o.outcome === "agreed" || o.outcome === "overridden")) {
		t.labeled++;
		t[o.outcome]++;
		const rt = Number.isFinite(Date.parse(o.resultTs)) ? Date.parse(o.resultTs) : NaN;
		const vt = Date.parse(v.ts);
		if (Number.isFinite(rt) && Number.isFinite(vt) && rt - vt >= 0) t.latencies.push(rt - vt);
	}
	classes.set(cls, t);
}

const perClass = [...classes.entries()].sort((a, b) => b[1].asks - a[1].asks).map(([cls, t]) => {
	const rate = t.agreed + t.overridden > 0 ? t.overridden / (t.agreed + t.overridden) : null;
	const reasons = [];
	if (rate !== null && rate >= 0.9 && t.sessions.size >= 5 && t.asks >= 10) {
		reasons.push(`override rate ${Math.round(rate * 100)}% (${t.overridden}/${t.agreed + t.overridden}) across ${t.sessions.size} sessions`);
	}
	const p95 = pctl(t.latencies, 95);
	if (t.latencies.length >= 5 && p95 < 1000) {
		reasons.push(`approval p95 ${p95}ms over ${t.latencies.length} labeled asks — rubber-stamp signature`);
	}
	return {
		class: cls,
		asks: t.asks,
		distinctSessions: t.sessions.size,
		distinctDays: t.days.size,
		labeled: t.labeled,
		agreed: t.agreed,
		overridden: t.overridden,
		overrideRate: rate,
		approvalLatencyMs: t.latencies.length > 0 ? { n: t.latencies.length, p50: pctl(t.latencies, 50), p95 } : null,
		inputTokens: t.tokensIn,
		outputTokens: t.tokensOut,
		costUsd: t.tokensIn > 0 ? Number(((t.tokensIn * costPerMTok) / 1e6).toFixed(6)) : null,
		candidate: reasons.length > 0,
		reasons,
	};
});

const candidates = perClass.filter((c) => c.candidate).map(({ class: cls, reasons }) => ({ class: cls, reasons }));
const out = {
	status: "ok",
	windowDays: Number.isFinite(args.windowDays) ? args.windowDays : "all",
	generatedAt: new Date().toISOString(),
	asks: askTotal,
	denyOverridden,
	perClass,
	candidates,
};

if (args.json) {
	console.log(JSON.stringify(out, null, 2));
	process.exit(0);
}

// Human output
console.log(`reflex tune — log: ${logPath}${Number.isFinite(args.windowDays) ? ` (window ${args.windowDays}d)` : " (all-time)"}`);
try { console.log(`log size: ${(statSync(logPath).size / 1024).toFixed(0)} KB`); } catch { /* gone mid-run */ }
console.log(`asks: ${askTotal} · deny-overridden (all-time labels): ${denyOverridden}`);
if (perClass.length === 0) {
	console.log("no asks in window — nothing to tune on");
	process.exit(0);
}
console.log("\nclass | asks | sessions | labeled | agreed | overridden | rate | p50/p95 latency | tokens in | cost");
for (const c of perClass) {
	const rate = c.overrideRate === null ? "—" : `${Math.round(c.overrideRate * 100)}% (${c.overridden}/${c.agreed + c.overridden})`;
	const lat = c.approvalLatencyMs ? `${c.approvalLatencyMs.p50}/${c.approvalLatencyMs.p95}ms (n=${c.approvalLatencyMs.n})` : "unavailable";
	const cost = c.costUsd === null ? "—" : `$${c.costUsd}`;
	console.log(`${c.class} | ${c.asks} | ${c.distinctSessions} | ${c.labeled} | ${c.agreed} | ${c.overridden} | ${rate} | ${lat} | ${c.inputTokens} | ${cost}`);
}
if (candidates.length > 0) {
	console.log("\ncandidates (proposals only — nothing changes without you):");
	for (const c of candidates) console.log(`  ${c.class}\n    - ${c.reasons.join("\n    - ")}`);
} else {
	console.log("\nno candidates — nothing meets the prune evidence bar");
}
