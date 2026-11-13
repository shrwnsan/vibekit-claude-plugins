#!/usr/bin/env node
/**
 * correlate-outcomes — post-hoc outcome labels for reflex verdicts.
 *
 *   node evals/reflex/correlate-outcomes.mjs [--log PATH] [--projects DIR] [--dry-run]
 *
 * Joins the reflex verdict log against Claude Code session transcripts and
 * appends one kind:"outcome" line per correlated verdict, directly after the
 * verdict it labels:
 *
 *   {"ts":"…","kind":"outcome","verdictTs":"…","tool_use_id":"…",
 *    "verdict":"ask","outcome":"agreed|overridden|no-match","basis":"…",
 *    "class":"fastpath:ask:force push"}
 *
 * Join key: the verdict's tool_use_id (logged by the gate since 0.1.5 from
 * the documented PreToolUse input); transcript_path (home-abbreviated by the
 * gate since 0.2.0, absolute before) routes ambiguous duplicate ids, with
 * `~` expanded back and basename as last fallback. The transcript's answer
 * for that id is a user-side tool_result block whose record carries
 * toolDenialKind:
 *
 *   user-rejected / permission-rule (hook deny) / automode-blocked /
 *   automode-unavailable / interrupted — all mean the tool did NOT run.
 *   A tool_result without any denial marker means it DID (an is_error result
 *   with exit-code text is a ran-and-failed, not a refusal).
 *
 * Outcome taxonomy ("agreed" = reality matched reflex's recommendation):
 *   ask/deny + tool did not run        → agreed    (caution confirmed)
 *   ask/deny + tool ran                → overridden (caution was wrong, or a
 *                                         human consciously approved anyway)
 *   allow  + tool ran                  → agreed
 *   allow  + refused downstream        → overridden (classifier or human
 *                                         refused what reflex allowed)
 *   no tool_result / interrupted (ESC) / ambiguous duplicate → no-match
 *
 * Idempotent: a verdict already referenced by an outcome line is skipped, so
 * the correlator can be rerun on a growing log. Verdicts from gates older
 * than 0.1.5 (no tool_use_id) are skipped and counted — exact-command-text
 * matching is deliberately NOT attempted (ambiguous with repeated commands).
 *
 * Read-only over transcripts; the only file it writes is the verdict log
 * itself (appending, same 0600/0700 privacy as the gate). Fails soft on
 * schema drift: malformed lines are skipped, unknown denial kinds fall back
 * to text shape, and a missing/renamed field degrades to no-match rather
 * than a crash. Transcript JSONL is an unofficial surface — expect drift.
 *
 * Deliberately OUT of the gate process: zero hot-path latency, zero new
 * failure modes in the hook; run it on demand (or on a cron) when tuning.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, basename, dirname } from "node:path";

// Drift fallback: a rejection without toolDenialKind still carries this
// canonical text — guarded by is_error so a tool RESULT that merely quotes
// the phrase (e.g. cat of a transcript) is never mislabeled a refusal.
const REJECT_TEXT = /The user doesn't want to proceed/;
const DAY_MS = 24 * 60 * 60 * 1000;

function parseArgs(argv) {
	const args = { dryRun: false };
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === "--dry-run") args.dryRun = true;
		else if (argv[i] === "--log") args.log = argv[++i];
		else if (argv[i] === "--projects") args.projects = argv[++i];
	}
	return args;
}

function readJsonLines(path) {
	try {
		return readFileSync(path, "utf8").split("\n").map((l) => {
			try { return JSON.parse(l); } catch { return null; } // malformed line: skipped
		}).filter(Boolean);
	} catch {
		return null;
	}
}

// Gather transcript records whose tool_result blocks carry a watched id.
// One streaming pass per file; anything unexpected is skipped.
function collectCandidates(projectsDir, idSet, minTsMs) {
	const byId = new Map();
	if (!existsSync(projectsDir)) return byId;
	const floor = Number.isFinite(minTsMs) ? minTsMs - DAY_MS : -Infinity;
	const walk = (dir, depth) => {
		let entries;
		try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
		for (const e of entries) {
			const p = join(dir, e.name);
			if (e.isDirectory()) { if (depth < 3) walk(p, depth + 1); continue; }
			if (!e.name.endsWith(".jsonl")) continue;
			let fresher;
			try { fresher = statSync(p).mtimeMs >= floor; } catch { fresher = false; }
			if (!fresher) continue;
			const lines = readJsonLines(p) ?? [];
			for (const rec of lines) {
				const content = rec?.message?.content;
				if (!Array.isArray(content)) continue;
				for (const block of content) {
					const id = block?.tool_use_id;
					if (block?.type !== "tool_result" || typeof id !== "string" || !idSet.has(id)) continue;
					const list = byId.get(id) ?? [];
					list.push({
						file: p,
						kind: typeof rec.toolDenialKind === "string" ? rec.toolDenialKind : undefined,
						isError: block.is_error === true,
						text: String(block.content ?? "").slice(0, 300),
						sessionId: typeof rec.sessionId === "string" ? rec.sessionId : (typeof rec.session_id === "string" ? rec.session_id : undefined),
					});
					byId.set(id, list);
				}
			}
		}
	};
	walk(projectsDir, 0);
	return byId;
}

// The gate home-abbreviates transcript_path since 0.2.0 (~ = homedir), so a
// logged `~/…` path expands back before exact matching; absolute lines from
// older gates expand to themselves. Basename stays as the last fallback.
function expandHome(p, home) {
	return typeof p === "string" && (p === "~" || p.startsWith("~/")) ? join(home, p.slice(1)) : p;
}

// Which transcript record answers this verdict: the one its transcript_path
// names, else its session, else a lone candidate; several unrouted candidates
// are ambiguous (a repeated id across sessions) → no-match, never a guess.
function pickCandidate(candidates, v, home) {
	if (candidates.length === 0) return { candidate: null, basis: "missing" };
	if (candidates.length > 1) {
		const tp = expandHome(v.transcript_path, home);
		const routed =
			(tp && (candidates.find((c) => c.file === tp) ?? candidates.find((c) => basename(c.file) === basename(tp))))
			?? (v.session_id && candidates.find((c) => c.sessionId === v.session_id));
		if (routed) return { candidate: routed, basis: classify(routed) };
		return { candidate: null, basis: "ambiguous" };
	}
	return { candidate: candidates[0], basis: classify(candidates[0]) };
}

function classify(c) {
	if (c.kind === "interrupted") return "interrupted";
	if (c.kind === "user-rejected" || (!c.kind && c.isError && REJECT_TEXT.test(c.text))) return "user-rejected";
	if (c.kind === "permission-rule") return "hook-denied";
	if (c.kind === "automode-blocked" || c.kind === "automode-unavailable") return "classifier-denied";
	if (c.kind) return c.kind; // unknown future denial kind: blocked-shaped until proven otherwise
	return "ran";
}

// "agreed" = the tool's fate matched reflex's recommendation.
function label(basis, decision) {
	if (basis === "missing" || basis === "ambiguous" || basis === "interrupted") return "no-match";
	const ran = basis === "ran";
	if (decision === "allow") return ran ? "agreed" : "overridden";
	return ran ? "overridden" : "agreed"; // ask/deny
}

function verdictClass(v) {
	if (v.fastpath) return `fastpath:${v.fastpath}${v.pattern ? `:${v.pattern}` : ""}`;
	if (v.provider) return `model:${v.provider}`;
	return "other";
}

function tallyAdd(tally, decision, outcome) {
	const d = (tally[decision] ??= { agreed: 0, overridden: 0, "no-match": 0 });
	d[outcome]++;
}

function rateLine(t) {
	const n = t.overridden, d = t.agreed + t.overridden;
	return d === 0 ? "override rate – (0/0)" : `override rate ${Math.round((n / d) * 100)}% (${n}/${d})`;
}

// -- Main ----------------------------------------------------------------------

const args = parseArgs(process.argv.slice(2));
const cfg = {
	log: args.log ?? process.env.REFLEX_LOG ?? join(homedir(), ".local", "share", "reflex", "verdicts.jsonl"),
	projects: args.projects ?? join(homedir(), ".claude", "projects"),
	dryRun: args.dryRun,
};

const lines = readJsonLines(cfg.log);
if (lines === null) {
	console.error(`correlate-outcomes: cannot read verdict log ${cfg.log}`);
	process.exit(1);
}

const verdicts = lines.filter((l) => l.kind === "verdict" && (l.decision === "allow" || l.decision === "ask" || l.decision === "deny"));
const existing = new Set(
	lines.filter((l) => l.kind === "outcome")
		.map((l) => `${l.verdictTs}|${l.tool_use_id}|${l.verdict}`),
);
const pending = verdicts.filter((v) => typeof v.tool_use_id === "string" && v.tool_use_id && !existing.has(`${v.ts}|${v.tool_use_id}|${v.decision}`));
const skippedNoId = verdicts.length - verdicts.filter((v) => typeof v.tool_use_id === "string" && v.tool_use_id).length;
const alreadyLabeled = verdicts.length - skippedNoId - pending.length;

const minTsMs = Math.min(...pending.map((v) => Date.parse(v.ts)).filter(Number.isFinite).concat(Infinity));
const byId = collectCandidates(cfg.projects, new Set(pending.map((v) => v.tool_use_id)), minTsMs);
const home = homedir();

const outcomes = [];
const byDecision = {}, byClass = new Map();
for (const v of pending) {
	const { candidate, basis } = pickCandidate(byId.get(v.tool_use_id) ?? [], v, home);
	const outcome = label(basis, v.decision);
	outcomes.push({
		ts: new Date().toISOString(),
		kind: "outcome",
		verdictTs: v.ts,
		tool_use_id: v.tool_use_id,
		verdict: v.decision,
		outcome,
		basis,
		class: verdictClass(v),
	});
	tallyAdd(byDecision, v.decision, outcome);
	const cls = verdictClass(v);
	// class tallies stay flat across decisions (a class is usually
	// single-decision anyway) — rateLine reads agreed/overridden directly
	const ct = byClass.get(cls) ?? { agreed: 0, overridden: 0, "no-match": 0, decisions: new Set() };
	ct[outcome]++;
	ct.decisions.add(v.decision);
	byClass.set(cls, ct);
}

if (!cfg.dryRun && outcomes.length > 0) {
	try {
		mkdirSync(dirname(cfg.log), { recursive: true, mode: 0o700 });
		appendFileSync(cfg.log, outcomes.map((o) => JSON.stringify(o)).join("\n") + "\n", { mode: 0o600 });
	} catch (err) {
		console.error(`correlate-outcomes: cannot append to ${cfg.log}: ${err?.message ?? err}`);
		process.exit(1);
	}
}

// -- Summary (the deliverable: override rate per pattern class) -------------------

console.log(`outcome correlation — log: ${cfg.log}${cfg.dryRun ? " (dry-run)" : ""}`);
console.log(`verdicts: ${verdicts.length} total, ${outcomes.length} correlated, ${skippedNoId} skipped (no tool_use_id — pre-0.1.5 gate), ${alreadyLabeled} already labeled`);
for (const decision of ["ask", "deny", "allow"]) {
	const t = byDecision[decision];
	if (!t) continue;
	console.log(`  ${decision}: agreed=${t.agreed} overridden=${t.overridden} no-match=${t["no-match"]} — ${rateLine(t)}`);
}
if (byClass.size > 0) {
	console.log("by class:");
	for (const [cls, t] of byClass) {
		const counts = `${t.agreed ? `agreed=${t.agreed} ` : ""}${t.overridden ? `overridden=${t.overridden} ` : ""}${t["no-match"] ? `no-match=${t["no-match"]}` : ""}`.trim();
		console.log(`  ${cls}  [${[...t.decisions].sort().join("/")}] ${counts} — ${rateLine(t)}`);
	}
}
console.log(cfg.dryRun
	? `dry-run: ${outcomes.length} outcome line(s) NOT written`
	: `wrote ${outcomes.length} outcome line(s) to ${cfg.log}`);
