# reflex

**Pre-classifier permission gate for Claude Code auto mode.**

A `PreToolUse` hook that decides shell commands *before* Claude Code's
auto-mode classifier sees them, using System One decision models — typed
probabilities (noul) from a dedicated decision-model API, not a chat model's
prose. Fast, cheap, and composable with whatever provider you already have a
key for.

```
Bash call → reflex
  ├─ names secrets/key material → ASK    (local regex — read-only ≠ safe)
  ├─ read-only regex          → ALLOW            (local, zero latency)
  ├─ unambiguous destruction  → DENY             (local regex — "places a regex beats the model")
  ├─ risky-but-contextual     → ASK              (local regex)
  └─ everything else          → decision-model chain (noul ×3: destructive,
                                                     exfiltration, prod/shared infra)
        ├─ max p ≥ deny threshold        → DENY
        ├─ max p ≥ ask threshold         → ASK
        ├─ all p ≤ (1 − ask threshold)   → ALLOW (confidently safe)
        └─ anywhere in between           → ASK
```

## The failure posture (the whole point)

Reflex is a **safety gate**, not a cost-saver — the inversion of
[pi-agent's session-summary decision gate](https://github.com/shrwnsan/pi-agent),
which "can only save a call, never block one". Reflex can only *sharpen* a
decision, never loosen one:

- **Uncertain probabilities** → `ask` (a human), never silent-allow.
- **Any permission mode other than auto mode** → **silent exit**. In manual
  modes a reflex `allow` would bypass the human prompt and a reflex `deny`
  would take the decision from the human — both loosen the default flow,
  so reflex gates nothing there.
- **A command naming secrets or key material** (`.env`, `*.pem`, `id_rsa`,
  …) → `ask` before the read-only fast path: a read-only allow must never
  preempt the classifier's secrets review.
- **Provider error, timeout, malformed response, chain exhausted** → **silent
  exit**: no hook output means Claude Code's normal flow — allow rules, then
  the auto-mode classifier — handles the call untouched.
- **Plugin disabled or kill-switched** (`REFLEX_DISABLED=1`) → same silent exit.
- **Hard rule, any configuration: reflex never allows outside auto mode.** `REFLEX_ALL_MODES=1` extends ask/deny gating to other modes; `bypassPermissions` is always excluded — with no prompts beneath the gate, a deny there would make reflex the sole authority.

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

Any System One-compatible endpoint works as a custom spec — e.g. Vercel AI
Gateway's TypeSafe surface (`ai-gateway.vercel.sh/typesafe/v1/systemone`,
model `typesafe-ai/jev`, paid tiers) or OpenRouter's decision surfaces:

```bash
export REFLEX_PROVIDERS="liquid,typesafe,gateway"
export REFLEX_SPEC_GATEWAY_JSON='{"type":"systemone","url":"https://ai-gateway.vercel.sh/typesafe/v1/systemone","model":"typesafe-ai/jev","apiKeyEnv":"AI_GATEWAY_API_KEY"}'
```

A keyless spec with a localhost URL is the zero-cost, zero-egress tier (e.g.
Ollama serving a decision model — note the Ollama path speaks `chat`, which
reflex does **not** implement: its YES/NO → 0.9/0.1 mapping is too coarse for
safety decisions. Use a System One-compatible local endpoint instead).

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
| `REFLEX_TIMEOUT_MS` | `3000` | Per-provider timeout (kept tight: hooks stall tool calls) |
| `REFLEX_MAX_FAILURES` | `3` | Consecutive failures → provider disabled |
| `REFLEX_RECOVERY_MS` | `1800000` | Disabled-provider cooldown before a retry (30 min) |
| `REFLEX_LOG` | `~/.local/share/reflex/verdicts.jsonl` | Verdict log (one JSON per line) |
| `REFLEX_ALL_MODES` | – | `1` = also gate non-auto modes (ask/deny only — reflex never allows outside auto; `bypassPermissions` always excluded) |
| `REFLEX_DISABLED` | – | `1` = kill switch (silent exit) |

## What the model sees (injection discipline)

The command text (≤2,000 chars) and the working directory — nothing else.
No tool output, no assistant prose, no file contents: hostile content in a
tool result cannot reach the decision model through reflex, mirroring Claude
Code's own classifier-request hygiene and the session-summary gate's digest
rules.

## Measurement

Every verdict — fast-path and model, provider errors included — is one JSON
line in `REFLEX_LOG`. The eval harness (`evals/reflex/` in the vibekit repo)
consumes the same format, so labelled sets for threshold tuning accumulate
from real traffic instead of from guesses. Ship the harness, not just the
gate (XavierJev's lesson: the wiring is the easy part).

## Thresholds are defaults, not truths

`0.85 / 0.55` are starting points calibrated to nothing. Tune them against
your own traffic: raise `ask` if reflex asks too often on your routine
commands; raise `deny` if you see false denies in the log. The ladder is
deliberately conservative between thresholds — the middle band is always
`ask`.

## Credits & lineage

- Provider protocol: [TypeSafe](https://docs.typesafe.ai) System One
  (`jev`), [Liquid AI](https://docs.liquid.ai) `d1` — both speak the same
  wire contract; Vercel AI Gateway proxies it too.
- Pattern: adapted from
  [shrwnsan/pi-agent](https://github.com/shrwnsan/pi-agent)
  `extensions/session-summary/decision-gate.ts` (MIT) — provider registry,
  cycle/failover, state-assembly discipline. Inverted for safety.
- Prior art that shaped the guardrails:
  [XavierJev](https://github.com/liu-x27/XavierJev) (measure, keep the regex
  wins), [jev-usecases](https://github.com/kenhuangus/jev-usecases)
  (action-band ladders).

## License

Apache-2.0 (vibekit). The adapted decision-gate pattern originates from MIT-
licensed code by the same author.
