---
name: demo-prep
description: Use when the user is preparing for a demo — exec review, customer pitch, board update, investor meeting, sales call, or all-hands. Trigger phrases include "I'm demoing X tomorrow", "help me prep for the review", "what could go wrong in this demo?". Especially valuable for AI-feature demos, where probabilistic systems can fail in ways scripted demos can't predict.
---

# Demo Prep

A demo is a *performance of confidence*, not a feature walkthrough. Prep means knowing what you'll do when the magic doesn't happen, and landing the message regardless.

## When to apply

- Exec, board, or investor demos
- Sales demos with high-value prospects
- Customer pilot kickoffs
- Internal cross-functional reviews where stakeholders will form opinions
- Any AI-feature demo (extra critical)

Skip for: routine standups, casual show-and-tells, audiences already sold.

## Before Pass 1: load the anchors

- **Strategy** — read `~/haku-work-reflections/strategy/<area>.md` if present. The headline should trace to a strategic track in the strategy's own vocabulary; a demo that maps to no track is a finding worth surfacing.
- **Latest pulse** — read the most recent `~/haku-work-reflections/pulses/<area>/pulse-*.md` if present. Gives current metrics for the script (Pass 4) and known risks for the pre-mortem (Pass 3) — an open follow-up in the pulse is exactly the question a sharp exec asks mid-demo.
- **Profile** — `profile.md` for the user's role and typical audiences.

Missing files are fine; proceed and don't lecture. If the pulse is stale relative to the period the demo covers, flag it — demoing last month's numbers is a Pass 3 hazard itself.

## The five-pass demo prep

### Pass 1: The headline

The **one sentence** the audience should repeat to a colleague. Headlines are *outcomes*, not features:
- Bad: "We shipped the new summarization feature."
- Good: "We process contracts legal spends 4 hours per deal on, in 90 seconds with verifiable citations."

Anything that doesn't reinforce the headline is a candidate to cut.

### Pass 2: The audience

Per stakeholder, one line: what they care about, their likeliest question, what makes them block / champion / stay neutral. Then re-check the headline against the *most senior skeptic*; sharpen if it doesn't land.

### Pass 3: The pre-mortem

*"Imagine the demo failed. Why?"* — force at least five answers across:

- **Technical:** internet drops, slow model, eval fails on a specific input, screen-share glitch, login expires.
- **AI-specific:** hallucination on a live input, refusal/over-refusal, wrong format, empty retrieval, output exposes unexpected data.
- **Narrative:** unanswerable question, misinterpreted metric, stakeholder hijacks the meeting.
- **Logistical:** wrong projector, locked demo account, dependency down, time runs out.

For each: prevent, mitigate, or accept-and-have-a-line-ready. Write the lines.

### Pass 4: The script

- **Opening** (45s): land the headline before any feature.
- **Core flow** (3–5 min): one path, no detours, inputs you've tested repeatedly.
- **Receipts** (1–2 min): eval scores, customer outcomes, before/after metrics — what convinces skeptics.
- **Ask** (30s): explicit next step, not "any questions".

For AI demos, *script the inputs* — ones you've run 20 times. If taking a live input, prepare a line for "the model gave a worse answer than usual" (usually: "that's the edge case our eval set catches").

### Pass 5: The Q&A

Top 10 likely questions; each with a one-sentence answer, the data you'd reach for, and the redirect if it's a rabbit hole. Pre-load the AI-specific ones — they *will* come up:

- "How often is it wrong?" → eval score, with confidence
- "What happens when it's wrong?" → fallback path, named
- "How do you prevent [hallucination / injection / data leak]?" → guardrail architecture, briefly
- "Cost per request?" → know the number cold
- "Why this model and not [competitor]?" → a trade-off you actually evaluated
- "Who reviewed this for safety?" → real names, real process

No crisp answers → the demo isn't ready. Fix before, not in the room.

## AI demo special hazards

- **No cold-cache calls.** Warm the system; hit the same prompts if caching.
- **Have a backup recording.** Switch to it without missing a beat if live fails.
- **Pre-stage the inputs.** Audience-visible inputs must be validated.
- **Show the boring path too.** One realistic-but-imperfect case builds more trust than five wow moments.
- **Never let the audience drive the keyboard** in a high-stakes demo. Take the suggestion, do it yourself, narrate.

## Output

- The one-sentence headline
- An audience map (one line per stakeholder)
- A pre-mortem list with mitigation/response per item
- A scripted demo flow with timings
- Top-10 Q&A prep, with crisp answers for AI-specific ones

If the demo is under 24 hours away, add a **dry-run checklist**: backup recording playable, inputs pre-loaded, dependencies up, test account working, time zone correct.

## Anti-patterns to flag

- **Slides as a crutch.** If slides could replace it, you're presenting, not demoing. Decide which.
- **No ask.** Always end with an explicit next step.
- **Live live live.** "This is live!" is a disaster when it fails. Match risk to audience.
- **Demoing the team's pride.** The cool architecture isn't the headline; the user outcome is.
