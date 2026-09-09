---
name: read-the-room
description: Use for retrospective subtext reads on meetings, reviews, Slack threads, or 1:1s. Trigger phrases include "what was actually going on in that meeting", "I think X is bothered but I can't tell why", "did anyone push back on my idea or were they just being polite", "read this Slack thread for me", "is the team aligned or just nodding".
---

# Read the Room

Most leadership work happens in the gap between what people *said* and what they *meant*. This skill takes a conversation, meeting, review, Slack thread, or 1:1 (transcript, notes, or recap) and surfaces the subtext: who held back, where agreement is performative, what positions mask what interests. It is **retrospective interpretation** — you bring the room to Claude after.

## When to apply

- The user left a meeting and *something feels off* but can't name it.
- A review or planning session ended in consensus the user doesn't trust.
- A 1:1 left the user wondering what the report actually meant.
- A Slack thread or exec readout is doing more under the surface than its words suggest.
- Before a follow-up conversation, to think about what was missed.

Don't trigger when: the user is just venting (ask which they want); the situation is genuinely surface-level; or they want validation of a locked-in interpretation.

## What to ask for first

1. **The artifact.** Transcript, notes, thread, or recap — the rawer the better; cleaned-up notes have filtered out the signal.
2. **Who was in the room.** Names, roles, relationship to the user. Anyone registered in `~/haku-work-reflections/` — read those files; past reflections are your context.
3. **The user's first interpretation,** surfaced explicitly so you can challenge it.
4. **What outcome they wanted.** Did they get it? Was the easiness itself a flag?

## The interpretation pass

### 1. Surface vs. subtext
Per significant exchange, name what was said and at least two plausible readings — including a kinder one than the user's first. *"Sarah said 'sounds good, let me think about it.' Surface: she's considering. Alt 1: not sold but won't disagree publicly. Alt 2: a concern she'd raise 1:1."*

### 2. Who didn't speak
Often louder than what was said: strong stakeholders who stayed quiet, silence the user moved past, disagreement-by-absence (the principal engineer who skipped the review).

### 3. Performative consensus check
Agreement too fast on a hard topic; generic phrasing ("makes sense," "sounds fine") without specifics; follow-through, or quiet slow-walking.

### 4. Position vs. interest
What people say they want vs. what they need. *"Mark's position: delay launch 2 weeks for testing. Possible interest: he doesn't trust QA; the delay is a proxy for a conversation he can't raise openly."*

### 5. Power dynamics
Who has authority, informal power, who's deferred to or talked over. Authority–credibility misalignment is often where unsaid things live.

### 6. Pattern check (if files available)
Cross-reference `stakeholder-reflect` entries: has Sarah been quiet in reviews for 3 weeks running (pattern, not moment)? Does Mark's QA concern repeat across settings? Team-level pattern?

### 7. Burnout / morale signals
Per person whose energy felt off: disengaged from topics they used to drive, defensive on relaxed details, shorter responses, absent from informal conversation. Tentative — burnout shows in patterns.

## Output format

```
# Read on: [meeting / thread / 1:1] — [date]

## What probably happened
One paragraph, observation vs. interpretation.

## What you might have missed
- [Specific signal, with evidence]

## Performative-consensus flags
- [Where agreement may not be real, and why]

## Underlying interests
- [Person]: stated [X], probably needs [Y]

## Patterns from your files (if any)
- [stakeholder-reflect cross-references]

## Hypotheses to verify directly
- [What to ask, and how, without sounding over-analytical]

## Suggested follow-ups
- [1:1 to schedule, message to send, topic to revisit]
```

## Operating principles

- **Reads are hypotheses, not facts** — *"several signals consistent with Sarah being checked out — strongest [X]. Worth verifying."*
- **Keep observation and interpretation separate** — mixing them is how reads become projections.
- **Generate the kindest plausible interpretation** as a hypothesis, not the truth.
- **Resist confirmation bias** — test the user's read against the data.
- **Don't pathologize normal friction** — disagreement is *good*; silence is the worrying signal.
- **End with verification, not certainty** — things to *ask*, not *believe*.

## Anti-patterns to flag

- **Mind-reading certainty** — "signals consistent with Mark thinking…", with named signals.
- **Substituting the read for the conversation** — "asking Sarah" beats "reading the room."
- **Projecting the user's anxiety onto others** — *"their discomfort, or your sensitivity to it?"*
- **Coherent narratives from sparse data** — two raised eyebrows is not a story.
- **Treating a single reading as definitive** — always generate two; the choice is the user's.
- **Letting reads escalate** into a private theory acted on untested.

## Composition with other skills

- **`stakeholder-reflect`** — destination for what the read produces; source for pattern checks.
- **`stakeholder-synthesize`** — when reads on the same person accumulate.
- **`feedback-frameworks`** — when the read should be raised directly (COIN).
- **`coaching-mode`** — when the next move is *asking*, not *telling*.
- **`one-on-one-prep`** — verification in the next 1:1.
- **`leadership-os`** (Diplomat / Mediator modes) — to act on cross-functional friction.
- **`team-diagnosis`** — when reads cohere into a team-level pattern.
