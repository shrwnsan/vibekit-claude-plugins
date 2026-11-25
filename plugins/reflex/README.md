# reflex

**Pre-classifier permission gate for Claude Code auto mode.**

A `PreToolUse` hook that decides shell commands *before* Claude Code's
auto-mode classifier sees them, using System One decision models, which
return typed probabilities (noul) from a dedicated decision-model API
rather than a chat model's prose. Fast, cheap, and composable with whatever
provider you already have a key for.

```
Bash call → reflex
  ├─ names secrets/key material → ASK    (local regex, read-only ≠ safe)
  ├─ read-only regex          → ALLOW            (local, zero latency)
  ├─ unambiguous destruction  → DENY             (local regex, "places a regex beats the model")
  ├─ risky-but-contextual     → ASK              (local regex)
  └─ everything else          → decision-model chain (noul ×3: destructive,
                                                     exfiltration, prod/shared infra)
        ├─ max p ≥ deny threshold        → DENY
        ├─ max p ≥ ask threshold         → ASK
        ├─ all p ≤ (1 − ask threshold)   → ALLOW (confidently safe)
        └─ anywhere in between           → ASK
```

## The failure posture

Reflex is a **safety gate**, not a cost-saver. It inverts
[pi-agent's session-summary decision gate](https://github.com/shrwnsan/pi-agent),
which "can only save a call, never block one". Reflex can only *sharpen* a
decision, never loosen one:

- **Uncertain probabilities** → `ask` (a human), never silent-allow.
- **Any permission mode other than auto mode** → **silent exit**. In manual
  modes a reflex `allow` would bypass the human prompt and a reflex `deny`
  would take the decision from the human. Both loosen the default flow,
  so reflex gates nothing there.
- **A command naming secrets or key material** (`.env`, `*.pem`, `id_rsa`,
  …) → `ask` before the read-only fast path: a read-only allow must never
  preempt the classifier's secrets review.
- **A command carrying an inline credential literal** (Authorization/
  Bearer headers, `sk-`/`ghp_`/`AKIA…`-class tokens, PEM key blocks) → the
  same `ask`, BEFORE the decision-model chain: a literal secret reaches a
  human, never a provider.
- **The verdict log stores verbatim command text**, including anything
  typed. Files are user-private by construction (0600, dirs 0700); no
  content redaction, by design. Masking heuristics give false comfort,
  and the ask above keeps literal secrets out of provider egress.
- **Provider error, timeout, malformed response, chain exhausted** → **silent
  exit**: no hook output means Claude Code's normal flow handles the call
  untouched, allow rules first and then the auto-mode classifier.
- **Plugin disabled or kill-switched** (`REFLEX_DISABLED=1`) → same silent exit.
- **Hard rule, any configuration: reflex never allows outside auto mode.** `REFLEX_ALL_MODES=1` extends ask/deny gating to other modes; `bypassPermissions` is always excluded. With no prompts beneath the gate, a deny there would make reflex the sole authority.

## Providers

Same specs/cycle/failover registry shape as the session-summary gate: presets
merge per-field with `REFLEX_SPEC_<NAME>_JSON` overrides; providers are tried
in `REFLEX_PROVIDERS` order; a provider is *active* when keyless or its env
var is set; 3 consecutive failures disable it (default) until the recovery
cooldown (`REFLEX_RECOVERY_MS`) elapses, then one retry decides again.

| Name | Endpoint | Model | Key env var |
|------|----------|-------|-------------|
| `liquid` | `api.liquid.ai/decisions/v1/systemone` | `d1.1` | `LIQUID_API_KEY` |
| `typesafe` | `api.typesafe.ai/v1/systemone` | `jev-latest` | `TYPESAFE_API_KEY` |

Any System One-compatible endpoint works as a custom spec, for example Vercel AI
Gateway's TypeSafe surface (`ai-gateway.vercel.sh/typesafe/v1/systemone`,
model `typesafe-ai/jev`, paid tiers) or OpenRouter's decision surfaces:

```bash
export REFLEX_PROVIDERS="liquid,typesafe,gateway"
export REFLEX_SPEC_GATEWAY_JSON='{"type":"systemone","url":"https://ai-gateway.vercel.sh/typesafe/v1/systemone","model":"typesafe-ai/jev","apiKeyEnv":"AI_GATEWAY_API_KEY"}'
```

A keyless spec with a localhost URL is the zero-cost, zero-egress tier, for
example Ollama serving a decision model. Note the Ollama path speaks `chat`,
which reflex does **not** implement: its YES/NO → 0.9/0.1 mapping is too
coarse for safety decisions. Use a System One-compatible local endpoint
instead.

## Install

```bash
# in a session with the vibekit marketplace registered
/plugin install reflex@vibekit
```

Then set one provider key (`LIQUID_API_KEY` or `TYPESAFE_API_KEY`) and start a
new session. Verify with the log:

```bash
tail -f ~/.local/share/reflex/verdicts.jsonl
```

## Environment reference

| Variable | Default | Meaning |
|---|---|---|
| `REFLEX_PROVIDERS` | `typesafe,liquid` | Provider cycle order |
| `REFLEX_SPEC_<N>_JSON` | – | Per-provider spec override (merged over preset) |
| `REFLEX_THRESHOLD_DENY` | `0.85` | Max risk p ≥ → deny |
| `REFLEX_THRESHOLD_ASK` | `0.55` | Max risk p ≥ → ask; all p ≤ 1−ask → allow |
| `REFLEX_CONFIG` | `~/.claude/reflex-config.json` | Config file path (persistent thresholds + `disabledClasses`; see Config file below) |
| `REFLEX_TIMEOUT_MS` | `3000` | Per-provider timeout (kept tight: hooks stall tool calls) |
| `REFLEX_MAX_FAILURES` | `3` | Consecutive failures → provider disabled |
| `REFLEX_RECOVERY_MS` | `1800000` | Disabled-provider cooldown before a retry (30 min) |
| `REFLEX_LOG` | `~/.local/share/reflex/verdicts.jsonl` | Verdict log (one JSON per line); `off` disables logging (the gate still decides) |
| `REFLEX_COST_PER_MTOK` | `0.042` | $/M input tokens for `/reflex:tune` cost stats (output free) |
| `REFLEX_ALL_MODES` | – | `1` = also gate non-auto modes (ask/deny only; reflex never allows outside auto; `bypassPermissions` always excluded) |
| `REFLEX_DISABLED` | – | `1` = kill switch (silent exit) |

## Config file

Env vars configure a session; `~/.claude/reflex-config.json` (relocatable
via `REFLEX_CONFIG`) persists your choices across sessions. All keys
optional, unknown keys ignored:

```json
{
  "version": 1,
  "thresholds": { "deny": 0.85, "ask": 0.55 },
  "disabledClasses": [".env file"]
}
```

Precedence: env var > config file > built-in defaults, so settings.json
`env` blocks and test harnesses stay authoritative. An env value beats the
config whenever it is numeric at all — `REFLEX_THRESHOLD_DENY=0.9` wins over
the file's `0.85`; empty or non-numeric falls through to the config. A
malformed config file is ignored whole and the gate stays silent about it
(hooks never print); `reflex-status --check` is what surfaces the error as
a trip.

`disabledClasses` entries match pattern labels by exact string — the same
labels `/reflex:status` already prints as top pattern labels — and remove
the class from its list whole.

> **Warning: disabling a class is a deliberate loosening of the gate.** A
> disabled secrets class no longer preempts the read-only allow — with
> `".env file"` disabled, plain `cat .env` is allowed with no human in the
> loop. Deny classes are disable-able too: a command that would hard-match
> a deny regex stops being refused. Disable only a class you have decided
> to live without, on evidence.

The intended workflow: take the label from `/reflex:status`, decide from
`/reflex:tune`'s evidence, then edit the file by hand — or let
`/reflex:tune` write the disable after you choose it (next section).

## What the model sees (injection discipline)

The command text (≤2,000 chars) and the working directory, nothing else.
(The working directory is home-abbreviated: `$HOME` → `~`, so the username
never egresses to the provider.)
No tool output, no assistant prose, no file contents: hostile content in a
tool result cannot reach the decision model through reflex, mirroring Claude
Code's own classifier-request hygiene and the session-summary gate's digest
rules.

## Measurement

Each verdict, whether fast-path or model and including provider errors, is
one JSON line in `REFLEX_LOG`. Since 0.1.5 each verdict also carries the hook's
`tool_use_id`/`session_id`/`transcript_path`, which is what makes outcome
labeling possible: the post-hoc correlator
(`evals/reflex/correlate-outcomes.mjs` in the vibekit repo) joins verdicts
to session transcripts and appends `kind:"outcome"` lines: `agreed`
(the tool's fate matched the verdict), `overridden` (reality contradicted
it), `no-match` (no transcript answer, ESC interrupt, ambiguous duplicate).
It is idempotent, read-only over transcripts, and deliberately outside the
gate process (zero hot-path latency, no new failure mode). The log's
`cwd` and `transcript_path` fields are home-abbreviated like the provider
prompt (`$HOME` → `~`), so shared logs carry no username; the correlator
expands `~` before matching (basename fallback covers older absolute
paths). Since 0.2.2, model-chain verdicts also carry the provider's
`input_tokens`/`output_tokens` — exact local spend accounting at $0.042/M
input (output free; rate overridable via `REFLEX_COST_PER_MTOK`).
The one verbatim field is `command`, because eval replay needs the
exact text the gate decided on:

```bash
node evals/reflex/correlate-outcomes.mjs            # label + summarize
node evals/reflex/correlate-outcomes.mjs --dry-run  # summary only
```

Its summary prints the override rate per decision and per pattern class.
If humans approve most asks, ask patterns are over-fitted and train
habituation; that number is the input to threshold tuning. Outcome lines
also carry `resultTs` (the answering record's timestamp) whenever the
correlator could stamp it, so `resultTs − verdictTs` is the ask approval
latency — and sub-second approvals are the rubber-stamp signature the
tuner flags. Outcome labels
accumulate only while 0.1.5+ is running (pre-0.1.5 verdict lines carry no
ids and are skipped). The correlator ships with the gate; XavierJev's
lesson is that the wiring is the easy part.

## Status

`/reflex:status` (or the reader directly) prints a paste-safe health and
metrics report, labels and counts only, never command text:

```bash
node plugins/reflex/scripts/reflex-status.mjs             # last 7 days
node plugins/reflex/scripts/reflex-status.mjs --since 30  # custom window
node plugins/reflex/scripts/reflex-status.mjs --since all # everything
```

It reports gate health (kill switch, provider failstate with cooldowns,
log permissions, 0600/0700 by construction, wider is flagged), windowed
metrics (decision counts, ask rate, fast-path/model split, hook and
provider latency percentiles, top pattern labels), outcome-label tallies
with the ask override rate, and version drift: the running gate's vintage
is inferred from the newest verdict line's field shape (`mode` since 0.1.3,
`~`-cwd since 0.1.6) and compared against the installed manifest, because
hooks pin at session start and lag plugin updates. Always exits 0.

`--check` is the scriptable trip-detector — the deliberate exception to the
always-exit-0 report above (a health report that fails is worse than one
that reports the failure):

```bash
node plugins/reflex/scripts/reflex-status.mjs --check
```

Healthy is silent stdout + exit 0. Anything that needs attention prints one
line and exits 1, so cron and CI can compose on the exit code. Trips:

- **deny overridden** — the headline: a refused command ran anyway; the
  hard boundary has been crossed
- kill switch on (`REFLEX_DISABLED=1`)
- verdict log PERMS WIDE (wider than 0600)
- a provider in active failstate
- running-gate drift vs the installed manifest
- config unusable (defaults in effect)

Deliberate accounting states are INFO, never trips: `REFLEX_LOG=off` is
INFO with exit 0 — accounting dark by your own choice, but the
deny-override watch is blind without the log.

## Tuning: `/reflex:tune`

The command runs `scripts/reflex-tune.mjs`, which aggregates the verdict
log into a per-class table — asks, distinct sessions, override rate
(conditional on outcome labels: unlabeled asks are missing data, not
consent), approval latency where `resultTs` exists, token cost at
`REFLEX_COST_PER_MTOK` — and flags prune candidates:

- override rate ≥ 90% across ≥ 5 distinct sessions and ≥ 10 asks — the
  pattern almost never changes the outcome;
- approval p95 < 1000 ms over ≥ 5 labeled asks — approved faster than a
  human could read it, the rubber-stamp signature.

Nothing changes until you choose: the command asks which candidate to act
on, and only your explicit choice writes. A disable lands in
`disabledClasses` in the config file and appends a `kind:"tuning"` audit
line to the verdict log, so the loosening keeps its own accounting. Under
`REFLEX_LOG=off` the command reports log-off and stops — there is nothing
to tune on — and `--record` is refused outright: an audit line written
nowhere is theater.

## Thresholds are defaults, not truths

`0.85 / 0.55` are starting points calibrated to nothing. Tune them against
your own traffic: raise `ask` if reflex asks too often on your routine
commands; raise `deny` if you see false denies in the log. The ladder is
deliberately conservative between thresholds, so the middle band is always
`ask`. Env vars change a session; write `thresholds` to the config file
(see Config file above) to persist them. For the prune decision — which
ask patterns to retire outright — run `/reflex:tune` and let the override
rates decide.

## Credits & lineage

- Provider protocol: [TypeSafe](https://docs.typesafe.ai) System One
  (`jev`), [Liquid AI](https://docs.liquid.ai) `d1`; both speak the same
  wire contract, and Vercel AI Gateway proxies it too.
- Pattern: adapted from
  [shrwnsan/pi-agent](https://github.com/shrwnsan/pi-agent)
  `extensions/session-summary/decision-gate.ts` (MIT): provider registry,
  cycle/failover, state-assembly discipline. Inverted for safety.
- Prior art that shaped the guardrails:
  [XavierJev](https://github.com/liu-x27/XavierJev) (measure, keep the regex
  wins), [jev-usecases](https://github.com/kenhuangus/jev-usecases)
  (action-band ladders).

## License

Apache-2.0 (vibekit). The adapted decision-gate pattern originates from MIT-
licensed code by the same author.
