---
name: metrics-design
description: Use when the user is designing the metric tree for a feature (especially an AI feature)—north star, leading and lagging indicators, quality metrics, counter-metrics. Trigger phrases include "what should we measure for…", "how do we know if this is working?", "I need to define success for…". Distinct from `the-eval-designer`, which measures model quality; this measures business success.
---

# Metrics Design

Design the metric tree so a feature can be steered in production, not just declared successful at launch. Especially load-bearing for AI features, where it's easy to ship something that "improves engagement" while quietly making the product worse.

**Context files:** If `~/haku-work-reflections/profile.md` exists, read it first — product/area context, strategic focus, and org KPIs shape what counts as "north star" and which counter-metrics matter. If `~/haku-work-reflections/strategy/<area-slug>.md` exists, its key metrics are candidate north stars and its counter-metrics compose with this framing. If the tree disagrees with the strategy doc, surface the gap and ask which is right.

## When to apply

Trigger on:
- A spec or PRD where "success metrics" is one fuzzy line
- A new AI feature about to ship — *before* it ships
- A retro where "we hit the metric but the product feels worse"
- Quarterly planning with outcome commitments

Skip for: trivially measurable A/B tests, or features whose entire purpose is one metric.

## The four-layer metric tree

If you can't fill all four layers, the feature isn't ready to ship.

### 1. North Star (1 metric)
The number that, if it moves, the feature *worked*.
- An **outcome**, not an output: "documents summarized" is an output; "time-to-decision reduced from 4h to 30min" is an outcome.
- **User-centric:** phrased from the user's perspective.
- **Defendable in a hostile room:** answer "couldn't this go up while the product gets worse?"

### 2. Lagging indicators (2–3)
Business outcomes downstream of the north star: revenue, retention, NPS, support ticket volume. Slow to move — use them to validate the north star, not to steer the feature.

### 3. Leading indicators (3–5)
Early signals that move within days/weeks: adoption, time-to-first-value, repeat-use within N days. Must move fast enough to act on and be feature-specific — "MAU" isn't; "% opening the summary panel within 3 sessions" is.

### 4. Counter-metrics (2–4) — *the section most teams skip*
What you do **not** want to go up — named, monitored, launch-blocking on breach. This catches Goodhart's-law failures.

For AI features, mandatory:
- **Quality metric (eval score)** — connect to `the-eval-designer`'s output; if quality drops, success elsewhere is a lie
- **Hallucination / wrongness rate** in production traffic
- **Trust signals** — thumbs-down, copy-edit, regenerate rates
- **Cost per successful interaction** — amortized across value-delivering interactions
- **Latency at p95/p99** — averages hide the worst experiences

For any feature, also consider:
- **Cannibalization** — feature X up while related feature Y collapses
- **Support load** — tickets mentioning the feature
- **Time-on-task** — engagement going *up* can mean confusion

### Anti-metrics: what *would* make us roll back?
Counter-metrics with explicit thresholds: "if hallucination rate > 5%, we roll back." Pair with `decision-log` to capture these durably.

## AI-specific patterns to watch

- **"Engagement looks great" trap:** LLM features drive session length by being verbose or confusing. Pair engagement with a task-completion or trust counter-metric.
- **Selection-bias trap:** early adopters aren't the median user; stratify by segment and tenure.
- **Novelty curve:** usage spikes decay over 4–6 weeks; judge by week-6 retention, not week-1 adoption.
- **"AI assist" measurement problem:** define upfront — acceptance, edited-acceptance, or time saved? Pick one headline.
- **Regressions hide in averages:** stratify quality metrics by input segment.

## How to help the user

1. **Force the north-star sentence:** "If this feature works, [user] will be able to [outcome] [measurable change]." Push back on outputs disguised as outcomes — unless the outcome is unmeasurable this cycle; an honest tracked output beats an outcome goal stuck at 0%.
2. **Build top-down, verify bottom-up:** would the leading indicators actually predict the lagging ones?
3. **Insist on counter-metrics.** If none offered, name three candidates.
4. **Set thresholds:** win / neutral / rollback-or-rethink for each. Vague thresholds invite revisionism.
5. **Specify cadence:** metrics nobody reviews on a schedule are theater.
6. **Name the instrumentation gap:** what's not logged? Design the logging plan with the metric plan.

## Output format

One-page metric plan:

```
Feature: [name]
Owner: [PM name]
Review cadence: [weekly / bi-weekly]

NORTH STAR
  [metric] — currently [baseline], target [N] by [date]

LAGGING (3-month validation)
  - [metric, target, threshold]
LEADING (acted-on weekly)
  - [metric, target, threshold]
COUNTER-METRICS (must not breach)
  - [metric, threshold, rollback action if breached]
INSTRUMENTATION GAPS
  - [what we need to start logging before launch]
OPEN QUESTIONS
  - [things we don't know how to measure yet]
```

## Anti-patterns to flag

- **One metric:** a recipe for Goodhart's law. Insist on the tree.
- **Vanity metrics:** totals go up mechanically; use rates and per-user metrics.
- **No counter-metrics:** the most common and most expensive omission. Push back hard.
- **Unowned metrics:** each metric needs a name — who watches it, who acts.
- **"Instrumentation later":** means launching blind; convert to an open question with a deadline.
- **Confusing eval score with success:** eval is a counter-metric, not the north star.
