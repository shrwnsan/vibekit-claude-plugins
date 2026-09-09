---
name: team-close-gap
description: Use when a team has identified a gap between stated goals/roles/norms and actual behavior and needs small-step action plans to close it. Triggers include "close the saying-doing gap", "how do we actually change our behavior", "action plan for team norm change", "small steps to improve team work", "bridge the intention-behavior gap". Third step of Moussa's 3X3; follows `team-check-in` or `team-charter`.
---

# Team Close the Gap

Translate identified alignment gaps (goals, roles, norms) into **small, targeted behavioral changes** with clear owners, environmental support, and progress tracking. The "Close" step of Moussa's 3X3.

## Key insight

High-performing teams close gaps through **small, targeted steps** that are:
- **Specific:** behavior, not aspiration
- **Small:** one change at a time; doable in 2–3 weeks
- **Environmental:** change surroundings to support the new behavior
- **Realistic:** based on current capacity, not ideal future state
- **Tracked:** progress visible; success measurable

Embodies the "realistic optimist" mindset: anticipate obstacles; make the new behavior easier than the old.

## When to apply

Trigger when: a check-in or charter session surfaced 1–3 specific gaps; the team commits to change but falls back into old patterns; a new norm's adoption is uneven; no one acts on a complained-about problem; *"We keep saying we'll do X but we never actually do"*.

Skip when: the gap is a one-time missed deliverable; the team won't admit the gap exists; the gap needs structural change (reorg, process overhaul) — that's a project, not a small step.

## The closure process

### Step 1: Gap specification (5–10 min)
Convert a vague gap into a specific, testable statement. "We need better communication" → "Reduce repeat questions in Slack by centralizing project updates in one channel."

**Template per gap:**
```
Current state: [observable behavior today]
Desired state: [observable behavior we want]
Gap: [what's different?]
```

### Step 2: Identify the smallest possible change (10–15 min)
Ask: *"What's the smallest thing we could do that would move us from current to desired?"*

Rules: **one behavior change per step**; **observable and binary**; **time-bound** (2–3 weeks, then review); **reversible**. Not "improve meeting quality" → "all recurring meetings post an agenda 24h in advance."

### Step 3: Environmental design (10–15 min)
What enables the old behavior and disables the new? Levers:
- **Remove friction from new behavior:** templates, automation, default locations
- **Add friction to old behavior:** remove shortcuts
- **Add cues/reminders:** calendar event, Slack reminder, checklist item
- **Change layout:** move channels, rename folders
- **Social proof:** public commitment, visible tracker

Example: gap "decisions made in private, then announced" → step "all design discussions in #design-review, not DMs" → support: create the channel, pin the norm, manager redirects side-channel discussions.

### Step 4: Owner and success criteria (5 min)
- **Owner:** single named person, not "the team"
- **Success criterion:** evidence after 2–3 weeks? Binary ("100% of meetings had an agenda 24h ahead"), metric ("decision-to-documentation drops from 3 days to same-day"), or qualitative ("retro survey: 80%+ feel more in the loop").

### Step 5: 2-week follow-up plan (5 min)
- **Check-in date** on the calendar; **quick pulse:** "Did it happen? Helpful? Adjust or adopt?"
- **If failed:** diagnose — step too big? Environment unchanged? Owner blocked? Design a smaller step or better support.
- **If successful:** make permanent; consider a second small step.

## Output format

Produces a `team-gap-closure-plan.md` (or appends to the charter's changelog):

```markdown
## Gap closure plan — [date]
**Gap:** [specific gap statement]
**Small step (next 2–3 weeks):** [single observable behavior change]
**Environmental support:** [how we'll make this easier than the old way]
**Owner:** [name]
**Success criterion:** [how we'll know it worked]
**Review date:** YYYY-MM-DD
**Status:** in-progress | done | failed | adopted
```

Multiple gaps = multiple blocks; limit to 2–3 concurrent changes.

## The realistic optimist approach

- **What could get in the way?** Name obstacles before starting.
- **Small enough that failure is unlikely?** If not, break it down.
- **Does the owner have capacity?** If overloaded, re-assign or defer.
- **Is the environment actually changing?** If not, the old behavior persists.

If a step fails, don't blame the owner: *"What about the environment or step design made this hard?"*

## Example from the field

**Gap:** "We don't follow our own decision-making process." Current: decisions in DMs, announced in meetings. Desired: proposal doc, comments, recorded decision. Small step: "for 2 weeks, every decision needs a 1-paragraph proposal in #decisions 24h before announcement." Support: create #decisions, pin guidance, manager redirects. Owner: EM. Success: 8/10 decisions follow the pattern.

## Relationship to other skills

- **Preceded by:** `team-check-in` (diagnoses the gap) or `team-charter` (sets initial targets)
- **Followed by:** another `team-check-in` in 2–3 weeks
- **Connected to:** `wins-log` — closures are team-level wins
- **Contrast:** `performance-management` (individual change) vs. this skill (team/system change)

## Anti-patterns to flag

- **Too many changes at once** — limit to 1–3 concurrent closures.
- **Vague success criteria** — "better communication" can't be measured.
- **Ownerless changes** — "The team will..." means no accountability.
- **Ignoring environment** — behavior change without changing conditions fails.
- **One-and-done** — no follow-up, no stickiness.
- **Grandiose steps** — "revamp our entire design process" is a project.
- **Blaming after failure** — fix the step or environment, not the person.
