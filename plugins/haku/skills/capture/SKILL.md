---
name: capture
description: Use to log something from the current conversation into the user's haku memory — a decision just made, a win that surfaced, a stakeholder observation, a self-insight. Triggers: "log this", "capture this", "save that decision", "remember this", or a substantive conversation just concluded. Distinct from decision-log / wins-log / stakeholder-reflect / self-reflect invoked directly: drafts FROM the conversation, files after approval.
---

# Capture

The memory system's biggest leak is the conversation that just happened. The user worked through a real decision, surfaced a win, or noticed something about a colleague — in this very session — and then closes the window. The insight existed for one moment in working memory and was never written down.

This skill closes the leak: draft the entry from the conversation, show it, file it. The user's cost drops from "re-type the whole thing into a form" to "read and say yes."

## When to fire

- **Explicitly:** "log this", "capture that", "save this decision", "add to my wins".
- **Proactively, at most once per conversation:** when a discussion just produced something durable — a decision with rationale, a resolved incident, a rehearsed hard conversation, a diagnosis of a person or team. Offer in one line: *"Worth capturing? I can file this as a [decision / win / reflection on X] — 30 seconds."* If declined, drop it; never re-offer in the same session.

Don't fire for: routine Q&A, drafting work whose output already lives somewhere (a PRD file, a sent email), or conversations the user marked as venting.

## Step 1: Classify what this is

| The conversation produced… | Files as | Target |
|---|---|---|
| A choice between options, with rationale | Decision | `decision-log` format |
| Something the user did that had impact | Win | `wins.md` via `wins-log` structure |
| An observation/insight about a person or team | Stakeholder entry | `<category>/<slug>.md` via `stakeholder-reflect` format |
| An insight about the user themselves | Self-reflection | `self/reflections.md` via `self-reflect` format |

One conversation can produce more than one (a resolved incident is often a win *and* a decision). Offer each separately; cap at two — capture is a snack, not a meal.

If it's none of these, say so rather than force-fitting: not everything durable belongs in the memory.

## Step 2: Draft from the conversation

Build the entry **entirely from what was said** — quote the user's own words for judgments and impact claims. Follow the target skill's entry structure exactly (read its SKILL.md if unsure), including today's date. Two rules the source skills enforce that still apply here:

- **Wins need evidence and impact**, not vibes. If the conversation established what happened but not the impact, ask the one missing question instead of writing a vague entry — a hollow win hurts later curation.
- **Stakeholder entries record observations, not verdicts.** "Said X in the standup, third week running" — not "is checked out."

## Step 3: Show, confirm, file

Show the drafted entry in full. The user says yes / edits / no. On yes:

- Append to the correct file under `~/haku-work-reflections/` (respect `$HAKU_WORK_REFLECTIONS_HOME`).
- If the target is a stakeholder who isn't registered, offer `stakeholder-register` first — don't create loose files outside the registry.
- Confirm in one line with the file path. Done. No tour of what else could be logged.

## Anti-patterns

- **The nag.** Offering capture after every exchange turns the best feature into the reason people uninstall. Once per conversation, only when there's a real artifact.
- **Embellishment.** The entry contains what the conversation contains. Don't upgrade "seemed to go fine" into "landed successfully."
- **Format drift.** A captured win must be indistinguishable from one logged via `wins-log` — same structure, same fields — or curation breaks later.
- **Capturing secrets by accident.** If the conversation contained something the user clearly wouldn't want on disk (a name-attached HR situation discussed hypothetically, say), ask rather than assume.

## Composition

- Drafts into the formats owned by: `decision-log`, `wins-log`, `stakeholder-reflect`, `self-reflect`
- `weekly` — the ritual catches what capture missed; capture reduces what the ritual has to dig for
