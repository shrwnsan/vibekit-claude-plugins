---
name: stakeholder-reflect
description: Use when reflecting on a registered stakeholder — manager, peer, report, or team — capturing insight to a durable file. Triggers include "let me reflect on John", "I want to think through my 1:1 with Jill", "log my thoughts on the Client Delivery ABC team", "reflect on [name]". Picks 1–3 questions by cadence/recency, guides reflection, writes dated entries back.
---

# Stakeholder Reflect

Guide a single reflection session about a registered stakeholder. Output is a dated entry appended to `~/haku-work-reflections/<category>/<slug>.md`.

## Exit signals

If the user says "stop", "exit", "I'm done", "pause", or similar — end immediately and write whatever has been captured. Better one good entry than three rushed ones. Opening message adds: *"You can say 'stop' at any time and we'll save what we have."*

## Inputs you need

1. **Which stakeholder.** Named explicitly ("John") or implied ("my manager"); resolve via `~/haku-work-reflections/stakeholders.json`.
2. **Time available.** Optional. "Quick" → exactly one. Default 2–3 questions, ~10–15 minutes.
3. **Anything specific on their mind.** Optional. If given, prioritize matching questions over the cadence picker.

If the stakeholder isn't registered, hand off to `stakeholder-register`.

## Loading context

1. Read `~/haku-work-reflections/<category>/<slug>.md` in full.
2. Load `questions.json` (this skill's folder).
3. Filter: `stakeholder_categories` must include the stakeholder's category.
4. Note the most recent entry date per candidate question.

## Picking questions

Default picker (when no specific topic was given):

1. Candidate pool: all questions matching the stakeholder's category.
2. Compute "due-ness": today minus last entry date, divided by `suggested_freq` in days (weekly=7, biweekly=14, monthly=30, quarterly=90, biyearly=180). Never-answered questions get a flat high score (2× their cadence).
3. Variety bias: prefer at least one `ask` and one `sense` question. For teams picking 2+, pull from at least two team-* sub-categories (clarity-alignment, culture, talent-process-resources, results, future).
4. Deprioritize questions answered in the last 3 days.
5. Take top N (default 2; 3 if the user has time; 1 if "quick").

Always explain the mode labels — users rarely know the ask/sense distinction:
- **ask** — get this directly from them; reflecting now means planning the question or logging what you heard
- **sense** — their stated answer would be unreliable; read behavior and choices instead
- **askandsense** — partly by asking, partly by watching; cover both

Then present:
> *"Here's what feels worth thinking about for John today: 1) What's been their feedback to you — an **ask/sense** question (not logged in 5 weeks). 2) What questions from them can you anticipate — a **sense** question (weekly cadence, last logged 11 days ago). Sound right, or swap one?"*

If redirected to a topic, skip the picker and find the closest matching questions.

## Running the reflection

For each picked question:

1. **Surface the metadata in full.** Prompt, then `subheading` (if any), then `things_to_consider` (if any) as a checklist — these are why the question is useful.
2. **State the sense category honestly.**
   - `ask`: *"Only useful if it comes from them. Writing now means planning how you'll ask, or logging what you already heard."*
   - `sense`: *"Their stated answer here would be unreliable. Read behavior, tone, and choices instead. What have you noticed?"*
   - `askandsense`: *"Some only by asking; some only by watching. Cover both."*
3. **Hold a real conversation.** Push past one-line answers: "Morale seems fine" → "based on what?". Labels → the behavior behind them.
4. **Reference the file's history.** *"Three weeks ago you wrote that John was 'all-in on the migration' — does that still hold?"*
5. **Don't synthesize while reflecting.** Patterns belong to `stakeholder-synthesize`.

## Writing the entry

After each question (or at session end), append to the file: a `## <prompt> [<sense_category>, <suggested_freq>]` heading, then a `### <YYYY-MM-DD>` subsection (today's date).

```markdown
## What's been their feedback to you? [askandsense, biweekly]

### 2026-05-01

He told me Tuesday the spec was "much sharper" and pulling forward the eval
section was the right call. He also forwarded it to the platform team unprompted —
that's real signal, not politeness.

Open: no response on the timeline pushback I raised. Bring it up next 1:1.
```

Compact but substantive; voice = the user's. Include "open" / "to do" lines when unresolved — they compound into raw material for `stakeholder-synthesize`. Skipped questions get nothing; no backfilling.

## Composing with other skills

Surface only when the conversation naturally produces the input: **feedback to give** → offer `feedback-frameworks`; **a 1:1 coming up** → offer `one-on-one-prep`; **a relationship decision** → offer `decision-log`. Don't force these; the reflection is the primary product.

## Operating principles

- **Push for specificity.** Vague entries compound into vague synthesis.
- **Honor the sense category.** On `sense` questions, record what the user *noticed*, not what the stakeholder *said*.
- **Cite evidence.** Claims should carry the observations that support them.
- **Reference the file's history.** Reflections compound only if past entries get surfaced.

## Anti-patterns to flag

- **One-line entries.** "Morale fine" is not an entry.
- **Stated answers as observed truth on `sense` questions.** "She said morale is fine" is `ask` material.
- **Reflection that's actually venting.** Name it gently; the file should hold insight.
- **Ratings ("morale is 7/10") substituting for description.** A number without observations is noise.
- **Confusing "I haven't asked yet" with "I don't know yet."** Plan the question; don't invent the answer.
