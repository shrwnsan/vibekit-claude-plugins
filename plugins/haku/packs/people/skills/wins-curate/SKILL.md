---
name: wins-curate
description: Use to turn the wins log into an audience-specific artifact — promo packet, behavioral interview stories (STAR), perf-review self-eval, salary case, or year-in-review. Trigger phrases include "build my promo packet", "I have a behavioral interview Tuesday", "draft my self-eval for the perf review", "make a case for a raise", "year in review for me". Reads `~/haku-work-reflections/wins.md`; never invents wins.
---

# Wins Curate

Turn the wins log into an audience-specific artifact. Five modes — pick one before producing anything.

## Inputs to settle first

Refuse to curate before these are clear — audience sets structure and which wins count.

1. **Mode:** `promo-packet` | `interview-stories` | `perf-review` | `salary-case` | `year-in-review`.
2. **Time window** — default last 12 months.
3. **Mode specifics:** promo → target level + rubric; interview → company/role + question themes; perf → template + rating scale; salary → comp band + case; year-in-review → any lens.

If they say "all of them," push back — one at a time.

## Loading

1. Read `~/haku-work-reflections/wins.md` (configurable via `$HAKU_WORK_REFLECTIONS_HOME`).
2. Filter to the window; read each entry's structured fields (type, scope, collaborators, credit, impact, evidence).
3. For perf-review mode, also read `~/haku-work-reflections/self/reflections.md` and registered stakeholders' files (via `stakeholders.json`).

## Mode: `promo-packet`

Packets need: **scope demonstration**, **impact**, **judgment**, **leadership/influence**, **growth trajectory**.

```
# Promo case: [name] → [target level]
Period: [time window]

## Scope demonstration
- [headline win] — [1-line summary] (cited: 2026-03-12)

## Impact
- [headline win] — [quantified result] (cited: 2026-04-22)

## Judgment
- [call, reasoning, result] (cited: ...)

## Leadership / influence
- ...

## Growth
- ...

## Gaps before submission
- [Dimension X is thin; strongest available is Y.]
```

Pull from `delivery`, `judgment`, `leadership`; `mentorship`/`range` for leadership and growth. Skip `learning` for senior cases — panels want demonstrated capability. **Calibration is non-negotiable:** show solo-vs-shared credit; inflation costs more than honest thinness.

## Mode: `interview-stories`

Behavioral answers want **stories with conflict and resolution** — pick 4–6 textured wins; prefer `recovery`, `judgment`, `range`, `leadership`.

```
## Story: [headline]
**Fit for prompts about:** disagreement, ambiguity, hard calls, mentoring

### STAR (90-second target)
**Situation (15s):** [context; stakes clear, no detail dump]
**Task (10s):** [your hook — distinct from the team's]
**Action (45s):** [what *you* did, first-person; surface the hard part]
**Result (20s):** [quantified if possible; else qualitative]

### Likely follow-ups
- "What would you do differently?"

### Anti-pattern check
- ☐ Real result with caveats, not a fairy tale
- ☐ The "I" is real, not collective
- ☐ Real conflict, not "I worked hard"
```

Add a **bench depth** note: themes well-covered vs. thin.

## Mode: `perf-review`

Reviewers want **breadth** plus **growth narrative** — a calibrated read, not a level-up argument.

```
# Self-evaluation: [period]
## Core deliverables
[Quantified, collaborators named honestly. From `delivery`.]
## Judgment & decision-making
[From `judgment`; ADR cross-references.]
## Leadership & influence
[From `leadership`, `mentorship`, `culture`.]
## Range / cross-functional
[From `range` — breadth is valuable in perf.]
## Growth this period
[From `learning` + `self-reflect` growth language with progress.]
## What I'm working on next period
[Open notes in `self-reflect` or stakeholder files.]
## Calibration notes
[Honest acknowledgement of underperformance or shared credit.]
```

Compose: `self-reflect` → growth narrative; `stakeholder-synthesize` → relationship reads; `decision-log` → judgment evidence.

## Mode: `salary-case`

Business value over personal scope — argue **value created is misaligned with comp received**.

```
# Comp case
## Business value created (last [period])
- Revenue / retention / cost saved (quantified, cited to wins)
- Strategic impact (qualitative but anchored)
## Scope vs. peers
[At/above level — with citing wins.]
## Market context
[Comp-band research the user has done; never fabricate market data.]
## The ask
[Specific number range, with reasoning.]
## Willing commitments
[Optional: results in exchange.]
```

**Don't inflate.** Every dollar figure maps to a logged win; name gaps plainly.

## Mode: `year-in-review`

Personal retrospective — "what did I do this year?"

```
# Year in review: [year]
## By the numbers
[N wins; type distribution; top 3 by impact]
## What I shipped / What I'm proudest of
[The hardest, not the loudest.]
## Patterns
[Type dominance; weak quarters; trajectory.]
## What's missing from the log
[Forgotten wins — next year's discipline.]
## What I want next year
[From `self-reflect` if available.]
```

Lower pressure; honest patterns beat headlines.

## Operating principles (all modes)

- **Never invent wins.** Name gaps and what would make them claimable.
- **Honor the user's voice.** No buzzwords — *"spearheaded a strategic initiative"* is a flag; say what they did.
- **Calibrate solo vs. shared credit** — inflation costs more.
- **Cite log entries** — the cite makes the artifact defensible.
- **Surface gaps as prep targets**.
- **Match the audience's risk tolerance.** Perf tolerates growth language; promo panels read it as "not ready."
- **Compose, don't duplicate** — pull by reference, not restatement.

## Anti-patterns to flag

- **One artifact for all audiences** — refuse to merge.
- **Inflation by adjective** — replace with the number or drop it.
- **Hidden plurals** — force singular when honest.
- **Skipping calibration** — no shared-credit acknowledgement reads as collusive.
- **Recency-bias only** — pull across the window.
- **Chronological ordering** — rank by the audience's criteria.
- **Ending with "the rest is up to you"** — end with next moves.
