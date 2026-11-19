#!/usr/bin/env node
/**
 * promoteCheck tests — the fail-once promotion detector (tasks-008, prd-010 §3.3.4).
 *
 *   node --test plugins/tempo/scripts/tests/*.test.mjs
 *
 * Same fixture discipline as triage-router.test.mjs: mock fetchImpl, state
 * confined to a fresh tmp dir, fixed epoch. The detector has NO keyword
 * floor by design (the skill's fail-twice rule is the floor and always
 * stands) — every provider-path test therefore goes straight to the chain.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { promoteCheck, PROVIDERS } from "../triage-router.mjs";

const TASK = "Add a slugify helper to the utils module.";
const EVIDENCE = "test 'slugify collapses spaces' failed: received 'a b', expected 'a-b' (first failure)";

const NOW = 1700000000000;

function makeTmp() {
	return mkdtempSync(join(tmpdir(), "tempo-promote-"));
}

function mockNoul(p, model = "jev-latest") {
	return {
		json: () => Promise.resolve({ model, answers: { escalate: { noul: p } } }),
		ok: true,
		status: 200,
	};
}

function baseEnv(tmp, over = {}) {
	return {
		TYPESAFE_API_KEY: "test-key",
		LIQUID_API_KEY: "test-key",
		TEMPO_LOG: join(tmp, "verdicts.jsonl"),
		TEMPO_STATE_FILE: join(tmp, "failstate.json"),
		...over,
	};
}

function logLines(tmp) {
	if (!existsSync(join(tmp, "verdicts.jsonl"))) return [];
	return readFileSync(join(tmp, "verdicts.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
}

test("unconfigured: no keys → status unconfigured, fetch never called, nothing logged", async () => {
	const tmp = makeTmp();
	try {
		let calls = 0;
		const v = await promoteCheck(TASK, EVIDENCE, {
			env: baseEnv(tmp, { TYPESAFE_API_KEY: "", LIQUID_API_KEY: "" }),
			fetchImpl: () => {
				calls += 1;
				return Promise.resolve(mockNoul(0.9));
			},
			now: () => NOW,
		});
		assert.equal(v.status, "unconfigured");
		assert.equal(calls, 0);
		assert.equal(logLines(tmp).length, 0);
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("kill switch TEMPO_TRIAGE=0 → status disabled (same switch as triage)", async () => {
	const tmp = makeTmp();
	try {
		const v = await promoteCheck(TASK, EVIDENCE, {
			env: baseEnv(tmp, { TEMPO_TRIAGE: "0" }),
			fetchImpl: () => Promise.resolve(mockNoul(0.9)),
			now: () => NOW,
		});
		assert.equal(v.status, "disabled");
		assert.equal(logLines(tmp).length, 0);
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("p 0.8 ≥ 0.6 → escalate, logged with mode promote and destination host", async () => {
	const tmp = makeTmp();
	try {
		const v = await promoteCheck(TASK, EVIDENCE, {
			env: baseEnv(tmp),
			fetchImpl: (url) => Promise.resolve(url === PROVIDERS.typesafe.url ? mockNoul(0.8) : mockNoul(0.1)),
			now: () => NOW,
		});
		assert.equal(v.status, "escalate");
		assert.equal(v.p, 0.8);
		assert.equal(v.provider, "typesafe");
		const lines = logLines(tmp);
		assert.equal(lines.length, 1);
		assert.equal(lines[0].status, "escalate");
		assert.equal(lines[0].mode, "promote");
		assert.equal(lines[0].host, "api.typesafe.ai");
		assert.equal(lines[0].task, TASK);
		assert.equal(lines[0].evidence, EVIDENCE);
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("p 0.4 < 0.6 → hold: the fail-twice skill rule stands", async () => {
	const tmp = makeTmp();
	try {
		const v = await promoteCheck(TASK, EVIDENCE, {
			env: baseEnv(tmp),
			fetchImpl: () => Promise.resolve(mockNoul(0.4)),
			now: () => NOW,
		});
		assert.equal(v.status, "hold");
		assert.equal(v.p, 0.4);
		assert.equal(logLines(tmp).length, 1);
		assert.equal(logLines(tmp)[0].status, "hold");
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("threshold override: TEMPO_PROMOTE_THRESHOLD=0.3 adopts p 0.4", async () => {
	const tmp = makeTmp();
	try {
		const v = await promoteCheck(TASK, EVIDENCE, {
			env: baseEnv(tmp, { TEMPO_PROMOTE_THRESHOLD: "0.3" }),
			fetchImpl: () => Promise.resolve(mockNoul(0.4)),
			now: () => NOW,
		});
		assert.equal(v.status, "escalate");
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("bool noul answer coerces: noul true → p 1 → escalate", async () => {
	const tmp = makeTmp();
	try {
		const v = await promoteCheck(TASK, EVIDENCE, {
			env: baseEnv(tmp),
			fetchImpl: () => Promise.resolve(mockNoul(true)),
			now: () => NOW,
		});
		assert.equal(v.status, "escalate");
		assert.equal(v.p, 1);
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("garbage noul answer on all providers → status error, one error log line, rule stands", async () => {
	const tmp = makeTmp();
	try {
		const v = await promoteCheck(TASK, EVIDENCE, {
			env: baseEnv(tmp),
			fetchImpl: () =>
				Promise.resolve({
					json: () => Promise.resolve({ model: "jev-latest", answers: {} }),
					ok: true,
					status: 200,
				}),
			now: () => NOW,
		});
		assert.equal(v.status, "error");
		assert.match(v.error, /typesafe/);
		assert.match(v.error, /liquid/);
		const lines = logLines(tmp);
		assert.equal(lines.length, 1);
		assert.equal(lines[0].status, "error");
		assert.equal(lines[0].mode, "promote");
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("failstate is shared: typesafe in backoff → only liquid is called", async () => {
	const tmp = makeTmp();
	try {
		const stateFile = join(tmp, "failstate.json");
		const until = new Date(NOW + 60_000).toISOString();
		writeFileSync(stateFile, JSON.stringify({ v: 1, providers: { typesafe: { fails: 1, until } } }));
		let liquidCalls = 0;
		const v = await promoteCheck(TASK, EVIDENCE, {
			env: baseEnv(tmp),
			fetchImpl: (url) => {
				if (url === PROVIDERS.liquid.url) {
					liquidCalls += 1;
					return Promise.resolve(mockNoul(0.9));
				}
				throw new Error("typesafe must be skipped, not called");
			},
			now: () => NOW,
		});
		assert.equal(v.status, "escalate");
		assert.equal(v.provider, "liquid");
		assert.equal(liquidCalls, 1);
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});
