# tempo

Safety-proportional process for agentic SDLC. Trivial changes skip ceremony;
risky changes earn it. Spec: [prd-010](../../docs/plans/prd-010-lean-sdlc-plugin.md).

## Why

Process-heavy plugins tax every task equally. A session-start lecture, a skill
cascade, and plan-file round-trips cost the same on a typo fix as on an auth
refactor. In headless benchmarks against bare Claude Code, a reference
process-heavy plugin (superpowers) spent 1.2–2.7× more tokens and 1.45–1.8×
more turns at identical correctness, on every tier of task
([harness](../../evals/ceremony/README.md), numbers below).

tempo keeps the safety disciplines and drops the flat tax.

## How it works

A short routing table (about 10 lines) is injected once per session. Each task
gets a tier:

| Tier | Task | Process |
|---|---|---|
| **0** trivial | Typo, copy tweak, obvious one-liner | Do it now, verify, done. No skills load. |
| **1** standard | Normal feature or fix | One-line plan note, test-first, single agent. |
| **2** risky | Architectural, ambiguous, security, cross-module | Short plan file, build, review gate, verify gate. |

Three rules hold at every tier:

- **Auto-promotion.** The same approach failing twice (tests, edit-revert
  cycles, repeated debugging) promotes the task one tier. A second failure at
  tier 2 stops for a human instead of a third attempt.
- **Verify before done.** Run the checks and quote the evidence. "Should work"
  is a failure state.
- **Test-first and systematic debugging from tier 1 up.** These disciplines
  apply only where they earn their cost.

## Skills

| Skill | Loads when | Size |
|---|---|---|
| `tempo:triage` | a task's risk is unclear, or after a failed attempt | ~45 lines |
| `tempo:tier-0-trivial` | rarely; the routing table already covers tier 0 | ~25 lines |
| `tempo:tier-1-standard` | standard changes | ~40 lines |
| `tempo:tier-2-risky` | risky changes | ~50 lines |

Design constraints: every skill stays under ~100 lines, all content is static,
skills don't cascade, and nothing re-injects process text mid-conversation.
Dynamic context (git state, test output) stays in tool calls and the prompt
tail, so the prompt prefix remains cache-stable.

## Install

```bash
claude plugin install https://github.com/shrwnsan/vibekit-claude-plugins
```

No configuration, no API keys. A decision-model triage layer (calibrated tier
probabilities from a Jev-compatible provider) is planned but not required; see
prd-010 §3.3.

## Usage

The common case needs no invocation: triage happens per task, and tier 0
usually loads nothing at all. To be explicit:

- `/tempo:triage` classify the current task
- `/tempo:tier-2-risky` force the risky flow

## Relationship to other plugins

- **base** keeps commit, branch, and handoff mechanics; tempo adds none.
- **haku** keeps the decide-spec-evidence judgment layer; tempo adds none.
- **superpowers** (external) remains a fine choice for maximal process. tempo
  is a lean alternative, not a fork.

## Benchmarks

One golden task set, one headless protocol, hidden tests only
([harness](../../evals/ceremony/README.md); protocol and full results in
[tasks-005](../../docs/plans/tasks-005-tempo-ceremony-eval-harness.md)).
Current table: 3 runs per task per condition, medians, bare re-based on the
same CLI as tempo. The superpowers column is the October baseline (older CLI);
median-of-3 with high same-task variance, so read deltas, not decimals.

| Tier | bare | superpowers | tempo |
|---|---|---|---|
| **0** trivial | 16.5 turns · 16.2k tok · 37s | 24 turns · 26.4k tok · 69s | 16 turns · 24.8k tok · 30s |
| **1** standard | 17 turns · 16.6k tok · 81s | 29 turns · 51k tok · 199s | 25.5 turns · 31.6k tok · 106s |
| **2** risky | 24.5 turns · 44.1k tok · 196s | 40.5 turns · 60.9k tok · 308s | 25 turns · 29.1k tok · 189s |

- **Safety**: hidden tests passed in every run ever recorded (33 baseline,
  6 smoke, 36 rerun = 75/75). The disciplines tempo keeps are insurance, not
  a measured defect-rate win.
- **Tier 2 is the clean result**: 0.66× bare tokens with parity turns and
  wall-clock. The plan file and review gate paid for themselves.
- **Tier 0 holds the floor on time**: turns and wall-clock at or under bare;
  tokens run ~1.5× bare because the hook table plus skill registry are fixed
  overhead, visible only on the shortest tasks.
- **Tier 1 is the honest cost**: between bare and superpowers. About 62% of
  superpowers' tokens, but ~1.9× bare's. Session forensics show the cost is
  behavioral — the test-first, plan-note, and full-verify disciplines are what
  bare skips — not skill-content overhead.
- **Caveats**: n=3 per task, high same-task variance on this backend, and the
  superpowers column predates the current CLI.

License: Apache-2.0.
