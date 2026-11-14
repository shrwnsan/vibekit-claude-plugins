#!/usr/bin/env node
/**
 * report-denials — missed-denials report for reflex, from session transcripts.
 *
 *   node evals/reflex/report-denials.mjs [--projects DIR] [--days N] [--all]
 *
 * Reflex's silent handoffs (no key, chain exhausted, non-Bash tools) produce
 * no verdict line by design, so pattern extension has no verdict-log evidence
 * for the calls the auto-mode classifier refused instead. But the transcript
 * records every classifier refusal with structured labels: a user-side
 * tool_result whose record carries toolDenialKind: "automode-blocked", plus
 * — on recent Claude Code builds — a top-level permissionDecision with
 * classifierCategory. This report tabulates those denials over a window:
 *
 *   - grouped by tool_name; the Bash rows are reflex's miss list: candidate
 *     fast-path or decision-model patterns, each with command text and
 *     category, ready to be triaged into DENY_PATTERNS / ASK_PATTERNS /
 *     secrets patterns on evidence;
 *   - non-Bash rows (e.g. Write, category ci_bypass) are scope questions for
 *     the classifier — surfaced for visibility, deliberately not reflex
 *     candidates (semantic intent gating is the classifier's job; regex over
 *     file bodies would be over-fitting);
 *   - pre-labeling records (no permissionDecision) still count, shown as
 *     unlabeled; denials whose tool_use record has rotated away land in an
 *     unknown bucket rather than being dropped.
 *
 * Read-only: prints to stdout, writes nothing. Tolerant of schema drift like
 * correlate-outcomes.mjs — malformed lines are skipped, missing fields
 * degrade (category → unlabeled, tool → unknown) rather than crashing.
 * Transcript JSONL is an unofficial surface — expect drift. Post-hoc only,
 * deliberately out of the gate process.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const DAY_MS = 24 * 60 * 60 * 1000;
const CELL = 200; // max characters of command text / file path per row

function parseArgs(argv) {
	const args = { days: 30 };
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === "--days") args.days = argv[++i];
		else if (argv[i] === "--all") args.all = true;
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
		return [];
	}
}

function walkProjects(projectsDir, floorMs, visit) {
	const walk = (dir, depth) => {
		let entries;
		try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
		for (const e of entries) {
			const p = join(dir, e.name);
			if (e.isDirectory()) { if (depth < 3) walk(p, depth + 1); continue; }
			if (!e.name.endsWith(".jsonl")) continue;
			if (floorMs !== -Infinity) {
				let fresher;
				try { fresher = statSync(p).mtimeMs >= floorMs; } catch { fresher = false; }
				if (!fresher) continue;
			}
			for (const rec of readJsonLines(p)) visit(rec, p);
		}
	};
	walk(projectsDir, 0);
}

// tsMs: undefined when the record carries no parseable timestamp — such
// records are always included (a harvest tool over-shows rather than
// silently dropping evidence) and sort last, displayed undated.
function recTsMs(rec) {
	const ms = Date.parse(rec?.timestamp);
	return Number.isFinite(ms) ? ms : undefined;
}

// Pass 1: classifier denials. Dedupe key id+ts+category — session copies of a
// transcript replay identical records; a genuinely repeated id (same command
// refused twice) differs in ts and stays two rows.
function collectDenials(projectsDir, floorMs, windowStartMs) {
	const denials = new Map();
	walkProjects(projectsDir, floorMs, (rec) => {
		if (rec?.toolDenialKind !== "automode-blocked") return;
		const content = rec?.message?.content;
		if (!Array.isArray(content)) return;
		const tsMs = recTsMs(rec);
		if (windowStartMs !== -Infinity && tsMs !== undefined && tsMs < windowStartMs) return;
		for (const block of content) {
			if (block?.type !== "tool_result" || typeof block.tool_use_id !== "string") continue;
			const category = typeof rec.permissionDecision?.classifierCategory === "string"
				? rec.permissionDecision.classifierCategory
				: "unlabeled";
			const key = `${block.tool_use_id}|${rec.timestamp ?? ""}|${category}`;
			if (!denials.has(key)) {
				denials.set(key, { id: block.tool_use_id, tsMs, category });
			}
		}
	});
	return denials;
}

// Pass 2: the assistant-side tool_use records naming those calls.
function collectUses(projectsDir, floorMs, ids) {
	const uses = new Map();
	walkProjects(projectsDir, floorMs, (rec) => {
		const content = rec?.message?.content;
		if (!Array.isArray(content)) return;
		for (const block of content) {
			if (block?.type !== "tool_use" || typeof block.id !== "string" || !ids.has(block.id)) continue;
			if (!uses.has(block.id)) uses.set(block.id, block);
		}
	});
	return uses;
}

// What to show for a denied call: the command for Bash, the file for the
// editing tools, compact JSON otherwise. Drift-truncated, never multiline.
function inputRepr(use) {
	const input = use?.input;
	if (use?.name === "Bash" && typeof input?.command === "string") return input.command;
	if (typeof input?.file_path === "string") return input.file_path;
	const s = JSON.stringify(input ?? null) ?? "null";
	return s.length > CELL ? s.slice(0, CELL - 1) + "…" : s;
}

const clip = (s) => (s.length > CELL ? s.slice(0, CELL - 1) + "…" : s);

// -- Main ----------------------------------------------------------------------

const args = parseArgs(process.argv.slice(2));
const days = Number.parseInt(args.days, 10);
if (!args.all && (!Number.isInteger(days) || days < 1)) {
	console.error("report-denials: --days must be a positive integer (or pass --all)");
	process.exit(1);
}
const projects = args.projects ?? join(homedir(), ".claude", "projects");
if (!existsSync(projects)) {
	console.error(`report-denials: projects dir not found: ${projects}`);
	process.exit(1);
}
const home = homedir();
const shownProjects = projects === home ? "~" : projects.startsWith(home + "/") ? "~" + projects.slice(home.length) : projects;
const windowLabel = args.all ? "all time" : `${days}d`;
// floorMs only prunes files from the walk (mtime lags the window by a day);
// the record's own timestamp is what the window filter actually applies to.
const floorMs = args.all ? -Infinity : Date.now() - (days + 1) * DAY_MS;
const windowStartMs = args.all ? -Infinity : Date.now() - days * DAY_MS;

const denials = collectDenials(projects, floorMs, windowStartMs);
const uses = collectUses(projects, floorMs, new Set([...denials.values()].map((d) => d.id)));

// rows grouped by tool name, unknown bucket last
const byTool = new Map();
for (const d of denials.values()) {
	const use = uses.get(d.id);
	const tool = use?.name ?? "unknown";
	const repr = use ? clip(inputRepr(use)) : "(tool_use record not found)";
	const list = byTool.get(tool) ?? [];
	list.push({ tsMs: d.tsMs, category: d.category, repr });
	byTool.set(tool, list);
}
const sortRows = (a, b) => (a.tsMs ?? Infinity) - (b.tsMs ?? Infinity);
for (const list of byTool.values()) list.sort(sortRows);

const labeled = [...denials.values()].filter((d) => d.category !== "unlabeled").length;
const categories = new Map();
for (const d of denials.values()) {
	if (d.category !== "unlabeled") categories.set(d.category, (categories.get(d.category) ?? 0) + 1);
}

// -- Summary --------------------------------------------------------------------

console.log(`missed denials — automode-blocked classifier denials in ${shownProjects} [window: ${windowLabel}]`);
console.log(`total: ${denials.size} (labeled ${labeled} / unlabeled ${denials.size - labeled})`);
if (byTool.size > 0) {
	console.log("by tool:");
	for (const [tool, rows] of [...byTool].sort((a, b) => (a[0] === "unknown") - (b[0] === "unknown"))) {
		const missNote = tool === "Bash" ? " — reflex miss list: candidate fast-path / decision-model patterns" : "";
		console.log(`  ${tool} ×${rows.length}${missNote}`);
		for (const row of rows) {
			const date = row.tsMs !== undefined ? new Date(row.tsMs).toISOString().slice(0, 10) : "????-??-??";
			console.log(`    ${date} [${row.category}] ${row.repr}`);
		}
	}
	const nonBash = [...byTool].filter(([tool]) => tool !== "Bash").reduce((n, [, rows]) => n + rows.length, 0);
	if (nonBash > 0) console.log(`non-Bash: ${nonBash} — classifier-scope questions, not reflex candidates`);
	if (categories.size > 0) {
		const line = [...categories].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
			.map(([c, n]) => `${c} ×${n}`).join(", ");
		console.log(`categories: ${line}`);
	}
}
