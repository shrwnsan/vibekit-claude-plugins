# tempo

Safety-proportional process for agentic SDLC. Trivial changes skip ceremony;
risky changes earn it. Spec: [prd-010](../../docs/plans/prd-010-lean-sdlc-plugin.md).

## Why

Process-heavy plugins tax every task equally: session-start lectures, skill
cascades, plan-file round-trips — the same overhead for a typo fix and an auth
refactor. Measured on the [ceremony-cost harness](../../evals/ceremony/README.md),
the reference process-heavy plugin costs **1.2–2.7× tokens and 1.45–1.8× turns**
versus bare Claude Code at identical correctness (33/33 hidden tests, both
conditions, all tiers).

tempo keeps the safety, drops the flat tax.

## How it works

A ~10-line routing table injected once per session. Every task gets a tier:

| Tier | Task | Process |
|---|---|---|
| **0** | Trivial/obvious (typo, copy tweak, one-liner) | Do it now, verify, done. Load nothing. |
| **1** | Standard change | One-line plan note, test-first, single agent. |
| **2** | Architectural / risky / ambiguous | Short plan file → build → review gate → verify gate. |

Hard rules, no judgment calls:

- **Auto-promotion** — the same approach failing twice (tests, edit-revert,
  repeated debugging) promotes the task one tier automatically. A second
  failure at tier 2 stops for a human instead of a third attempt.
- **Verify before done, every tier** — run the checks, quote the evidence.
  Never claim done from inspection ("should work" is a failure state).
- **TDD and systematic debugging at tier ≥ 1** — the highest safety-per-token
  disciplines, kept exactly where they pay.

## Skills

| Skill | Loads when | Size |
|---|---|---|
| `tempo:triage` | a task's risk is unclear, or after a failed attempt | ~45 lines |
| `tempo:tier-0` | rarely — the routing table already covers tier 0 | ~25 lines |
| `tempo:tier-1` | standard changes | ~40 lines |
| `tempo:tier-2` | heavy changes | ~50 lines |

Design constraints (the anti-patterns being avoided): every skill ≤ ~100 lines,
static content only, no skill-to-skill cascades, no mid-conversation process
re-injection, session hook emits a routing table rather than a philosophy
lecture. Dynamic context (git state, test output) stays in tool calls and the
prompt tail, never the conversation middle — the prompt prefix stays
cache-stable.

## Install

```
claude plugin install https://github.com/shrwnsan/vibekit-claude-plugins
```

No configuration. No API keys. A decision-model triage layer (calibrated
tier/probability calls, Jev-compatible providers) is planned but not required —
see prd-010 §3.3.

## Usage

Nothing to invoke for the common case: triage happens per task, tier 0 usually
loads nothing at all. When you want it explicit:

- `/tempo:triage` — classify the current task
- `/tempo:tier-2` — force the heavy flow

## Relationship to other plugins

- **base** — keeps commit/branch/handoff mechanics; tempo adds no mechanics.
- **haku** — keeps decide → spec → evidence judgment; tempo adds no judgment.
- **superpowers** (external) — pairs fine if you want maximal process; tempo is
  the lean alternative, not a fork.

## Measurement

Release gates are numbers, not feel — [evals/ceremony](../../evals/ceremony/README.md)
runs the golden task set under `bare` / `superpowers` / `tempo` conditions and
compares tokens, turns, wall-clock, and hidden-test correctness. Baselines and
targets: [tasks-005](../../docs/plans/tasks-005-tempo-ceremony-eval-harness.md).

License: Apache-2.0.
