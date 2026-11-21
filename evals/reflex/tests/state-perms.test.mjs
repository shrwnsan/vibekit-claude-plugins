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
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, statSync, rmSync } from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const GATE = join(HERE, "..", "..", "..", "plugins", "reflex", "scripts", "reflex-gate.mjs");

const payload = JSON.stringify({
	tool_input: { command: "echo hello", tool_name: "Bash" },
	permission_mode: "auto",
});

test("wide-mode verdict log is tightened to 0600 on the next write", async () => {
	const tmp = mkdtempSync(join(tmpdir(), "reflex-perms-"));
	try {
		const log = join(tmp, "verdicts.jsonl");
		// a log born in the pre-hygiene era
		writeFileSync(log, '{"ts":"2026-01-01T00:00:00Z","kind":"verdict","decision":"allow"}\n', { mode: 0o664 });
		assert.equal(statSync(log).mode & 0o777, 0o664);
		const r = spawnSync("node", [GATE], { input: payload, encoding: "utf8", timeout: 15_000, env: { ...process.env, REFLEX_LOG: log, REFLEX_STATE_FILE: join(tmp, "failstate.json") } });
		assert.equal(r.status, 0);
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
		// goes through the provider path (loopback mock; same sandbox-skip
		// reasoning as deny-persistence.test.mjs)
		const r = spawnSync("node", [GATE], {
			input: JSON.stringify({ tool_input: { command: "deploy-to-production --env prod", tool_name: "Bash" }, permission_mode: "auto" }),
			encoding: "utf8", timeout: 15_000,
			env: {
				...process.env,
				REFLEX_LOG: join(tmp, "verdicts.jsonl"),
				REFLEX_STATE_FILE: state,
				REFLEX_PROVIDERS: "typesafe",
				REFLEX_SPEC_TYPESAFE_JSON: JSON.stringify({ url: `http://127.0.0.1:${server.address().port}/v1/systemone` }),
				TYPESAFE_API_KEY: "test-key",
			},
		});
		assert.equal(r.status, 0);
		let logText = "";
		try { logText = readFileSync(join(tmp, "verdicts.jsonl"), "utf8"); } catch { /* no chain run */ }
		if (/provider-error/.test(logText) && (statSync(state).mode & 0o077)) {
			console.log("skip: loopback egress blocked by sandbox; run unsandboxed or in CI");
			return;
		}
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
		const r = spawnSync("node", [GATE], { input: payload, encoding: "utf8", timeout: 15_000, env: { ...process.env, REFLEX_LOG: log, REFLEX_STATE_FILE: join(tmp, "failstate.json") } });
		assert.equal(r.status, 0);
		assert.equal(statSync(log).mode & 0o777, 0o600);
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});
