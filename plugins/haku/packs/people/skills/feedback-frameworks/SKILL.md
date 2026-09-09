---
name: feedback-frameworks
description: Use when the user is preparing to give feedback to a teammate, direct report, peer, or stakeholder — performance reviews, 1:1 prep, post-incident conversations, peer reviews, 360s, written async feedback, or any moment they're drafting "how do I tell them that…". Apply the COIN structure to compose the message and the SOLID checklist to pressure-test it before delivery.
---

# Feedback Frameworks: COIN + SOLID

For **preparing or rehearsing feedback for another person**. COIN structures what to say; SOLID pressure-tests it. Flow: **COIN draft → SOLID check → revise**.

**User profile:** if `~/haku-work-reflections/profile.md` exists, read it first — it carries the user's communication style and directness preference, which calibrate the draft.

**Evidence from reflections:** if the recipient is a registered stakeholder (check `~/haku-work-reflections/stakeholders.json`), read their `<category>/<slug>.md` first. Dated entries are exactly what COIN's Observation step needs — and they survive a defensive "that was one time" the way memory can't. Never import an entry the user marked secondhand — SOLID drops it anyway.

## Exit signals

On "stop", "exit", "I'm done", "skip this", "pause", or similar — stop immediately, share whatever has been drafted (even a partial COIN), end cleanly. Opening message includes: *"You can say 'stop' at any time and I'll share whatever we've drafted so far."*

## When to use

Trigger phrases: "How do I tell my report that…", "I need to give feedback on…", "Help me draft my 360 review for…", "I have a hard 1:1 tomorrow about…", "Can you review this feedback I'm about to send?" — or any feedback draft the user shares.

If the user just wants to vent, ask before applying the framework.

## Before drafting: three questions

1. **Solicited, or am I ambushing them?** If unsolicited, plan how to ask permission first.
2. **Did I observe this directly?** If secondhand, name it as such or talk to the firsthand source.
3. **What outcome do I want?** Behavior change, repair, recognition, alignment? Frame sets tone.

Surface any shaky answer before drafting.

## Part 1: COIN — the structure

Four stages, in order. Some implementations swap "Connection" for "Context"; either is fine.

### C — Connection / Context
Don't open cold; signal the topic so the recipient isn't blindsided. *"Got a few minutes? About yesterday's stakeholder review."* Avoid theatrical preambles and praise-as-setup.

### O — Observation
Neutral, factual language. No labels, no "you always / you never."
- Bad: *"You were distracted in the meeting."*
- Good: *"During the half-hour review you were on your phone for stretches and missed two questions directed at you."*

Rewrite adjectives about the *person* ("you were dismissive") to describe the *behavior* ("you cut in twice before they finished").

### I — Impact
Connect the behavior to a concrete outcome on the work, team, stakeholders, or the person's goals; if impact is only likely and future, say so. *"Because the spec was a day late, the iOS team pushed sprint planning and lost the QA window."* Tie impact to behavior, never identity.

### N — Next Steps
End with a path forward, co-created: *"One thing that might help is X — what would work for you?"* Land on something specific enough to recognize next time.

## Part 2: SOLID — the quality check

Run the draft through SOLID; notice what's missing and decide whether to address it.

- **S — Specific, Sincere, Solicited:** Named incidents and dates, not "you're always late." Given from care — if angry, delay. Did they agree to receive this now?
- **O — Objective, first-hand observation:** Strip interpretation; flag secondhand input.
- **L — Learning-focused, Logical:** Something to take away? Does observation → impact → request hold?
- **I — Impact discussed:** Did the draft say what changed (or will)? This makes feedback consequential, not nitpicky.
- **D — Direct, Dialogue-based:** No burying the lede; leave room for response — in async, an explicit invitation.

## How to help the user

1. **Diagnose** the situation (the three pre-questions).
2. **Produce or revise a COIN draft**, parts clearly labeled.
3. **Run SOLID**: for each letter, hit / partial / missing, and why.
4. **Offer one revised version.**
5. **Flag traps:** feedback that's the giver's frustration; identity-level statements posing as behavioral; "feedback" that's an instruction with no dialogue; praise too vague to repeat.

## Worked example

**User:** *"My senior engineer keeps shutting down juniors in standup. I want to tell him to stop being so dismissive."*

**Diagnose:** Observed directly (yes); not solicited (ask for a 1:1); outcome: behavior change, relationship preserved.

**COIN draft:**
- *Connection:* "Got fifteen minutes? Something I noticed in standup this week."
- *Observation:* "In Tuesday's and Thursday's standup, when Priya and Alex shared their approaches, you cut in within a few seconds with 'that won't work' before they finished."
- *Impact:* "The juniors stopped volunteering ideas, and we lost a real option — Priya's approach was the one the architect later recommended."
- *Next steps:* "I'd like a version that keeps your judgment in the room without closing the door early — holding the first reaction for thirty seconds, say. What feels workable?"

**SOLID:** S ✓ (specific, sincere, solicited once the 1:1 is set); O ✓ (behavior, not character); L ✓; I ✓; D ✓.

Deliver.
