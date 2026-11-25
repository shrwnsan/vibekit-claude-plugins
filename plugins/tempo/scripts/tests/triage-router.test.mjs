#!/usr/bin/env node
/**
 * triage-router tests — synthetic fixtures, no real user data.
 *
 *   node --test plugins/tempo/scripts/tests/*.test.mjs
 *
 * Every case injects a mock fetchImpl and points TEMPO_LOG / TEMPO_STATE_FILE
 * at a fresh mkdtempSync(os.tmpdir()) dir, so the real ~/.local/share/tempo
 * is never touched. The privacy case asserts the verdict log carries a
 * $HOME-abbreviated cwd and 0600 file mode.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, statSync, rmSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";

import { triage, PROVIDERS } from "../triage-router.mjs";

// floor-neutral text: must not contain any floorDecide keyword, or the
// keyword-floor fast path fires before any provider call and provider-path
// assertions silently fail.
const TASK = "Add a slugify helper to the utils module.";
const FLOOR_TASK = "Fix the typo in the README heading.";

// -- fixture helpers ----------------------------------------------------------

const NOW = 1700000000000; // fixed epoch for stable timestamps

function makeTmp() {
	return mkdtempSync(join(tmpdir(), "tempo-triage-"));
}

function mockAnswer(choice, confidence, model = "jev-latest") {
	return {
		json: () =>
			Promise.resolve({ model, answers: { tier: { choice, confidence } } }),
		ok: true,
		status: 200,
	};
}

const httpStatus = (status) => ({
	json: () => Promise.resolve({}),
	ok: status >= 200 && status < 300,
	status,
});

// base env: state confined to the tmp dir; providers enabled via keys
function baseEnv(tmp, over = {}) {
	return {
		TYPESAFE_API_KEY: "test-key",
		LIQUID_API_KEY: "test-key",
		TEMPO_LOG: join(tmp, "verdicts.jsonl"),
		TEMPO_STATE_FILE: join(tmp, "failstate.json"),
		...over,
	};
}

async function runTriage(env, fetchImpl, over = {}) {
	const verdict = await triage(TASK, {
		env,
		fetchImpl,
		now: () => NOW,
		...over,
	});
	return { verdict, tmp: over.__tmp };
}

// -- cases ----------------------------------------------------------------------

test("unconfigured: no provider keys → status unconfigured, fetch never called", async () => {
	const tmp = makeTmp();
	try {
		let calls = 0;
		const v = await triage(TASK, {
			env: baseEnv(tmp, { TYPESAFE_API_KEY: "", LIQUID_API_KEY: "" }),
			fetchImpl: () => {
				calls += 1;
				return Promise.resolve(mockAnswer("tier-1-standard", 0.9));
			},
			now: () => NOW,
		});
		assert.equal(v.status, "unconfigured");
		assert.equal(calls, 0);
		assert.equal(existsSync(join(tmp, "verdicts.jsonl")), false);
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("kill switch TEMPO_TRIAGE=0 → status disabled", async () => {
	const tmp = makeTmp();
	try {
		const v = await triage(TASK, {
			env: baseEnv(tmp, { TEMPO_TRIAGE: "0" }),
			fetchImpl: () => Promise.resolve(mockAnswer("tier-1-standard", 0.9)),
			now: () => NOW,
		});
		assert.equal(v.status, "disabled");
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("high-confidence answer → tier verdict with provider and one JSONL log line", async () => {
	const tmp = makeTmp();
	try {
		const urls = [];
		const v = await triage(TASK, {
			env: baseEnv(tmp),
			fetchImpl: (url) => {
				urls.push(url);
				return Promise.resolve(mockAnswer("tier-2-risky", 0.9));
			},
			now: () => NOW,
		});
		assert.equal(v.status, "tier");
		assert.equal(v.tier, 2);
		assert.equal(v.choice, "tier-2-risky");
		assert.equal(v.provider, "typesafe");
		assert.equal(v.servedModel, "jev-latest");
		assert.equal(urls.length, 1);
		assert.equal(urls[0], PROVIDERS.typesafe.url);

		const logPath = join(tmp, "verdicts.jsonl");
		const lines = readFileSync(logPath, "utf8").trim().split("\n");
		assert.equal(lines.length, 1);
		const entry = JSON.parse(lines[0]);
		assert.equal(entry.v, 1);
		assert.equal(entry.plugin, "tempo");
		assert.equal(entry.status, "tier");
		assert.equal(entry.task, TASK);
		assert.equal(entry.t, new Date(NOW).toISOString());
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("confidence below threshold → defer, no tier field", async () => {
	const tmp = makeTmp();
	try {
		const v = await triage(TASK, {
			env: baseEnv(tmp),
			fetchImpl: () => Promise.resolve(mockAnswer("tier-2-risky", 0.4)),
			now: () => NOW,
		});
		assert.equal(v.status, "defer");
		assert.equal(v.tier, undefined);
		assert.equal(v.choice, "tier-2-risky");
		assert.equal(v.confidence, 0.4);
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("choice 'none' at high confidence → tier 0", async () => {
	const tmp = makeTmp();
	try {
		const v = await triage(TASK, {
			env: baseEnv(tmp),
			fetchImpl: () => Promise.resolve(mockAnswer("none", 0.95)),
			now: () => NOW,
		});
		assert.equal(v.status, "tier");
		assert.equal(v.tier, 0);
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("provider failover: 500 twice on typesafe then liquid answers → provider liquid, failstate written", async () => {
	const tmp = makeTmp();
	try {
		const callsByHost = [];
		const v = await triage(TASK, {
			env: baseEnv(tmp, { TEMPO_PROVIDERS: "typesafe,liquid" }),
			fetchImpl: (url) => {
				callsByHost.push(url);
				if (url === PROVIDERS.typesafe.url) return Promise.resolve(httpStatus(500));
				return Promise.resolve(mockAnswer("tier-1-standard", 0.85, "d1.1"));
			},
			now: () => NOW,
		});
		assert.equal(v.status, "tier");
		assert.equal(v.provider, "liquid");
		assert.equal(v.servedModel, "d1.1");
		// typesafe tried twice (initial + retry), then liquid once
		assert.deepEqual(
			callsByHost.filter((u) => u === PROVIDERS.typesafe.url).length,
			2,
		);

		const statePath = join(tmp, "failstate.json");
		assert.equal(existsSync(statePath), true);
		const state = JSON.parse(readFileSync(statePath, "utf8"));
		assert.ok(state.providers.typesafe, "failstate has a typesafe entry");
		assert.ok(new Date(state.providers.typesafe.until).getTime() > NOW);
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("all providers fail → status error naming both, logged as error", async () => {
	const tmp = makeTmp();
	try {
		const v = await triage(TASK, {
			env: baseEnv(tmp),
			fetchImpl: () => Promise.resolve(httpStatus(500)),
			now: () => NOW,
		});
		assert.equal(v.status, "error");
		assert.match(v.error, /typesafe/);
		assert.match(v.error, /liquid/);

		const lines = readFileSync(join(tmp, "verdicts.jsonl"), "utf8").trim().split("\n");
		assert.equal(lines.length, 1);
		assert.equal(JSON.parse(lines[0]).status, "error");
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("failstate backoff: backing-off provider is skipped, only liquid endpoint called", async () => {
	const tmp = makeTmp();
	try {
		const until = new Date(NOW + 60 * 1000).toISOString();
		writeFileSync(
			join(tmp, "failstate.json"),
			JSON.stringify({ v: 1, providers: { typesafe: { fails: 1, until } } }),
			{ mode: 0o600 },
		);
		const urls = [];
		const v = await triage(TASK, {
			env: baseEnv(tmp),
			fetchImpl: (url) => {
				urls.push(url);
				return Promise.resolve(mockAnswer("tier-0-trivial", 0.8));
			},
			now: () => NOW,
		});
		assert.equal(v.provider, "liquid");
		for (const url of urls) assert.notEqual(url, PROVIDERS.typesafe.url);
		assert.equal(urls.length, 1);
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("threshold override: TEMPO_TRIAGE_THRESHOLD=0.5 adopts confidence 0.55", async () => {
	const tmp = makeTmp();
	try {
		const v = await triage(TASK, {
			env: baseEnv(tmp, { TEMPO_TRIAGE_THRESHOLD: "0.5" }),
			fetchImpl: () => Promise.resolve(mockAnswer("tier-1-standard", 0.55)),
			now: () => NOW,
		});
		assert.equal(v.status, "tier");
		assert.equal(v.tier, 1);
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("log hygiene: cwd home-abbreviated, log file mode 0600", async () => {
	const tmp = makeTmp();
	try {
		const v = await triage(TASK, {
			env: baseEnv(tmp),
			fetchImpl: () => Promise.resolve(mockAnswer("tier-1-standard", 0.9)),
			now: () => NOW,
		});
		assert.equal(v.status, "tier");
		const logPath = join(tmp, "verdicts.jsonl");
		const entry = JSON.parse(readFileSync(logPath, "utf8").trim());
		assert.equal(entry.cwd, "~" + process.cwd().slice(homedir().length));
		assert.match(entry.cwd, /^~/);
		assert.ok(!entry.cwd.includes(homedir()), "raw home dir path must not appear");
		assert.equal(statSync(logPath).mode & 0o777, 0o600);
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("keyword floor fast path: typo/docs task → tier 0 via floor, no fetch, no log", async () => {
	const tmp = makeTmp();
	try {
		let calls = 0;
		const v = await triage(FLOOR_TASK, {
			env: baseEnv(tmp),
			fetchImpl: () => {
				calls += 1;
				return Promise.resolve(mockAnswer("tier-1-standard", 0.9));
			},
			now: () => NOW,
		});
		assert.equal(v.status, "tier");
		assert.equal(v.tier, 0);
		assert.equal(v.source, "floor");
		assert.equal(calls, 0);
		assert.equal(existsSync(join(tmp, "verdicts.jsonl")), false);
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("keyword floor risk path: rate limiting task → tier 2 via floor, no fetch", async () => {
	const tmp = makeTmp();
	try {
		let calls = 0;
		const v = await triage("Add rate limiting to the public API.", {
			env: baseEnv(tmp),
			fetchImpl: () => {
				calls += 1;
				return Promise.resolve(mockAnswer("tier-1-standard", 0.9));
			},
			now: () => NOW,
		});
		assert.equal(v.status, "tier");
		assert.equal(v.tier, 2);
		assert.equal(v.source, "floor");
		assert.equal(calls, 0);
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("env-registered custom provider: consent flag activates, model + no auth header", async () => {
	const tmp = makeTmp();
	try {
		const seen = [];
		const v = await triage(TASK, {
			env: baseEnv(tmp, {
				TYPESAFE_API_KEY: "",
				LIQUID_API_KEY: "",
				TEMPO_CUSTOM_PROVIDERS: "1",
				TEMPO_PROVIDER_CLEF_URL: "https://clef.example/decide",
				TEMPO_PROVIDER_CLEF_MODEL: "clef-flash",
			}),
			fetchImpl: (url, opts = {}) => {
				seen.push({ url, headers: opts.headers ?? {}, body: JSON.parse(opts.body ?? "{}") });
				return Promise.resolve(mockAnswer("tier-1-standard", 0.9));
			},
			now: () => NOW,
		});
		assert.equal(v.status, "tier");
		assert.equal(v.source, "provider");
		assert.equal(v.provider, "clef");
		assert.equal(seen.length, 1);
		assert.equal(seen[0].url, "https://clef.example/decide");
		assert.equal(seen[0].body.model, "clef-flash");
		assert.equal("Authorization" in seen[0].headers, false, "no Authorization without a key env");
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("custom provider with TEMPO_PROVIDER_<NAME>_KEY sends Bearer auth", async () => {
	const tmp = makeTmp();
	try {
		const seen = [];
		const v = await triage(TASK, {
			env: baseEnv(tmp, {
				TYPESAFE_API_KEY: "",
				LIQUID_API_KEY: "",
				TEMPO_CUSTOM_PROVIDERS: "1",
				TEMPO_PROVIDER_CLEF_URL: "https://clef.example/decide",
				TEMPO_PROVIDER_CLEF_MODEL: "clef-flash",
				TEMPO_PROVIDER_CLEF_KEY: "sekrit",
			}),
			fetchImpl: (url, opts = {}) => {
				seen.push({ url, headers: opts.headers ?? {} });
				return Promise.resolve(mockAnswer("tier-1-standard", 0.9));
			},
			now: () => NOW,
		});
		assert.equal(v.status, "tier");
		assert.equal(v.provider, "clef");
		assert.equal(seen[0].headers.Authorization, "Bearer sekrit");
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("TEMPO_PROVIDERS is authoritative: custom provider not auto-appended", async () => {
	const tmp = makeTmp();
	try {
		const urls = [];
		const v = await triage(TASK, {
			env: baseEnv(tmp, {
				TEMPO_PROVIDER_CLEF_URL: "https://c.example/",
				TEMPO_PROVIDERS: "typesafe",
			}),
			fetchImpl: (url) => {
				urls.push(url);
				return Promise.resolve(mockAnswer("tier-2-risky", 0.9));
			},
			now: () => NOW,
		});
		assert.equal(v.status, "tier");
		assert.equal(v.provider, "typesafe");
		assert.deepEqual(urls, [PROVIDERS.typesafe.url]);
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("custom provider URL must be https: http:// registration is ignored", async () => {
	const tmp = makeTmp();
	try {
		let calls = 0;
		const v = await triage(TASK, {
			env: baseEnv(tmp, {
				TYPESAFE_API_KEY: "",
				LIQUID_API_KEY: "",
				TEMPO_CUSTOM_PROVIDERS: "1",
				TEMPO_PROVIDER_HTTP_URL: "http://collect.example/decide",
			}),
			fetchImpl: () => {
				calls++;
				return Promise.resolve(mockAnswer("tier-1-standard", 0.9));
			},
			now: () => NOW,
		});
		assert.equal(v.status, "unconfigured");
		assert.equal(calls, 0);
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("consent gate: custom URL without TEMPO_CUSTOM_PROVIDERS or TEMPO_PROVIDERS is inert", async () => {
	const tmp = makeTmp();
	try {
		let calls = 0;
		const v = await triage(TASK, {
			env: baseEnv(tmp, {
				TYPESAFE_API_KEY: "",
				LIQUID_API_KEY: "",
				TEMPO_PROVIDER_CLEF_URL: "https://clef.example/decide",
			}),
			fetchImpl: () => {
				calls++;
				return Promise.resolve(mockAnswer("tier-1-standard", 0.9));
			},
			now: () => NOW,
		});
		assert.equal(v.status, "unconfigured");
		assert.equal(calls, 0);
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("egress visibility: verdict and log line carry the destination host", async () => {
	const tmp = makeTmp();
	try {
		const v = await triage(TASK, {
			env: baseEnv(tmp, {}),
			fetchImpl: () => Promise.resolve(mockAnswer("tier-2-risky", 0.95)),
			now: () => NOW,
		});
		assert.equal(v.status, "tier");
		assert.equal(v.host, "api.typesafe.ai");
		const line = JSON.parse(readFileSync(join(tmp, "verdicts.jsonl"), "utf8").trim());
		assert.equal(line.host, "api.typesafe.ai");
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("TEMPO_LOCAL_URL does not auto-join: naming in TEMPO_PROVIDERS is the consent", async () => {
	const tmp = makeTmp();
	try {
		let calls = 0;
		const v = await triage(TASK, {
			env: baseEnv(tmp, {
				TYPESAFE_API_KEY: "",
				LIQUID_API_KEY: "",
				TEMPO_LOCAL_URL: "https://selfhost.example/decide",
			}),
			fetchImpl: () => {
				calls++;
				return Promise.resolve(mockAnswer("tier-1-standard", 0.9));
			},
			now: () => NOW,
		});
		assert.equal(v.status, "unconfigured");
		assert.equal(calls, 0);
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("TEMPO_LOCAL_URL must be https, even when named", async () => {
	const tmp = makeTmp();
	try {
		let calls = 0;
		const v = await triage(TASK, {
			env: baseEnv(tmp, {
				TYPESAFE_API_KEY: "",
				LIQUID_API_KEY: "",
				TEMPO_PROVIDERS: "local",
				TEMPO_LOCAL_URL: "http://selfhost.example/decide",
			}),
			fetchImpl: () => {
				calls++;
				return Promise.resolve(mockAnswer("tier-1-standard", 0.9));
			},
			now: () => NOW,
		});
		assert.equal(v.status, "unconfigured");
		assert.equal(calls, 0);
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("timeout drill: typesafe aborts both attempts, liquid answers → verdict provider liquid, escalate-choice tier from liquid", async () => {
	const tmp = makeTmp();
	try {
		const v = await triage(TASK, {
			env: baseEnv(tmp),
			fetchImpl: (url) => {
				if (url === PROVIDERS.typesafe.url)
					return Promise.reject(new Error("This operation was aborted"));
				return Promise.resolve(mockAnswer("tier-1-standard", 0.9));
			},
			now: () => NOW,
		});
		assert.equal(v.status, "tier");
		assert.equal(v.provider, "liquid");
		assert.equal(v.tier, 1);
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("garbage-body drill: 200 with choiceless body everywhere → status error naming both providers, exactly one error line in verdicts.jsonl, failstate backs off both", async () => {
	const tmp = makeTmp();
	try {
		const garbage = {
			json: () => Promise.reject(new Error("Unexpected token")),
			ok: true,
			status: 200,
		};
		const v = await triage(TASK, {
			env: baseEnv(tmp),
			fetchImpl: () => Promise.resolve(garbage),
			now: () => NOW,
		});
		assert.equal(v.status, "error");
		assert.match(v.error, /typesafe/);
		assert.match(v.error, /liquid/);

		const lines = readFileSync(join(tmp, "verdicts.jsonl"), "utf8").trim().split("\n");
		assert.equal(lines.length, 1);
		assert.equal(JSON.parse(lines[0]).status, "error");

		const statePath = join(tmp, "failstate.json");
		assert.equal(existsSync(statePath), true);
		const state = JSON.parse(readFileSync(statePath, "utf8"));
		assert.ok(state.providers.typesafe, "failstate has a typesafe entry");
		assert.ok(state.providers.liquid, "failstate has a liquid entry");
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("unknown-choice drill: provider answers an unknown flow name → immediate fallthrough to next provider (no same-provider retry)", async () => {
	const tmp = makeTmp();
	try {
		const urls = [];
		const v = await triage(TASK, {
			env: baseEnv(tmp),
			fetchImpl: (url) => {
				urls.push(url);
				if (url === PROVIDERS.typesafe.url)
					return Promise.resolve(mockAnswer("tier-3-ultra", 0.95));
				return Promise.resolve(mockAnswer("tier-2-risky", 0.85));
			},
			now: () => NOW,
		});
		assert.equal(v.status, "tier");
		assert.equal(v.provider, "liquid");
		assert.equal(v.tier, 2);
		// unknown choice must not trigger the 2-attempt retry HTTP errors get
		assert.equal(urls.filter((u) => u === PROVIDERS.typesafe.url).length, 1);
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("named https TEMPO_LOCAL_URL works and is called at that URL", async () => {
	const tmp = makeTmp();
	try {
		const urls = [];
		const v = await triage(TASK, {
			env: baseEnv(tmp, {
				TYPESAFE_API_KEY: "",
				LIQUID_API_KEY: "",
				TEMPO_PROVIDERS: "local",
				TEMPO_LOCAL_URL: "https://selfhost.example/decide",
				TEMPO_LOCAL_MODEL: "d1-3b",
			}),
			fetchImpl: (url) => {
				urls.push(url);
				return Promise.resolve(mockAnswer("tier-1-standard", 0.9));
			},
			now: () => NOW,
		});
		assert.equal(v.status, "tier");
		assert.equal(v.provider, "local");
		assert.equal(v.host, "selfhost.example");
		assert.deepEqual(urls, ["https://selfhost.example/decide"]);
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("verdict log carries provider usage tokens when reported", async () => {
	const tmp = makeTmp();
	try {
		let calls = 0;
		const v = await triage(TASK, {
			env: baseEnv(tmp),
			fetchImpl: () => {
				calls += 1;
				return Promise.resolve({
					json: () => Promise.resolve({
						model: "jev-latest",
						usage: { input_tokens: 999, output_tokens: 2 },
						answers: { tier: { choice: "tier-1-standard", confidence: 0.9 } },
					}),
					ok: true,
					status: 200,
				});
			},
			now: () => NOW,
		});
		assert.equal(v.status, "tier");
		const line = JSON.parse(readFileSync(join(tmp, "verdicts.jsonl"), "utf8").trim());
		assert.equal(line.input_tokens, 999);
		assert.equal(line.output_tokens, 2);
		assert.equal(calls, 1);
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("TEMPO_LOG=off disables logging; the router still decides", async () => {
	const tmp = makeTmp();
	try {
		const v = await triage(TASK, {
			env: baseEnv(tmp, { TEMPO_LOG: "off" }),
			fetchImpl: () => Promise.resolve(mockAnswer("tier-1-standard", 0.9)),
			now: () => NOW,
		});
		assert.equal(v.status, "tier");
		assert.equal(existsSync(join(tmp, "verdicts.jsonl")), false, "log file created despite off");
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});
