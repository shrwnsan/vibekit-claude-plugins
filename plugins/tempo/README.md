# tempo

Safety-proportional process for agentic SDLC. Trivial changes skip ceremony;
risky changes earn it. Spec: [prd-010](../../docs/plans/prd-010-lean-sdlc-plugin.md).

## Results at a glance

Measured on a fixed benchmark harness, medians of 3 runs per task, every task
passed hidden verification:

- **Risky changes (tier 2)**: cheaper than no process at all — 34% fewer
  tokens than bare Claude Code, with the plan file and review gate included.
- **Trivial changes (tier 0)**: about as fast as bare — fewer turns and
  faster wall-clock; a small token overhead from the routing table shows only
  on the very shortest tasks.
- **Standard changes (tier 1)**: the safety net is visible in the bill.
  Test-first plus full verification costs about 1.9× bare, which is still
  roughly 38% cheaper than the process-heavy reference plugin.
- **Every task, every run**: hidden tests passed 75 of 75 times. The
  disciplines are insurance, and tempo publishes the bill so you can judge.

Full tables and caveats: [Benchmarks](#benchmarks).

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
| `tempo:risk-triage` | a task's risk is unclear, or after a failed attempt | ~45 lines |
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

- `/tempo:risk-triage` classify the current task
- `/tempo:tier-2-risky` force the risky flow

## Relationship to other plugins

- **base** keeps commit, branch, and handoff mechanics; tempo adds none.
- **haku** keeps the decide-spec-evidence judgment layer; tempo adds none.
- **superpowers** (external) remains a fine choice for maximal process. tempo
  is a lean alternative, not a fork.

## Standards

Ships with dual manifests: a Claude Code plugin (`.claude-plugin/plugin.json`)
and an [Agent Plugins](https://agent-plugins.org/) v1.0.0 package
(`plugin.json`). The skills conform to the [Agent Skills
specification](https://agentskills.io/). CI checks the two manifests stay in
sync. The session-start hook is Claude Code-specific and intentionally not
part of the portable package; portable clients get tempo as skills-only.

## Other clients

The four skills are plain Agent Skills, so clients that read that format can
use them without tempo's Claude Code packaging:

- **Pi**: copy or symlink the `skills/*` directories to `~/.agents/skills/`
- **Amp**: `~/.config/agents/skills/` (user-level) or `.agents/skills/` in
  the workspace

In these clients the skills appear under their bare names (`risk-triage`,
`tier-1-standard`, ...), not `tempo:*`. Two things stay Claude Code-only: the
session-start routing table (the automatic triage nudge) and the `/tempo:*`
commands. Without the nudge, load `risk-triage` when a task starts; the tier flows
carry their own rules from there.

Pi trust note: project-scoped skills (`.agents/skills/` in the workspace) are
listed but their content will not load until you trust the folder; user-level
placement (`~/.agents/skills/`) has no trust gate. Verified live: with
user-level placement, pi routes a slugify task to `tier-1-standard` by
description and applies triage content to rate an auth one-liner as tier 2.

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
