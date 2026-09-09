---
name: stakeholder-synthesize
description: Use when deriving insight across stakeholder reflections — patterns, trends, contradictions, blind spots. Triggers: "how is my managing-up overall", "summarize what I've learned about Jill this quarter", "before my performance review, what do I know about my reports", "what patterns do I see across my team leads", "give me a read on the Client Delivery ABC team". Claims cite dated entries
---

# Stakeholder Synthesize

Find the signal in accumulated reflections. Operates over one stakeholder, a category, or all stakeholders, depending on the user's framing.

## Inputs to clarify

1. **Scope.** One stakeholder, one category (e.g. all of managing-down), or everything?
2. **Time window.** Default: last 90 days. User can override ("this quarter", "since the reorg in March", "all time").
3. **Lens.** What's the user looking for?
   - **Trend over time** ("has Jill's morale improved?")
   - **Cross-stakeholder pattern** ("am I getting consistent feedback across managing-up?")
   - **Pre-meeting prep** ("what do I know about John before our 1:1?")
   - **Performance review prep** ("what's the case for Draymond's promotion?")
   - **Blind spots** ("what haven't I been thinking about?")

If the ask is open-ended ("what's going on with my team?"), pick a default lens and state it: *"I'll do a cross-stakeholder pattern read across managing-down for the last 90 days — let me know if you want a different cut."*

## Loading

1. Read `~/haku-work-reflections/stakeholders.json` for the registry.
2. Identify files by scope; read each in full, taking all `### YYYY-MM-DD` entries inside the window.

## Synthesis discipline

This is the load-bearing part. Bad synthesis on stakeholder data is worse than none — it manufactures false confidence about real people.

**Every claim must cite at least one specific dated entry.** *"Morale has been declining since mid-March (entries 2026-03-18, 2026-04-02, 2026-04-15 all reference disengagement signals)."* No citation, no claim.

**Distinguish your three modes of evidence:**
- `ask` entries: what the stakeholder said — their stated position, not necessarily the truth.
- `sense` entries: what the user observed — bias-filtered but anchored in behavior.
- `askandsense` entries: where stated and observed agree, conviction is highest; where they disagree, surface the gap.

**Surface contradictions, don't paper over them.** "Seems all-in" on March 5 vs "is checked out" on April 12 — call out the gap, don't average it.

**Distinguish trend from snapshot.** Three same-week entries = snapshot; three across two months = trend.

**Watch for the user's blind spots.** Patterns of *non-reflection* are signal: no entries in 60+ days despite due items; topics consistently skipped (compensation, conflict, morale); entries that always say "fine, no issues". Surface as "patterns of attention," not accusations.

## Output structure

Match the lens. For most lenses, this shape:

```
# Synthesis: [scope] — [time window]

## Top-line read
One paragraph. The most important thing the user should walk away with.

## Patterns
- **[Pattern]** — one-sentence claim. (Sources: 2026-03-18, 2026-04-02 in [stakeholder])
- ...

## Contradictions / open questions
- **[Tension]** — what was said vs. what was observed. (Sources: ...)
- ...

## Blind spots
- Stakeholders or topics the user hasn't engaged with recently, with what would be worth doing.

## Suggested next conversations
- [Stakeholder]: what's worth raising, with concrete framing.
```

For pre-meeting prep, swap "Suggested next conversations" for a meeting agenda. For performance review prep, swap for a structured promo-packet-style write-up (strengths with evidence, growth areas with evidence, recent impact).

## Composing with other skills

Surface the natural next steps after the synthesis:

- A "next conversation" needing structured feedback → offer `feedback-frameworks`.
- A meeting was named → offer `one-on-one-prep`.
- A decision the user is implicitly making → offer `decision-log` so it's named and revisitable.
- Pre-launch / pre-review prep → mention `the-translator` for reframing findings for execs.

## Operating principles

- **Synthesis ≠ summary.** Synthesis derives a claim the user wouldn't see reading entries sequentially; a recap means you haven't finished.
- **Cite or strike.** No exceptions.
- **Honor the user's voice.** Quote vivid phrasing; don't sand off candor. Accurate insight, not clean copy.
- **Quantify scope honestly.** "Across 4 entries over 6 weeks" beats "consistently".
- **Don't moralize.** Name the pattern, not the person — a mirror, not a coach.
- **Resist therapizing.** This is for getting more useful at work.

## Anti-patterns to flag

- **A bulleted "John said X, Y, Z" summary.** A list, not synthesis.
- **Smoothing over contradictions.** Surface the disagreement.
- **Inventing patterns from sparse data.** Two entries is not a trend; say "one signal".
- **Cross-stakeholder claims without naming the segment.** Specify which stakeholders, what window, what evidence.
- **Synthesis the user can't act on.** End with concrete next moves.
