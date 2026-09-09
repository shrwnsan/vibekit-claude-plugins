---
name: glue-audit
description: Use when the user wants to systematically identify, categorize, and quantify "glue work" on themselves or their team. Trigger phrases include "what glue work am I doing", "audit my glue work", "what non-promotable work is our team doing", "catalog our glue tasks", "how much time do we spend on glue", "map our glue work".
---

# Glue Work Audit

Identify, categorize, and make visible glue work—essential non-core technical work, often invisible, uncounted, and non-promotable: onboarding, documentation, unblocking, alignment, process improvement, mentorship, coordination. Supports promotion evidence, workload equity, redistribution, and career planning.

## When to apply

Apply when the user:
- Preparing for a promotion cycle; needs glue framed as promotable technical leadership
- Managing a team; auditing who does what non-core work
- Feels they're doing "too much glue" before a career conversation
- Is deciding between the IC track and management/TPM
- Notices certain people (often junior, often women and underrepresented groups) volunteering for non-promotable work

Skip when:
- Logging a single win (use `wins-log` instead)
- Mid-crisis tactical unblocking (this is strategic/reflective)
- The team needs hiring, not rebalancing

## The audit scope

**Whose glue work?** Three modes:
- **Self-audit** — your own glue tasks, past 30–90 days
- **Team audit** — glue work across a team (requires estimating member activities)
- **Role-based audit** — "If I become a [manager/TPM/staff engineer], how much of my current glue work becomes core vs. non-promotable?"

## Glue work taxonomy

Tanya Reilly's categories:

1. **Onboarding & mentorship** — ramping new hires, pairing, docs
2. **Documentation** — ADRs, runbooks, wikis, API docs
3. **Design review & quality gate** — catching handwaves, missing edge cases
4. **Cross-team alignment** — resolving cross-team ambiguity
5. **Process improvement** — standards, testing guidelines, checklists
6. **Unblocking** — getting others unstuck
7. **Roadmap & planning** — roadmap currency, scoping, priorities
8. **Incident & postmortem coordination** — stabilization, blameless reviews, follow-through
9. **Stakeholder management** — escalations, exec updates
10. **Hiring & interviewing** — loops, debriefs, calibration
11. **Team health & culture** — spotting burnout, facilitating retro
12. **DEI work** — ERG leadership, inclusive hiring

## The interview flow

### 1. Set scope
- "Auditing you individually, the whole team, or a specific role/project?"
- "Time window: last 30 days, last quarter, or a specific project?"
- "Time estimates (hours) or just a task inventory?"

### 2. Brainstorm tasks
Walk through a typical week/month:
- "Who's onboarding right now? What are you doing to help?"
- "What design reviews are you on? What do you contribute?"
- "What processes did you improve last quarter?"

For team audits, ask each teammate's likely glue allocation.

### 3. Categorize & tag each item
Capture per task:
- **Name** (short, specific)
- **Category** (from taxonomy)
- **Frequency** (daily/weekly/one-off)
- **Time estimate** (hours/week or fraction)
- **Core vs. glue** — in the official job description/rubric, or "above and beyond"?
- **Visibility** — who knows? (manager, team, org, recipient only)
- **Promotable?** — does the ladder recognize this as senior/staff-level work? (T/F/partial)

### 4. Quantify & surface patterns
- Total glue vs. core hours/week
- Distribution across team members (team audits)
- Visibility gaps (high-impact glue nobody sees)
- Bias markers (e.g. "women always take meeting notes")

### 5. Output structure

Write `~/haku-work-reflections/glue-audits/<date>-<scope>.md` with:

```markdown
---
subject: glue audit
scope: self | team | role
auditee: [name or team name]
period: [date range]
---

# Glue Work Audit — [scope description]

## Summary
- Core: ~X hrs/week (X%); Glue: ~Y hrs/week (Y%)
- Top glue categories: [list ranked]
- High-visibility glue: [items]
- Invisible glue: [items]
- Promotable fraction: [estimate]

## Inventory

| Task | Category | Freq | Hours/wk | Core? | Visible? | Promotable? |
|---|---|---|---|---|---|---|
| Onboarding new hire Priya | Onboarding | one-off | 8 | no | team | partial |
| ... | ... | ... | ... | ... | ... | ... |

## Patterns & flags
- [Concern: X spends 40% on glue, all invisible]
- [Bias signal: all women on team do the meeting notes]
- [Promotion risk: Z's glue is mostly non-promotable by current ladder]

## Manager actions suggested
- [Redistribution ideas; what to highlight in review]
- [Ladder update needed: add X as senior-level behavior]
```

## Operating principles

- **Quantify, don't just list.** Hours/week forces honest accounting.
- **Separate "should" from "is."** A diagnostic, not a judgment.
- **Name invisible work.**
- **Fairness lens.** Surface routine non-promotable work as an equity risk.
- **Tie "Promotable?" to the user's actual ladder.**
- **Respect privacy.** Saved privately.
- **User owns the output.** Don't invent numbers.

## Composition with other skills

- **`report-promo-case`** — feed "glue inventory" as promo evidence; link both files
- **`manage-glue-workers`** — diagnostic input; manage-glue-workers prescribes interventions
- **`user-profile`** — read role/level to judge "core vs. glue"
- **`wins-log`** — log glue tasks with visible outcomes as wins

## Anti-patterns to flag

- **Audit as weapon.** System fairness, not individual blame.
- **Rigid definitions.** "Core vs. glue" is organization-specific.
- **Analysis paralysis.** Prod to act within a sprint of finishing.
- **Sharing without consent.** Don't post team results publicly — it could single people out.
- **Expecting perfect data.** Estimates are fine; directional, not forensic.
