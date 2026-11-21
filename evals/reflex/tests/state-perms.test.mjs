#!/usr/bin/env node
/**
 * state-perms tests — verdict log and failstate never stay world-readable.
 *
 *   node --test evals/reflex/tests/state-perms.test.mjs
 *
 * Regression guard for the 0.2.0 field finding: files created by pre-0.1.1
 * reflex kept their birth mode forever (a live 664 verdicts.jsonl holding
 * verbatim credential-bearing commands, world-readable — flagged by
 * reflex-status as PERMS WIDE). appendFileSync/writeFileSync mode only
 * applies at creation, so the fix tightens existing files on every write.
 *
 * runGate uses async spawn so the in-process mock provider can answer the
 * gate child's fetch — spawnSync froze the event loop and every provider-
 * path run died at the gate's 3s fetch timeout (found in review 2026-11-21).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, statSync, rmSync } from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const GATE = join(HERE, "..", "..", "..", "plugins", "reflex", "scripts", "reflex-gate.mjs");

function runGate(env, payload) {
	return new Promise((resolve) => {
		const child = spawn("node", [GATE], {
			env: { ...process.env, ...env },
			stdio: ["pipe", "pipe", "pipe"],
		});
		const timer = setTimeout(() => child.kill("SIGKILL"), 10_000);
		child.on("close", (code) => {
			clearTimeout(timer);
			resolve(code);
		});
		child.stdin.on("error", () => {}); // EPIPE if the gate exits before reading
		child.stdin.end(JSON.stringify(payload));
	});
}

const payload = {
	tool_input: { command: "echo hello", tool_name: "Bash" },
	permission_mode: "auto",
};

test("wide-mode verdict log is tightened to 0600 on the next write", async () => {
	const tmp = mkdtempSync(join(tmpdir(), "reflex-perms-"));
	try {
		const log = join(tmp, "verdicts.jsonl");
		// a log born in the pre-hygiene era
		writeFileSync(log, '{"ts":"2026-01-01T00:00:00Z","kind":"verdict","decision":"allow"}\n', { mode: 0o664 });
		assert.equal(statSync(log).mode & 0o777, 0o664);
		const code = await runGate({ REFLEX_LOG: log, REFLEX_STATE_FILE: join(tmp, "failstate.json") }, payload);
		assert.equal(code, 0);
		assert.equal(statSync(log).mode & 0o777, 0o600, "log still wide after a gate write");
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("wide-mode failstate is tightened to 0600 on the next save", async () => {
	const tmp = mkdtempSync(join(tmpdir(), "reflex-perms-"));
	const server = http.createServer((req, res) => {
		let b = "";
		req.on("data", (c) => (b += c));
		req.on("end", () => {
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ model: "mock-1", answers: { destructive: { noul: 0.1 }, exfiltration: { noul: 0.1 }, prod_infra: { noul: 0.1 } } }));
		});
	});
	await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
	try {
		const state = join(tmp, "failstate.json");
		writeFileSync(state, "{}", { mode: 0o664 });
		// failstate only saves after a decision-model chain run, so this one
		// goes through the provider path (loopback mock, answered because the
		// event loop stays free). No environment skip: saveFailState runs
		// after the chain whether the provider call succeeds or errors, so
		// the 0600 assertion is valid everywhere — a still-wide file is a
		// real regression, not an environment limitation.
		const code = await runGate(
			{
				REFLEX_LOG: join(tmp, "verdicts.jsonl"),
				REFLEX_STATE_FILE: state,
				REFLEX_PROVIDERS: "typesafe",
				REFLEX_SPEC_TYPESAFE_JSON: JSON.stringify({ url: `http://127.0.0.1:${server.address().port}/v1/systemone` }),
				TYPESAFE_API_KEY: "test-key",
			},
			{ tool_input: { command: "deploy-to-production --env prod", tool_name: "Bash" }, permission_mode: "auto" }
		);
		assert.equal(code, 0);
		assert.equal(statSync(state).mode & 0o777, 0o600, "failstate still wide after a gate write");
	} finally {
		server.close();
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("fresh files are created 0600 as before", async () => {
	const tmp = mkdtempSync(join(tmpdir(), "reflex-perms-"));
	try {
		const log = join(tmp, "verdicts.jsonl");
		const code = await runGate({ REFLEX_LOG: log, REFLEX_STATE_FILE: join(tmp, "failstate.json") }, payload);
		assert.equal(code, 0);
		assert.equal(statSync(log).mode & 0o777, 0o600);
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});
