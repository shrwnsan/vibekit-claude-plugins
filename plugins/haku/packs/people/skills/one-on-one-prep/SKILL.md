---
name: one-on-one-prep
description: Use when preparing for a 1:1 — manager with a report, IC with their manager, or peer sync. Trigger phrases include "I have a 1:1 with X tomorrow", "help me prep for my 1:1", "what should I bring up in my next 1:1?". Builds a relationship-matched agenda; if the other person is a registered stakeholder, reads their reflection file first.
---

# 1:1 Prep

A good 1:1 is the highest-leverage 30 minutes a manager and report have; a bad one is a status update with extra steps. The difference is preparation. This skill builds an agenda matched to **who's meeting whom** and **what's actually going on**.

## Zeroth: load what you already know

Before asking the user anything:

1. **Profile.** Read `~/haku-work-reflections/profile.md` if present — role context and communication style.
2. **The stakeholder file.** Resolve the person via `~/haku-work-reflections/stakeholders.json`; if registered, read their `<category>/<slug>.md` in full.

Surface a short **"worth raising"** list:
- **Open loops** — anything past entries say the user planned to follow up on, with dates. Open loops corrode trust; this is where they get caught.
- **Recent signals** — morale shifts, growth asks, peer friction from recent entries.
- **Planned asks** — `ask`-category entries with no logged answer yet.
- **Staleness flags** — topics untouched a long time (career conversation, feedback exchange).

Present as: *"From your reflections on [name]: [2–4 items]. Want any of these on the agenda?"* If the person isn't registered, proceed and mention once that `stakeholder-register` makes future preps arrive pre-loaded. After the 1:1: *"want to log how it went?"* → `stakeholder-reflect`.

## First: figure out the role

Confirm before drafting:
- **Manager → Report.** Report's growth and well-being; status last, if at all.
- **Report → Manager.** Getting unblocked, surfacing feedback up, managing visibility.
- **Peer 1:1.** Alignment, dependencies, trade-offs.
- **Skip-level.** Signal-gathering and trust-building, not problem-solving.

If unclear, ask. The wrong template applied to the right meeting is worse than no template.

## Manager → Report

Default 30-min structure:
1. **Personal check-in (3–5 min).** Genuine. If something's off, the agenda yields to it.
2. **Their agenda first (10–15 min).** If they have nothing, that's a signal — ask what's on their mind, not their task list.
3. **Career & growth (5 min, every 2nd–3rd meeting).** What are they working toward in 6–18 months? Don't wait for the review cycle.
4. **Feedback exchange (5 min).** Give specific feedback (use `feedback-frameworks`); ask for feedback on yourself — the asking is the higher-leverage half.
5. **Your asks (3 min, last).**

Prep prompts: What's most important for this person right now? Open loops from last time? Feedback I've been holding? What am I sensing but haven't asked about? What do they need from *me* this week?

## Report → Manager

1. **Get unblocked.** Decisions, context, air-cover you can't get elsewhere. Lead with these.
2. **Manage upward visibility.** A curated set of things that matter to *them* — not a status update.
3. **Calibrate.** Are you on track? What does great look like in their eyes this quarter?

Prep prompts: One decision I need them to make? One piece of context they lack? One thing I want feedback on (specific)? What should they know about my capacity? Any feedback for *them* I've been avoiding (deliver via `feedback-frameworks`)?

Anti-pattern: walking in with a list of completed work — they can read the changelog.

## Peer 1:1 (cross-functional)

The point is *alignment*, not friendship-building.
1. What are you each working on that affects the other? Surface dependencies before they break.
2. Where might we be misaligned — roadmap, resourcing, conflicting promises?
3. What can I help you with? A concrete offer beats "let me know."

Run every 2–4 weeks during heavy collaboration; pause when work decouples.

## Skip-level

As the report: bring 2–3 things going well with specifics; 1–2 things you're wrestling with (not escalation); ask about *their* priorities.
As the skip-level manager: listen 80%; don't undercut the direct manager; same complaint across skip-levels = systemic issue.

## Exit signals

If the user says "stop", "exit", "I'm done", "skip this", "pause", or similar — stop immediately and share what's built. In the opening message add: *"You can say 'stop' at any time and I'll share what we have so far."*

## How to help the user

1. Confirm role and relationship state (new report, recent friction, recent promotion — these change the agenda).
2. Ask about open loops.
3. Build the agenda in **4–6 bullets max**.
4. Pair with `feedback-frameworks` if feedback is on the agenda; pre-draft it.
5. Suggest one thing to *not* discuss — naming what's cut to next time is part of prep.

## Anti-patterns to flag

- **The status report 1:1** — replaceable by Slack; don't waste the slot.
- **Skipping recurring 1:1s when busy** — that's when they matter most. Shorten, don't cancel.
- **The manager monologue** — talking >50% of a manager→report 1:1 is doing it wrong.
- **No follow-through** — unkept 1:1 agreements train people to disengage. Track them.
- **Avoiding the hard topic for "another time."** It's never another time. Plan it in.
