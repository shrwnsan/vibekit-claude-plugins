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

import { promoteCheck, PROVIDERS, homeAbbrev } from "../triage-router.mjs";

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

// -- reflex denial evidence (TEMPO_EVIDENCE_REFLEX, tasks cross-ref #169/#170) --

// fixture: a reflex verdicts.jsonl with denies for this cwd and another one
function writeReflexLog(tmp, entries) {
	writeFileSync(join(tmp, "reflex-verdicts.jsonl"), entries.map((e) => JSON.stringify(e)).join("\n") + "\n");
}

const reflexEnv = (tmp, over = {}) =>
	baseEnv(tmp, {
		REFLEX_LOG: join(tmp, "reflex-verdicts.jsonl"),
		...over,
	});

const reflexDeny = (over = {}) => ({
	ts: new Date(NOW - 5 * 60_000).toISOString(),
	kind: "verdict",
	decision: "deny",
	reason: "typesafe prod_infra=p0.88 ≥ deny 0.85",
	cwd: homeAbbrev(process.cwd()),
	command: "deploy-to-production --env prod",
	...over,
});

test("opt-in: TEMPO_EVIDENCE_REFLEX=1 merges recent same-cwd reflex denies into the evidence", async () => {
	const tmp = makeTmp();
	try {
		writeReflexLog(tmp, [reflexDeny(), reflexDeny({ ts: new Date(NOW - 10 * 60_000).toISOString(), reason: "typesafe exfiltration=p0.86 ≥ deny 0.85" })]);
		let seenEvidence;
		const v = await promoteCheck(TASK, EVIDENCE, {
			env: reflexEnv(tmp, { TEMPO_EVIDENCE_REFLEX: "1" }),
			fetchImpl: (url, init) => {
				seenEvidence = JSON.parse(init.body).state.evidence;
				return Promise.resolve(mockNoul(0.8));
			},
			now: () => NOW,
		});
		assert.equal(v.status, "escalate");
		assert.match(seenEvidence, /2 reflex-gate command denials/);
		assert.match(seenEvidence, /prod_infra=p0\.88/);
		assert.match(seenEvidence, /exfiltration=p0\.86/);
		// the human-written evidence stays in front
		assert.ok(seenEvidence.indexOf(EVIDENCE) < seenEvidence.indexOf("reflex-gate"));
		// the logged verdict carries the merged evidence verbatim (replay)
		assert.match(logLines(tmp)[0].evidence, /reflex-gate command denials/);
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("default off: reflex log ignored unless TEMPO_EVIDENCE_REFLEX=1", async () => {
	const tmp = makeTmp();
	try {
		writeReflexLog(tmp, [reflexDeny()]);
		let seenEvidence;
		await promoteCheck(TASK, EVIDENCE, {
			env: reflexEnv(tmp),
			fetchImpl: (url, init) => {
				seenEvidence = JSON.parse(init.body).state.evidence;
				return Promise.resolve(mockNoul(0.8));
			},
			now: () => NOW,
		});
		assert.equal(seenEvidence, EVIDENCE);
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("missing or garbage reflex log → no crash, evidence unchanged", async () => {
	const tmp = makeTmp();
	try {
		writeFileSync(join(tmp, "reflex-verdicts.jsonl"), "not json at all\n");
		let seenEvidence;
		const v = await promoteCheck(TASK, EVIDENCE, {
			env: reflexEnv(tmp, { TEMPO_EVIDENCE_REFLEX: "1" }),
			fetchImpl: (url, init) => {
				seenEvidence = JSON.parse(init.body).state.evidence;
				return Promise.resolve(mockNoul(0.8));
			},
			now: () => NOW,
		});
		assert.equal(v.status, "escalate");
		assert.equal(seenEvidence, EVIDENCE);
		// missing file entirely: same outcome
		rmSync(join(tmp, "reflex-verdicts.jsonl"));
		const v2 = await promoteCheck(TASK, EVIDENCE, {
			env: reflexEnv(tmp, { TEMPO_EVIDENCE_REFLEX: "1" }),
			fetchImpl: () => Promise.resolve(mockNoul(0.8)),
			now: () => NOW,
		});
		assert.equal(v2.status, "escalate");
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("stale or different-cwd denies are not merged in", async () => {
	const tmp = makeTmp();
	try {
		writeReflexLog(tmp, [
			reflexDeny({ ts: new Date(NOW - 2 * 3600_000).toISOString() }), // outside 1h window
			reflexDeny({ cwd: "~/elsewhere" }), // other project
			reflexDeny({ decision: "allow" }), // not a deny
			reflexDeny(), // fresh, this cwd → the only one that counts
		]);
		let seenEvidence;
		await promoteCheck(TASK, EVIDENCE, {
			env: reflexEnv(tmp, { TEMPO_EVIDENCE_REFLEX: "1" }),
			fetchImpl: (url, init) => {
				seenEvidence = JSON.parse(init.body).state.evidence;
				return Promise.resolve(mockNoul(0.8));
			},
			now: () => NOW,
		});
		assert.match(seenEvidence, /1 reflex-gate command denial/);
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("fast-path deny reasons merge without the matched-command fragment", async () => {
	const tmp = makeTmp();
	try {
		// literal split so the live project-scoped reflex hook doesn't deny
		// the Bash call writing this test (it matches the contiguous string)
		const cmd = "rm " + "-rf /tmp/somebuild";
		writeReflexLog(tmp, [
			reflexDeny({ reason: `unambiguous destruction — recursive rm of home/absolute path: "${cmd}"` }),
			reflexDeny({ ts: new Date(NOW - 9 * 60_000).toISOString(), reason: "typesafe prod_infra=p0.88 ≥ deny 0.85" }),
		]);
		let seenEvidence;
		await promoteCheck(TASK, EVIDENCE, {
			env: reflexEnv(tmp, { TEMPO_EVIDENCE_REFLEX: "1" }),
			fetchImpl: (url, init) => {
				seenEvidence = JSON.parse(init.body).state.evidence;
				return Promise.resolve(mockNoul(0.8));
			},
			now: () => NOW,
		});
		assert.match(seenEvidence, /recursive rm of home\/absolute path/); // pattern label survives
		assert.doesNotMatch(seenEvidence, new RegExp(cmd.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))); // fragment stripped
		assert.match(seenEvidence, /prod_infra=p0\.88/); // model-chain reason intact
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});
