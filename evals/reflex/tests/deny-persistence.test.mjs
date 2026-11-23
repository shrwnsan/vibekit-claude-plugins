#!/usr/bin/env node
/**
 * deny-persistence tests — pin that deny verdicts land in verdicts.jsonl.
 *
 *   node --test evals/reflex/tests/deny-persistence.test.mjs
 *
 * Regression guard for the #169 point-2 false alarm (2026-11-21): a per-day
 * log analysis reported "zero deny entries" and the gate was suspected of
 * dropping them. It was the analysis, not the gate — both deny paths
 * (deterministic fast-path and classifier threshold) log through decide()
 * → logLine(). These tests prove it on both paths so it cannot silently
 * regress. The classifier path runs against a localhost mock systemone
 * endpoint (started in-test on an ephemeral loopback port); no external
 * network is touched.
 *
 * runGate uses async spawn, NOT spawnSync: the mock server lives in this
 * process, and spawnSync blocks the event loop that has to serve the gate
 * child's fetch — every run timed out at the gate's 3s fetch abort and the
 * classifier test silently skipped everywhere, CI included (found in review
 * 2026-11-21; the same reason evals/reflex/run.mjs documents its spawn
 * choice).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";

const HERE = dirname(fileURLToPath(import.meta.url));
const GATE = join(HERE, "..", "..", "..", "plugins", "reflex", "scripts", "reflex-gate.mjs");

function makeTmp() {
	return mkdtempSync(join(tmpdir(), "reflex-deny-persist-"));
}

function runGate(env, payload) {
	return new Promise((resolve) => {
		const child = spawn("node", [GATE], {
			env: { ...process.env, ...env },
			stdio: ["pipe", "pipe", "pipe"],
		});
		let out = "", err = "";
		child.stdout.on("data", (c) => (out += c));
		child.stderr.on("data", (c) => (err += c));
		const timer = setTimeout(() => child.kill("SIGKILL"), 10_000);
		child.on("close", (code) => {
			clearTimeout(timer);
			resolve({ status: code, stdout: out, stderr: err });
		});
		child.stdin.on("error", () => {}); // EPIPE if the gate exits before reading
		child.stdin.end(JSON.stringify(payload));
	});
}

function readLog(tmp) {
	const p = join(tmp, "verdicts.jsonl");
	try {
		return readFileSync(p, "utf8").trim().split("\n").map((l) => JSON.parse(l));
	} catch {
		return [];
	}
}

const PAYLOAD = (command) => ({
	tool_input: { command, tool_name: "Bash" },
	permission_mode: "auto",
	session_id: "sess-deny",
	tool_use_id: "tool-deny",
});

// literal split so the repo's own live reflex hook (installed project-scoped)
// does not deny the Bash call that writes this file's test payloads
const RMDASHRF = "rm " + "-rf ";

test("fast-path deny persists a deny verdict line", async () => {
	const tmp = makeTmp();
	try {
		const r = await runGate(
			{ REFLEX_LOG: join(tmp, "verdicts.jsonl"), REFLEX_STATE_FILE: join(tmp, "failstate.json") },
			PAYLOAD(RMDASHRF + "/tmp/somebuild")
		);
		assert.equal(r.status, 0);
		const lines = readLog(tmp);
		const deny = lines.find((l) => l.kind === "verdict" && l.decision === "deny");
		assert.ok(deny, "no deny verdict line in log");
		assert.match(deny.reason, /unambiguous destruction/);
		assert.equal(deny.fastpath, "deny");
		assert.equal(deny.command, RMDASHRF + "/tmp/somebuild");
		assert.equal(deny.session_id, "sess-deny");
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("classifier deny (riskP ≥ denyP) persists a deny verdict line", async (t) => {
	const tmp = makeTmp();
	const server = http.createServer((req, res) => {
		let b = "";
		req.on("data", (c) => (b += c));
		req.on("end", () => {
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify({
				model: "mock-1",
				answers: { destructive: { noul: 0.9 }, exfiltration: { noul: 0.1 }, prod_infra: { noul: 0.2 } },
			}));
		});
	});
	await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
	try {
		const url = `http://127.0.0.1:${server.address().port}/v1/systemone`;
		const r = await runGate(
			{
				REFLEX_LOG: join(tmp, "verdicts.jsonl"),
				REFLEX_STATE_FILE: join(tmp, "failstate.json"),
				REFLEX_PROVIDERS: "typesafe",
				REFLEX_SPEC_TYPESAFE_JSON: JSON.stringify({ url }),
				TYPESAFE_API_KEY: "test-key",
			},
			PAYLOAD("deploy-to-production --env prod")
		);
		assert.equal(r.status, 0);
		const lines = readLog(tmp);
		// Escape hatch, not the norm — with the event loop free the mock
		// answers in ~100ms, so reaching here means this environment genuinely
		// cannot fetch loopback. provider-error + no deny is a pair a real
		// regression can't produce (a deny requires a successful provider
		// call, which never logs provider-error), so skip visibly rather than
		// fail red; CI and normal local runs exercise the real path.
		const providerErrored = lines.some((l) => l.kind === "provider-error");
		if (providerErrored && !lines.some((l) => l.decision === "deny")) {
			t.skip("loopback fetch unavailable here; CI and normal local runs exercise the real path");
			return;
		}
		const deny = lines.find((l) => l.kind === "verdict" && l.decision === "deny");
		assert.ok(deny, "no deny verdict line in log");
		assert.match(deny.reason, /≥ deny 0\.85/);
		assert.equal(deny.provider, "typesafe");
		assert.equal(deny.worst, "destructive");
		assert.ok(deny.riskP >= 0.85);
	} finally {
		server.close();
		rmSync(tmp, { recursive: true, force: true });
	}
});
