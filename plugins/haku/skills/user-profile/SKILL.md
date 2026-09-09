---
name: user-profile
description: Use to create or update the user's anchor profile — one private file (~/haku-work-reflections/profile.md) capturing who they are and the context other skills need. Read automatically by other skills when present, so the user doesn't re-explain themselves every session. Triggers: "set up my profile", "update my profile", "I changed roles, refresh my profile". Explain yourself once, get tailored output forever.
---

# User Profile

Most skills work better when they know who the user is. This skill creates a **single anchor file** carrying standing context that other skills read automatically when present — the user explains themselves once and gets tailored output every session.

The file lives at `~/haku-work-reflections/profile.md` (configurable via `$HAKU_WORK_REFLECTIONS_HOME`) — same private root and privacy posture as the rest of the bundle.

## Root directory ownership

`user-profile` owns creation of the reflections root, its `.gitignore`, and the privacy warning — other skills hand off here rather than duplicating the ceremony. On first run, if the root doesn't exist, create it and the `.gitignore`, then issue the warning before writing:

> I'm about to create `~/haku-work-reflections/`, which will hold your profile and any candid reflections you log over time. This directory lives on your local machine only. Confirm the location, or set `$HAKU_WORK_REFLECTIONS_HOME` if you'd prefer a different one (e.g. an encrypted volume).

Wait for confirmation; if the root exists, skip the ceremony — it happens once. If `~/haku-work-reflections/` doesn't exist but `~/bettersense-work-reflections/` does (a pre-rename root), surface it first and offer `mv` to the new name — or `$HAKU_WORK_REFLECTIONS_HOME` pointed at the old path — before creating anything fresh; a second root silently forks the user's memory.

## When to apply

Trigger when the user is setting up the bundle for the first time; changed roles, teams, or scope; notices another skill producing generic output that context would sharpen; wants to see or update their profile; or wants an alternate "hat." Skip for one-off questions — don't suggest setup mid-flow.

## File format

Single markdown file, frontmatter + sections, hand-editable — the user owns it.

```markdown
---
name: [optional]
last_updated: 2026-05-03
default_hat: pm
---

# Default profile

## Role
[One paragraph: title, level, time in role, reporting shape.]

## Org and product context
[Company stage/size, what you own, team size, key cross-functional partners.]

## Current strategic focus (next 1-2 quarters)
[2-4 bullets — the narrative arc, not a backlog.]

## Communication style preferences
["Concise, direct over diplomatic, push back on me if my framing is off."]

## What I'm working on as a leader
[1-2 personal growth areas.]

## Stack and tools (if relevant)

## Cross-references
- Stakeholder files, wins log, self-reflections (paths under the same root)

# Alternate hats (optional)

## Hat: [mode]
[What differs from default — stakeholders, KPIs, communication register.]
```

## Exit signals

If the user says "stop", "exit", "skip this", or similar — stop immediately, summarize what was captured, offer to save a partial profile if enough was gathered, and end cleanly. Announce once in the opening: *"Say 'stop' at any time — we'll wrap up with whatever we have."*

## Interview flow

Walk through in order; keep each step short — this is a doorway, not an interrogation. Detail fills in over time.

1. **Name** (optional; skip if the user prefers).
2. **Role** — title, level, time in role, reporting shape.
3. **Org and product context** — two or three sentences.
4. **Current strategic focus** — the arc, not the backlog.
5. **Communication style** — capture verbatim where possible.
6. **Personal growth area** — optional but high value.
7. **Stack and tools** — only if relevant to their work.
8. **Alternate hats** — only if indicated.

Render the result, confirm with the user, then write.

## Update flow

**Show** the current profile; **edit a specific section** on request ("update my strategic focus"); or **refresh** by re-running the interview pre-populated from the file. Always bump `last_updated`. Past ~90 days, surface it gently — *"last updated [date] — anything material changed?"* — once.

## How other skills use it

> **If `profile.md` exists, read it before doing your work.** Tailor output to role, level, communication style, current focus, and stack; don't repeat questions the profile already answers.

`the-spec-writer` uses it for scope assumptions and stack defaults; installed pack skills (translator, explainer, coaching, reporting) read it for audience and calibration. If the profile is missing, everything still works — output is just more generic.

## Operating principles

- **The user owns the file.** Plain markdown, direct edits welcome; this skill is a doorway and a periodic refresher, not a gatekeeper.
- **Keep it short.** ~30 lines of content; a two-page profile doesn't get read.
- **Standing context only.** Stakeholders, reflections, and wins have their own homes — cross-reference, don't duplicate.
- **Privacy is non-negotiable.** Local file, gitignored, never auto-shared. If pointed at a hosted model, the contents go through that provider — disclose this on first run.
- **Hats are opt-in.** Most users have one mode; default to `default_hat` unless the user signals otherwise.

## Anti-patterns to flag

Résumé language ("spearheaded transformative AI initiatives") — signaling, not standing context; listing reports or stakeholders in the profile (that's what the stakeholder registry is for); weekly updates (it's a semi-static anchor — update on real role/scope changes); suggesting hats unprompted; and a profile contradicting recent stakeholder or wins entries — surface the gap, let the user resolve it.
