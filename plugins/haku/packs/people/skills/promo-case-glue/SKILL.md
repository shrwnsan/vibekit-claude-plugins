---
name: promo-case-glue
description: Use when a glue-heavy engineer needs a promo packet framing it as technical leadership. Trigger phrases include "promotion case for glue work", "I do a lot of glue work how do I get promoted", "frame my non-code work for promotion", "my manager says I need more technical accomplishments", "I'm a glue person how do I get senior". Mode of `report-promo-case`.
---

# Promotion Case for Glue-Heavy Engineers

Build a promotion-ready case for engineers whose impact is glue work — coordination, documentation, unblocking — that rarely reads as technical.

Apply when: manager wants more technical accomplishments but time goes to unblocking and onboarding; biggest impacts are non-code; told "we don't see you as an engineer"; or the team would collapse without the glue but the committee doesn't count it.

Skip when: clear code/design/production impact (use `report-promo-case` directly); management/TPM track; or the ladder excludes glue from senior IC criteria — change the perception or pivot.

**Prerequisite:** run `glue-audit` first — the case builds on its glue inventory.

## The interview flow

### 1. Ladder context
Ask target level (Senior/Staff/Principal) and whether they have the ladder. Typical dimensions: Technical Fluency, Delivery, Architecture, Leadership, Mentorship, Business Impact, Cross-functional Influence. Map glue onto these.

### 2. Glue inventory review
Read the latest `glue-audit` file; confirm top 5–7 tasks by impact and time. Per task: the *outcome*, what broke without it, who benefited, metrics moved, artifacts.

### 3. Reframe glue as technical leadership
Glue work is *already* technical leadership — it needs translating.

| Glue task | Technical leadership frame |
|---|---|
| Onboarding | Ramp N→M weeks; onboarding system; 3 mentored to first ship |
| Documentation (ADRs, runbooks) | Knowledge capture; lower bus factor |
| Design review | Architecture gate; prevented a P0 |
| Unblocking | Cross-team orchestration; killed a 3-week bottleneck |
| Process improvement | Rollbacks down X%; faster reviews |
| Cross-team alignment | Integration ownership; no duplicate work |
| Mentorship | Capability building; retention; multiplied output |
| Incident coordination | Reliability ownership; blameless postmortem |
| Hiring interviewer | Calibration; fewer false negatives |

Write: *"Not 'just documentation' — system design clarity that prevented divergent implementations."*

### 4. Artifact mining
Per item, collect: design docs, onboarding docs, alignment threads, postmortems citing them; metrics (ramp time, review cycles, rollback rate); testimonials (Slack quotes). Build an "Artifacts" section.

### 5. Narrative construction — three acts
1. **The problem:** gaps in [onboarding, design quality, alignment] caused [slow ramp, rework, incidents].
2. **The intervention:** glue tasks framed as *owning* the problem, with the technical decisions made.
3. **The outcome:** quantified results — done *as an engineer* through technical leadership, not project management.

### 6. Pre-bunk the "not technical enough" objection
- *"Impact isn't technical enough"* → "[N] hours of wasted engineering prevented, [metric] moved X% — outcomes at the coordination layer."
- *"Not enough code"* → "I improved the conditions under which code gets written; ladders value impact."
- *"This is project management"* → "PMs coordinate timelines; I solved technical problems — designed onboarding, set standards, caught gaps."

Write these into "Q&A prep" verbatim.

### 7. Manager advocacy guide
For the user's manager: calibration emphasis, artifacts to surface, how to answer "was this promotable?", defusing "soft skills", and the ask: "Tell the committee: X's glue work is why Y happened."

## Output structure

Write to `~/haku-work-reflections/promo-cases/<level>-glue-<name>-<date>.md`:

```markdown
---
candidate: [name]
target_level: Senior | Staff | Principal
period: [date range]
summary: "[one-sentence impact claim]"
---

# Promotion Case: [Name] — [Target Level]
## TL;DR
[Dimensions evaluated, glue as vehicle, headline numbers.]

## Evidence by ladder dimension
Per dimension: **Task**, **What I did**, **Outcome** (quantified), **Artifacts**, **Why senior**.

## Quantitative summary
[Hours/week on glue; attributable outcomes; visibility.]

## Artifacts collected
[List with paths or descriptions]

## The glue narrative
[150 words: "My technical contribution is making the team effective…"]

## Q&A prep
[The three objection/response pairs from step 6.]

## Manager guidance
[Calibration language, artifacts, the direct ask.]

## Risks & mitigations
[Still "not technical enough" → Plan B: rebalance glue vs. core
(`boundary-negotiation`), but try this narrative first.]
```

## Operating principles

- **Frame glue as technical leadership, not "soft skills."** *Coordination* not *communication*; *system design* not *documentation*; *quality gate* not *code review*.
- **Visibility is half the battle.** No artifacts → start collecting for next cycle.
- **Don't invent impact** — the story is stronger honest.
- **Target the ladder's rubric language**, not vague "seniority."
- **Allow honest "not promotable here" conclusions** — if the company doesn't value glue at IC level, help the user see that.

## Composition with other skills

- **`glue-audit`** — prerequisite; consumes its output.
- **`report-promo-case`** — parent; route or compose.
- **`user-profile`** — level and company context.
- **`wins-log`** — log glue wins; cross-reference.
- **`boundary-negotiation`** — Plan B if the user wants to reduce glue.

## Anti-patterns to flag

- **"I helped a lot"** — too vague; force outcomes and artifacts.
- **Sole credit for shared glue** — acknowledge collaborators.
- **Tasks without technical framing** — "I onboarded Bob" → "I cut ramp from 6 weeks to 3."
- **Ignoring the actual ladder** — if it demands production code, say so.
- **Waiting for promo season to collect artifacts.**
