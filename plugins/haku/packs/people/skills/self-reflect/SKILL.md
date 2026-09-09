---
name: self-reflect
description: Use when the user wants to reflect on themselves as a leader — behavior under pressure, communication, time and energy, fulfillment, advocating for themselves. Trigger phrases include "let me reflect on myself", "self-check", "I want to think about how I've been leading lately", "self-reflection". Loads `~/haku-work-reflections/self/reflections.md`, picks 1–3 fitting questions, writes the dated entry back. Mirrors `stakeholder-reflect` for the user.
---

# Self-Reflect

Reflect on the user themselves — leadership, behavior, fulfillment, calendar — and capture the result to `~/haku-work-reflections/self/reflections.md`. The shape mirrors `stakeholder-reflect`; the difference is the audience and the question pool.

## Exit signals

If the user says "stop", "exit", "I'm done", "that's enough", "pause", or similar — end immediately and write whatever has been captured. In the opening message add: *"You can say 'stop' at any time and we'll save what we have."*

## First-run setup

If `~/haku-work-reflections/self/reflections.md` doesn't exist:

1. Create the `self/` directory under `$HAKU_WORK_REFLECTIONS_HOME`.
2. Initialize `reflections.md` with this frontmatter:
   ```markdown
   ---
   subject: self
   since: 2026-05-01
   ---

   # Self-reflections

   <!-- The self-reflect skill appends per-question entries below this line. -->
   ```

If `~/haku-work-reflections/` itself doesn't exist, hand off to `stakeholder-register` first — that skill owns root setup and the privacy warning.

## Picking questions

Filter `questions.json` (from the `stakeholder-reflect` skill folder) to questions where `stakeholder_categories` includes `self`. Three families:

- **General behaviour:** under pressure, communicating, giving/handling feedback, calendar.
- **Leadership:** effectiveness, growth, what to work on.
- **Current role:** compensation, fulfillment, time/energy, self-advocacy, work environment.

Default picker (when no topic given):
1. Compute due-ness same as `stakeholder-reflect`: `days_since_last / cadence_days`.
2. Variety: with 2+ questions, pick from at least two families.
3. Deprioritize anything answered in the last 7 days.
4. Take top N (default 2; 3 if "I have time"; 1 if "quick").

Show the picks before drilling in:

> *"Here's what feels worth thinking about: 1) How well have you managed your time and energy recently? (biweekly, last logged 3 weeks ago) 2) How are you handling feedback? (monthly, never logged). Sound right?"*

If the user named a topic, skip the picker.

## Running the reflection

Same shape as `stakeholder-reflect`, with self-specific adaptations:

1. **Surface the question's `subheading` and `things_to_consider` in full** — they carry most of the depth.
2. **Push past the comfortable answer.** Watch for false modesty ("I'm fine") and false self-criticism; challenge both. *"You said you're 'fine' under pressure, but earlier you mentioned the Friday call where you snapped at the iOS lead — can we look at that?"*
3. **Reference past entries.** *"Two months ago you wanted to delegate more — what have you actually handed off?"*
4. **`current-role` questions** (compensation, fulfillment, advocacy): take seriously even when the user is glib — the questions most skipped and most regretted.

## Writing the entry

Append in the same per-question / per-date structure as stakeholder files:

```markdown
## How well have you managed your time and energy recently? [current-role, biweekly]

### 2026-05-01

Calendar over the last 2 weeks: 31 hrs of meetings (target was ≤24). 6 hrs were
optional. Energy: lower in the afternoons; mornings protected but the back half
of the day burns in low-stakes syncs.

Action: cancel the standing Thursday product review. Block 2-4pm Wednesdays for
deep work and treat as inviolable.
```

Entries should produce *actions or commitments* more often than stakeholder entries — the user is the only one who can act on them. Write the action down explicitly.

## Composing with other skills

- Surfaces feedback to give someone else → offer `stakeholder-reflect` or `feedback-frameworks`.
- Surfaces a decision → offer `decision-log`.
- Surfaces a leadership behavior to change → after a few entries, invite a `stakeholder-synthesize` over the self file with that lens.

Don't force these; most sessions just need to land cleanly.

## Operating principles

- **Honesty over performance.** The file is private; encourage candor.
- **Concrete observations, not labels.** "I lost my temper Tuesday at 3pm when the eng director cut me off" is useful; "I'm impatient" is not.
- **Action-orientation.** "I'll be a better listener" is a non-commitment; "I will pause 5 seconds before responding in tomorrow's standup" is a commitment.
- **Cadence respect.** Daily is grinding; weekly to bi-weekly is the sweet spot.
- **Don't double up with therapy.** Real distress belongs with a professional, not a markdown file.

## Anti-patterns to flag

- **Vague gratitude lists** — push for one specific person and moment.
- **Resolutions without observation** — anchor every "I should…" to something recent.
- **Skipping the same question every time** — the deflection pattern is itself material; surface it gently.
- **Reframing critique as praise** ("I struggle with delegation" → "I care deeply about quality") — call the dodge.
- **Logging without revisiting** — recommend a monthly `stakeholder-synthesize` over the self file; the compounding insight is in the rereading.
