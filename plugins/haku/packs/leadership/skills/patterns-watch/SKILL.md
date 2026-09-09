---
name: patterns-watch
description: Use to surface unsolicited patterns across stakeholder reflections, wins log, and self-reflect entries. Trigger phrases include "what patterns am I missing", "anything notable across my files", "scan my reflections for things I should know", "weekly cross-cutting check". Distinct from `stakeholder-synthesize` (user-driven, one person/category)—this is unsolicited and cross-cutting; every claim cites dated entries.
---

# Patterns Watch

Scan the whole reflection ecosystem on a cadence and surface patterns the user hasn't asked about — attention gaps, cross-people trends, contradictions between stated focus and logged work. Two disciplines: every pattern claim **cites specific entries**, and the skill **refuses to predict** — it observes and asks.

## When to apply

Trigger on:
- The user asks for a cross-cutting scan
- Wired to `/schedule` for weekly Sunday-evening surfacing
- Quarter close, year-end review, or reorg planning

Skip when:
- The user wants a focused synthesis of one person or topic — use `stakeholder-synthesize`
- The user has been logging less than 4 weeks — patterns need volume to be honest

## What it scans

The full reflection ecosystem at `~/haku-work-reflections/` (or `$HAKU_WORK_REFLECTIONS_HOME`):

- `profile.md` (if present) — stated strategic focus, growth area, communication style
- `managing-up/<*>.md`, `managing-across/<*>.md`, `managing-down/<*>.md`, `teams/<*>.md`
- `self/reflections.md`, `wins.md`
- `pulses/` — if product pulse is set up (future)

Reads the last **12 weeks** by default (configurable).

## What it looks for

Five lenses across the corpus:

### 1. Attention gaps
Stakeholders with zero entries in 4+ weeks despite due items; question categories (especially `compensation`, `feedback`, `morale`) consistently skipped; self-reflection topics untouched 6+ weeks.

### 2. Cross-stakeholder patterns
The same theme surfacing in multiple stakeholders' files independently; consistent feedback not yet internalized; team-level signals visible in individual files before `team-diagnosis`.

### 3. Contradictions
Stated focus in `profile.md` vs. actual logged work; said vs. observed on the same person (`ask` vs `sense` entries); self-reflection commitments not followed through.

### 4. Trajectory shifts
Stakeholder entries trending green→yellow; growing or shrinking entry volume on a topic (volume itself is signal).

### 5. Avoidance signals
Topics started but not finished; `ask`-category questions never answered; hard topics circled without addressing directly.

## Output format

```
# Patterns this week — 2026-05-03

## Attention gaps
- [Gap with citation: "no entries on John Adams in 5 weeks despite weekly cadence"]

## Cross-stakeholder patterns
- [Pattern with sources: "three reports independently mentioned tooling friction (04-22, 04-25, 04-30)"]

## Contradictions
- [Specific contradiction with sources]

## Trajectory shifts
- [Trend with citations]

## Avoidance signals (gentle)
- [Pattern with citations, framed as observation]

## What you might want to do
- [3 options ranked by leverage, including "do nothing" if appropriate]
```

Every pattern must cite specific files and dates. If you can't cite, don't claim.

## Honest discipline (the load-bearing part)

Pattern detection across personal data is easy to do badly; the risk is confident-sounding noise the user starts acting on.

1. **Minimum threshold for "pattern":** 3+ entries over 2+ weeks. Two adjacent entries is a moment, not a trend.
2. **Cite or strike.** No exceptions.
3. **No predictions.** Observation + question, never forecast.
4. **Distinguish `ask` from `sense` entries** — mixing evidence types produces false certainty.
5. **Surface the kindest plausible interpretation** alongside the user's likely first read.
6. **Don't pathologize attention gaps** — a gap may be avoidance or a stakeholder needing less attention.
7. **Quantify scope honestly:** *"across 4 entries over 6 weeks"*, not *"consistently"*.
8. **End with options, not orders** — including "do nothing if I'm reading this wrong."

## Wiring to a schedule

**Claude Code Desktop app (recommended):** Routines → New routine → Local; weekly, Sunday; instructions: `Run /patterns-watch`. Full local file access, persists indefinitely.

**Terminal / CLI users:** use OS-level scheduling (cron, Task Scheduler). Session-scoped tasks expire after 7 days.

**Never suggest cloud routines** — they cannot read `~/haku-work-reflections/`.

On-demand: run before a planning week, perf cycle, or hard 1:1.

## Operating principles

- **Observation, not prescription** — a mirror, not a coach.
- **Lower confidence is honest:** "possible signal" beats "clear pattern."
- **Compose with the bundle:** team-level patterns to `team-diagnosis`, deferred feedback to `feedback-frameworks`, coaching conversations to `coaching-mode`, implicit decisions to `decision-log`.
- **Keep output tight** — six bullets read beat sixty skimmed.
- **Be honest about volume:** thin data means saying the patterns are thin.

## Anti-patterns to flag

- **Predictive language.** Observe; don't forecast.
- **Pattern-of-one.** A single anomalous entry is a "weak signal" at most.
- **Confirming the user's prior.** Counterweight with the kindest plausible read.
- **Pathologizing healthy gaps.** Not reflecting because things are fine is calibrating.
- **Long output.** Hard cap; if nothing significant: *"Nothing significant cross-cutting this week. Strongest signal: [one thing]."*
- **Ranking by drama.** Rank by leverage, not alarm.

## Composition with other skills

- **`stakeholder-synthesize`** — drill into a stakeholder the scan surfaced
- **`team-diagnosis`** — structured eight-dimension read for team-level signals
- **`self-reflect`** — personal-growth patterns across self entries
- **`feedback-frameworks`** — when a pattern points at deferred feedback
- **`decision-log`** — log implicit decisions the scan surfaces explicitly
- **`user-profile`** — reads "current strategic focus"; surface divergence

## The weekly ritual

This skill is one segment of the `weekly` skill — a ~15-minute session running wins capture, the most-overdue stakeholder reflection, and a patterns scan. For the recurring ritual, route to `/haku:weekly`.
