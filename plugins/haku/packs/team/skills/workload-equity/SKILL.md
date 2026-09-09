---
name: workload-equity
description: Use when the user wants to analyze whether non-promotable (glue) work is fairly distributed across their team, with attention to demographic patterns. Triggers: "is our glue work fair", "who does the non-promotable work on our team", "audit workload distribution", "are women doing more glue work", "workload equity analysis", "non-promotable work allocation". Produces a diagnosis with bias signals and redistribution recommendations
---

# Workload Equity Analysis

Diagnose whether non-promotable (glue) work is distributed fairly across a team, with attention to demographic patterns (gender, seniority, tenure). Combines Tanya Reilly's "glue work" framework with HBR volunteerism-bias research (women volunteer 48% more often; managers ask women 44% more often).

**Output:** a private diagnostic report (`~/haku-work-reflections/workload-equity/<date>-team-<team>.md`) for pre-calibration self-reflection, DEI review (anonymized), 1:1 role-clarity discussions, and process design making glue visible.

## When to apply

Trigger when: certain members (often junior, often women/underrepresented) over-volunteer for non-promotable work; preparing for promotion calibration; some engineers never get senior-level coordination work; complaints like "some people always take meeting notes"; attrition among juniors stuck on support tasks; proactive audit.

Skip when: team too small (<4); active crisis (address the fire first); no visibility into workload distribution (IC without management scope).

## Prerequisites

Either the user has run `glue-audit` (baseline inventory), or has sufficient observational data. The skill interviews the user as a proxy observer; it does not access calendars or task systems directly.

## The interview flow

### 1. Scope definition
Team name/size; time period; team-wide vs. one individual; anonymity preference.

### 2. Team roster
Per member: name (or pseudonym), level, gender (only if comfortable — needed for bias signal), tenure, role (IC/EM/TPM).

### 3. Glue work inventory per person
"What glue tasks has [person] done in the last [period]?" Use the `glue-audit` taxonomy as prompts. Estimate hours per week; was it officially part of the role?

### 4. Core work check
"What are each person's *core* deliverables this period?" Glue plus weak core = underperformance; glue plus strong core = exploitation.

### 5. Visibility & credit
Per glue item: who knows? Called out in reviews or promo packets? If it stopped, who would notice?

### 6. Volunteering vs. assignment
For recurring tasks: volunteered or asked? *"Who said 'I'll take onboarding' vs. '[person], can you?'"*

### 7. Fairness signals
Red flags: **single-point dependency** (bus factor 1); **task ghettoization** (same people always take notes/logistics); **credit mismatch** (one does the work, another gets visibility); **career penalty risk** (glue-doer's promotion slips); **demographic clustering** (women/juniors on support/coordination).

### 8. Optional: manager self-check
"What have you asked each person this quarter?" "What have you *not* asked certain people, though it's senior-level work?" "Have you deflected glue requests landing in someone's Slack?"

## Output structure

```markdown
---
team: [team name]
period: [date range]
analyst: [user name, role]
anonymized: true | false
---

# Workload Equity Audit — [Team]

## Executive summary
- Team size, glue distribution, patterns ("Women do 62% of glue hours")
- Risk: low / medium / high; top 3 redistribution opportunities

## Per-person breakdown
| Person | Level | Gender | Core work | Glue hrs/wk | Glue type | Visibility | Promotion risk |
|---|---|---|---|---|---|---|---|
| Alice | Senior | F | Shipped auth service | 12 | onboarding, design review | team | Medium (glue not counted) |
| Bob | Senior | M | Shipped billing pipeline | 2 | occasional PR review | high | Low (code counts) |

## Patterns identified
[Name each with evidence, drivers, risk — e.g.
"Women over-volunteer": Alice/Carol/Dana carry 68% of glue hours;
"Single-point dependency": only Alice knows onboarding;
"Glue not counted in promotions": packet emphasized code output only.]

## Recommendations
### Immediate (this sprint)
Rotate onboarding to Bob with Alice as backup; publicly credit design-review work; explicit assignment protocol.
### Short-term (next quarter)
"Glue work is real work" in the working agreement; promotion rubric includes onboarding/mentorship; calendar blocks make glue visible.
### Long-term (6 months)
Shared glue rotation; collect promo cases where glue was central; bias check: "Would I ask a senior man to do this?"

**If the user is the overloaded person:** a 2-week "glue holiday" to surface gaps; reassign at least 2 categories; protect core-work blocks.

## Manager guidance
System improvement, not individual performance review; present findings without shaming; add "glue work is work" to retro/planning rituals; rebalancing is career development for juniors.
```

## Operating principles

- **Privacy-protective** — anonymized by default; named only on opt-in.
- **Bias-aware, not accusatory** — patterns as system signal, not person fault.
- **Action-oriented** — diagnosis without a redistribution plan is just guilt.
- **Link to promotion** — senior-level but unrecognized glue is a ladder problem or a redistribution problem.
- **Respect core work** — if deliverables suffer, redistribution includes offloading, not just sharing.

## Composition with other skills

- **`glue-audit`** — uses its inventory as raw input
- **`promo-case-glue`** — equity diagnosis supports the promotion narrative
- **`manage-glue-workers`** — the redistribution plan is its execution instruction
- **`team-diagnosis`** — a focused input into that broader health check

## Anti-patterns to flag

- **Naming and shaming** — never publish named individual data without opt-in.
- **Ignoring core work** — equitable glue is meaningless if deliverables slip.
- **Assuming intent** — present the pattern; don't accuse bias.
- **One-and-done** — recommend quarterly re-audit.
- **Over-counting** — some glue is promotable; strategic alignment beats scheduling.
