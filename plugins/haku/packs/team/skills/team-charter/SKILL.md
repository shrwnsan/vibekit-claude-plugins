---
name: team-charter
description: Use when forming a new team, resetting after a reorg, or when a team's goals/roles/norms are unclear and causing friction. Triggers include "create a team charter", "align our team on goals roles norms", "reset the team operating model", "new team kickoff", "team alignment workshop". Facilitates explicit conversation on Moussa's 3X3 foundations (Goals, Roles, Norms); produces a living charter at ~/haku-work-reflections/team-charters/<team-slug>.md.
---

# Team Charter

Create or refresh a team's explicit agreement on **Goals, Roles, and Norms** — the three foundations Moussa identifies as necessary for high-performance teams (the "Commit" step of the 3X3 cycle). Output is a living charter, revisited via `team-check-in` to surface drift.

## When to apply

Trigger when: forming a new team or major initiative; confusion about who does what or unclear decision rights; misaligned goals; implicit or friction-causing norms; after a reorg; before a performance cycle; or the user says *"We keep arguing about who owns X"*.

Skip when: brief ad-hoc group (overhead > value); team in active crisis (stabilize first); user just wants a generic template.

## The 3X3 foundations

### Goals
- Team's mandate — one-sentence purpose
- 2–4 specific goals (SMART if possible); success at 3/6/12 months
- What we're explicitly NOT doing (scope boundaries)
- Key stakeholders and what they need; how progress is measured

### Roles
For each functional role: accountabilities, decision rights (unilateral / consultative / group), dependencies, escalation path. Crucial question: *"Is there work no one currently owns?"* — identify and assign.

### Norms
Communication (channels, response times, meeting hygiene), decision-making (consensus / consultative / decider), conflict handling, meeting rhythms, information sharing, workload & availability, feedback, learning & growth.

**Important:** name explicit norms, not generic values. "We value transparency" is vague; "We post major decisions in #team-updates within 24 hours" is a norm.

## The interview flow

Interviews the user (usually the lead), designed for whole-team participation.

### Phase 1: Context setting
Team name/purpose, members (names, roles, tenure), new team vs. refresh, what prompted this now.

### Phase 2: Goals conversation
- Draft a one-sentence purpose — offer 3–5 wording options.
- Top 2–3 goals this quarter, specific and measurable.
- In scope vs out of scope; metrics/outcomes; who depends on us and vice versa.

### Phase 3: Roles conversation
- List each role; top 3 accountabilities each.
- Ambiguous decision rights? Who decides what?
- Work falling through the cracks; role overlaps causing conflict.

### Phase 4: Norms conversation
Present a menu (meetings, communication, decision rights, incident handling, learning, workload visibility); team chooses what to specify. Push each norm from vague to behavioral: *"We communicate openly"* → *"We voice disagreement in meetings, not after in Slack."*

### Phase 5: Review and commit
Review the full draft; "Who disagrees? What's missing?"; agree storage and review cadence (default: every 6 weeks via `team-check-in`).

## File format and location

`~/haku-work-reflections/team-charters/<team-slug>.md`

```markdown
---
team: [team name]
team_slug: [slugified]
charter_version: 1
created_date: YYYY-MM-DD
last_updated: YYYY-MM-DD
members:
  - name: [name]
    role: [role title]
    responsibilities: [bullet list]
---

# [Team Name] Charter

## Purpose
One-sentence mission: [what value does the team create?]

## Goals
### Goal 1: [specific measurable goal]
- Owner: [name]
- Success metrics: [how measured?]
- Target date: [date]

## Roles & Responsibilities
### Role: Technical Lead — [name]
- Accountabilities: [what decisions, what outputs]
- Decision rights: [unilateral vs consultative]
- Dependencies: [what needed from others]

## Norms
### Communication
- [Behavioral statement]

### Meetings / Decisions / Conflict
- [Behavioral statements]

## Review cadence
We will review this charter every [6] weeks via `team-check-in`. Last review: [date]. Next review: [date].

## Changelog
- v1 (2026-05-09): Initial charter created
```

## Operating principles

- **Explicit, not implied.** "We all know Alice decides infrastructure" → document it.
- **Specific behaviors, not values.**
- **Facilitated, not imposed** — the team owns the content.
- **Living, not archival** — stale charters are worse than none.
- **Concise enough to read in 5 minutes.**
- **Every gap gets an owner; review cadence built in.**

## Composition with other skills

- **`team-check-in`** — uses the charter as baseline; charter review opens every check-in
- **`team-diagnosis`** — charter provides context ("conflict high — what norms are missing?")
- **`stakeholder-register`** — register key individual stakeholders for reflection
- **`strategy-doc`** — link team goals to product strategy
- **`user-profile`** — the lead's preferences can shape norms discussions

## Anti-patterns to flag

- **Generic platitudes** — meaningless without behavioral specification
- **No decision matrix** — endless debates or unilateral overreach
- **No owner** — goals without drivers are fantasies
- **Set-and-forget** — drift accelerates
- **Leader-imposed** — top-down charters fail
- **Too detailed** — principles + allocations, not a procedures manual
- **Ignoring scope boundaries** — non-goals left unstated diffuse focus
