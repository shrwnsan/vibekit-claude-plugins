---
name: hiring-craft
description: Use when designing interview loops, writing interview questions or rubrics, calibrating panel feedback, running hiring debriefs, or making a hire/no-hire call. Trigger phrases include "design an interview loop for [role]", "write interview questions for [signal]", "help me run the debrief", "should we hire X", "I need a rubric for the system design round".
---

# Hiring Craft

The highest-leverage decision an engineering manager makes — every hire is a 1–3 year bet on team trajectory. Most loops run on tribal habit; this skill applies forcing functions where loops most often fail.

Three sub-modes: **loop design**, **rubric writing**, **debrief discipline**.

## Mode: Loop design

### 1. Define the role's signals first
What are the **3–5 capabilities** this hire must demonstrate?
- Bad: "strong engineer"
- Good: "can decompose a vague product problem into a 6-week project; mentor 1–2 juniors; own on-call; ship at senior level"

If the user can't articulate signals, push back: a loop without explicit signals is a panel of vibes-checks.

### 2. Map signals to slots
Each signal gets **one** primary slot plus one secondary check. Failure modes: **duplicate coverage** (three slots all assess system design) and **coverage gaps** (no slot probes mentorship — surfaces in debrief as "we didn't get a read on X").

Output a coverage matrix:
```
Signal              | Primary slot       | Secondary check
--------------------+--------------------+---------------------
System design       | Architecture round | Coding (if relevant)
Cross-team work     | Behavioral round   | Reference check
Mentorship          | Behavioral round   | (gap — add probe to mgr 1:1)
On-call ownership   | Hiring mgr round   | (gap)
Senior shipping     | Coding + take-home | Architecture round
```

### 3. Include the "nice to work with" signal explicitly
Don't hope it surfaces — make it one of the 3–5 signals, with probes (handling disagreement, treating the interviewer's wrong answers).

### 4. Length, sequence, and bar
- **Length:** push back on loops over 5 hours of candidate time.
- **Sequence:** behavioral and hiring-manager early, technical depth mid, reach-across-the-table round last.
- **Bar:** define *strong-yes* at this level **before** interviews happen; otherwise it drifts toward whoever's available.

## Mode: Rubric writing

Per signal, behavioral anchors at four levels: strong-yes / lean-yes / lean-no / strong-no. Anchors describe **behaviors observed**, not internal qualities.

```
"Decomposes vague problems"
Strong-yes: 2-3 clarifying questions first; decomposes into 3-4 sub-problems
with clear interfaces; names where they'd start and why; names what they
don't know.
Lean-yes: at least one clarifying question; decomposition flat (no interfaces);
starting point chosen but reasoning thin.
Lean-no: dives in without clarifying; partial or imbalanced decomposition;
confident but unstructured reasoning.
Strong-no: no clarifying questions; treats the prompt literally; wrong
decomposition; defends it when challenged.
```

**Force concreteness:** adjectives with no observable behavior aren't a rubric — two interviewers on the same recording should land within one notch.

Include an **anti-bias note** per rubric: *"Don't penalize accent, communication style, or unfamiliarity with internal vocabulary — score the substance."*

## Mode: Debrief discipline

The debrief is where decisions go wrong: loud voices win, first speaker anchors, calibration drifts. This order, every time:

1. **Silent written votes first.** Every interviewer writes vote plus one sentence of evidence before discussion. Breaks anchoring.
2. **Round-robin, lowest-rank-first.** Junior interviewers speak first; hiring manager last.
3. **Per-signal walk-through.** Debate each signal — *"On 'system design,' what did people see?"* — evidence, not adjectives.
4. **Then the question.** Only after all signals: **"Would you reach across the table to hire this person at the offered level?"** Force commitment.
5. **Disagreement is data.** If the room splits, ask *what did one group see that the other didn't?* Don't paper over it.
6. **Decision and write-up.** Document the decision, driving signals, calibration notes, risks if hired. Disagreement patterns show where the rubric or loop needs fixing.

## Operating principles

- **Hiring is a process you can improve.** Every loop's write-up informs the next.
- **Loop design before rubric writing before slot assignment.** Reverse order bloats loops.
- **Calibration > consensus.** A loud "strong yes" with weak evidence is worse than a structured "lean no."
- **Document the no-hires too.**
- **Push back on hiring-by-availability.** A weak hire costs more than a delayed one; the bar doesn't move because the role's been open 90 days.
- **Surface bias proactively.** If name, school, or accent dominates discussion over evidence, name it.

## Anti-patterns to flag

- **The "culture fit" non-signal.** Replace with the specific behaviors you mean; it's where bias hides.
- **"I just have a feeling."** Push for the observation behind it; if none, it shouldn't decide.
- **Question reuse without rotation.** Standard questions leak; keep 2–3 variants per slot.
- **Hiring manager speaking first in debrief.** Always last.
- **"Better than no one."** A weak hire blocks the role and demotivates.
- **Skipping the reference check.** It catches what interviews can't; 30 minutes well spent.

## Composition with other skills

- **`feedback-frameworks`** — COIN structure when giving feedback to a panel member.
- **`decision-log`** — log the hire/no-hire decision and signals for later calibration.
- **`stakeholder-register`** — once hired, register the report and start the reflection log day one.
