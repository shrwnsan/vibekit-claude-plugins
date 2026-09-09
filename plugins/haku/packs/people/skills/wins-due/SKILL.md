---
name: wins-due
description: Use for a low-pressure nudge on whether anything from the recent week is worth logging. Weekly Desktop scheduled task friendly (never cloud routines); probes by category. Trigger phrases include "what should I log this week", "is anything missing from my wins doc", "did I do anything notable this week", "Friday wins check".
---

# Wins Due

A weekly low-pressure nudge to surface forgotten wins. Most underlogging is forgetting, not modesty — *"what did you do this week?"* gets blank stares while *"did you mentor anyone? recover anything? say a useful no?"* gets memory hits.

## When to apply

Triggers: Friday-afternoon "did anything happen?" moments; after a big shipping week; wired to `/schedule` (recommended: weekly, late-week).

Skip when: the user just logged something today; the user is mid-flow on something else (don't context-switch them unsolicited).

## Loading

1. Read `~/haku-work-reflections/wins.md` (configurable via `$HAKU_WORK_REFLECTIONS_HOME`).
2. Find the most recent `## YYYY-MM-DD —` entry; compute `days_since_last`.
3. No file → hand off to `wins-log` (owns first-run setup).

## When to nudge

- `< 7` days: don't nudge — *"Last entry was 3 days ago — you're current. Nothing to chase."*
- `7–13`: gentle nudge.
- `≥ 14`: stronger nudge; things may be slipping from memory.
- Never logged: warmer onboarding — *"Want to start with one thing from this week, or skip for now?"*

## The probe

Probe by category — **selective memory undercounts certain types**: most users remember `delivery` and forget `judgment`, `mentorship`, `recovery`, `culture`. Pick 4–5 per session, randomize across runs:

- **Delivery:** ship anything with real effort? Push past a hard milestone?
- **Judgment:** a hard call? A useful *no*? An unpopular-but-right scope cut?
- **Recovery:** save anything sliding sideways? Take over something stuck?
- **Mentorship:** help someone with what they couldn't do alone?
- **Range:** work outside your lane? Fix something that wasn't yours?
- **Craft:** work you're particularly proud of — sharp doc, clean prototype?
- **Culture:** push a new norm? Surface a workaround the team tolerated?
- **Learning:** pick up a capability you'll use again?

## Output format

```
You haven't logged a win in 11 days. Quick probe — anything in these buckets?

🚀 Delivery: ship anything that mattered? Push past a hard milestone?
⚖️ Judgment: make a call under uncertainty? Say a useful "no"?
🧯 Recovery: save anything that was going sideways?
🤝 Mentorship: help someone with something they couldn't have done alone?
🪜 Range: cover for someone? Fix something outside your lane?

Pick one and we can log it now (`wins-log`), or say "nothing notable" and I'll get out of your way.
```

"Nothing notable" → accept cleanly: *"Fair. Quiet weeks happen. Talk again next Friday."* If they pick something, hand off to `wins-log` — this skill discovers; `wins-log` captures.

## Optional: scan accessible context

If integrations are reachable (commits, calendar, chat), offer — **opt-in only, never auto-scan**: *"Want me to skim recent commits / calendar / threads for things you might have forgotten? You'd review before anything gets logged."* If invoked, look for substantive commits, big launches and hard meetings, threads with pushback or calls made. Surface 3–5 candidates as bullets for the user to pick.

## Wiring to a schedule

- **Claude Code Desktop app (recommended):** Routines → New routine → Local, weekly Friday: `Run /wins-due and show me the list`. Full local file access, persists indefinitely.
- **Terminal / CLI users:** OS-level scheduling (cron / Task Scheduler). Session-scoped tasks expire after 7 days — unsuitable.
- **Never suggest cloud routines** — they run on Anthropic's servers and cannot access `~/haku-work-reflections/`.

Don't set up a schedule automatically — the user owns the cadence decision.

## Operating principles

- **Lower pressure than `stakeholder-due`.** A quiet week of wins is sometimes just a quiet week.
- **Probe, don't cheerlead.** "What did you crush?" produces inflated entries; "Did you say a useful no?" produces real ones.
- **Vary the probes.** Same five questions every Friday becomes background noise.
- **Hand off cleanly.** Don't capture inline — you'll either dilute discovery or rush capture.
- **Be okay with "no."** A weekly nag becomes a weekly skip.

## Anti-patterns to flag

- **Nagging after skipped weeks** — ask once if the cadence is right; offer to drop to monthly or pause.
- **Probing every category every time** — 4–5 is the cap.
- **Logging inline** — skipping `wins-log`'s structured capture produces vague entries that hurt later curation.
- **Treating absence of wins as a problem** — some weeks are admin and planning.

## The weekly ritual

One segment of the `weekly` skill — a ~15-minute session running wins capture, the most-overdue stakeholder reflection, and a patterns scan. For the full ritual, route to `/haku:weekly`.
