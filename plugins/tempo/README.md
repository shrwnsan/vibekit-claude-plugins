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
Baseline numbers are medians over 4–7 runs per cell; tempo numbers are a first
smoke with one run per task, so read them as directional.

| Tier | bare | superpowers | tempo (smoke) |
|---|---|---|---|
| **0** trivial | 16 turns · 21.3k tok · 46s | 24 turns · 26.4k tok · 69s | 9–13 turns · 14.6–23.8k tok · 12–16s |
| **1** standard | 16.5 turns · 19.1k tok · 82s | 29 turns · 51k tok · 199s | 18–22 turns · 21–23.8k tok · 42–44s |
| **2** risky | 28 turns · 51.4k tok · 397s | 40.5 turns · 60.9k tok · 308s | 24–49 turns · 33.1–35.4k tok · 67–223s |

Findings so far:

- Hidden tests passed in all 39 runs (33 baseline, 6 tempo). On this task set
  the extra process bought no measurable correctness; the disciplines tempo
  keeps (TDD, systematic debugging, verify gate) are insurance, not a measured
  defect-rate win.
- The process-heavy baseline paid 1.2–2.7× tokens and 1.45–1.8× turns over
  bare at every tier.
- tempo landed at or under the bare floor on tier 0, at bare cost with the
  safety net on tier 1 (44% of superpowers' tokens), and at 0.67× bare tokens
  on tier 2 including the plan file and review gate. Turns rise where ceremony
  pays (49 on the refactor task); tokens don't.
- Caveats: one run per task for tempo, a CLI version change mid-comparison,
  and high same-task variance on the test backend. Reruns with more samples
  are needed before treating any of this as a release gate.

License: Apache-2.0.
