#!/usr/bin/env node
/**
 * reflex-gate — PreToolUse decision gate for Claude Code auto mode.
 *
 * Sits BETWEEN Claude Code's allow rules and its auto-mode classifier, in
 * AUTO MODE ONLY (any other permission mode → silent exit: an allow here
 * would bypass the human prompt, a loosening the posture below forbids):
 *
 *   0. SECRETS ASK — a command naming secrets/key material (.env, *.pem,
 *      id_rsa, …) asks a human before the read-only fast path can allow it:
 *      read-only ≠ safe.
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
 *   REFLEX_PROVIDERS      csv cycle order            (default "typesafe,liquid")
 *   REFLEX_SPEC_<N>_JSON  per-provider spec override (merged over presets)
 *   REFLEX_THRESHOLD_DENY max-risk p ≥ this → deny   (default 0.85)
 *   REFLEX_THRESHOLD_ASK  max-risk p ≥ this → ask    (default 0.55)
 *   REFLEX_TIMEOUT_MS     per-provider timeout       (default 3000)
 *   REFLEX_MAX_FAILURES   consecutive fails → disable provider until the
 *                         recovery cooldown elapses (default 3)
 *   REFLEX_RECOVERY_MS    provider recovery cooldown (default 1800000)
 *   REFLEX_LOG            verdict log path
 *   REFLEX_ALL_MODES      "1" → also gate non-auto modes (ask/deny only;
 *                                                    bypassPermissions never)
 *   REFLEX_DISABLED       "1" → exit 0 immediately (kill switch)
 *
 * Provider presets (active = keyless or env var set):
 *   liquid   systemone  api.liquid.ai/decisions/v1/systemone   d1.1         LIQUID_API_KEY
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
import { appendFileSync, mkdirSync, readFileSync, realpathSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname, sep } from "node:path";

// Home-relative abbreviation for the paths reflex itself authors: the logged
// `cwd` and the working directory in the provider state prompt. Consistent
// with how reflex names its own paths (~/.local/share/reflex/…), and it
// keeps the username out of everything that leaves the machine. Verbatim
// fields are never tildified — command replays and the correlator's
// transcript_path join need them byte-for-byte.
//
// process.cwd() (getcwd) returns the symlink-resolved path while $HOME may
// contain a symlink component (macOS: /var → /private/var), so both spellings
// of home are matched — otherwise tildify silently no-ops there.
const tildify = (p) => {
	for (const home of homeCandidates) {
		if (p === home) return "~";
		if (p.startsWith(home + sep)) return "~" + p.slice(home.length);
	}
	return p;
};
const homeCandidates = (() => {
	const h = homedir();
	try {
		const r = realpathSync(h);
		return r === h ? [h] : [h, r];
	} catch { return [h]; }
})();

// -- Config -----------------------------------------------------------------

const PRESETS = {
	liquid: { type: "systemone", url: "https://api.liquid.ai/decisions/v1/systemone", model: "d1.1", apiKeyEnv: "LIQUID_API_KEY" },
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
	const providers = (env.REFLEX_PROVIDERS ?? "typesafe,liquid")
		.split(",").map((s) => s.trim()).filter((n) => specs[n]);
	return {
		providers,
		specs,
		denyP: clamp(Number(env.REFLEX_THRESHOLD_DENY ?? 0.85), 0.5, 0.99),
		askP: clamp(Number(env.REFLEX_THRESHOLD_ASK ?? 0.55), 0.3, Number(env.REFLEX_THRESHOLD_DENY ?? 0.85)),
		timeoutMs: num(env.REFLEX_TIMEOUT_MS, 3000),
		maxFailures: num(env.REFLEX_MAX_FAILURES, 3),
		recoveryMs: num(env.REFLEX_RECOVERY_MS, 30 * 60 * 1000),
		log: env.REFLEX_LOG ?? join(homedir(), ".local", "share", "reflex", "verdicts.jsonl"),
		stateFile: env.REFLEX_STATE_FILE ?? join(homedir(), ".local", "share", "reflex", "failstate.json"),
		disabled: env.REFLEX_DISABLED === "1",
		allModes: env.REFLEX_ALL_MODES === "1",
	};
}

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : lo));
// env number with default: unset/empty/non-numeric → default (a NaN here would
// silently disable the failure breaker: NaN comparisons are always false)
const num = (v, d) => {
	const n = Number(v);
	return v === undefined || v === "" || !Number.isFinite(n) ? d : n;
};

// -- Fast paths (local, no network) ------------------------------------------
// SECURITY NOTE: every pattern is anchored over the WHOLE segment (^…$). A
// prefix match would let `cat notes.md > /etc/passwd` slip through on `cat`.
// Deliberately NOT in the list: find (-delete/-exec), awk (print > file),
// sed (-i), sort (-o), tee, git branch/tag with args, gh api (can POST) —
// anything with a write mode goes to the model or the classifier instead.

// curl HEAD-only probe, token-based so flag position can't dodge the check
// (the regex form only inspected the first flag bundle): an -I/--head flag
// must be present AND no token may carry a body, method override, upload,
// or a response/header/config file write — short bundles containing
// d D F O o T X K, long --data* --form* --upload* --request* --dump*
// --output --remote-name* --trace* --libcurl --config.
const curlHeadOnly = (seg) => {
	if (!/^curl\s/.test(seg)) return false;
	const tokens = seg.split(/\s+/).slice(1);
	const head = tokens.some((t) => t === "--head" || (/^-[A-Za-z]+$/.test(t) && t.includes("I")));
	return head && !tokens.some((t) =>
		/^-[A-Za-z]*[dDFOoTXK]/.test(t) || /^--(data|form|upload|request|dump|output|remote|trace|libcurl|config)/.test(t));
};

const RO_PATTERNS = [
	// intrinsically read-only programs, any flags/args to end of segment
	/^(?:ls|pwd|cat|head|tail|wc|file|stat|du|df|tree|which|type|date|uname|hostname|id|whoami|groups|tty|printenv|locale|jq|yq|md5sum|sha1sum|sha256sum|cksum|diff|comm|cut)(?:\s+(?:-{1,2}[\w][\w-]*|"[^"\n]*"|'[^'\n]*'|[^\s"'|;&`\\]+))*$/,
	// more read-only programs, with write-mode exclusions where one exists
	/^grep\b/,
	// sort without an output flag — \S* also catches attached (-oFILE) values
	/^sort\b(?!(?:.*\s)?(?:-o\S*|--output\S*))(?:\s.*)?$/,
	/^uniq\b|^column\b|^basename\b|^dirname\b|^realpath\b|^readlink\b/,
	// find without write/exec actions — --? covers single AND double dash
	// (--delete), \w* covers -execdir/-okdir; -executable is over-blocked,
	// deliberately conservative
	/^find\b(?!.*\s--?(?:delete|exec\w*|ok\w*|fls|fprint\w*)\b)/,
	// sed in pure line-print mode, whole-segment anchored: flags are one
	// -n-containing bundle (or --quiet/--silent) with no i (in-place) or
	// f (script file) in it; the script is a single quoted-or-bare token of
	// only addresses/p (no s/w/e/d-with-s — w and GNU e can write/execute);
	// any later token must not start with "-" (no trailing -e/-f/-i)
	/^sed\s+(?:--(?:quiet|silent)|-(?![A-Za-z]*[if])[A-Za-z]*n[A-Za-z]*)\s+(['"]?)[0-9$,p]*\1(?:\s+[^-\s]\S*)*$/,
	// parse-only interpreter modes (no execution)
	/^(?:ba|z|k)?sh\s+-n\b|^node\s+--check\b/,
	// trivial no-op / timing segments
	/^(?:echo|printf|true|false|sleep)(?:\s.*)?$/,
	// cd to any target cannot write anything
	/^cd\b/,
	// command -v: the only safe slice of `command` — bare `command rm …`
	// would execute its argument, so no broader form
	/^command (?:-v|-V|--version)\s+\S+(?:\s+\S+)*$/,
	// read-only git subcommands — --output (git diff --output=FILE) writes
	/^git (?:status|log|diff|show|blame|rev-parse|describe|check-ignore|ls-files|cat-file|rev-list)\b(?!(?:.*\s)?--output(?:\s|=))(?:\s+\S.*)?$/,
	/^git (?:branch|tag)(?: (?:--list|-l|-a|-r|-v|-vv|--all|--remotes))?$/,
	/^git remote -v$/,
	// read-only gh subcommands
	/^gh (?:pr|issue|repo) (?:view|list|checks|diff)\b/,
	// package and toolchain version/read queries
	/^(?:npm|pnpm) (?:ls|list|outdated|view)\b.*$|^yarn (?:info|list)\b.*$/,
	/^(?:node|python3?|cargo|rustc|gcc|g\+\+|make) (?:--version|-v)$|^go version$/,
	// process/system reads
	/^(?:ps|pgrep|lscpu|lsblk)\b|^lsof -i\b|^ss -l\b|^netstat -l\b|^free$|^uptime$|^nproc$/,
	/^systemctl (?:status|list-|is-active|is-enabled)\b/,
	// read-only network probes (HEAD / spider only — plain GETs still go to
	// the model: a literal secret in a URL must never be silently allowed).
	curlHeadOnly, /^wget\s+(?:-\w+\s+)*--spider\b.*$/,
];

function splitSegments(cmd) {
	const stripped = cmd
		// to /dev/null: harmless — covers >, >>, N>, N>>, &>, &>> (the
		// &>? form only matched &>-variants and killed the fast path for
		// plain >/dev/null and 2>/dev/null)
		.replace(/(?:\d)?\s*&?>{1,2}\s*\/dev\/null/g, " ")
		.replace(/(?:\d)?\s*>&\s*\d+/g, " "); // fd duplication (2>&1): harmless
	// any redirection other than the above → not fast-path (writes somewhere)
	if (/(?:\d)?[<>]{1,2}\s*\S+/.test(stripped)) return null;
	// (?<!\\)\| — an escaped pipe (grep 'a\|b' BRE alternation) is a literal
	// argument, not a pipe operator; splitting on it broke whole compounds
	return stripped.split(/\|\||&&|(?<!\\)\||;|\$\(|`|\n/g).map((s) => s.trim()).filter(Boolean);
}

function fastPathAllow(cmd) {
	const segs = splitSegments(cmd);
	return segs !== null && segs.length > 0 && segs.every((s) => RO_PATTERNS.some((p) => (typeof p === "function" ? p(s) : p.test(s))));
}

// Unambiguous destruction — deny without a model call. Labeled so the
// hook reason tells the human WHAT was matched, not just that something was.
const DENY_PATTERNS = [
	["recursive rm of home/absolute path", /rm\s+(?:-[a-zA-Z]*[rf][a-zA-Z]*\s+)+(?:~|\$HOME|\/[^"\s]*|"\$?[A-Z_]{2,}")/],
	["raw device write (dd of=)", /dd\s+[^\n]*of=\/dev\/(?:sd|nvme|vd)/],
	["raw device write (redirect)", />\s*\/dev\/(?:sd|nvme|vd)/],
	["filesystem creation (mkfs)", /mkfs(?:\.\w+)?\s/],
	["fork bomb", /:\(\)\s*\{\s*:\|:&\s*\};:/],
];

// Risky-but-context-dependent — a human should see these regardless of model.
const ASK_PATTERNS = [
	["force push", /git\s+push\s+(--force|-f\b)/],
	["git reset --hard (discards uncommitted work)", /git\s+reset\s+--hard/],
	["git clean -f (deletes untracked files)", /git\s+clean\s+-[a-zA-Z]*f/],
	["discard all local changes (git checkout -- .)", /git\s+checkout\s+--\s+\.\s*$/],
	["discard all local changes (git restore .)", /git\s+restore\s+\.\s*$/],
	["SQL DROP TABLE/DATABASE", /DROP\s+(TABLE|DATABASE)/],
	["terraform destroy", /terraform\s+destroy/],
	["kubectl delete namespace", /kubectl\s+delete\s+(ns|namespace)/],
	["chmod -R 777 on /", /chmod\s+-R\s+777\s+\/(?!tmp|home\/\w+\/\.cache)/],
];

// Secrets-file exposure — a command naming credential/key material must reach
// a human: read-only ≠ safe, and a read-only fast-path allow would preempt the
// auto-mode classifier's own secrets block lists (cat .env, head ~/.aws/
// credentials). Conservative by design: writing or generating a key also asks.
const SECRETS_PATTERNS = [
	[".env file", /\.env\b/],
	["certificate/key file (.pem/.key/.p12/.pfx)", /\.(?:pem|key|p12|pfx)\b/],
	["SSH private key (id_rsa/id_ed25519/id_ecdsa)", /id_(?:rsa|ed25519|ecdsa)\b/],
	["credentials file", /credentials\.json\b|\.aws\/credentials/],
	[".netrc (stored credentials)", /\.netrc\b/],
	// Inline credential literals — checked in the SAME step-0 gate, BEFORE the
	// decision-model chain: a command carrying a literal credential must ask a
	// human rather than send the secret to a third-party provider. Raises the
	// bar, not a guarantee (heuristics have false negatives) — the structural
	// bound is that providers only ever receive commands these regexes miss.
	["inline credential (Authorization/Bearer header)", /(?:Authorization[:"']?\s*[Bb]earer?\s|Bearer\s+[A-Za-z0-9._~+/=-]{8,})/],
	["inline credential (OpenAI-style sk- key)", /sk-[A-Za-z0-9]{16,}/],
	["inline credential (GitHub token)", /gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}/],
	["inline credential (AWS access key id)", /AKIA[0-9A-Z]{16}/],
	["inline credential (Slack token)", /xox[baprs]-[A-Za-z0-9-]{10,}/],
	["inline credential (PEM private key block)", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
];

// First labeled pattern matching the command: {label, snippet} | null. The
// snippet (≤60 chars) is the matched text itself — shown to the human so the
// hook reason names WHAT fired, not just that something did.
function firstMatch(patterns, cmd) {
	for (const [label, re] of patterns) {
		const m = cmd.match(re);
		if (m) return { label, snippet: m[0].slice(0, 60) };
	}
	return null;
}

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

async function runChain(cfg, env, state, failState, logCtx = {}) {
	const now = Date.now();
	for (const name of cfg.providers) {
		const spec = cfg.specs[name];
		if (!spec || !providerActive(spec, env)) continue;
		// circuit breaker: skip a provider while it has maxFailures AND the
		// recovery cooldown hasn't elapsed — after the cooldown it gets one
		// half-open retry (success clears the entry, failure re-opens it)
		const entry = failState[name];
		const disabled = typeof entry?.count === "number" && typeof entry?.since === "number"
			? entry.count >= cfg.maxFailures && now - entry.since < cfg.recoveryMs
			: false; // legacy bare-number entries: treated as expired
		if (disabled) continue;
		try {
			const callT0 = Date.now();
			const ps = await systemOneCall(spec, env[spec.apiKeyEnv ?? ""] ?? undefined, state, spec.timeoutMs ?? cfg.timeoutMs);
			delete failState[name];
			return { provider: name, ps, callMs: Date.now() - callT0 };
		} catch (err) {
			const prev = failState[name];
			const count = (typeof prev?.count === "number" ? prev.count : (typeof prev === "number" ? prev : 0)) + 1;
			// stamp since on every failure: the cooldown restarts from the
			// latest failure, including a failed half-open retry
			failState[name] = { count, since: now };
			// command/cwd included so an outage can be correlated with the
			// calls it affected (what fell through to the classifier, and when)
			logLine(cfg, { ts: new Date().toISOString(), kind: "provider-error", provider: name, error: String(err?.message || err).slice(0, 60), ...logCtx });
		}
	}
	return null;
}

// -- Logging -------------------------------------------------------------------

function logLine(cfg, obj) {
	try {
		// 0700/0600: the log stores verbatim command text — anything typed,
		// including inline credentials — so it is user-private by construction
		mkdirSync(dirname(cfg.log), { recursive: true, mode: 0o700 });
		appendFileSync(cfg.log, JSON.stringify(obj) + "\n", { mode: 0o600 });
	} catch { /* logging must never break gating */ }
}

function loadFailState(cfg) {
	try { return JSON.parse(readFileSync(cfg.stateFile, "utf8")); } catch { return {}; }
}
function saveFailState(cfg, s) {
	try {
		mkdirSync(dirname(cfg.stateFile), { recursive: true, mode: 0o700 });
		writeFileSync(cfg.stateFile, JSON.stringify(s), { mode: 0o600 });
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
	const t0 = Date.now();
	const env = process.env;
	const cfg = resolveConfig(env);
	if (cfg.disabled || cfg.providers.length === 0) return; // silent: classifier hand-off

	let raw = "";
	for await (const chunk of process.stdin) raw += chunk;
	let input;
	try { input = JSON.parse(raw); } catch { return; }
	const cmd = String(input?.tool_input?.command ?? "").slice(0, 2000);
	if (!cmd.trim()) return;

	// Mode gate. INVARIANT: reflex never allows outside auto mode, in any
	// configuration — a reflex "allow" there would bypass the human prompt
	// (a loosening the failure posture forbids). Default scope is auto only;
	// REFLEX_ALL_MODES=1 extends ask/deny gating to other modes. In
	// bypassPermissions there are no prompts beneath the gate, so a deny
	// would make reflex the sole authority — that mode is always excluded
	// (an unrecognized mode string simply never matches: silent exit).
	const mode = input?.permission_mode ?? input?.permissionMode;
	const gated = mode === "auto"
		|| (cfg.allModes && mode !== "bypassPermissions");
	if (!gated) return; // silent: untouched default flow

	const logCommon = {
		// same 2,000-char string the gate decided on — the eval harness replays
		// from this log, so a truncated prefix would silently mislabel replays
		command: cmd,
		cwd: tildify(process.cwd()),
		mode, // the gate only acts in auto; recording it makes every line auditable
		ms: Date.now() - t0, // end-to-end hook cost: the "fast, cheap" claim, measured
		// Hook-correlation ids (documented PreToolUse input fields): they let
		// the post-hoc outcome correlator join a verdict line to the exact
		// transcript tool_use record — the human's actual decision. Absent
		// fields stay absent: JSON.stringify drops undefined.
		tool_use_id: input?.tool_use_id,
		session_id: input?.session_id,
		transcript_path: input?.transcript_path,
	};

	// No-allow invariant: outside auto mode an "allow" becomes a silent exit —
	// the default flow (the human prompt) handles the call instead.
	const emit = (_cfg, decision, reason, extra) =>
		decision === "allow" && mode !== "auto" ? undefined : decide(cfg, decision, reason, extra);

	// 0. Secrets exposure — before the read-only fast path, so cat .env asks;
	// before the model chain, so inline credentials never reach a provider.
	const secret = firstMatch(SECRETS_PATTERNS, cmd);
	if (secret) return emit(cfg, "ask", `carries secrets material — ${secret.label}: "${secret.snippet}"`, { ...logCommon, fastpath: "secrets", pattern: secret.label });

	// 1-3. Local fast paths — decided without the network.
	if (fastPathAllow(cmd)) return emit(cfg, "allow", "read-only fast path", { ...logCommon, fastpath: "allow" });
	const denyHit = firstMatch(DENY_PATTERNS, cmd);
	if (denyHit) return emit(cfg, "deny", `unambiguous destruction — ${denyHit.label}: "${denyHit.snippet}"`, { ...logCommon, fastpath: "deny", pattern: denyHit.label });
	const askHit = firstMatch(ASK_PATTERNS, cmd);
	if (askHit) return emit(cfg, "ask", `risky pattern — ${askHit.label}: "${askHit.snippet}" (human decides)`, { ...logCommon, fastpath: "ask", pattern: askHit.label });

	// 4. Decision-model chain.
	const failState = loadFailState(cfg);
	const state = `Shell command proposed for execution.\nWorking directory: ${tildify(process.cwd())}\nCommand: ${cmd}`;
	const result = await runChain(cfg, env, state, failState, logCommon);
	saveFailState(cfg, failState);
	if (!result) return; // silent: classifier hand-off — never allow on gate failure

	const riskP = Math.max(...result.ps);
	const worst = ["destructive", "exfiltration", "prod_infra"][result.ps.indexOf(riskP)];
	if (riskP >= cfg.denyP) return emit(cfg, "deny", `${result.provider} ${worst}=p${riskP.toFixed(2)} ≥ deny ${cfg.denyP}`, { ...logCommon, provider: result.provider, riskP, worst, callMs: result.callMs });
	if (riskP >= cfg.askP) return emit(cfg, "ask", `${result.provider} ${worst}=p${riskP.toFixed(2)} — uncertain, human decides`, { ...logCommon, provider: result.provider, riskP, worst, callMs: result.callMs });
	if (result.ps.every((p) => p <= 1 - cfg.askP)) return emit(cfg, "allow", `${result.provider} max-risk=p${riskP.toFixed(2)} — confidently safe`, { ...logCommon, provider: result.provider, riskP, worst, callMs: result.callMs });
	return emit(cfg, "ask", `${result.provider} probabilities straddle thresholds — human decides`, { ...logCommon, provider: result.provider, riskP, worst, callMs: result.callMs });
}

main().catch(() => process.exit(0)); // any gate bug must never block or allow
