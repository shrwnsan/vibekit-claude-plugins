# prd-010: Lean SDLC Plugin (`tempo`)

**Tagline:** safety-proportional process for agentic SDLC
**Status:** Draft
**Date:** 2026-10-15
**Author:** shrwnsan, drafted with Claude Code (GLM)

## 1. Problem

Agentic development pays a flat process tax regardless of task risk. The reference
case is the [superpowers](https://github.com/obra/superpowers) plugin (v5.1.0):

- **Session tax**: a ~117-line meta-skill injected into every session via SessionStart hook.
- **Skill cascade**: brainstorming → writing-plans → executing-plans → code-review →
  finishing-a-development-branch loads ~1,000+ lines of process prose before any code,
  and each mid-conversation injection busts the prompt cache (full-prefix re-read).
- **Process-flat TDD**: a 371-line rigid red-green-refactor skill applies equally to a
  CSS tweak and an auth refactor.
- **Default subagent fan-out**: each spawned agent re-reads context and re-loads skills.
- **Turn count = cost**: TodoWrite-per-checklist, plan-file round-trips, review checkpoints.
  The token bill is really a latency bill.

Net effect observed in daily use: slow iterations, high token burn, poor cache-hit ratio —
even for trivial changes.

## 2. Outcome wanted

Not "fewer tokens" (a proxy). The real outcomes:

| Outcome | Definition |
|---|---|
| Fast time-to-demo | Prompt → first test green / first demoable artifact, minimized |
| Low cost per change | Tokens per merged change; high prompt-cache hit ratio |
| No safety regression | Defect rate no worse than process-heavy baseline |

Design principle: **risk-tiered process with outcome gates, not step gates.**
Process is earned by task risk, not defaulted to.

## 3. Proposed solution: three layers

### 3.1 Risk-tiered SDLC loop (core)

One tiny triage step classifies each task; ceremony scales with tier:

| Tier | Definition | Process |
|---|---|---|
| **0** | Trivial/obvious (typo, one-line fix) | Just do it. Verify. Done. No skill loads. |
| **1** | Standard feature/change | Test-first. One plan note. Single-agent. |
| **2** | Architectural / risky / ambiguous | Full loop: brainstorm → plan file → subagents → review gate. |

Hard rules:

- **Auto-promotion**: any task that fails twice (test failures, edit-revert cycles,
  repeated debug attempts) promotes one tier automatically. No judgment call needed.
- **Kept disciplines** (highest safety-per-token from superpowers, retained verbatim in spirit):
  `verification-before-completion` (hard gate), `systematic-debugging` (tier ≥ 1),
  TDD for tier ≥ 1 only.
- **Small skills, no chains**: each skill ≤ ~100 lines, one-line pointer to the next phase.
  No 600-line skills, no flowcharts re-read every turn.

### 3.2 Cache-first architecture

- All skill content **static**; loaded once per session, never `!`-injected mid-conversation.
- Dynamic context (git state, test output) appended at prompt tail or into tool calls —
  never injected into the middle of conversation (note: base's `systematic-debugging`
  currently violates this and should be fixed under this effort).
- Session hook injects a **~20-line routing table**, not a philosophy lecture.

### 3.3 Optional decision-model layer (new category, the differentiator)

A **decision model** (see §5) takes a state + typed questions and returns calibrated
probabilities with **zero output tokens** — machine-speed, near-free judgment. Integrated
as an *optional* provider behind one interface; degrades to "main model self-triages" when
unconfigured (same philosophy as search-plus keyless fallback).

Integration points:

1. **Task triage** — classify tier 0/1/2 at intake and re-triage sub-tasks mid-flight.
   Cost drops to ~zero, so *everything* gets triaged, continuously.
2. **Skill/route selection** — "which skill applies?" as a Choice over the skill registry.
   Correct first-shot routing avoids wrong-path turns (the most expensive kind: full cache
   miss + wasted work).
3. **Checkpoint adjudication** — verification gate triage ("done or not?"), review triage
   ("mechanical / senior-review / human?"), flaky-vs-real test triage (Noul).
4. **Auto-promotion detector** — after each failed attempt, a Noul call: "escalate tier?"
   Threshold-configurable (e.g. p > 0.6 → promote).

Safety envelope: the decision model **proposes, never disposes**. Low-confidence or
novel-looking states fall through to the main model. Irreversible actions are never
gated by it alone. Every call logs state + probabilities (audit trail, and eval data).

## 4. Non-goals

- Not a commit/branch/handoff mechanics plugin — base keeps that layer.
- Not a leadership/judgment plugin — haku keeps decide → spec → evidence.
- Not a web/attention plugin — search-plus and ping unaffected.
- No enforcement-by-injection of long meta-content (the anti-pattern being fixed).

## 5. Background: the decision-model landscape (verified 2026-10-15)

Common contract across vendors: state (text/JSON) + typed questions → calibrated
probability per allowed answer; no free-form text; per-call costs ~fractions of a cent.
Primitives converge on: **Choice** (pick from set), **Noul** (yes/no), **Score** (ordered scale).

| Model | Vendor / date | Access | Notes |
|---|---|---|---|
| **Jev 1.13** | TypeSafe, 2026-09-15 | OpenRouter `typesafe/jev-1.13` | $0.042/M input, output free; 64K ctx; created the category ("System One") |
| **Jev Router** | TypeSafe, 2026-09-25 | OpenRouter | Picks best model + reasoning effort per request, 1M ctx — model/effort routing as a service; direct precedent for §3.3.1 |
| **Clef / Clef-flash** | Cloudflare, ~2026-10-01 | Workers AI + open weights (Apache 2.0) | **Jev-API compatible**; leader on Jev Decision Index at release; ~$0.15/M input; confidence-threshold routing is the idiomatic pattern |
| **d1** | Liquid AI, 2026-09-29 | Liquid API (`d1:free`) | Zero output tokens, single forward pass |
| **d1-3B / d1-omni-600M** | Liquid AI, 2026-10-07 | Open weights (Hugging Face) | 8 ms/question on RTX 4090; multimodal; free < $10M annual revenue |

Implications for this PRD:

- **Jev-API compatibility is the de-facto standard** (Clef adopted it) → target it as the
  provider interface; any of the four vendors (or a local open-weight Clef/d1 on the VPS)
  becomes a drop-in.
- Open-weight options make the "runs on your VPS, zero marginal cost" story real, which
  matters for a plugin that wants to triage *everything*.

Sources:
- [Liquid AI: Introducing d1](https://www.liquid.ai/blog/d1-decision-model)
- [Liquid AI: Open d1 edge models](https://www.liquid.ai/blog/d1-open)
- [MarkTechPost: Liquid AI d1](https://www.marktechpost.com/2026/09/29/liquid-ai-releases-d1-a-decision-model-that-returns-calibrated-probabilities-with-zero-output-tokens)
- [MarkTechPost: Open d1-3B / d1-omni-600M](https://www.marktechpost.com/2026/10/07/liquid-ai-releases-open-weight-d1-3b-and-d1-omni-600m-multimodal-decision-models-with-zero-output-tokens)
- [OpenRouter: Jev 1.13](https://openrouter.ai/typesafe/jev-1.13) and Jev docs/tutorial pages
- [Cloudflare: Introducing Clef](https://www.cloudflare.com/blog/) (Clef announcement, Oct 2026)
- [Superteams.ai: Decision Models Explained — Jev, Clef, System One wave](https://superteams.ai/blog)

## 6. Success metrics ("ceremony cost" evals)

Gate releases on measured numbers, not feel:

| Metric | Baseline (superpowers) | Target |
|---|---|---|
| Tokens, prompt → first code change (tier 0) | measure | ≤ 1.5× bare Claude Code |
| Tokens, prompt → verified done (tier 1) | measure | ≤ 60% of superpowers |
| Prompt-cache hit ratio per session | measure | ≥ 85% |
| Wall-clock, prompt → first test green (tier 1) | measure | ≥ 40% faster |
| Tier accuracy (vs. human-labeled golden set) | n/a | ≥ 95%; decision-model tier ≥ heuristic baseline |
| Defect escape rate | measure | ≤ superpowers baseline |

Eval harness: golden task set across tiers (reuse handoff-context eval-asset pattern from
base; routing-eval CI pattern from haku). Decision-model calls logged → weekly accuracy
vs. cost curve per provider.

## 7. MVP scope

1. Tiering router skill + 20-line session hook (no decision model required).
2. Tier-0/1/2 flow skills (small, static, unchained).
3. Ceremony-cost eval harness + golden task set.
4. Decision-model provider interface (Jev-compatible), one hosted provider configured
   via env var; graceful fallback to self-triage.
5. Auto-promotion rule (fail-twice) as the tier-2 escape hatch.

Later: local open-weight provider docs (Clef / d1-3B on VPS), mid-flight re-triage,
review-triage gates, model/effort routing integration with harness `/effort`.

## 8. Open questions

- Plugin name: resolved — `tempo` (see [research-012](../evals/research-012-naming-lean-sdlc-plugin.md)
  for the naming DD, adversarial review, and falsification criteria).
- How much of superpowers' rigor to keep in tier-2 — copy philosophy or vendor as
  "pairs with superpowers" (composability story)?
- Does decision-model triage run as a hook (PreToolUse/UserPromptSubmit) or inside the
  router skill? Hook = automatic but adds moving parts.
- Heuristic baseline first? (diff size, file count, test names) — may beat a model call
  for tier 0 detection; benchmark before committing.
- Privacy: sending code context (state) to hosted decision models — needs a
  redaction/summary step or an explicit opt-in; open-weight local provider sidesteps it.

## 9. Relationship to existing plugins

| Plugin | Relationship |
|---|---|
| base | Unchanged (mechanics layer). Fix its `!`-injection cache violations under this effort. |
| haku | Unchanged (judgment layer). Its routing-eval CI pattern is reused. |
| search-plus / ping | Unchanged. |
| superpowers | External complement: pairs well for users who want maximal process; this plugin is the lean alternative, not a fork. |
