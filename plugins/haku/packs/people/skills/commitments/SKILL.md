---
name: commitments
description: Use to track promises in ~/haku-work-reflections/commitments.md and keep them from going stale. Trigger phrases include "what have I committed to", "add a commitment", "I promised X by Friday", "am I overcommitted", "help me say no to this", "I need to renegotiate a deadline". Renegotiate early; pressure-test new asks. Distinct from wins-log (what you did vs. what you owe).
---

# Commitments

Trust upward is made of kept promises and *early renegotiation* of unkeepable ones. The failure mode isn't the missed deadline — it's the missed deadline the other person discovered on the deadline. This skill keeps a ledger of what the user owes and makes renegotiation happen while it's still cheap.

## The ledger

`~/haku-work-reflections/commitments.md` (respect `$HAKU_WORK_REFLECTIONS_HOME`). One entry per promise:

```markdown
## [C-014] Eval regression report to Priya (VP Eng)
- promised: 2026-07-08, in the quarterly review
- due: 2026-07-18
- status: open          # open | done | renegotiated | dropped
- stakeholder: priya-shah (managing-up)
- notes: she cares about the enterprise-tier number specifically
```

Statuses are never deleted, only updated — the history of renegotiations *is* the useful data.

## Mode 1: Log a promise

When the user says they committed to something (or `exec-readout-prep` / a 1:1 just ended with a promise made): capture what, to whom, by when, and where it was said. Thirty seconds. If the counterparty is a registered stakeholder, link the slug.

Push back once on vague promises at capture time: "look into it" has no due date and no done-state — *"what did they hear you promise?"* is the question. Log what they heard, not what you meant.

## Mode 2: Review ("what do I owe?")

On request, or as a glance inside `weekly`:

1. **Due soon** (next 7 days) and **overdue**, sorted by counterparty seniority and age.
2. **The slipping** — open items with no progress signal the user can name. These are renegotiation candidates *now*, while the due date is still in front of them.
3. **Load read** — total open commitments. If the count only ever grows, say so plainly: that's not a busy quarter, that's an accumulating default.

For each slipping item, one recommendation: deliver, renegotiate (see script), or consciously drop with notice. "Hope" is not on the list.

## Mode 3: Renegotiate early

The script that preserves trust:

> *"I committed to [X] by [date]. [One-sentence reason it moved — no essay, no blame theater.] I can do [scoped-down version] by [original date], or the full thing by [new date]. Which is more useful to you?"*

The two-option structure matters: it converts an apology into a decision the counterparty controls. Renegotiated early, this *builds* credibility. Update the ledger entry with the new terms and date.

## Mode 4: Before saying yes (or no)

When a new ask arrives, read the open ledger first and put the trade-off on the table:

> *"I can take that. Here's what's currently committed: [top 2–3 relevant items]. If this is urgent, which of these should move?"*

This is the honest no: not a refusal but a prioritization question routed to the person entitled to answer it. If the user simply wants to decline, help them decline once, clearly, with a reason and (when real) an alternative — not a slow-fade maybe. For asks that deserve a yes, log the commitment immediately (Mode 1) so the yes was priced.

## Anti-patterns

- **The ledger as guilt engine.** Overdue items get a renegotiation plan, not a shame spiral. The skill's tone is operational, always.
- **Tracking tasks.** This is not a todo list. Only promises *another person is relying on* go in; the bar is "would someone notice if this didn't happen?"
- **Renegotiating everything.** A user whose entries are majority-renegotiated has a calibration problem, not a communication problem. Surface it once, kindly: the fix is smaller promises, made later.
- **Secret drops.** Dropping a commitment is legitimate; dropping it without telling the counterparty is how trust dies. `status: dropped` requires "notified them" in the notes.

## Composition

- `weekly` — the natural place for the Mode 2 glance
- `exec-readout-prep` — approved asks come with promises; log them on the way out
- `one-on-one-prep` — commitments due to the person you're meeting belong on the agenda
- `the-status-crafter` — "next period" lines in status updates are commitments; keep the two consistent
- `stakeholder-reflect` — a counterparty's reaction to a renegotiation is worth a dated entry
