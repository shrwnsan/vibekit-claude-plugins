---
name: report-career-architect
description: Use when designing or revisiting a 12–18 month growth plan for a direct report. Trigger phrases include "build a growth plan for [report]", "what should [name]'s next year look like", "I want to architect [report]'s path to senior", "I'm prepping for promo cycle and [report] needs a plan", "let's think about [report]'s development". Distinct from one-on-one-prep and coaching-mode.
---

# Report Career Architect

Great managers *architect* growth, not just track work. Turn accumulated stakeholder observations into a 12–18 month plan: what the report grows into, what experiences close the gap, what exposure is missing.

Run when onboarding a report (first 60 days), after a promotion, when growth stalls between promos, pre-promo-cycle (the plan should *predate* the promo case), or when the report asks what's next.

**Not:** a 1:1 agenda (`one-on-one-prep`), a coaching conversation (`coaching-mode`), a promo packet (`report-promo-case`), or a PIP (`performance-management` — growth plans assume the report is performing).

## Inputs to gather first

1. **Where the report is now** — level, scope, time in role, trajectory.
2. **Where they're growing toward** — next level, lateral move, specialization, manager track. Most managers can't articulate this; *force* the user to.
3. **What the report has said they want** — from `stakeholder-reflect` entries ("What are their career goals?", "What do they want to achieve?"). Read the file first.
4. **Time horizon** — default 12 months.
5. **What the user already thinks the report needs** — surface the prior.

If (2) is unclear: *"Without a target, this is a wishlist. Where should they be in 18 months?"* If truly unknown, that's a `coaching-mode` conversation with the report.

## The plan structure

Keep it to one page:

```
# Growth Plan: [Report] (next 12 months)

Current state:
- Level / time in role / recent trajectory

Target state (12 months out):
- [Level + scope change, or deeper specialization, or tech-lead readiness]

The gap (what closing it requires):
- [3 specific capabilities, e.g. "owning a cross-team initiative end-to-end"]

The plan (specific experiences, sequenced):
- Q1–Q4: [project / scope / role each quarter; what it forces them to do]

Manager moves (what *the user* will do):
- [Hand off work to create room; make introductions; stop reviewing X; say "go talk to X yourself"]

Risks / what could derail this:
- [Risk + mitigation, e.g. roadmap lacks the stretch; burnout signals]

Check-in cadence:
- Quarterly review with the report; monthly stakeholder-reflect note; annual rewrite

Success criteria (month 12):
- [Concrete behavioral anchor / artifact / org feedback]
```

## Forcing functions

1. **Specific experiences over abstract goals.** "Lead the migration design review, handling Sarah's pushback" — not "improve communication." Plans of *projects* are actionable; plans of *qualities* are theater.
2. **Manager moves are first-class.** The user must actively make room — the #1 failure mode is omitting them.
3. **Sequence matters.** Q1's experience makes Q2's possible: shadow the tech-lead role, then own it with support, then alone.
4. **Risks named.** Roadmap shape, life events, attrition pull-back to firefighting, the user's own unwillingness to let go.
5. **Success is observable, not felt.** Force "they will have [shipped X / written Y / received Z feedback]" — wishful plans can't be evaluated honestly.
6. **Shared, not done *to* the report.** Land it in a 1:1 (`coaching-mode`); the report edits and owns it. The plan that lives is the one they agree to.

## Storage

The plan lives in the report's stakeholder file at `~/haku-work-reflections/managing-down/<slug>.md`, under a `## Growth Plan` section (full frontmatter: name, slug, category, role, since). Archive previous plans inside the file — the same gap two cycles running is signal.

## Operating principles

- **One plan per report, refreshed not rewritten.**
- **The report's voice must be in the plan.** Surface gaps where the user's read and the report's stated goals diverge.
- **Pace matters as much as direction.** All-stretch plans end in burnout; build in consolidation.
- **Underrepresented reports get weaker growth plans** — managers feel less confident architecting; over-invest there.
- **The plan ages.** Quarterly re-read, annual rewrite; untouched plans become fiction.

## Anti-patterns to flag

- **Wishlist** — no projects, sequence, or manager moves.
- **Plan without manager moves** — the report grows in spite of the user, not because of them.
- **Stretch with no consolidation.**
- **The promo plan disguised as a growth plan.** "12 months to staff" is an outcome; *what must be different to operate at staff* is the plan.
- **Identical plans for two reports.**
- **Architecting in isolation** — a plan dropped as directive doesn't survive contact with reality.

## Composition with other skills

- **`user-profile`** — read `~/haku-work-reflections/profile.md` first; management context shapes pacing and plausibility.
- **`stakeholder-reflect` (managing-down)** — the source of observations; read first.
- **`coaching-mode`** — the conversation that lands the plan.
- **`one-on-one-prep`** — quarterly 1:1 to revisit it.
- **`feedback-frameworks`** — delivering the parts that name a gap.
- **`report-promo-case`** — an executed plan makes a strong promo case; an unexecuted one a thin case.
- **`leadership-os` (Career Architect mode)** — the same principle, broader.
