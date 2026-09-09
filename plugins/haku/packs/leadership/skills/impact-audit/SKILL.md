---
name: impact-audit
description: Use when a PM or team stress-tests whether work connects to business outcomes—"are we even pointed at the right thing?"—before strategy-doc or prioritization-frameworks. Trigger phrases include "are we doing the right work?", "I'm worried my team isn't driving real impact", "help me check if my team is aligned", "I'm worried about layoffs", or any doubt the work would survive scrutiny.
---

# Impact Audit

Diagnostic on whether a team's work is genuinely connected to business outcomes. Not about *how* to build things—that's `prioritization-frameworks`, `strategy-doc`, and `metrics-design`. This runs *before* those, when the question is whether the team is pointed at the right thing at all.

Inspired by Matt LeMay's *Impact First Product Teams* framework.

## The audit: three questions

Run in order; each builds on the previous. Work through whatever surfaces—don't rush ahead.

### Question 1: The budget stress test

> "If the person who controls your team's budget had to justify it from scratch today, could they? Would they?"

Ask for an honest, not optimistic, answer. Hedged answers ("I think so," "probably") are the signal. Confident yes: move on. Anything less: spend time here.

Useful follow-ups:
- "What would you point to as the clearest evidence that this team is a good investment?"
- "If your team disappeared tomorrow, what would the business noticeably lose?"

*(In large orgs, substitute "the exec who controls your budget" for "CEO"—the principle is the same.)*

### Question 2: The death spiral check

Teams fall into low-impact work gradually: small, safe additions—features that won't break anything, cosmetic improvements—compound. The product gets crowded, complexity grows, and high-impact work gets harder. The safer the work feels, the more accumulates.

Ask: **"What has your team shipped in the last two quarters? Would those things be missed if they hadn't been built?"**

Listen for:
- "Requested" work with unclear business impact
- Features that shipped but nobody tracked the outcome
- A roadmap driven by stakeholder asks rather than a business goal
- Busy, but not sure it matters

If the work feels like decorating rather than engine work, name it directly—not as blame, but because the pattern is self-reinforcing and the way out is deliberate.

### Question 3: The goal distance check

> "Can you state your team's primary goal and connect it to a real business outcome in one step?"

One step = one mathematical operator. Examples:

- "We convert single-product users to multi-product—each conversion is worth £X in lifetime value, so our goal contributes £Y." ✓
- "The company's growth goal is 1M users—we own 100K of that." ✓
- "We improve onboarding which improves retention which improves revenue." ✗ (too many steps and assumptions)

*(In large orgs, "real business outcome" means the nearest goal with genuine budget authority—a platform team's one step might be to the consuming team's goal.)*

If the user can't state this cleanly, that's the work. Don't move past it.

## If the audit surfaces problems

Matt LeMay's three steps to becoming an impact-first team:

**Step 1: Set team goals no more than one step from the nearest meaningful business goal.** Don't cascade goals down five layers until the connection is invisible. Find the goal the budget holder cares about and connect directly; if you can't, change the goal.

**Step 2: Keep impact first at every stage, not just goal-setting.** When writing epics, scoping sprints, or reviewing priorities, keep asking how this connects to the goal. If the answer gets fuzzy, stop.

**Step 3: Express impact in the same unit as your goal.** Users converted? Estimate in users. Revenue? Estimate in revenue. Rough is fine—the point is maintaining the connection, not precision.

## A note on practice-level alibi progress

Also worth checking occasionally: the *practices themselves*. For each regular practice (OKR cycle, sprint reviews, discovery sessions), what problem does it solve, and for whom? Would the team notice if it disappeared?

A practice done correctly isn't the same as a practice worth doing—teams can run textbook OKR seasons that produce goals nobody reads. This doesn't mean abandoning the practice; it means being honest about whether it's earning its place.

## Composition with other skills

Run this skill *before*:
- `strategy-doc` — if the audit reveals misalignment, fix the goal first, then write the strategy
- `prioritization-frameworks` — impact estimates must be in the same unit as the team goal, or scores are meaningless
- `metrics-design` — the north star should be the goal that passed the one-step test

If the user is already using those skills and something still feels disconnected, this is the right diagnostic.

## Anti-patterns to flag

- **Confident answers that don't survive one follow-up.** Push gently.
- **Blaming the org.** The audit is about what the team can do from where they sit—not waiting for leadership to improve first.
- **Confusing busyness with impact.** A team shipping every sprint can still be in the death spiral.
- **Treating this as one-time.** Run it when something feels off, the environment changes, or layoffs are in the air.
