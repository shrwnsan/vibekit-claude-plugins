---
name: weekly
description: Use for the user's weekly review ritual — one ~15-minute guided session wrapping the haku maintenance loop. Triggers: "run my weekly review", "Friday review", "weekly check-in", "/haku:weekly", "catch up on the week". Composes wins-due, stakeholder-due, stakeholder-reflect, patterns-watch into four time-boxed segments: wins capture, stakeholder reflection, patterns, pulse glance. Prefer this for the ritual; individual skills for one piece.
---

# Weekly

One sitting, four segments, fifteen minutes. This is the habit loop that makes the rest of haku compound: wins get captured before memory fades, the most-neglected stakeholder gets thought about, patterns surface before they become surprises, and the product pulse gets a glance.

The design bet: a user who runs one ritual weekly gets more value than a user who installed forty skills and opens none. Never make this session feel like homework.

## Exit signals

If the user says "stop", "that's enough", "gotta go", or similar — end immediately and write whatever has been captured so far. Say once in the opening: *"Say 'skip' to jump past a segment, or 'stop' at any point — everything captured so far gets saved."*

## Before starting

1. Read `~/haku-work-reflections/profile.md` if it exists (calibrates tone and focus).
2. Check what exists: stakeholder files, `wins.md`, `self/reflections.md`, `pulses/`.
3. **First-run case:** if `~/haku-work-reflections/` is missing or nearly empty, don't run a hollow ritual. Say so plainly — *"There's not much logged yet, so a review would come up empty. Want to set up the basics first?"* — and hand off to the `start` skill.
4. Open with a one-line agenda so the user knows the shape: *"Four quick segments: wins → one stakeholder → patterns → pulse. ~15 minutes, less if the week was quiet."*

## Segment 1 — Wins (~5 min)

Apply the `wins-due` skill: probe the recent week by category (delivery, judgment, mentorship, recovery, range) rather than asking a blank "anything notable?". Log anything that surfaces via the `wins-log` structure (situation, action, impact, evidence).

Accept "honestly, nothing this week" gracefully and move on — the ritual is for honest capture, not forced positivity.

## Segment 2 — One stakeholder (~5 min)

Apply the `stakeholder-due` skill to compute what's overdue, but **don't dump the full list** — that's the fast track to overwhelm. Name the single most overdue stakeholder × question pair and offer it:

> *"Most overdue: you haven't reflected on Jill's morale in 6 weeks (monthly cadence). Two minutes on that, or would you rather pick someone else?"*

Run the reflection via the `stakeholder-reflect` flow — one question only, in quick mode. If the user wants the full due list, give it, but the default is one.

## Segment 3 — Patterns (~2 min)

Apply the `patterns-watch` skill in its lightweight form: scan across stakeholder entries, wins, and self-reflections and surface **at most two** cross-cutting observations, each cited to dated entries. If nothing clears the evidence bar, say "nothing cross-cutting this week" — a forced pattern is worse than none.

## Segment 4 — Pulse glance (~1 min)

If `pulses/<area>/` has entries: read the most recent pulse and give one line — anything that moved, anything awaiting follow-up. Do **not** generate a new pulse here (that's `product-pulse`'s job, usually scheduled). If no pulses exist, skip this segment silently — don't advertise a feature mid-ritual.

## Close

Three lines, no more:

1. **Captured:** what got written this session (wins logged, reflection saved).
2. **Noticed:** the one pattern or flag worth keeping in mind this week.
3. **Next:** one concrete suggestion (e.g., "worth booking the conversation with Jill that reflection pointed at").

Then stop. Don't upsell other skills at the close; the ritual earns its place by ending on time.

## Scheduling the ritual

- **On demand** — most users: a calendar block Friday afternoon or Monday morning, then `/haku:weekly`.
- **Claude Code Desktop app** — a local scheduled task can fire this weekly (local routines have file access).
- **Headless/cron** — power users can pre-compute the due lists so the interactive session starts warm:

  ```bash
  # Friday 3pm: compute what's due, save to a scratch note
  0 15 * * 5  claude -p "run /haku:stakeholder-due and /haku:wins-due, write the combined output to ~/haku-work-reflections/due-this-week.md" --allowedTools "Read,Write,Glob,Grep"
  ```

  Cloud routines cannot access local files and won't work with haku.

## Anti-patterns

- **The completionist ritual.** All overdue stakeholders in one sitting → user dreads next week. One is the number.
- **Segment creep.** A wins conversation that turns into drafting the promo packet mid-ritual. Note it, park it, point to `wins-curate` for later.
- **Empty-week shame.** Quiet weeks are data, not failure. Log nothing cheerfully.
- **Skipping the close.** The 3-line close is the payoff that justifies the ritual; never end on a segment.

## Composition

- Wraps: `wins-due`, `wins-log`, `stakeholder-due`, `stakeholder-reflect`, `patterns-watch`
- Hands off to: `start` (first run), `wins-curate` / `report-promo-case` (when a captured win belongs in a packet), `product-pulse` (when the user wants a fresh pulse, not a glance)
