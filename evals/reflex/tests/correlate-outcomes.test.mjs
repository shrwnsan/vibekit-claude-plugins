#!/usr/bin/env node
/**
 * correlate-outcomes tests — synthetic fixtures, no real user data.
 *
 *   node --test evals/reflex/tests/correlate-outcomes.test.mjs
 *
 * Each case builds a throwaway verdict log plus a fake projects tree whose
 * transcript records are modeled on real Claude Code v2.1.308 output
 * (assistant tool_use blocks; user-side tool_result blocks carrying
 * toolDenialKind: user-rejected / permission-rule / automode-blocked /
 * interrupted), runs the correlator as a child process, and asserts the
 * kind:"outcome" lines appended to the log copy.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CORRELATOR = join(HERE, "..", "correlate-outcomes.mjs");

// -- fixture builders ---------------------------------------------------------

const assistantUse = (id, cmd) => JSON.stringify({
	type: "assistant",
	message: { role: "assistant", content: [{ type: "tool_use", id, name: "Bash", input: { command: cmd } }] },
	sessionId: "sess-a",
});

// extra: { text, isError, toolUseResult, kind, perm, sessionId }
const userResult = (id, extra = {}) => JSON.stringify({
	type: "user",
	message: { role: "user", content: [{ type: "tool_result", content: extra.text ?? "out", is_error: extra.isError ?? false, tool_use_id: id }] },
	toolUseResult: extra.toolUseResult ?? { stdout: "out" },
	...(extra.kind ? { toolDenialKind: extra.kind } : {}),
	...(extra.perm ? { permissionDecision: extra.perm } : {}),
	sessionId: extra.sessionId ?? "sess-a",
});

// o: { ts, decision, fastpath, pattern, provider, toolUseId, sessionId, transcriptPath }
const verdict = (o) => JSON.stringify({
	ts: o.ts,
	kind: "verdict",
	decision: o.decision,
	reason: o.reason ?? "risky pattern — force push",
	command: o.command ?? "git push --force",
	cwd: "/x",
	mode: "auto",
	ms: 2,
	...(o.fastpath ? { fastpath: o.fastpath } : {}),
	...(o.pattern ? { pattern: o.pattern } : {}),
	...(o.provider ? { provider: o.provider } : {}),
	...(o.toolUseId ? { tool_use_id: o.toolUseId } : {}),
	...(o.sessionId ? { session_id: o.sessionId } : {}),
	...(o.transcriptPath ? { transcript_path: o.transcriptPath } : {}),
});

// -- harness -------------------------------------------------------------------

function scenario(files) {
	const root = mkdtempSync(join(tmpdir(), "reflex-corr-"));
	for (const [rel, content] of Object.entries(files)) {
		const p = join(root, rel);
		mkdirSync(dirname(p), { recursive: true });
		writeFileSync(p, content);
	}
	return root;
}

function runCorrelator(root, args = []) {
	return new Promise((resolve) => {
		const child = spawn(process.execPath, [CORRELATOR, "--log", join(root, "log.jsonl"), "--projects", join(root, "projects"), ...args],
			{ stdio: ["ignore", "pipe", "pipe"] });
		let out = "", err = "";
		child.stdout.on("data", (c) => (out += c));
		child.stderr.on("data", (c) => (err += c));
		child.on("close", (code) => {
			// tolerate malformed lines: some scenarios plant them on purpose
			const lines = readFileSync(join(root, "log.jsonl"), "utf8").trim().split("\n").filter(Boolean)
				.map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
			resolve({ code, out, err, lines, outcomes: lines.filter((l) => l.kind === "outcome") });
		});
	});
}

const strip = (o) => ({
	verdictTs: o.verdictTs,
	tool_use_id: o.tool_use_id,
	verdict: o.verdict,
	outcome: o.outcome,
	basis: o.basis,
	class: o.class,
});

// -- cases ----------------------------------------------------------------------

test("ask + user rejection → agreed (toolDenialKind path)", async () => {
	const root = scenario({
		"log.jsonl": verdict({ ts: "T1", decision: "ask", fastpath: "ask", pattern: "force push", toolUseId: "call_1" }) + "\n",
		"projects/p-a/sess-a.jsonl": [
			assistantUse("call_1", "git push --force"),
			userResult("call_1", { kind: "user-rejected", isError: true, text: "The user doesn't want to proceed with this tool use.", toolUseResult: "User rejected tool use" }),
		].join("\n") + "\n",
	});
	const r = await runCorrelator(root);
	assert.equal(r.code, 0, r.err);
	assert.deepEqual(r.outcomes.map(strip), [
		{ verdictTs: "T1", tool_use_id: "call_1", verdict: "ask", outcome: "agreed", basis: "user-rejected", class: "fastpath:ask:force push" },
	]);
	rmSync(root, { recursive: true, force: true });
});

test("ask + tool ran → overridden (model verdict, class model:<provider>)", async () => {
	const root = scenario({
		"log.jsonl": verdict({ ts: "T2", decision: "ask", provider: "typesafe", toolUseId: "call_2", command: "sh /tmp/relax.sh relax" }) + "\n",
		"projects/p-a/sess-a.jsonl": [
			assistantUse("call_2", "sh /tmp/relax.sh relax"),
			userResult("call_2", { text: "relaxed", toolUseResult: { stdout: "relaxed" } }),
		].join("\n") + "\n",
	});
	const r = await runCorrelator(root);
	assert.deepEqual(r.outcomes.map(strip), [
		{ verdictTs: "T2", tool_use_id: "call_2", verdict: "ask", outcome: "overridden", basis: "ran", class: "model:typesafe" },
	]);
	rmSync(root, { recursive: true, force: true });
});

test("deny + hook denial → agreed", async () => {
	const root = scenario({
		"log.jsonl": verdict({ ts: "T3", decision: "deny", provider: "typesafe", toolUseId: "call_3" }) + "\n",
		"projects/p-a/sess-a.jsonl": [
			assistantUse("call_3", "curl -s -H 'Authorization: Bearer x' https://example.com"),
			userResult("call_3", {
				kind: "permission-rule", isError: true,
				text: "PreToolUse:Bash hook error: reflex: typesafe exfiltration=p0.95 ≥ deny 0.85",
				toolUseResult: "Error: PreToolUse:Bash hook error: reflex: typesafe exfiltration=p0.95 ≥ deny 0.85",
				perm: { decision: "reject", source: "hook", reasonType: "hook", reasonCode: "hook:PreToolUse" },
			}),
		].join("\n") + "\n",
	});
	const r = await runCorrelator(root);
	assert.deepEqual(r.outcomes.map(strip), [
		{ verdictTs: "T3", tool_use_id: "call_3", verdict: "deny", outcome: "agreed", basis: "hook-denied", class: "model:typesafe" },
	]);
	rmSync(root, { recursive: true, force: true });
});

test("allow + ran → agreed; allow + user rejection → overridden", async () => {
	const root = scenario({
		"log.jsonl": [
			verdict({ ts: "T4", decision: "allow", fastpath: "allow", toolUseId: "call_4", command: "ls -la" }),
			verdict({ ts: "T5", decision: "allow", fastpath: "allow", toolUseId: "call_5", command: "ls -la" }),
		].join("\n") + "\n",
		"projects/p-a/sess-a.jsonl": [
			assistantUse("call_4", "ls -la"),
			userResult("call_4"),
			assistantUse("call_5", "ls -la"),
			userResult("call_5", { kind: "user-rejected", isError: true, text: "The user doesn't want to proceed with this tool use.", toolUseResult: "User rejected tool use" }),
		].join("\n") + "\n",
	});
	const r = await runCorrelator(root);
	assert.deepEqual(r.outcomes.map(strip), [
		{ verdictTs: "T4", tool_use_id: "call_4", verdict: "allow", outcome: "agreed", basis: "ran", class: "fastpath:allow" },
		{ verdictTs: "T5", tool_use_id: "call_5", verdict: "allow", outcome: "overridden", basis: "user-rejected", class: "fastpath:allow" },
	]);
	rmSync(root, { recursive: true, force: true });
});

test("no tool_result → no-match (basis missing); interrupted → no-match", async () => {
	const root = scenario({
		"log.jsonl": [
			verdict({ ts: "T6", decision: "ask", fastpath: "ask", pattern: "git reset --hard (discards uncommitted work)", toolUseId: "call_6" }),
			verdict({ ts: "T7", decision: "ask", fastpath: "ask", pattern: "force push", toolUseId: "call_7" }),
		].join("\n") + "\n",
		"projects/p-a/sess-a.jsonl": [
			assistantUse("call_7", "git push --force"),
			userResult("call_7", { kind: "interrupted", isError: true, text: "Request interrupted", toolUseResult: "Interrupted by user" }),
		].join("\n") + "\n",
	});
	const r = await runCorrelator(root);
	assert.deepEqual(r.outcomes.map(strip), [
		{ verdictTs: "T6", tool_use_id: "call_6", verdict: "ask", outcome: "no-match", basis: "missing", class: "fastpath:ask:git reset --hard (discards uncommitted work)" },
		{ verdictTs: "T7", tool_use_id: "call_7", verdict: "ask", outcome: "no-match", basis: "interrupted", class: "fastpath:ask:force push" },
	]);
	rmSync(root, { recursive: true, force: true });
});

test("classifier denial → agreed", async () => {
	const root = scenario({
		"log.jsonl": verdict({ ts: "T8", decision: "deny", provider: "typesafe", toolUseId: "call_8" }) + "\n",
		"projects/p-a/sess-a.jsonl": [
			assistantUse("call_8", "bash script.sh"),
			userResult("call_8", {
				kind: "automode-blocked", isError: true,
				text: "Permission for this action was denied by the Claude Code auto-mode classifier",
				toolUseResult: "Error: Permission for this action was denied by the Claude Code auto-mode classifier",
				perm: { decision: "reject", source: "config", reasonType: "classifier", reasonCode: "classifier:auto-mode" },
			}),
		].join("\n") + "\n",
	});
	const r = await runCorrelator(root);
	assert.deepEqual(r.outcomes.map(strip), [
		{ verdictTs: "T8", tool_use_id: "call_8", verdict: "deny", outcome: "agreed", basis: "classifier-denied", class: "model:typesafe" },
	]);
	rmSync(root, { recursive: true, force: true });
});

test("schema drift: text-only rejection (no toolDenialKind) still labels; success carrying the phrase is not a rejection", async () => {
	const root = scenario({
		"log.jsonl": [
			verdict({ ts: "T9", decision: "ask", fastpath: "ask", pattern: "force push", toolUseId: "call_9" }),
			verdict({ ts: "T10", decision: "ask", fastpath: "ask", pattern: "force push", toolUseId: "call_10", command: "cat transcript.jsonl" }),
		].join("\n") + "\n",
		"projects/p-a/sess-a.jsonl": [
			assistantUse("call_9", "git push --force"),
			userResult("call_9", { isError: true, text: "The user doesn't want to proceed with this tool use.", toolUseResult: "User rejected tool use" }),
			assistantUse("call_10", "cat transcript.jsonl"),
			userResult("call_10", { text: "The user doesn't want to proceed with this tool use. (quoted text)" }),
		].join("\n") + "\n",
	});
	const r = await runCorrelator(root);
	const byId = Object.fromEntries(r.outcomes.map((o) => [o.tool_use_id, strip(o)]));
	assert.deepEqual(byId.call_9, { verdictTs: "T9", tool_use_id: "call_9", verdict: "ask", outcome: "agreed", basis: "user-rejected", class: "fastpath:ask:force push" });
	assert.deepEqual(byId.call_10, { verdictTs: "T10", tool_use_id: "call_10", verdict: "ask", outcome: "overridden", basis: "ran", class: "fastpath:ask:force push" });
	rmSync(root, { recursive: true, force: true });
});

test("verdict without tool_use_id → skipped, no outcome line", async () => {
	const root = scenario({
		"log.jsonl": verdict({ ts: "T11", decision: "ask", fastpath: "ask", pattern: "force push" }) + "\n",
		"projects/p-a/sess-a.jsonl": [assistantUse("call_x", "git push --force"), userResult("call_x")].join("\n") + "\n",
	});
	const r = await runCorrelator(root);
	assert.equal(r.outcomes.length, 0);
	assert.match(r.out, /skipped/);
	rmSync(root, { recursive: true, force: true });
});

test("idempotent: existing outcome lines are not duplicated", async () => {
	const seed = JSON.stringify({ ts: "2026-11-12T00:00:00.000Z", kind: "outcome", verdictTs: "T12", tool_use_id: "call_12", verdict: "ask", outcome: "agreed", basis: "user-rejected", class: "fastpath:ask:force push" });
	const root = scenario({
		"log.jsonl": [verdict({ ts: "T12", decision: "ask", fastpath: "ask", pattern: "force push", toolUseId: "call_12" }), seed].join("\n") + "\n",
		"projects/p-a/sess-a.jsonl": [assistantUse("call_12", "git push --force"), userResult("call_12", { kind: "user-rejected", isError: true, text: "no", toolUseResult: "User rejected tool use" })].join("\n") + "\n",
	});
	const r = await runCorrelator(root);
	assert.equal(r.outcomes.length, 1, "exactly the seeded outcome line");
	assert.match(r.out, /already labeled/);
	rmSync(root, { recursive: true, force: true });
});

test("--dry-run: summary printed, log untouched", async () => {
	const root = scenario({
		"log.jsonl": verdict({ ts: "T13", decision: "ask", fastpath: "ask", pattern: "force push", toolUseId: "call_13" }) + "\n",
		"projects/p-a/sess-a.jsonl": [assistantUse("call_13", "git push --force"), userResult("call_13", { kind: "user-rejected", isError: true, text: "no", toolUseResult: "User rejected tool use" })].join("\n") + "\n",
	});
	const r = await runCorrelator(root, ["--dry-run"]);
	assert.equal(r.code, 0, r.err);
	assert.equal(r.outcomes.length, 0, "no outcome line appended");
	assert.match(r.out, /agreed/);
	rmSync(root, { recursive: true, force: true });
});

test("duplicate ids across transcripts: transcript_path wins", async () => {
	const root = mkdtempSync(join(tmpdir(), "reflex-corr-"));
	const mk = (rel, content) => { const p = join(root, rel); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, content); };
	const pathB = join(root, "projects/p-b/sess-b.jsonl");
	mk("log.jsonl", verdict({ ts: "T14", decision: "ask", fastpath: "ask", pattern: "force push", toolUseId: "call_14", transcriptPath: pathB }) + "\n");
	// file A: rejected; file B: ran — the verdict names B
	mk("projects/p-a/sess-a.jsonl", [
		assistantUse("call_14", "git push --force"),
		userResult("call_14", { kind: "user-rejected", isError: true, text: "no", toolUseResult: "User rejected tool use" }),
	].join("\n") + "\n");
	mk("projects/p-b/sess-b.jsonl", [
		assistantUse("call_14", "git push --force"),
		userResult("call_14"),
	].join("\n") + "\n");
	const r = await runCorrelator(root);
	assert.deepEqual(r.outcomes.map(strip), [
		{ verdictTs: "T14", tool_use_id: "call_14", verdict: "ask", outcome: "overridden", basis: "ran", class: "fastpath:ask:force push" },
	]);
	rmSync(root, { recursive: true, force: true });
});

test("malformed lines in log and transcripts are tolerated", async () => {
	const root = scenario({
		"log.jsonl": [
			"{{{not json",
			verdict({ ts: "T15", decision: "ask", fastpath: "ask", pattern: "force push", toolUseId: "call_15" }),
			JSON.stringify({ ts: "T15x", kind: "provider-error", provider: "typesafe", error: "HTTP 500" }),
			"",
		].join("\n") + "\n",
		"projects/p-a/sess-a.jsonl": [
			"garbage line",
			assistantUse("call_15", "git push --force"),
			JSON.stringify({ type: "user", message: { role: "user", content: "plain string content, not a block list" } }),
			userResult("call_15", { kind: "user-rejected", isError: true, text: "no", toolUseResult: "User rejected tool use" }),
		].join("\n") + "\n",
	});
	const r = await runCorrelator(root);
	assert.equal(r.code, 0, r.err);
	assert.deepEqual(r.outcomes.map(strip), [
		{ verdictTs: "T15", tool_use_id: "call_15", verdict: "ask", outcome: "agreed", basis: "user-rejected", class: "fastpath:ask:force push" },
	]);
	rmSync(root, { recursive: true, force: true });
});

test("summary reports override rate per decision and per class", async () => {
	const root = scenario({
		"log.jsonl": [
			verdict({ ts: "S1", decision: "ask", fastpath: "ask", pattern: "force push", toolUseId: "c1" }),
			verdict({ ts: "S2", decision: "ask", fastpath: "ask", pattern: "force push", toolUseId: "c2" }),
			verdict({ ts: "S3", decision: "ask", fastpath: "ask", pattern: "force push", toolUseId: "c3" }),
			verdict({ ts: "S4", decision: "ask", fastpath: "ask", pattern: "force push", toolUseId: "c4" }),
		].join("\n") + "\n",
		"projects/p-a/sess-a.jsonl": [
			assistantUse("c1", "git push --force"),
			userResult("c1", { kind: "user-rejected", isError: true, text: "no", toolUseResult: "User rejected tool use" }),
			assistantUse("c2", "git push --force"),
			userResult("c2", { kind: "user-rejected", isError: true, text: "no", toolUseResult: "User rejected tool use" }),
			assistantUse("c3", "git push --force"),
			userResult("c3", { kind: "user-rejected", isError: true, text: "no", toolUseResult: "User rejected tool use" }),
			assistantUse("c4", "git push --force"),
			userResult("c4"),
		].join("\n") + "\n",
	});
	const r = await runCorrelator(root);
	assert.match(r.out, /25% \(1\/4\)/); // 1 of 4 asks overridden
	assert.match(r.out, /fastpath:ask:force push/);
	rmSync(root, { recursive: true, force: true });
});

test("home-abbreviated transcript_path (~ form, gate ≥0.2.0) still routes", async () => {
	// The gate logs `~/…` since 0.2.0; expansion maps it back to homedir(), which
	// cannot reach this tmpdir fixture tree, so routing lands on the basename
	// fallback — the designed tolerance for path-spelling drift.
	const root = mkdtempSync(join(tmpdir(), "reflex-corr-"));
	const mk = (rel, content) => { const p = join(root, rel); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, content); };
	mk("log.jsonl", [
		verdict({ ts: "T16", decision: "ask", fastpath: "ask", pattern: "force push", toolUseId: "call_16", transcriptPath: "~/fake-projects/sess-16.jsonl" }),
		verdict({ ts: "T17", decision: "ask", fastpath: "ask", pattern: "force push", toolUseId: "call_17", transcriptPath: "~/fake-projects/sess-17.jsonl" }),
	].join("\n") + "\n");
	// two transcripts sharing the id (ambiguous) — the tilde path must still
	// route to sess-16.jsonl via basename, not collapse to no-match
	mk("projects/p-a/sess-16.jsonl", [
		assistantUse("call_16", "git push --force"),
		userResult("call_16", { kind: "user-rejected", isError: true, text: "no", toolUseResult: "User rejected tool use" }),
	].join("\n") + "\n");
	mk("projects/p-b/sess-17.jsonl", [
		assistantUse("call_16", "git push --force"),
		userResult("call_16"),
		assistantUse("call_17", "git push --force"),
		userResult("call_17"),
	].join("\n") + "\n");
	const r = await runCorrelator(root);
	assert.deepEqual(r.outcomes.map(strip), [
		{ verdictTs: "T16", tool_use_id: "call_16", verdict: "ask", outcome: "agreed", basis: "user-rejected", class: "fastpath:ask:force push" },
		{ verdictTs: "T17", tool_use_id: "call_17", verdict: "ask", outcome: "overridden", basis: "ran", class: "fastpath:ask:force push" },
	]);
	rmSync(root, { recursive: true, force: true });
});
