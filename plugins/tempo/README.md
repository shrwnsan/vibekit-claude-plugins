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

## Measured: tempo vs superpowers vs bare

Same golden task set ([evals/ceremony](../../evals/ceremony/README.md)), same
headless protocol, same GLM backend, hidden tests only. Baselines are medians
of n=4–7 runs ([tasks-005](../../docs/plans/tasks-005-tempo-ceremony-eval-harness.md));
tempo is the first MVP smoke (n=1 per task) — directional signal, not a
release gate:

| Tier | bare | superpowers | tempo (smoke) |
|---|---|---|---|
| **0** trivial | 16 turns · 21.3k tok · 46s | 24 turns · 26.4k tok · 69s | **9–13 turns · 14.6–23.8k tok · 12–16s** |
| **1** standard | 16.5 turns · 19.1k tok · 82s | 29 turns · 51k tok · 199s | **18–22 turns · 21–23.8k tok · 42–44s** |
| **2** heavy | 28 turns · 51.4k tok · 397s | 40.5 turns · 60.9k tok · 308s | **24–49 turns · 33.1–35.4k tok · 67–223s** |

- **Correctness**: hidden tests passed in 33/33 baseline runs and 6/6 tempo
  runs. On this task set, process cost bought no measurable correctness — the
  kept disciplines (TDD, systematic debugging, verify gate) are insurance, not
  a measured defect-rate win.
- **The process-flat tax**: superpowers costs 1.2–2.7× tokens and 1.45–1.8×
  turns over bare at every tier — the overhead tempo removes is real and
  tier-independent.
- **tempo's through-line**: tier 0 at/below the bare floor; tier 1 at bare
  cost with the safety net (44% of superpowers' tokens); tier 2 at 0.67× bare
  tokens with the plan file and review gate included — turns rise where the
  ceremony pays (49 on the refactor task), tokens don't.
- **Caveats**: n=1 tempo vs n≥4 baselines; CLI drift (2.1.292 → 2.1.308);
  same-task variance is large on this backend. Release gates (prd-010 §6)
  need n≥3 medians and a re-based bare row.

superpowers (external) is the maximal-process complement — tempo is the lean
alternative, not a fork. Protocol, golden tasks, and full results:
[tasks-005](../../docs/plans/tasks-005-tempo-ceremony-eval-harness.md).

License: Apache-2.0.
