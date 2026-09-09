---
name: team-diagnosis
description: Use when the user wants a structured read on their team's *health*, beyond individual morale. Triggers: "how is my team doing", "I want a team health check", "diagnose my team", "before my skip-level update, what should I flag", "is something off with the team that I'm missing". Reads stakeholder-reflect entries + team file; outputs patterns, risks, actions.
---

# Team Diagnosis

Individual reflection (`stakeholder-reflect`) catches per-person signals. **Team health** shows up in patterns across people and second-order signals (who's gone quiet, who's covering for whom). This skill checks dimensions usually unexamined until something breaks.

## When to use

- **Quarterly cadence**, ideally before a skip-level update or planning round.
- **After a triggering event** — surprise resignation, missed delivery, an exec asking "is your team okay?".
- **Before a hard decision** (reorg, headcount cut) needing a calibrated read.
- **Vague unease** the user can't articulate.


Don't trigger for: status updates, sprint reviews, individual performance concerns (use `performance-management` or `stakeholder-reflect`).

## Inputs to gather first

1. **Stakeholder-reflect files** per direct report (`~/haku-work-reflections/managing-down/<slug>.md`).
2. **The team file** if one exists (`~/haku-work-reflections/teams/<slug>.md`).
3. **Retros**, **eng survey scores**, **attrition events**, **delivery track record**.

Gut sense only → say the diagnosis is qualitative; probe their observations.

## The eight dimensions

Score each **green / yellow / red** with evidence:

### 1. Delivery cadence
Quarterly-goal hit rate (2–3 quarters); plan-vs-actual drift (1.5x estimates?); cancellations (upstream chaos?).

### 2. Attrition risk
Quiet in 1:1s; pointed "what's next" talk; passed-over; comp below market; surprise resignations (each a missed signal). 15%+ unwanted attrition a year: find leading indicators first.

### 3. Dependency tax
Time paid to other teams' chaos: meetings existing because something else is broken; recurring "blocked on X team"; private friction complaints.

### 4. On-call burden
Pages per oncall per week (trending?); concentration (one de facto SME?); toil ratio (incidents vs. papercuts).

### 5. Peer relationships and cross-functional health
PMs vs. eng frustration? Underleveraged partnerships? A peer team that resents this one?

### 6. Information flow
Skip-level surprises (should have flowed up earlier); decisions without needed people; "I didn't know X was happening."

### 7. Technical health
Coverage trends; unaddressed tech debt; velocity slowed by system friction; dreaded systems. **Onboarding time** — long ramp signals a hard-to-navigate system; if internal-transfer onboarding takes as long, tooling/docs/context don't travel. **Developer experience friction** — manual handoffs that look automated; dashboards fine but lived experience painful. For deeper diagnosis, trigger `engineering-health`.

### 8. Culture and norms
Juniors getting their say (compose with `stakeholder-reflect` team questions)? Safety (risks raised or buried)? Peer feedback or top-down only? Learning or execution-only? Gallows humor at unsaid problems?

## Output format

A team health one-pager:

```
# Team Diagnosis: [team] — [date]

## Top-line read
One paragraph: what's quietly fine, degrading, broken.

## Dimensions (G/Y/R, with evidence)
| Dimension | Status | Evidence |
|-----------|--------|----------|
| Delivery cadence | 🟨 | [cite] |
| Attrition risk | 🟥 | [cite] |
| Dependency tax | 🟩 | [cite] |
| On-call burden | 🟨 | [cite] |
| Peer relationships | 🟩 | [cite] |
| Information flow | 🟨 | [cite] |
| Technical health | 🟥 | [cite] |
| Culture and norms | 🟩 | [cite] |

## Patterns
[Cross-cutting signals — where the real diagnosis often lives.]

## Top-3 risks worth acting on
[Specific, with action and owner.]

## What's working to protect
[Strengths a reorg could accidentally remove.]

## Open questions
[Too thin to call — investigate before next quarter.]
```

## Forcing functions

- **Cite, don't claim** — same discipline as `stakeholder-synthesize`: every claim cites entries/events (*"three people independently mentioned X — Priya, Sam, Nina"*).
- **Patterns over people** — the insight isn't "Priya is unhappy," it's "three reports described the same blocker."
- **Surface what you're avoiding** — ask *"What dimension are you most reluctant to look at?"* The avoidance is often the diagnosis.
- **Name protective work** — name load-bearing strengths (review culture, mentorship, peer relationships) so reorgs don't remove them.
- **Honest about confidence** — mark low-confidence reds and greens; next month's observation targets.

## Operating principles

- **Diagnosis without action is theater** — top-3 risks need owners and dates.
- **The user is in the culture** — are they part of the pattern (the bottleneck? the pressure?).
- **Patterns reveal blind spots** — in reflections but never retros means an unsafe topic.
- **A green isn't "no work needed"** — robust health differs from temporary calm.
- **Don't over-diagnose** — 3 yellows, 5 greens is a team doing well.

## Anti-patterns to flag

- **Diagnosis as venting** — calibrated, not a failure list.
- **Aggregating prematurely** — one unhappy report isn't a morale issue.
- **Conflating people with system problems** — three leave over a failing manager: a system problem, different fix.
- **Skipping "what's working"** — no greens means the diagnosis is wrong.
- **Actions without owners or dates.**
- **Surveys as ground truth** — green surveys can hide burnout.

## Composition with other skills

- **`stakeholder-reflect` (managing-down + teams)** — primary source
- **`stakeholder-synthesize`** — per-individual lens first, then team patterns
- **`leadership-os` (Heat Shield, Diplomat, Triage Lead)** — the follow-up conversations
- **`performance-management`** — switch tools when individual underperformance surfaces
- **`one-on-one-prep`** — top-3 risks land in specific 1:1s
- **`decision-log`** — log decisions arising from the diagnosis
- **`the-research-synthesizer`** — parallel discipline for qualitative data
