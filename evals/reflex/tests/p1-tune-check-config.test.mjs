#!/usr/bin/env node
/**
 * P1 feature tests — config file layer, --check trips, /reflex:tune stats.
 *
 *   node --test evals/reflex/tests/p1-tune-check-config.test.mjs
 *
 * Config semantics under test (gate parity with the status reader): env >
 * config file > defaults; a malformed config is ignored whole by the gate and
 * surfaced as a --check trip; disabledClasses removes a labeled pattern class
 * from its list whole — a disabled secrets class lets its command fall
 * through to the read-only allow, a disabled ask class falls through to the
 * model chain. Provider-path tests use async spawn + an in-process loopback
 * mock (spawnSync froze the event loop serving the mock — see
 * deny-persistence.test.mjs).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";

const HERE = dirname(fileURLToPath(import.meta.url));
const REFLEX = join(HERE, "..", "..", "..", "plugins", "reflex", "scripts");

function makeTmp() {
	return mkdtempSync(join(tmpdir(), "reflex-p1-"));
}

// Async spawn: the mock servers below live in this process — spawnSync would
// freeze the event loop that has to answer the child's fetch.
function runScript(script, args, env, payload) {
	return new Promise((resolve) => {
		const child = spawn("node", [script, ...args], { env: { ...process.env, ...env }, stdio: ["pipe", "pipe", "pipe"] });
		let out = "", err = "";
		child.stdout.on("data", (c) => (out += c));
		child.stderr.on("data", (c) => (err += c));
		const timer = setTimeout(() => child.kill("SIGKILL"), 10_000);
		child.on("close", (code) => {
			clearTimeout(timer);
			resolve({ code, out, err });
		});
		if (payload !== undefined) {
			child.stdin.on("error", () => {});
			child.stdin.end(typeof payload === "string" ? payload : JSON.stringify(payload));
		} else {
			child.stdin.end();
		}
	});
}

function readLog(tmp) {
	try {
		return readFileSync(join(tmp, "verdicts.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
	} catch {
		return [];
	}
}

function mockProvider(answers) {
	const server = http.createServer((req, res) => {
		let b = "";
		req.on("data", (c) => (b += c));
		req.on("end", () => {
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ model: "mock-1", answers }));
		});
	});
	return server;
}

const baseEnv = (tmp, over = {}) => ({
	REFLEX_LOG: join(tmp, "verdicts.jsonl"),
	REFLEX_STATE_FILE: join(tmp, "failstate.json"),
	REFLEX_CONFIG: join(tmp, "reflex-config.json"),
	...over,
});

// -- Gate: config file layer ---------------------------------------------------

test("config: disabled ask class falls through to the model chain", async () => {
	const tmp = makeTmp();
	const server = mockProvider({ destructive: { noul: 0.1 }, exfiltration: { noul: 0.1 }, prod_infra: { noul: 0.1 } });
	await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
	try {
		const url = `http://127.0.0.1:${server.address().port}/v1/systemone`;
		const env = baseEnv(tmp, {
			REFLEX_PROVIDERS: "typesafe",
			REFLEX_SPEC_TYPESAFE_JSON: JSON.stringify({ url }),
			TYPESAFE_API_KEY: "test-key",
		});
		// control: ask fires on the class
		writeFileSync(env.REFLEX_CONFIG, JSON.stringify({ version: 1 }));
		const ctrl = await runScript(join(REFLEX, "reflex-gate.mjs"), [], env, {
			tool_input: { command: "git reset --hard", tool_name: "Bash" }, permission_mode: "auto",
		});
		assert.equal(ctrl.code, 0);
		assert.equal(readLog(tmp).some((l) => l.kind === "verdict" && l.decision === "ask" && l.pattern === "git reset --hard (discards uncommitted work)"), true);

		// with the class disabled: no ask — the command flows to the chain
		rmSync(join(tmp, "verdicts.jsonl"), { force: true });
		writeFileSync(env.REFLEX_CONFIG, JSON.stringify({ version: 1, disabledClasses: ["git reset --hard (discards uncommitted work)"] }));
		const r = await runScript(join(REFLEX, "reflex-gate.mjs"), [], env, {
			tool_input: { command: "git reset --hard", tool_name: "Bash" }, permission_mode: "auto",
		});
		assert.equal(r.code, 0);
		const lines = readLog(tmp).filter((l) => l.kind === "verdict");
		assert.equal(lines.some((l) => l.decision === "ask"), false, "disabled class must not ask");
		assert.equal(lines.some((l) => l.decision === "allow" && l.provider === "typesafe"), true, "falls through to the model chain");
	} finally {
		server.close();
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("config: disabled secrets class lets a read-only command be allowed", async () => {
	const tmp = makeTmp();
	try {
		const env = baseEnv(tmp);
		const seed = join(tmp, "seed.env");
		writeFileSync(seed, "x=1\n");
		const payload = { tool_input: { command: `cat ${seed}`, tool_name: "Bash" }, permission_mode: "auto" };
		// control: the .env class asks before the read-only allow can fire
		writeFileSync(env.REFLEX_CONFIG, JSON.stringify({ version: 1 }));
		const ctrl = await runScript(join(REFLEX, "reflex-gate.mjs"), [], env, payload);
		assert.equal(ctrl.code, 0);
		assert.equal(readLog(tmp).some((l) => l.decision === "ask" && l.fastpath === "secrets"), true);

		// disabled: no secrets ask — cat is read-only, so it is allowed
		rmSync(join(tmp, "verdicts.jsonl"), { force: true });
		writeFileSync(env.REFLEX_CONFIG, JSON.stringify({ version: 1, disabledClasses: [".env file"] }));
		const r = await runScript(join(REFLEX, "reflex-gate.mjs"), [], env, payload);
		assert.equal(r.code, 0);
		const lines = readLog(tmp).filter((l) => l.kind === "verdict");
		assert.equal(lines.some((l) => l.decision === "ask"), false);
		assert.equal(lines.some((l) => l.decision === "allow" && l.fastpath === "allow"), true);
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("config: thresholds — env beats config, config beats defaults", async () => {
	const tmp = makeTmp();
	const server = mockProvider({ destructive: { noul: 0.6 }, exfiltration: { noul: 0.1 }, prod_infra: { noul: 0.1 } });
	await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
	try {
		const url = `http://127.0.0.1:${server.address().port}/v1/systemone`;
		const payload = { tool_input: { command: "deploy-to-production --env prod", tool_name: "Bash" }, permission_mode: "auto" };
		// config alone: deny 0.5 → risk 0.6 denies
		const env = baseEnv(tmp, {
			REFLEX_PROVIDERS: "typesafe",
			REFLEX_SPEC_TYPESAFE_JSON: JSON.stringify({ url }),
			TYPESAFE_API_KEY: "test-key",
		});
		writeFileSync(env.REFLEX_CONFIG, JSON.stringify({ version: 1, thresholds: { deny: 0.5 } }));
		const r1 = await runScript(join(REFLEX, "reflex-gate.mjs"), [], env, payload);
		assert.equal(r1.code, 0);
		assert.equal(readLog(tmp).some((l) => l.kind === "verdict" && l.decision === "deny"), true, "config threshold applies");

		// env overrides config: deny 0.99 wins over config 0.5 → ask instead
		rmSync(join(tmp, "verdicts.jsonl"), { force: true });
		const r2 = await runScript(join(REFLEX, "reflex-gate.mjs"), [], { ...env, REFLEX_THRESHOLD_DENY: "0.99" }, payload);
		assert.equal(r2.code, 0);
		const lines = readLog(tmp).filter((l) => l.kind === "verdict");
		assert.equal(lines.some((l) => l.decision === "ask"), true, "env threshold wins over config");
		assert.equal(lines.some((l) => l.decision === "deny"), false);
	} finally {
		server.close();
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("config: malformed file is ignored whole — gate decides normally", async () => {
	const tmp = makeTmp();
	try {
		const env = baseEnv(tmp);
		writeFileSync(env.REFLEX_CONFIG, "this is { not json");
		const r = await runScript(join(REFLEX, "reflex-gate.mjs"), [], env, {
			tool_input: { command: "git reset --hard", tool_name: "Bash" }, permission_mode: "auto",
		});
		assert.equal(r.code, 0);
		assert.equal(readLog(tmp).some((l) => l.decision === "ask"), true, "defaults in effect");
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

// -- reflex-status --check -------------------------------------------------------

test("--check: healthy log is silent, exit 0", async () => {
	const tmp = makeTmp();
	try {
		const env = baseEnv(tmp);
		const verdict = { ts: new Date().toISOString(), kind: "verdict", decision: "allow", command: "x", cwd: "~/p", mode: "auto" };
		writeFileSync(env.REFLEX_LOG, JSON.stringify(verdict) + "\n", { mode: 0o600 });
		const r = await runScript(join(REFLEX, "reflex-status.mjs"), ["--check"], env);
		assert.equal(r.code, 0);
		assert.equal(r.out.trim(), "", "healthy means silent");
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("--check: deny overridden is a trip (the headline)", async () => {
	const tmp = makeTmp();
	try {
		const env = baseEnv(tmp);
		const verdict = { ts: "2026-01-01T00:00:00Z", kind: "verdict", decision: "deny", command: "x", cwd: "~/p", mode: "auto", tool_use_id: "t1" };
		const outcome = { ts: "2026-01-01T00:01:00Z", kind: "outcome", verdictTs: "2026-01-01T00:00:00Z", tool_use_id: "t1", verdict: "deny", outcome: "overridden", basis: "ran" };
		writeFileSync(env.REFLEX_LOG, [verdict, outcome].map((l) => JSON.stringify(l)).join("\n") + "\n", { mode: 0o600 });
		const r = await runScript(join(REFLEX, "reflex-status.mjs"), ["--check"], env);
		assert.equal(r.code, 1);
		assert.match(r.out, /deny overridden/);
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("--check: kill switch, PERMS WIDE, provider failstate, drift are trips", async () => {
	const tmp = makeTmp();
	try {
		const env = baseEnv(tmp, { REFLEX_DISABLED: "1" });
		let r = await runScript(join(REFLEX, "reflex-status.mjs"), ["--check"], env);
		assert.equal(r.code, 1);
		assert.match(r.out, /kill switch/);

		delete env.REFLEX_DISABLED;
		const log = join(tmp, "verdicts.jsonl");
		writeFileSync(log, "", { mode: 0o644 });
		r = await runScript(join(REFLEX, "reflex-status.mjs"), ["--check"], env);
		assert.equal(r.code, 1);
		assert.match(r.out, /PERMS WIDE/);

		rmSync(log, { force: true });
		writeFileSync(env.REFLEX_STATE_FILE, JSON.stringify({ typesafe: { count: 3, since: Date.now() } }));
		r = await runScript(join(REFLEX, "reflex-status.mjs"), ["--check"], env);
		assert.equal(r.code, 1);
		assert.match(r.out, /disabled in failstate/);
		rmSync(env.REFLEX_STATE_FILE, { force: true });

		// drift: newest verdict lacks `mode` (pre-0.1.3 field shape) vs installed ≥0.1.6
		const old = { ts: new Date().toISOString(), kind: "verdict", decision: "allow", command: "x", cwd: "/abs/p" };
		writeFileSync(log, JSON.stringify(old) + "\n", { mode: 0o600 });
		r = await runScript(join(REFLEX, "reflex-status.mjs"), ["--check"], env);
		assert.equal(r.code, 1);
		assert.match(r.out, /DRIFT/);
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("--check: LOG=off is INFO (exit 0), malformed config is a trip", async () => {
	const tmp = makeTmp();
	try {
		const env = baseEnv(tmp, { REFLEX_LOG: "off" });
		let r = await runScript(join(REFLEX, "reflex-status.mjs"), ["--check"], env);
		assert.equal(r.code, 0, "deliberate accounting state is not a trip");
		assert.match(r.out, /INFO: .*log off by config/);
		assert.match(r.out, /deny-override watch is blind/);

		writeFileSync(env.REFLEX_CONFIG, "this is { not json");
		r = await runScript(join(REFLEX, "reflex-status.mjs"), ["--check"], { ...env, REFLEX_LOG: join(tmp, "verdicts.jsonl") });
		assert.equal(r.code, 1);
		assert.match(r.out, /config unusable/);
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

// -- reflex-tune ------------------------------------------------------------------

function tuneFixture(tmp) {
	// 12 Bearer asks across 6 sessions, all overridden, 200ms approvals, 550 in-tokens;
	// 2 model asks agreed. Outcome lines carry resultTs for latency.
	const lines = [];
	const mk = (i, session, decision, tokens) => ({
		ts: new Date(Date.parse("2026-01-01T00:00:00Z") + i * 60_000).toISOString(),
		kind: "verdict", decision, command: "x", cwd: "~/p", mode: "auto",
		session_id: session, tool_use_id: `t${i}`,
		fastpath: decision === "ask" ? "secrets" : undefined,
		pattern: decision === "ask" ? "inline credential (Authorization/Bearer header)" : undefined,
		...(tokens ? { input_tokens: tokens, output_tokens: 10 } : {}),
	});
	const o = (v, outcome, resultTs) => ({
		ts: new Date().toISOString(), kind: "outcome", verdictTs: v.ts, tool_use_id: v.tool_use_id,
		verdict: v.decision, outcome, basis: outcome === "overridden" ? "ran" : "user-rejected",
		...(resultTs ? { resultTs } : {}),
	});
	for (let i = 0; i < 12; i++) {
		const v = mk(i, `sess-${i % 6}`, "ask", 550);
		lines.push(v, o(v, "overridden", new Date(Date.parse(v.ts) + 200).toISOString()));
	}
	const m1 = {
		ts: new Date(Date.parse("2026-01-01T00:00:00Z") + 90 * 60_000).toISOString(),
		kind: "verdict", decision: "ask", command: "x", cwd: "~/p", mode: "auto",
		session_id: "sess-9", tool_use_id: "t90", provider: "typesafe", riskP: 0.6, input_tokens: 400, output_tokens: 20,
	};
	lines.push(m1, o(m1, "agreed", new Date(Date.parse(m1.ts) + 4000).toISOString()));
	const d1 = mk(91, "sess-9", "deny", null);
	lines.push(d1, o(d1, "agreed"));
	return lines;
}

test("tune: per-class stats, conditional rates, latency, token cost", async () => {
	const tmp = makeTmp();
	try {
		const env = baseEnv(tmp);
		writeFileSync(env.REFLEX_LOG, tuneFixture(tmp).map((l) => JSON.stringify(l)).join("\n") + "\n", { mode: 0o600 });
		const r = await runScript(join(REFLEX, "reflex-tune.mjs"), ["--json"], env);
		assert.equal(r.code, 0);
		const j = JSON.parse(r.out);
		assert.equal(j.status, "ok");
		assert.equal(j.asks, 13);
		const bearer = j.perClass.find((c) => c.class === "fastpath:secrets:inline credential (Authorization/Bearer header)");
		assert.equal(bearer.asks, 12);
		assert.equal(bearer.distinctSessions, 6);
		assert.equal(bearer.overrideRate, 1);
		assert.equal(bearer.approvalLatencyMs.p50, 200);
		assert.equal(bearer.costUsd > 0, true, "token cost computed from input_tokens");
		const model = j.perClass.find((c) => c.class === "model:typesafe");
		assert.equal(model.overrideRate, 0, "agreed label → rate 0, conditional on labels");
		assert.equal(j.denyOverridden, 0);
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("tune: candidate flags on the evidence bar (rate, sessions, latency)", async () => {
	const tmp = makeTmp();
	try {
		const env = baseEnv(tmp);
		const lines = [];
		for (let i = 0; i < 12; i++) {
			const v = {
				ts: new Date(Date.parse("2026-01-01T00:00:00Z") + i * 60_000).toISOString(),
				kind: "verdict", decision: "ask", command: "x", cwd: "~/p", mode: "auto",
				session_id: `s-${i % 6}`, tool_use_id: `t${i}`,
				fastpath: "ask", pattern: "force push",
			};
			lines.push(v, {
				ts: new Date().toISOString(), kind: "outcome", verdictTs: v.ts, tool_use_id: v.tool_use_id,
				verdict: "ask", outcome: "overridden", basis: "ran",
				resultTs: new Date(Date.parse(v.ts) + 150).toISOString(),
			});
		}
		writeFileSync(env.REFLEX_LOG, lines.map((l) => JSON.stringify(l)).join("\n") + "\n", { mode: 0o600 });
		const r = await runScript(join(REFLEX, "reflex-tune.mjs"), ["--json"], env);
		const j = JSON.parse(r.out);
		const c = j.candidates.find((x) => x.class === "fastpath:ask:force push");
		assert.ok(c, "candidate flagged");
		assert.equal(c.reasons.length, 2, "rate reason + rubber-stamp reason");
		assert.match(c.reasons[0], /override rate 100%/);
		assert.match(c.reasons[1], /rubber-stamp/);
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("tune: log-off and no-log statuses; --record writes audit, refuses under LOG=off", async () => {
	const tmp = makeTmp();
	try {
		let r = await runScript(join(REFLEX, "reflex-tune.mjs"), ["--json"], { REFLEX_LOG: "off" });
		assert.equal(r.code, 0);
		assert.equal(JSON.parse(r.out).status, "log-off");

		r = await runScript(join(REFLEX, "reflex-tune.mjs"), ["--json"], baseEnv(tmp));
		assert.equal(r.code, 0);
		assert.equal(JSON.parse(r.out).status, "no-log");

		const env = baseEnv(tmp);
		writeFileSync(env.REFLEX_LOG, '{"ts":"2026-01-01T00:00:00Z","kind":"verdict","decision":"allow"}\n', { mode: 0o600 });
		r = await runScript(join(REFLEX, "reflex-tune.mjs"), ["--json"], env);
		assert.equal(JSON.parse(r.out).status, "ok");

		r = await runScript(join(REFLEX, "reflex-tune.mjs"), ["--json"], env);
		// --record is argument-driven, spawn it with args via a direct child:
		r = await new Promise((resolve) => {
			const child = spawn("node", [join(REFLEX, "reflex-tune.mjs"), "--record", JSON.stringify({ action: "disable-class", class: "x" })], { env: { ...process.env, REFLEX_LOG: env.REFLEX_LOG }, stdio: ["ignore", "pipe", "pipe"] });
			let out = "";
			child.stdout.on("data", (c) => (out += c));
			child.on("close", (code) => resolve({ code, out }));
		});
		assert.equal(r.code, 0);
		assert.match(r.out, /recorded tuning line/);
		assert.equal(readLog(tmp).some((l) => l.kind === "tuning" && l.action === "disable-class"), true);

		r = await new Promise((resolve) => {
			const child = spawn("node", [join(REFLEX, "reflex-tune.mjs"), "--record", '{"action":"x"}'], { env: { ...process.env, REFLEX_LOG: "off" }, stdio: ["ignore", "pipe", "pipe"] });
			child.on("close", (code) => resolve({ code }));
		});
		assert.equal(r.code, 1, "record refused when accounting is dark");
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("report mode: footer points at /reflex:tune (the lie is gone), LOG=off says accounting dark", async () => {
	const tmp = makeTmp();
	try {
		const env = baseEnv(tmp);
		const verdict = { ts: new Date().toISOString(), kind: "verdict", decision: "ask", command: "x", cwd: "~/p", mode: "auto", fastpath: "ask", pattern: "force push" };
		writeFileSync(env.REFLEX_LOG, JSON.stringify(verdict) + "\n", { mode: 0o600 });
		let r = await runScript(join(REFLEX, "reflex-status.mjs"), ["--check"], env);
		assert.equal(r.code, 0);
		assert.doesNotMatch(r.out, /labels come from evals/);
		r = await runScript(join(REFLEX, "reflex-status.mjs"), [], { ...env, REFLEX_LOG: "off" });
		assert.match(r.out, /accounting dark/);
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});
