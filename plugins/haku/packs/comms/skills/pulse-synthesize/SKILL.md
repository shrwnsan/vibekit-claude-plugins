---
name: pulse-synthesize
description: Use to derive trends, anomalies, inflection points, and regime shifts across accumulated product-pulse reports. Trigger phrases include "what's been the pattern across pulses this quarter", "synthesize my product pulses for [area] over the last 8 weeks", "before my exec readout, what does the data say across the period", "is anything trending that I missed week to week". Reads `~/haku-work-reflections/pulses/<area-slug>/`.
---

# Pulse Synthesize

A single pulse is a snapshot; the folder of pulses over time is the asset — but only if someone reads across them. Cost-per-success up 12%, then 12%, then 8%: across pulses that's a trend; in any single pulse, noise. This skill turns the folder into the insight.

Same discipline as `stakeholder-synthesize`: every claim cites the pulses supporting it. No predictions — only observations and hypotheses to verify.

## When to apply

- A planning round, exec readout, or quarterly review needs a *trajectory* read.
- Pulses logged for 4+ weeks; the user wants to see what's compounded.
- A metric has been moving and the user wants to know for how long, and what moved with it.
- Before a new strategic track, to read where the product actually is vs. where the strategy assumes.

Skip when: the user wants a snapshot (`product-pulse`); fewer than 4 pulses in the window; or synthesis across stakeholders/wins is wanted (`stakeholder-synthesize`, `wins-curate`).

## Inputs to clarify

1. **Area** — which `<area-slug>`; default `default` for single-product users.
2. **Time window** — default last 90 days; override on the user's framing.
3. **Lens** — trend over time, anomaly hunt, inflection points, pre-readout trajectory story, or strategy check (moving where strategy.md predicted?).

Open-ended ask → default to **trend + anomalies**, and say so.

## Loading

1. Read `~/haku-work-reflections/strategy/<area-slug>.md` if present — the interpretive frame.
2. Read all pulses in `~/haku-work-reflections/pulses/<area-slug>/` within the window, chronologically.
3. Optional: `~/haku-work-reflections/profile.md`.

## Synthesis discipline (the load-bearing part)

The risk is a confident trajectory story the user pitches to leadership that turns out to be noise.

1. **Minimum threshold.** A trend needs ≥4 consecutive data points moving the same direction with meaningful magnitude. 3 is "early signal"; 2 is "moment, not trend."
2. **Cite every claim.** *"Cost per successful interaction has trended up since March (pulses: 2026-03-09 → $0.14, 2026-03-23 → $0.16, 2026-04-13 → $0.18)."* No citation, no claim.
3. **Trend vs. regime shift.** A gradual climb is a trend; a step-change then a new flat line is a regime shift — usually a specific event. The response differs.
4. **Signal vs. seasonality.** Weekly/monthly cycles are seasonality; subtract before claiming movement.
5. **Cross-correlate cautiously.** "Rose together; possible coupling" is honest; "caused" is not.
6. **Watch counter-metrics independently.** Headline up + counter-metric up = Goodhart pattern; flag it.
7. **Don't predict** (same discipline as `read-the-room`, `patterns-watch`) — "up over 8 weeks" is observation, "will keep rising" is forecast.
8. **Acknowledge the gaps.** *"Covers 7 of the last 12 weeks; gaps may obscure a regime shift."*

## Output format

```
# Pulse synthesis: [area] — [time window]

## Top-line read
One paragraph: the most important trajectory. Trend, regime shift,
or "no significant movement worth flagging."

## Trends (≥4 consecutive data points)
- **[Metric]** — direction, magnitude, source pulse dates.

## Anomalies (single-pulse outliers)
- **[Metric] — [pulse date]** — what was unusual; persisted?

## Regime shifts (step-changes, with date if identifiable)
- **[Metric]** — [old level] → [new level] around [date].

## Counter-metric watch
- **[Headline] up + [counter-metric] up** — Goodhart flag, with sources.

## Strategy check (if strategy.md present)
- **Track [N]** — progress / regression against the bet. Sources.

## Coverage and confidence
- Pulses read, span, gaps, confidence (and why)

## What you might want to do
- 2-4 follow-ups by leverage; "do nothing" if healthy.
```

## Composing with the rest of the bundle

- **Trajectory diverges from strategy** → `strategy-doc` to refresh or make explicit.
- **Counter-metric trending wrong** → `metrics-design`.
- **Anomaly is actually a regression** → `the-incident-responder`.
- **Architectural drift (latency, fallback rate, cost)** → `the-architect`.
- **Part of an exec/board readout** → `the-translator`.
- **Credit-worthy improvement** → `wins-log`.
- **Implicit decision surfaced** → `decision-log`.

## Operating principles

- **Synthesis ≠ summary** — synthesis derives a claim not visible in any single pulse; a recap isn't finished.
- **Cite or strike.** Every claim has source pulse dates.
- **Honest confidence.** Low coverage = low confidence; skipped weeks get called out.
- **Match the lens** — lead with what the user asked for.
- **Resist drama-ranking** — rank by leverage, not alarm.
- **Counter-metrics get equal billing.**
- **Acknowledge the noise floor** — "bounced between 0.14 and 0.16 for 12 weeks; no trend" beats a fabricated story.

## Anti-patterns to flag

- **Trends from 2 data points** — mark "early signal."
- **Causal language from observational data** — "coincident with," not "because of."
- **Predictive forecasting.** Refuse.
- **Synthesis without the strategic frame** floats free of meaning.
- **Burying the regime shift** in the trends section — different response, own section.
- **One synthesis for all audiences** — one per lens.
- **Hiding the gaps** — surface coverage limits up front.

## Composition with other skills

- **`product-pulse`** — produces the input data this skill reads.
- **`strategy-doc`** — interpretive frame; read first if available.
- **`patterns-watch`** — the wider ecosystem scan; pulse-synthesize is the deeper cut on pulses.
- **`metrics-design`**, **`the-translator`**, **`the-incident-responder`**, **`the-architect`**, **`wins-log`**, **`decision-log`** — routing targets per the composing section above.
