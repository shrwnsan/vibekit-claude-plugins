---
name: wins-log
description: Use when the user wants to capture a "win at work" — something shipped, judgment exercised, someone mentored, a fire put out. Triggers: "I just shipped X", "log this win", "add to my brag doc", "I had a good week". Captures structured entries (situation, action, impact, evidence) to ~/haku-work-reflections/wins.md for later remix by wins-curate into promo packets, interview stories, perf self-evals.
---

# Wins Log

Capture a single "win at work" in a structured form for later remixing — promo packet, interview stories, perf reviews, salary case, year-in-review. The output is one entry, prepended (newest first) to `~/haku-work-reflections/wins.md` (configurable via `$HAKU_WORK_REFLECTIONS_HOME`).

Two modes: **fresh** (the user just did something and wants to capture it) and **retroactive** (logging something recent).

## First-run setup

If `wins.md` doesn't exist: if the reflections root doesn't exist either, hand off to `user-profile` first — it owns root setup and the privacy warning. Then create `wins.md` with:

```markdown
---
subject: wins
since: <today's date>
---

# Wins at Work

<!-- Newest entries are prepended below. Each entry begins with `## YYYY-MM-DD — <headline>`. -->
```

## Per-entry structure

Every entry uses this exact shape. The structure is what makes entries remixable later — fight to fill every section.

```markdown
## 2026-05-01 — Shipped contract-summarization to GA

**Type:** delivery, judgment
**Scope:** Q2 multi-team launch
**Collaborators:** Priya (eng lead), Trae (design), legal review team
**Solo vs. shared credit:** Led PM side end-to-end; eng and design owned
execution; legal validated the safety story

What happened:
[2-4 sentences: what was at stake, what was hard, what was unusual.]

What I did:
- [The user's specific contributions — "I" verbs, not "we" verbs.]

Impact:
- [Quantified wherever possible.]

Evidence:
- [Where someone could verify this — OKR doc, email, Slack channel, ADR.]
```

## The capture flow

Walk through these quickly — a fresh win takes 5–10 minutes.

### 1. Headline + date
One short title, no buzzwords. *"Shipped contract-summarization to GA"* — not *"Successfully delivered industry-leading AI capability."*

### 2. Type
One or more, comma-separated — the single most important structural choice, since it drives what curation can do later. Push for the 1–3 that actually fit:

- `delivery` — shipped something
- `judgment` — a hard call under uncertainty (especially a *no*, a delay, a scope cut)
- `leadership` — set direction, owned outcome, brought people along
- `mentorship` — grew someone else
- `recovery` — saved something going sideways
- `craft` — technical/PM excellence (a sharp spec, a great eval rubric)
- `learning` — new capability
- `range` — outside the normal lane
- `culture` — changed how the team works (a ritual, a norm, a vocabulary)

### 3. Scope
`sprint`, `quarter`, `multi-quarter`, or `ongoing` — calibrates the win's weight later.

### 4. Collaborators + credit framing
Both required: *"Who else was involved?"* (with roles), and *"What was specifically your contribution vs. theirs?"* "Led the PM side; eng owned execution" is calibrated. "I shipped this" when five people did is inflation; calibration protects the user when others read the artifact later.

### 5. What happened (situation)
What made this a real win and not just routine work? 2–4 sentences.

### 6. What I did (action)
Push past team verbs to "I" verbs. "We decided" → "I argued for X and got buy-in from Y." Distinguish what would have happened without the user.

### 7. Impact
Quantify whenever possible — this is where most logged wins are weakest. If the user offers vague impact ("improved the system"), probe: *for whom? by how much? over what time?* If they say "I can't quantify it": name an N ("helped 3 engineers" beats "helped engineers"), find a downstream effect, or name the counterfactual ("would have been a P0 if we'd shipped"). Genuinely unquantifiable wins get anchored with specific witnessed examples.

### 8. Evidence
Where someone could verify this; informal is fine (*"#legal-summarization Slack channel, week of April 15"*). If they can't name any, flag gently that a win without evidence is hard to defend later; note `Evidence: none captured at the time` to stay honest.

## Writing the entry

Show the structured version, confirm it lands, then prepend to `wins.md` (newest first), using today's date.

## Cross-links

When the win touches another skill's territory, surface the link — the capture is the primary product; cross-links are bonuses, don't force them:

- A judgment win with a real decision behind it → suggest capturing the underlying ADR in `decision-log`; cross-reference both.
- Feedback-, mentorship-, or stakeholder-shaped wins → note the relevant pack skill (`feedback-frameworks`, `stakeholder-reflect`) if installed.

## Operating principles

- **Push past vague.** Specifics compound; vagueness rots.
- **Calibrate credit.** Honest solo-vs-shared framing is what makes the log credible.
- **Honor "I had a quiet week."** Don't manufacture wins; forced positivity produces fictions.
- **Keep the user's voice.** The file is private; cleaned-up phrasing is the curator's job, not this skill's.
- **Don't over-edit retroactive entries.** Fuzzy details get captured as remembered and marked `(reconstructed from memory)`. Some signal beats no signal.

## Anti-patterns to flag

"I shipped X" when five people did; adjectives instead of numbers ("massively improved" vs. "P95 2.4s → 800ms"); wins that are really routine tasks — distinguish achievement from output; resume buzzwords; entries with neither evidence nor impact (a story, not a win); and inflated type tags — one or two honest tags beat five aspirational ones.
