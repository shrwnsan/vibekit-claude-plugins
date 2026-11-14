#!/usr/bin/env node
/**
 * report-denials tests — synthetic fixtures, no real user data.
 *
 *   node --test evals/reflex/tests/report-denials.test.mjs
 *
 * Each case builds a fake projects tree whose transcript records are modeled
 * on real Claude Code output (assistant tool_use blocks; user-side
 * tool_result blocks carrying toolDenialKind: automode-blocked with an
 * optional top-level permissionDecision.classifierCategory — absent on
 * pre-labeling records), runs the report as a child process, and asserts on
 * its stdout. The report is read-only: nothing under the scenario root
 * changes.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPORT = join(HERE, "..", "report-denials.mjs");

const ago = (ms) => new Date(Date.now() - ms).toISOString();
const H = 3600e3, D = 24 * H;

// -- fixture builders ---------------------------------------------------------

// assistant-side record naming the tool call
const assistantUse = (id, name, input) => JSON.stringify({
	type: "assistant",
	message: { role: "assistant", content: [{ type: "tool_use", id, name, input }] },
	sessionId: "sess-a",
	timestamp: ago(2 * H),
});

// extra: { ts, category, sessionId } — category undefined = pre-labeling record
const denial = (id, extra = {}) => JSON.stringify({
	type: "user",
	message: { role: "user", content: [{ type: "tool_result", content: "Permission for this action was denied by the Claude Code auto-mode classifier", is_error: true, tool_use_id: id }] },
	toolUseResult: "Error: Permission for this action was denied by the Claude Code auto-mode classifier",
	classifierBoundary: true,
	toolDenialKind: "automode-blocked",
	...(extra.category ? { permissionDecision: { decision: "reject", source: "config", reasonType: "classifier", reasonCode: "classifier:auto-mode", classifierCategory: extra.category } } : {}),
	timestamp: extra.ts ?? ago(H),
	sessionId: extra.sessionId ?? "sess-a",
});

// other denial kinds must never appear in the report
const otherKind = (id, kind) => JSON.stringify({
	type: "user",
	message: { role: "user", content: [{ type: "tool_result", content: "no", is_error: true, tool_use_id: id }] },
	toolDenialKind: kind,
	timestamp: ago(H),
	sessionId: "sess-a",
});

// -- harness -------------------------------------------------------------------

function scenario(files) {
	const root = mkdtempSync(join(tmpdir(), "reflex-denials-"));
	for (const [rel, content] of Object.entries(files)) {
		const p = join(root, rel);
		mkdirSync(dirname(p), { recursive: true });
		writeFileSync(p, content);
	}
	return root;
}

function runReport(root, args = []) {
	return new Promise((resolve) => {
		const child = spawn(process.execPath, [REPORT, "--projects", join(root, "projects"), ...args],
			{ stdio: ["ignore", "pipe", "pipe"] });
		let out = "", err = "";
		child.stdout.on("data", (c) => (out += c));
		child.stderr.on("data", (c) => (err += c));
		child.on("close", (code) => resolve({ code, out, err }));
	});
}

// -- cases ----------------------------------------------------------------------

test("Bash denial with category → row under Bash with command text (miss list)", async () => {
	const root = scenario({
		"projects/p-a/sess-a.jsonl": [
			assistantUse("call_1", "Bash", { command: "sh .worktrees/relax.sh" }),
			denial("call_1", { category: "ci_bypass" }),
		].join("\n") + "\n",
	});
	const r = await runReport(root);
	assert.equal(r.code, 0, r.err);
	assert.match(r.out, /Bash ×1/);
	assert.match(r.out, /\[ci_bypass\] sh \.worktrees\/relax\.sh/);
	rmSync(root, { recursive: true, force: true });
});

test("non-Bash denial (Write) → surfaced separately, never a Bash row", async () => {
	const root = scenario({
		"projects/p-a/sess-a.jsonl": [
			assistantUse("call_2", "Write", { file_path: "~/repo/.github/workflows/x.yml", content: "…" }),
			denial("call_2", { category: "ci_bypass" }),
		].join("\n") + "\n",
	});
	const r = await runReport(root);
	assert.equal(r.code, 0, r.err);
	assert.match(r.out, /Write ×1/);
	assert.match(r.out, /\[ci_bypass\] ~\/repo\/\.github\/workflows\/x\.yml/);
	assert.doesNotMatch(r.out, /Bash ×/);
	rmSync(root, { recursive: true, force: true });
});

test("pre-labeling record (no permissionDecision) → unlabeled row, still counted", async () => {
	const root = scenario({
		"projects/p-a/sess-a.jsonl": [
			assistantUse("call_3", "Bash", { command: "git clean -fdx" }),
			denial("call_3", {}),
		].join("\n") + "\n",
	});
	const r = await runReport(root);
	assert.equal(r.code, 0, r.err);
	assert.match(r.out, /\[unlabeled\] git clean -fdx/);
	assert.match(r.out, /unlabeled 1/);
	rmSync(root, { recursive: true, force: true });
});

test("window: --days excludes old denials, --all includes them", async () => {
	const root = scenario({
		"projects/p-a/sess-a.jsonl": [
			assistantUse("new_1", "Bash", { command: "echo fresh" }),
			denial("new_1", { category: "merge_without_review", ts: ago(2 * H) }),
			assistantUse("old_1", "Bash", { command: "echo stale" }),
			denial("old_1", { category: "merge_without_review", ts: ago(5 * D) }),
		].join("\n") + "\n",
	});
	const win = await runReport(root, ["--days", "1"]);
	assert.match(win.out, /echo fresh/);
	assert.doesNotMatch(win.out, /echo stale/);
	const all = await runReport(root, ["--all"]);
	assert.match(all.out, /echo fresh/);
	assert.match(all.out, /echo stale/);
	rmSync(root, { recursive: true, force: true });
});

test("only automode-blocked counts: other denial kinds never reported", async () => {
	const root = scenario({
		"projects/p-a/sess-a.jsonl": [
			assistantUse("k1", "Bash", { command: "git push --force" }),
			otherKind("k1", "user-rejected"),
			assistantUse("k2", "Bash", { command: "git reset --hard" }),
			otherKind("k2", "permission-rule"),
			assistantUse("k3", "Bash", { command: "make test" }),
			otherKind("k3", "automode-unavailable"),
			assistantUse("k4", "Bash", { command: "echo hit" }),
			denial("k4", { category: "irreversible_local_destruction" }),
		].join("\n") + "\n",
	});
	const r = await runReport(root);
	assert.match(r.out, /echo hit/);
	assert.doesNotMatch(r.out, /git push --force/);
	assert.doesNotMatch(r.out, /git reset --hard/);
	assert.doesNotMatch(r.out, /make test/);
	rmSync(root, { recursive: true, force: true });
});

test("denial whose tool_use record is gone → unknown-tool bucket, kept", async () => {
	const root = scenario({
		"projects/p-a/sess-a.jsonl": [
			denial("lost_1", { category: "code_that_leaks_when_run" }),
		].join("\n") + "\n",
	});
	const r = await runReport(root);
	assert.equal(r.code, 0, r.err);
	assert.match(r.out, /unknown ×1/);
	assert.match(r.out, /\[code_that_leaks_when_run\]/);
	rmSync(root, { recursive: true, force: true });
});

test("duplicate denial records (same id, ts, category) dedupe to one row", async () => {
	const ts = ago(H); // fixed so both file copies carry the identical record
	const line = (sess) => [
		assistantUse("dup_1", "Bash", { command: "rm -rf /tmp/x" }),
		denial("dup_1", { category: "unverifiable_deletion_scope", ts, sessionId: sess }),
	].join("\n");
	const root = scenario({
		"projects/p-a/sess-a.jsonl": line("sess-a") + "\n",
		"projects/p-a/sess-a-copy.jsonl": line("sess-a") + "\n",
	});
	const r = await runReport(root);
	assert.match(r.out, /Bash ×1/);
	assert.equal((r.out.match(/rm -rf \/tmp\/x/g) ?? []).length, 1);
	rmSync(root, { recursive: true, force: true });
});

test("same id denied twice at different times → two rows", async () => {
	const root = scenario({
		"projects/p-a/sess-a.jsonl": [
			assistantUse("twice_1", "Bash", { command: "echo a" }),
			denial("twice_1", { category: "ci_bypass", ts: ago(3 * H) }),
			assistantUse("twice_1b", "Bash", { command: "echo b" }),
			denial("twice_1", { category: "ci_bypass", ts: ago(H) }),
		].join("\n") + "\n",
	});
	const r = await runReport(root);
	assert.match(r.out, /Bash ×2/);
	rmSync(root, { recursive: true, force: true });
});

test("malformed lines and string content tolerated; missing projects dir exits 1", async () => {
	const root = scenario({
		"projects/p-a/sess-a.jsonl": [
			"garbage line",
			assistantUse("m1", "Bash", { command: "echo ok" }),
			denial("m1", { category: "ci_bypass" }),
			JSON.stringify({ type: "user", message: { role: "user", content: "plain string content" } }),
		].join("\n") + "\n",
	});
	const r = await runReport(root);
	assert.equal(r.code, 0, r.err);
	assert.match(r.out, /echo ok/);
	rmSync(root, { recursive: true, force: true });

	const ghost = mkdtempSync(join(tmpdir(), "reflex-denials-"));
	const g = await runReport(ghost, []);
	assert.equal(g.code, 1);
	assert.match(g.err, /not found|cannot read/);
	rmSync(ghost, { recursive: true, force: true });
});

test("summary tallies categories and labeled/unlabeled split", async () => {
	const root = scenario({
		"projects/p-a/sess-a.jsonl": [
			assistantUse("s1", "Bash", { command: "echo 1" }),
			denial("s1", { category: "ci_bypass" }),
			assistantUse("s2", "Bash", { command: "echo 2" }),
			denial("s2", { category: "ci_bypass" }),
			assistantUse("s3", "Bash", { command: "echo 3" }),
			denial("s3", {}),
		].join("\n") + "\n",
	});
	const r = await runReport(root);
	assert.match(r.out, /total: 3/);
	assert.match(r.out, /labeled 2 \/ unlabeled 1/);
	assert.match(r.out, /ci_bypass ×2/);
	rmSync(root, { recursive: true, force: true });
});

test("empty window → clean zero report, exit 0", async () => {
	const root = scenario({
		"projects/p-a/sess-a.jsonl": [
			assistantUse("e1", "Bash", { command: "ls" }),
			denial("e1", { category: "ci_bypass", ts: ago(90 * D) }),
		].join("\n") + "\n",
	});
	const r = await runReport(root, ["--days", "7"]);
	assert.equal(r.code, 0, r.err);
	assert.match(r.out, /total: 0/);
	rmSync(root, { recursive: true, force: true });
});
