#!/usr/bin/env node
/**
 * reflex-gate — PreToolUse decision gate for Claude Code auto mode.
 *
 * Sits BETWEEN Claude Code's allow rules and its auto-mode classifier:
 *
 *   1. FAST-PATH ALLOW — read-only shell commands, decided locally by regex,
 *      zero latency, no network. Only whole-command matches: every pipe/chain
 *      segment must be read-only, redirections only to /dev/null.
 *   2. FAST-PATH DENY — a small set of unambiguous destructive patterns
 *      (recursive deletes of critical paths, device writes, fork bombs).
 *      "Places a regex beats the model" are kept (XavierJev's rule).
 *   3. FAST-PATH ASK — risky-but-context-dependent patterns (git reset --hard,
 *      force push without scope) that deserve a human regardless of model.
 *   4. DECISION MODEL — everything else goes to a System One provider chain
 *      (same specs/cycle/failover shape as pi-agent's session-summary decision
 *      gate): three noul questions (destructive, exfiltration, prod/shared
 *      infra) over a bounded state blob, mapped through an inverted ladder.
 *
 * FAILURE POSTURE — the inversion that makes this a safety gate, not a
 * cost-saver (cf. session-summary's "can only save a call, never block one"):
 *   uncertain        → ASK (the human), never silent-allow
 *   provider error / timeout / malformed response → SILENT EXIT (exit 0, no
 *   output): Claude Code's default flow — allow rules, then the auto-mode
 *   classifier — handles the call. The gate can only sharpen a decision,
 *   never loosen one.
 *
 * Every verdict (fast-path and model) is appended as one JSON line to
 * $REFLEX_LOG (default ~/.local/share/reflex/verdicts.jsonl) so labelled
 * sets for the measurement harness accumulate from real traffic.
 *
 * Config: environment variables only — never config files, never key values.
 *   REFLEX_PROVIDERS      csv cycle order            (default "liquid,typesafe")
 *   REFLEX_SPEC_<N>_JSON  per-provider spec override (merged over presets)
 *   REFLEX_THRESHOLD_DENY max-risk p ≥ this → deny   (default 0.85)
 *   REFLEX_THRESHOLD_ASK  max-risk p ≥ this → ask    (default 0.55)
 *   REFLEX_TIMEOUT_MS     per-provider timeout       (default 3000)
 *   REFLEX_MAX_FAILURES   consecutive fails → disable provider for the day
 *                                                    (default 3)
 *   REFLEX_LOG            verdict log path
 *   REFLEX_DISABLED       "1" → exit 0 immediately (kill switch)
 *
 * Provider presets (active = keyless or env var set):
 *   liquid   systemone  api.liquid.ai/decisions/v1/systemone   d1:free      LIQUID_API_KEY
 *   typesafe systemone  api.typesafe.ai/v1/systemone           jev-latest   TYPESAFE_API_KEY
 *   Custom specs merge over presets per-field, pi-agent style.
 *
 * State assembly discipline (injection surface): the model sees the command
 * text (2,000 chars) and the hook working directory — never tool output,
 * never assistant prose, never file contents.
 *
 * Pattern adapted from shrwnsan/pi-agent extensions/session-summary
 * decision-gate.ts (MIT, Copyright (c) 2026 shrwnsan). This file is
 * Apache-2.0 as part of vibekit.
 */
import { appendFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";

// -- Config -----------------------------------------------------------------

const PRESETS = {
	liquid: { type: "systemone", url: "https://api.liquid.ai/decisions/v1/systemone", model: "d1:free", apiKeyEnv: "LIQUID_API_KEY" },
	typesafe: { type: "systemone", url: "https://api.typesafe.ai/v1/systemone", model: "jev-latest", apiKeyEnv: "TYPESAFE_API_KEY" },
};

function resolveConfig(env = process.env) {
	const specs = JSON.parse(JSON.stringify(PRESETS));
	for (const [k, v] of Object.entries(env)) {
		const m = k.match(/^REFLEX_SPEC_([A-Z0-9_]+)_JSON$/);
		if (m && v) {
			const name = m[1].toLowerCase();
			try {
				specs[name] = { ...(specs[name] ?? {}), ...JSON.parse(v) };
			} catch { /* invalid override: keep preset */ }
		}
	}
	const providers = (env.REFLEX_PROVIDERS ?? "liquid,typesafe")
		.split(",").map((s) => s.trim()).filter((n) => specs[n]);
	return {
		providers,
		specs,
		denyP: clamp(Number(env.REFLEX_THRESHOLD_DENY ?? 0.85), 0.5, 0.99),
		askP: clamp(Number(env.REFLEX_THRESHOLD_ASK ?? 0.55), 0.3, Number(env.REFLEX_THRESHOLD_DENY ?? 0.85)),
		timeoutMs: Number(env.REFLEX_TIMEOUT_MS ?? 3000),
		maxFailures: Number(env.REFLEX_MAX_FAILURES ?? 3),
		log: env.REFLEX_LOG ?? join(homedir(), ".local", "share", "reflex", "verdicts.jsonl"),
		stateFile: env.REFLEX_STATE_FILE ?? join(homedir(), ".local", "share", "reflex", "failstate.json"),
		disabled: env.REFLEX_DISABLED === "1",
	};
}

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : lo));

// -- Fast paths (local, no network) ------------------------------------------
// SECURITY NOTE: every pattern is anchored over the WHOLE segment (^…$). A
// prefix match would let `cat notes.md > /etc/passwd` slip through on `cat`.
// Deliberately NOT in the list: find (-delete/-exec), awk (print > file),
// sed (-i), sort (-o), tee, git branch/tag with args, gh api (can POST) —
// anything with a write mode goes to the model or the classifier instead.

const RO_PATTERNS = [
	// intrinsically read-only programs, any flags/args to end of segment
	/^(?:ls|pwd|cat|head|tail|wc|file|stat|du|df|tree|which|type|date|uname|hostname|id|whoami|groups|tty|printenv|locale|jq|yq|md5sum|sha1sum|sha256sum|cksum|diff|comm|cut)(?:\s+(?:-{1,2}[\w][\w-]*|"[^"\n]*"|'[^'\n]*'|[^\s"'|;&`\\]+))*$/,
	// read-only git subcommands
	/^git (?:status|log|diff|show|blame|rev-parse|describe)(?:\s+\S.*)?$/,
	/^git (?:branch|tag)(?: (?:--list|-l|-a|-r|-v|-vv|--all|--remotes))?$/,
	/^git remote -v$/,
	// package and toolchain version/read queries
	/^(?:npm|pnpm) (?:ls|list|outdated|view)\b.*$|^yarn (?:info|list)\b.*$/,
	/^(?:node|python3?|cargo|rustc|gcc|g\+\+|make) (?:--version|-v)$|^go version$/,
	// process/system reads
	/^(?:ps|pgrep|lscpu|lsblk)\b|^lsof -i\b|^ss -l\b|^netstat -l\b|^free$|^uptime$|^nproc$/,
	/^systemctl (?:status|list-|is-active|is-enabled)\b/,
	// read-only network probes (HEAD / spider only)
	/^curl\s+(?:-\w+\s+)*-I\b.*$|^wget\s+(?:-\w+\s+)*--spider\b.*$/,
];

function splitSegments(cmd) {
	const stripped = cmd.replace(/(?:\d)?\s*&?\s*\/dev\/null/g, " ");
	// any redirection other than /dev/null → not fast-path (writes somewhere)
	if (/(?:\d)?[<>]{1,2}\s*\S+/.test(stripped)) return null;
	return stripped.split(/\||&&|\|\||;|\$\(|`|\n/g).map((s) => s.trim()).filter(Boolean);
}

function fastPathAllow(cmd) {
	const segs = splitSegments(cmd);
	return segs !== null && segs.length > 0 && segs.every((s) => RO_PATTERNS.some((re) => re.test(s)));
}

// Unambiguous destruction — deny without a model call.
const DENY_RE = new RegExp([
	// rm with -r and/or -f flags targeting home, an absolute path, or an ALL-CAPS shell var
	"rm\\s+(?:-[a-zA-Z]*[rf][a-zA-Z]*\\s+)+(?:~|\\$HOME|/[^\"\\s]*|\"\\$?[A-Z_]{2,}\")",
	// raw device writes and filesystem creation
	"dd\\s+[^\\n]*of=/dev/(?:sd|nvme|vd)",
	">\\s*/dev/(?:sd|nvme|vd)",
	"mkfs(?:\\.\\w+)?\\s",
	// classic fork bomb
	":\\(\\)\\s*\\{\\s*:\\|:&\\s*\\};:",
].join("|"));

// Risky-but-context-dependent — a human should see these regardless of model.
const ASK_RE = /git\s+push\s+(--force|-f\b)|git\s+reset\s+--hard|git\s+clean\s+-[a-zA-Z]*f|git\s+checkout\s+--\s+\.\s*$|git\s+restore\s+\.\s*$|DROP\s+(TABLE|DATABASE)|terraform\s+destroy|kubectl\s+delete\s+(ns|namespace)|chmod\s+-R\s+777\s+\/(?!tmp|home\/\w+\/\.cache)/i;

// -- Decision-model chain -----------------------------------------------------

function providerActive(spec, env) { return !spec.apiKeyEnv || !!env[spec.apiKeyEnv]; }

function questions() {
	return {
		destructive: {
			type: "noul",
			instructions: "Would executing this shell command irreversibly destroy or overwrite data OUTSIDE the working directory and its build/cache artifacts — or destroy uncommitted work inside it?",
			criteria: { true: "Irreversible deletion/overwrite beyond throwaway artifacts, or discarding uncommitted work", false: "Reads, writes to scratch/build/cache paths, reversible operations" },
		},
		exfiltration: {
			type: "noul",
			instructions: "Does this command send credentials, secrets, private keys, or substantial private data to an external host, or pipe local content into a network request body?",
			criteria: { true: "Sensitive or private content leaves the machine or reaches a non-essential endpoint", false: "No network egress, or egress of non-sensitive content to an expected service" },
		},
		prod_infra: {
			type: "noul",
			instructions: "Does this command target production, shared, or infrastructure systems — deploys, migrations, IAM or permission changes, DNS, shared clusters, other people's resources?",
			criteria: { true: "Reaches infrastructure beyond this machine and this project's own sandbox", false: "Local-only effect or an explicitly named dev/test target" },
		},
	};
}

async function systemOneCall(spec, apiKey, state, timeoutMs) {
	const headers = { "Content-Type": "application/json" };
	if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
	const res = await fetch(spec.url, {
		method: "POST",
		headers,
		body: JSON.stringify({ model: spec.model, state, questions: questions() }),
		signal: AbortSignal.timeout(timeoutMs),
	});
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	const data = await res.json();
	const a = data?.answers;
	const ps = ["destructive", "exfiltration", "prod_infra"].map((q) => a?.[q]?.noul);
	if (ps.some((p) => typeof p !== "number")) throw new Error("MALFORMED_RESPONSE");
	return ps;
}

async function runChain(cfg, env, state, failState) {
	for (const name of cfg.providers) {
		const spec = cfg.specs[name];
		if (!spec || !providerActive(spec, env)) continue;
		if ((failState[name] ?? 0) >= cfg.maxFailures) continue;
		try {
			const ps = await systemOneCall(spec, env[spec.apiKeyEnv ?? ""] ?? undefined, state, spec.timeoutMs ?? cfg.timeoutMs);
			delete failState[name];
			return { provider: name, ps };
		} catch (err) {
			failState[name] = (failState[name] ?? 0) + 1;
			logLine(cfg, { ts: new Date().toISOString(), kind: "provider-error", provider: name, error: String(err?.message || err).slice(0, 60) });
		}
	}
	return null;
}

// -- Logging -------------------------------------------------------------------

function logLine(cfg, obj) {
	try {
		mkdirSync(dirname(cfg.log), { recursive: true });
		appendFileSync(cfg.log, JSON.stringify(obj) + "\n");
	} catch { /* logging must never break gating */ }
}

function loadFailState(cfg) {
	try { return JSON.parse(readFileSync(cfg.stateFile, "utf8")); } catch { return {}; }
}
function saveFailState(cfg, s) {
	try {
		mkdirSync(dirname(cfg.stateFile), { recursive: true });
		writeFileSync(cfg.stateFile, JSON.stringify(s));
	} catch { /* ignore */ }
}

// -- Output helpers -------------------------------------------------------------

function decide(cfg, decision, reason, extra = {}) {
	logLine(cfg, { ts: new Date().toISOString(), kind: "verdict", decision, reason, ...extra });
	process.stdout.write(JSON.stringify({
		hookSpecificOutput: {
			hookEventName: "PreToolUse",
			permissionDecision: decision,
			permissionDecisionReason: `reflex: ${reason}`,
		},
	}));
}

// -- Main ------------------------------------------------------------------------

async function main() {
	const env = process.env;
	const cfg = resolveConfig(env);
	if (cfg.disabled || cfg.providers.length === 0) return; // silent: classifier hand-off

	let raw = "";
	for await (const chunk of process.stdin) raw += chunk;
	let input;
	try { input = JSON.parse(raw); } catch { return; }
	const cmd = String(input?.tool_input?.command ?? "").slice(0, 2000);
	if (!cmd.trim()) return;

	const logCommon = { command: cmd.slice(0, 200), cwd: process.cwd() };

	// 1-3. Local fast paths — decided without the network.
	if (fastPathAllow(cmd)) return decide(cfg, "allow", "read-only fast path", { ...logCommon, fastpath: "allow" });
	if (DENY_RE.test(cmd)) return decide(cfg, "deny", "unambiguous destructive pattern (local regex)", { ...logCommon, fastpath: "deny" });
	if (ASK_RE.test(cmd)) return decide(cfg, "ask", "risky pattern needs human eyes (local regex)", { ...logCommon, fastpath: "ask" });

	// 4. Decision-model chain.
	const failState = loadFailState(cfg);
	const state = `Shell command proposed for execution.\nWorking directory: ${process.cwd()}\nCommand: ${cmd}`;
	const result = await runChain(cfg, env, state, failState);
	saveFailState(cfg, failState);
	if (!result) return; // silent: classifier hand-off — never allow on gate failure

	const riskP = Math.max(...result.ps);
	const worst = ["destructive", "exfiltration", "prod_infra"][result.ps.indexOf(riskP)];
	if (riskP >= cfg.denyP) return decide(cfg, "deny", `${result.provider} ${worst}=p${riskP.toFixed(2)} ≥ deny ${cfg.denyP}`, { ...logCommon, provider: result.provider, riskP, worst });
	if (riskP >= cfg.askP) return decide(cfg, "ask", `${result.provider} ${worst}=p${riskP.toFixed(2)} — uncertain, human decides`, { ...logCommon, provider: result.provider, riskP, worst });
	if (result.ps.every((p) => p <= 1 - cfg.askP)) return decide(cfg, "allow", `${result.provider} max-risk=p${riskP.toFixed(2)} — confidently safe`, { ...logCommon, provider: result.provider, riskP, worst });
	return decide(cfg, "ask", `${result.provider} probabilities straddle thresholds — human decides`, { ...logCommon, provider: result.provider, riskP, worst });
}

main().catch(() => process.exit(0)); // any gate bug must never block or allow
