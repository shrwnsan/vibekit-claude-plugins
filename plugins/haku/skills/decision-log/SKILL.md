---
name: decision-log
description: Use when the user makes or revisits a meaningful product, technical, or organizational decision and wants it captured ADR-style. Triggers: "we decided to…", "let's go with X over Y", "write up the call we made on…", or reconstructing a past decision. Especially AI-product decisions — model choice, eval threshold, fallback design — whose rationale is easy to lose.
---

# Decision Log

Capture decisions in a consistent, ADR-style (Architecture Decision Record) format so that three months from now, the user — or the next PM in the seat — can reconstruct *why*, not just *what*.

## When to apply this

Use this skill when the decision has any of these properties:

- **Costly to reverse.** Model choice, vendor commitment, schema migration, public API shape.
- **Likely to be re-litigated.** Anything where someone will ask "wait, why didn't we do X?" later.
- **Bound to a model or version.** AI decisions tied to a specific model (Sonnet 4.6, Opus 4.7, etc.) — these *will* be revisited at the next model migration, and the rationale must survive.
- **Made under uncertainty.** When you're picking with incomplete information; future-you needs to know what was unknown at the time.

Skip for: trivially reversible choices, daily execution decisions, anything captured well enough by a commit message or PR description.

## The format

Use this structure. Keep each section short — the whole thing should fit on one screen.

```markdown
# ADR-NNN: [Short, declarative title]

**Date:** YYYY-MM-DD
**Status:** Proposed | Accepted | Superseded by ADR-MMM | Deprecated
**Deciders:** [names/roles]
**Reversibility:** Easy | Moderate | Hard | One-way door

## Context
What is the situation that requires a decision? What constraints apply?
Two to four sentences. State only facts and constraints, not the choice yet.

## Options considered
- **Option A:** [name]. Pros: … Cons: …
- **Option B:** [name]. Pros: … Cons: …
- **Option C:** [name]. Pros: … Cons: …

(Always at least two options. "We had no choice" is rarely true and worth interrogating.)

## Decision
We chose **[Option X]**.

## Rationale
Why X, given the trade-offs. Be specific about which constraint or value tipped the call.
This is the section future-you will care about most.

## Consequences
- What this enables
- What this forecloses
- What we'll have to live with that isn't great

## Revisit triggers
Concrete events or thresholds that should prompt revisiting this decision.
Examples: "next model family release", "if eval drops below 0.85", "if request volume 10x's", "Q4 planning".
```

## AI-specific decisions: extra fields

For decisions about models, prompts, evals, or agent design, add:

- **Model & version:** Pin the exact model ID at decision time (e.g., `claude-sonnet-4-6`).
- **Eval state:** Score on the current golden set, and the eval version.
- **Cost/latency at decision time:** Per-request cost, p50/p95 latency.
- **Fallback path:** What happens when this choice fails? Named explicitly.

These fields are what make the decision survive a model upgrade. Without them, the next person re-derives the trade-off from scratch.

## Where to keep it

Recommend the user store ADRs in the repo, in a top-level `docs/decisions/` folder, numbered sequentially (`ADR-001-foo.md`, `ADR-002-bar.md`). They live next to the code, get reviewed in PRs, and survive re-orgs. A wiki tab is a graveyard.

## How to help the user

1. **Diagnose first.** Confirm the decision is worth logging (use the criteria above). If it's trivially reversible, say so and offer a one-liner instead.
2. **Probe for the missing options.** If the user presents only one option, push: "What were the alternatives? What did you reject and why?" Decisions with only one stated option usually have hidden ones.
3. **Push for revisit triggers.** Most users skip this section. It's the highest-leverage one.
4. **Write the ADR yourself** in the structure above, marked clearly as a draft. The user can sharpen it; don't make them assemble from a template.
5. **Suggest the filename.** Following the `ADR-NNN-short-title.md` convention. Look for existing ADRs in the repo to get the next number right.

## Anti-patterns to flag

- **"Decision: we'll figure it out later"** — this isn't a decision; convert to an open question with an owner and a deadline.
- **Rationale that's actually a restatement** — "We chose X because X is better" → push for the underlying value or constraint.
- **Missing reversibility classification** — affects how much rigor the decision deserves; don't let it slide.
- **Vague revisit triggers** — "when relevant" means never. Replace with a concrete event or metric.
