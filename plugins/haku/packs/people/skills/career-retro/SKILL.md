---
name: career-retro
description: Use for a quarterly/annual career retrospective across the haku memory; cited growth deltas vs. last retro, written to self/retros/. Trigger phrases include "run my career retro", "where am I in my career", "annual self-assessment", "how have I grown this year", "it's review season, take stock of everything". Distinct from wins-curate (audience-facing artifacts) and self-reflect (single entries).
---

# Career Retro

The payoff moment for a year of logging. Every other skill deposits into the memory — stakeholder reflections, wins, self-reflections, pulses. This skill withdraws the accumulated interest: it reads all of it at once and answers the question no single entry can: *who have I become, and is it who I meant to become?*

Its most important property is that **it writes its own output and reads the previous one.** The first retro is a snapshot; the second is a story, because it can say what changed.

## Distinguish the ask first

- *"I need my self-eval / promo packet"* → audience-facing artifact; hand off to `wins-curate` or `report-promo-case`. This skill can feed them, but is not the submission document.
- *"Let me reflect on how I handled last week"* → a single entry; that's `self-reflect`.
- *"Where am I in my career, honestly, across everything"* → **this skill.**

If the user wants both, run the retro first, then offer to spin the relevant slice into the external artifact.

## Loading — read broadly, cite specifically

Set the period first (default: since the last retro, or 12 months if none). Then read everything under `$HAKU_WORK_REFLECTIONS_HOME` (default `~/haku-work-reflections/`) in the window:

1. **The previous retro** — `self/retros/retro-*.md`, most recent. The baseline for every delta. If none exists, say so: this retro sets the baseline.
2. **`profile.md`** — stated role, level, focus. The sharpest question is often the gap between stated focus and where the evidence shows time went.
3. **`wins.md`** — the dated impact record.
4. **`self/reflections.md`** — the user's own trajectory of mood, energy, fulfillment.
5. **All stakeholder files** (`<category>/*.md` via `stakeholders.json`) — how relationships and management evolved. Growth as a leader lives here more than in wins.
6. **`pulses/`** and **`team-charters/`** — product and team arcs the user drove.
7. **ADRs / decision logs** — `decision-log` stores these in the code repo; ask the user to point at `docs/decisions/` if they want decisions folded in. Don't fabricate their absence into a weakness.

**Citation discipline:** every claim about growth or a gap cites specific dated entries. *"In March you logged avoiding the feedback conversation with Alex for three weeks; by September you logged delivering same-week feedback to two reports (wins 2026-09-04, 2026-09-19)"* is the product. Never assert a trajectory you can't cite.

## The retro structure

Write it to `self/retros/retro-YYYY-MM-DD.md`:

```markdown
# Career Retro — [period, e.g. 2026 H1] — generated YYYY-MM-DD
baseline: [previous retro date, or "first retro"]

## The one-line arc
[This period's growth in a sentence, cited. What you'd want a sponsor to know.]

## Deltas since last retro
[The heart of the document. What CHANGED per dimension, cited on both ends.]
| Dimension | Then | Now | Evidence |
|---|---|---|---|
| Scope / impact | ... | ... | wins 2026-... |
| Leadership / people | ... | ... | stakeholder entries ... |
| Technical / craft | ... | ... | ... |
| Judgment | ... | ... | ... |
| Visibility / influence | ... | ... | ... |
[First retro: "Then" becomes the baseline being established now.]

## Evidence highlights
[3–6 strongest cited moments — the ones that would anchor a promo case.]

## Gaps and honest weak spots
[Cited. Where evidence is thin, where a pattern repeats, where stated focus and actual work diverged. This section earns the user's trust — no retro is all growth.]

## Trajectory read
[Is the arc pointing where the profile says it should? Toward the next level, or plateauing?]

## Focus for next period
[2–4 concrete, evidence-driven priorities. These become next retro's things-to-measure-against.]
```

## Operating principles

- **Longitudinal, not point-in-time.** The question is always "compared to when," cited on both sides. A retro that reads like a single self-reflection has failed.
- **Honest gaps are the credibility.** All-upward-and-to-the-right reads as marketing. Surface the plateau and the divergence between claimed focus and the log.
- **Never invent evidence.** Same rule as `stakeholder-synthesize` and `pulse-synthesize` — if the memory is thin, say so and note the logging gap to close.
- **Persist, always.** Writing the dated file *is* the feature; the delta only exists because last time's file exists.

## Composition

- Reads the output of: `wins-log`, `stakeholder-reflect`, `self-reflect`, `product-pulse`, `team-charter`
- Feeds into: `wins-curate` (evidence highlights → promo packet / self-eval), `report-promo-case` (same lens on a report)
- Pairs with: `weekly` (the ritual keeps the memory fed; the retro is what that feeding was for)
- A gap that's really a direction question → `the-career-coach`
