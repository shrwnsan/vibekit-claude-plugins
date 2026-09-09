---
name: stakeholder-due
description: Use when the user wants to know which stakeholder reflections are overdue — "what's due", "who haven't I thought about lately", "what's on my plate this week for stakeholder reflection", "stakeholder check-in", Monday-morning planning. Scans `~/haku-work-reflections/`, computes overdue question × stakeholder pairs from `suggested_freq`, outputs a prioritized list. Weekly Desktop task OK; cloud routines can't read local files.
---

# Stakeholder Due

Compute and surface what's overdue for reflection. The output is a prioritized list of question × stakeholder pairs the user should consider tackling, plus quick links to start each.

## Inputs

Default: scan everything. The user can narrow:
- *"What's due in managing-up"* → filter to one category.
- *"What's due for John"* → filter to one stakeholder.
- *"What's due this week"* → filter to items overdue by ≤ 7 days from their cadence.

## Loading

1. Read `~/haku-work-reflections/stakeholders.json` for the registered list.
2. Load `questions.json` from the `stakeholder-reflect` skill folder.
3. For each registered stakeholder, read their file. For each question whose `stakeholder_categories` matches the stakeholder's category, find the most recent dated entry under the matching `## <prompt>` heading.

## Computing overdueness

For each (stakeholder, question) pair:

- `cadence_days` = lookup of `suggested_freq`: weekly=7, biweekly=14, monthly=30, quarterly=90, biyearly=180.
- `last_entry_date` = most recent `### YYYY-MM-DD` under that question's heading; never answered = never.
- `days_since_last` = today − last_entry_date (∞ if never).
- `due_ratio` = days_since_last / cadence_days (≥1.0 due; ≥1.5 notably overdue; ≥2.0 very overdue).

Honor `cadence_overrides` in the stakeholder file's frontmatter if present (per-question or per-stakeholder cadence).

## Prioritizing

Sort by `due_ratio` descending. Then apply adjustments:

1. **Cap items per stakeholder.** At most 3 questions per stakeholder — otherwise one neglected stakeholder dominates and the user disengages.
2. **Cap total items.** Default 10 — keeps the list actionable.
3. **Surface "never answered" items distinctly.** These are new commitments, not overdue. Group them separately so the user can choose new questions vs. refreshing existing ones.

## Output format

```
Stakeholder reflections due (as of <today>)

🟥 Very overdue (≥2× cadence)
  • [John Adams · managing-up] What are their priorities, incentives and constraints?
    last logged 2026-02-15 · biweekly cadence · 11 weeks since
  • ...

🟧 Overdue (≥1.5× cadence)
  • [Jill Smith · managing-across] What's not going well?
    last logged 2026-04-08 · biweekly cadence · 23 days since
  • ...

🟨 Due (≥1× cadence)
  • ...

🆕 Never answered
  • [Client Delivery ABC · teams] Are goals clearly defined?
    quarterly cadence · never logged
  • ...

To pick one: "let me reflect on [stakeholder]" or run `stakeholder-reflect`.
```

Use the colored markers consistently — they make the output skim-able.

## When nothing is due

Say so plainly. Don't manufacture work.

> *"Nothing significant is overdue right now. Earliest item due is John's 'priorities, incentives and constraints' in 4 days. If you want to get ahead, that's the one."*

## Wiring to a schedule

**Claude Code Desktop app (recommended):** Routines → New routine → Local. Weekly, Monday, instructions: `Run /stakeholder-due and show me the list`. Desktop Routines have full local file access and persist indefinitely.

**Terminal / CLI users:** OS-level scheduling (cron on macOS/Linux, Task Scheduler on Windows). Session-scoped tasks expire after 7 days — unsuitable for weekly cadences.

**Never suggest cloud routines** — they cannot access `~/haku-work-reflections/`.

Don't set up a schedule automatically — the user owns the cadence decision.

## Operating principles

- **The list is a menu, not an obligation.** Frame output as "here's what you could pick up." Pressure kills the practice.
- **Surface avoided stakeholders.** Zero entries in 4+ weeks despite multiple due items — call it out gently. Avoidance is signal.
- **Don't over-engineer the math.** Simple `days_since / cadence_days` is enough. No weights, recency bonuses, or "importance scores".
- **Respect "skip" instincts.** If the same question is consistently skipped for the same stakeholder, surface that as an open question.

## Anti-patterns to flag

- **Same flat list every time.** If run daily, the list barely moves — suggest weekly.
- **Treating teams like individuals.** Teams often deserve longer cadence; if `cadence_overrides` aren't set, suggest one.
- **Listing 30 items.** A long list is unread. Default to 10.
- **Sorting purely by date.** Sort by `due_ratio`, not raw days — an 8-day-late weekly question outranks a 30-day-late quarterly one.

## The weekly ritual

This skill is one segment of the `weekly` skill — a single ~15-minute session that runs wins capture, the most-overdue stakeholder reflection, and a patterns scan together. When the user wants the recurring ritual rather than this one piece, route to `/haku:weekly`.
