---
name: exec-readout-prep
description: Use when the user needs a decision from executives and is preparing the meeting or memo that gets it — QBRs, roadmap reviews, headcount asks, investment pitches. Trigger phrases include "prep my exec readout", "I'm presenting to leadership", "I need sign-off from the VP", "help me get this decision approved". Distinct from demo-prep (performing a product) and the-status-crafter (recurring update rhythm).
---

# Exec Readout Prep

Executive meetings are decided before they start or not at all. This skill preps for the decision, not the performance — a readout that "goes well" but produces no decision is a failure with good production values.

## Step 1: Name the ask — one sentence, falsifiable

Before slides, before narrative:

> *"I am asking [who] to approve [what] by [when], which costs [what] and unblocks [what]."*

If the user can't produce this sentence, the meeting isn't ready to book. "Alignment" and "visibility" are not asks — push until there is a decision someone can say yes or no to. If it's genuinely an FYI readout, say so on slide one.

## Step 2: Map the room

For each person in the meeting, one line each: what they care about, what they'll ask, and whether you need their **yes**, their **non-objection**, or just their **awareness**.

**Use the memory.** For each attendee registered as a stakeholder, read their `~/haku-work-reflections/<category>/<slug>.md` — past entries hold their question patterns, hot buttons, and how they've reacted to similar asks. Also read `strategy/<area>.md` if present: the ask should be framed as movement on a track leadership has already bought, in the vocabulary they already use. An ask that maps to no known priority is fighting uphill; say that to the user before they book the room.

Identify the **most senior skeptic** — the prep is calibrated to them, not to the friendly sponsor.

## Step 3: Pre-wire

The cardinal rule: **no decision-maker hears the ask for the first time in the meeting.**

- List who needs a 1:1 before the readout (any must-have yes, any likely blocker).
- For each pre-wire conversation: share the draft, ask "what would make this a no for you?", and *change the material* based on what you hear. Pre-wiring that doesn't alter the deck was flattery, not pre-wiring.
- Recruit the sponsor: whose air cover matters, and what exact sentence do you want them saying when the skeptic pushes?

If there's no time to pre-wire, downgrade expectations honestly: the meeting's realistic best outcome is "agreed on the follow-up," not "approved."

## Step 4: Build the material — decision-first

Structure (memo or slides, same skeleton):

1. **The ask** — the Step 1 sentence, verbatim, first.
2. **Why now** — the cost of deciding later, in business terms. Urgency from evidence, not adjectives.
3. **Options considered** — the recommendation plus 1–2 real alternatives with honest trade-offs, including "do nothing" and its price.
4. **Risks and mitigations** — name the top 2–3 yourself; an objection you raise is analysis, an objection they raise is a flaw.
5. **The plan if yes** — first three steps, owner, when they'd see evidence it's working.

Everything else is appendix. Assume the material gets 90 seconds of true attention; the appendix exists for the person who gives it twenty minutes.

## Step 5: Rehearse the hard five minutes

Skip rehearsing the walkthrough; rehearse the interruptions:

- The skeptic's most likely objection (you know it from Step 2 — draft the two-sentence answer).
- The "why not half the cost / half the scope?" cut-down. Know your actual floor before the meeting, not during it.
- The question you're dreading. There's always one; naming it aloud with the user usually shrinks it.
- The graceful non-answer for what you don't know: *"I'll have that number to you by [date]"* beats improvisation.

## Afterward

Two prompts:
- Log the outcome as a dated entry — the decision (and its conditions) via `decision-log`, and anything learned about attendees via `stakeholder-reflect`. Next quarter's readout preps itself from these.
- If the ask was approved, note what was promised and when it's due — that promise is now a commitment worth tracking (see `commitments`).

## Anti-patterns

- **The ambush.** A big ask, unwired, sprung on a full room. Even when it works, it teaches leadership to brace when you book meetings.
- **The data dump.** Twenty slides of evidence, ask on slide nineteen. Decision-makers decide early and spend the rest of the meeting confirming; put the ask where the deciding happens.
- **Winning the debate.** Correcting an exec's misframe in public costs more than the point is worth. Park it: *"let me take that offline and come back with the detail."*
- **Vague success.** If the user can't say what "this went well" means (approved? follow-up scheduled? skeptic neutralized?), define it in prep.

## Composition

- `stakeholder-reflect` / `stakeholder-register` — the exec profiles this skill reads and updates
- `strategy-doc` — the vocabulary and tracks the ask should frame against
- `the-translator` — when the readout includes AI-technical results needing reframing
- `decision-log` — file the decision the meeting produces
- `influence-without-authority` — when the real work is coalition-building over weeks, not one meeting
