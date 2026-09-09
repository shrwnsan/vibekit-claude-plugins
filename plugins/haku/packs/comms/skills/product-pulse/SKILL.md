---
name: product-pulse
description: Use to produce a single-page dated pulse report on product health — usage metrics, AI-feature signals (hallucination, refusal, eval drift), counter-metrics, follow-ups. Trigger phrases include "run a pulse on [area]", "give me a product health snapshot", "weekly product pulse", "what does the data say this week". Saves to `~/haku-work-reflections/pulses/<area-slug>/pulse-YYYY-MM-DD.md`. Desktop scheduled tasks only — cloud routines cannot read local files.
---

# Product Pulse

A pulse report is a dated, single-page snapshot of product health: what changed, what's anomalous, what to investigate. Six months of pulses reveal trends no single report could. This skill produces one pulse; `pulse-synthesize` reads the folder over time; `strategy-doc` tells both what to watch.

## Where pulses live

```
~/haku-work-reflections/pulses/<area-slug>/pulse-YYYY-MM-DD.md
```

Single-product users default `area-slug` to `default`; multi-product users get one folder per area, mirroring `strategy-doc`. If `~/haku-work-reflections/` is missing, hand off to `stakeholder-register` for root setup.

## Inputs

1. **Strategy doc** at `~/haku-work-reflections/strategy/<area-slug>.md` — what to watch (key metrics), what to flag against (counter-metrics). If missing, run with a generic all-metrics lens and surface the gap.
2. **Data sources:**
   - **MCPs available** (PostHog, Mixpanel, Amplitude, Datadog, Sentry, Logfire, Stripe, Paddle, etc.) — query directly; list what was queried and when.
   - **No MCPs** — the user pastes recent metric numbers and the skill structures them.
   - **Read-only replica** — only if explicitly set up; never query production directly.
3. **The previous pulse** for this area — compute deltas.

## What goes in a pulse

Five sections, in order, fitting one screen — 30-50 lines.

### 1. Headline (1-2 sentences)
The single most important thing this period — an editorial call, not a recap. *"Engagement up 8% WoW, but trust signals (copy-edit rate) up 5% — possible Goodhart pattern."*

### 2. Usage / outcome metrics (the strategy's KPIs)
Each key metric: current value, period delta, status mark.

```
- Weekly active engineers: 1,247 (▲ +3.2% WoW) — on track
- Time-to-first-success: 4.2 min (▼ -8% WoW) — exceeding target ✓
- Free → paid conversion: 2.1% (— flat) — below target 🟨
```

### 3. Counter-metrics (Goodhart watch)
The metrics that would tell you the headline is misleading — from the strategy's counter-metrics plus AI-specific signals.

```
- Trust signals — copy-edit rate: 7.4% (▲ +5% WoW) ⚠ follow up
- Hallucination rate (eval set): 3.1% (— flat) — within band
- Cost per successful interaction: $0.18 (▲ +12% WoW) ⚠
```

### 4. AI-specific signals (when the product is AI-powered)
First-class — generic pulses miss these. Compose with `the-eval-designer` outputs.

```
- Eval score (golden set, last run): 0.89 (▼ -0.02 WoW)
- Refusal rate: 1.2% (— flat) — within expected range
- Fallback path activation: 0.4% (▲ from 0.2%) — possible regression
- p95 latency: 2.1s (▲ +15% WoW) ⚠
```

### 5. Follow-up investigation (≤3 items)
Anomalies warranting a deeper look, each with a hypothesis and next step. The pulse surfaces; it doesn't solve.

```
- Cost up 12%. Hypothesis: higher retry rate after Tuesday's prompt change.
  Next: pull retry distribution by version.
```

### 6. Provenance
One line per source: what was queried, from where, when. E.g. *"Data: PostHog (events 2026-04-27 → 2026-05-04 UTC), Datadog (latency p95). Sample sizes redacted; no PII."*

## Privacy discipline (load-bearing)

1. **Default to aggregated/redacted data** — counts, rates, percentiles; redact at the source query.
2. **PII never enters the pulse file** — user-specific follow-ups happen separately, with user awareness.
3. **Provenance footer is mandatory.**

If pointed at a hosted model, pulse contents go through that provider on every read/synthesis — disclose on first run.

## The cadence

**Claude Code Desktop app (recommended):** Routines → New routine → Local: `Run /product-pulse for the default area`. Weekly (Monday 8am) for most teams. Desktop Routines can write to `~/haku-work-reflections/pulses/`.

**Terminal / CLI users:** OS-level scheduling (cron, Task Scheduler); session-scoped tasks expire after 7 days.

**Never suggest cloud routines** — they cannot read or write `~/haku-work-reflections/`. Weekly is right for most; quarterly suits slow-moving B2B. Scheduled output lands in Claude Code, not the phone — pair with a calendar reminder.

## Operating principles

- **Editorial discipline.** A pulse is *one page*; the constraint forces prioritization.
- **Anchor to strategy.** Metrics and counter-metrics live in `strategy.md`; without it the pulse is a dashboard.
- **Counter-metrics first-class** (per `metrics-design`); **AI signals first-class for AI products.**
- **Hypothesis, not conclusion** — the pulse surfaces; the user decides.
- **Cap follow-ups at 3.**
- **Honest deltas** against the previous pulse.
- **No vanity metrics** — rates and per-user metrics, not mechanical totals.

## Anti-patterns to flag

- **Dashboard-as-pulse.** A metric dump failed.
- **Headline that's a recap** — what's the *single thing* to walk away knowing?
- **Counter-metrics buried.**
- **More than 3 follow-ups.**
- **PII in the pulse.** Hard rule.
- **Pulse without strategy** — surface the gap.
- **Same pulse every week, no editorial** — slow cadence or enrich signals.

## Composition with other skills

- **`strategy-doc`** — anchor; what to watch and flag against.
- **`metrics-design`** — counter-metric framing; route here if the strategy lacks counter-metrics.
- **`pulse-synthesize`** — cross-pulse trends from the accumulated folder.
- **`the-eval-designer`** — eval score source for AI products.
- **`the-architect`** — architectural drift (latency, fallback, cost).
- **`the-incident-responder`** — incident in progress.
- **`wins-log`** — metric improvement the user contributed to.
- **`decision-log`** — decisions the pulse triggers.
- **`the-translator`** — reframes for non-technical audiences; the pulse stays technical.
- **`patterns-watch`** — reads pulse data in its ecosystem-wide scan.
