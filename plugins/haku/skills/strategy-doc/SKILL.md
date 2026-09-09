---
name: strategy-doc
description: Use to create or update a product/area strategy document — target problem, approach, personas, 3-5 SMART metrics, 2-4 strategic tracks, explicit not-working-on section. Triggers: "draft a strategy doc for [area]", "I need a strategy.md for the platform team", "interview me about my strategy". Lives at ~/haku-work-reflections/strategy/<area-slug>.md; anchor read by the-spec-writer, prioritization-frameworks, metrics-design, product-pulse, pulse-synthesize.
---

# Strategy Doc

A product or area strategy is the load-bearing context for everything downstream — what specs get written, what gets prioritized, what counter-metrics matter. Most teams write one, then forget it exists. This skill creates or updates the doc, and makes it *useful* by ensuring other skills read it.

## Where it lives

`~/haku-work-reflections/strategy/<area-slug>.md` (configurable via `$HAKU_WORK_REFLECTIONS_HOME`).

One product → `strategy/default.md` is fine; multiple lines → one file per area. If the reflections root doesn't exist yet, hand off to `user-profile` first — it owns root setup and the privacy warning.

## When to apply

Trigger when the user is starting a new project, role, or area; a planning round needs a refresh; other skills keep producing generic output — stale or missing strategy is the usual cause; or after a real pivot (market, platform, constraint). Skip when the user just wants one spec or one prioritization, or can't yet articulate a problem or approach — that's a coaching conversation first.

## File format

Single markdown file, frontmatter + structured sections:

```markdown
---
area: [name]
slug: [area-slug]
owner: [user]
last_updated: 2026-05-04
revisit_by: 2026-08-01
---

# [Area] — Strategy

## Target problem
[Who hurts, what they're trying to do, what blocks them, why now — the
problem, not the solution you've decided on.]

## Approach
[The strategic shape of the answer, not the spec: "a faster lane for X by
removing Y," not "use Kafka."]

## Personas
[1-3, priority order, specific — "senior eng on a platform team in a
100-500 eng org" beats "engineers."]

## Key metrics (SMART)
[3-5: baseline, target, by when.]

## Strategic tracks (next 2 quarters)
[2-4 themes, not features. Per track: **Why**, **Bet** (what's true if it
succeeds), **Inside scope**, **Out of scope**.]

## Not working on (deliberate non-commitments)
[Declined items, with reasons — as load-bearing as the tracks.]

## Counter-metrics
[Signals the strategy is wrong even if headline metrics look good.]

## Open questions
[Unanswered, with who could resolve them.]

## Cross-references
- Profile: `~/haku-work-reflections/profile.md`
- Pulses: `~/haku-work-reflections/pulses/<area-slug>/`
```

## Slug confirmation

Before writing anything, say what file you're about to create or update. Infer the slug ("enterprise onboarding" → `onboarding-enterprise`); if `strategy/<slug>.md` exists, surface it (area, `last_updated`, one-line problem summary) and ask whether to refresh it, edit a section, or treat this as a genuinely different area. If new, confirm the slug before the interview. Slugs propagate — a wrong slug on day one silently forks product memory.

## Interview flow (new strategy)

Walk through in order — vague strategy is worse than none.

1. **Area + slug** — confirm before continuing.
2. **Target problem** — who hurts, what blocks them, why now. Push back on solution-first framing.
3. **Approach** — the bet, not the spec. If next quarter is "the same things, more of them," no real choice has been made.
4. **Personas** — ranked, 1-3, specific.
5. **Key metrics** — 3-5 SMART; reject vanity metrics; each must connect to a real business goal in one step.
6. **Strategic tracks** — 2-4 multi-month themes.
7. **Not working on** — push hardest here; most strategies fail because nobody decided what to drop.
8. **Counter-metrics** — what would make you doubt the strategy despite good headlines.
9. **Open questions** — what's unanswered and who could answer it.

Render, confirm with the user, write.

## Update flow

Three sub-modes: **Show** (dump the current strategy), **Edit a section** (e.g. "update my tracks"; append a one-line audit note), **Refresh** (re-run the interview pre-populated from the file; bump `last_updated` and `revisit_by`). If `revisit_by` has passed, surface it on any invocation.

## How other skills use it

> **If `strategy/<area-slug>.md` exists, read it before doing your work.** Multiple files → ask which area applies.

`the-spec-writer` anchors every spec to a strategic track. Pack skills that declare strategy-awareness read it when installed. Without a strategy doc everything still works — output is just more generic. Don't pester the user to set one up.

## Operating principles

- **Specificity over comprehensiveness** — a sharp page beats a hedged five.
- **"Not working on" is the spine.** Push hardest there.
- **Counter-metrics are first-class.** A strategy without them optimizes itself into a worse product (the Goodhart trap).
- **One area per file.**
- **Refresh on real triggers** — planning round, missed-bet retro, reorg — not "it's been 90 days."
- **Honest confidence.** Uncertain? Write "Hypothesis (low confidence) — to test by [date]."

## Anti-patterns to flag

Solution-first framing (a roadmap, not a strategy); an approach that would have been equally true last quarter; 5+ tracks (wishlist); no "not working on" section; vague or floating metrics; personas that are everyone; marketing tone — write for a senior peer who'd push back on hand-waving; retconning the strategy to match what shipped — if execution diverges, that's the conversation, not an edit.

## Composition

`user-profile` is who you are; this is what you're building. `the-spec-writer` refuses specs that don't anchor to a track. Strategic changes (track scope, persona order, metric pivots) belong in the `decision-log`.
