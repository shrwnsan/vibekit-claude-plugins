---
name: prioritization-frameworks
description: Use when the user is prioritizing a backlog, building a roadmap, cutting scope, or arguing about what to build next. Trigger phrases include "what should we build first?", "help me cut this list", "I need to defend my roadmap", "should we do X or Y?". Surfaces the right framework—RICE, ICE, WSJF, MoSCoW, Kano, Cost of Delay.
---

# Prioritization Frameworks

For when there's more potential work than capacity. The point of any framework here is **not the score** — it's forcing hidden assumptions into the open where they can be challenged.

**Strategy doc:** If `~/haku-work-reflections/strategy/<area-slug>.md` exists, read it before scoring. Items fitting a strategic track score one way; items fitting none belong on the "not working on" list, not the backlog.

## Pick the right framework first

Don't reflexively reach for RICE. Match the framework to the situation:

| Situation | Best fit | Why |
|---|---|---|
| Mixed backlog for one team | **RICE** | Default for product backlogs. |
| Same, moving fast / low rigor | **ICE** | RICE without Reach — quicker, more subjective. |
| Engineering-heavy, cost-of-delay variance | **WSJF** (Weighted Shortest Job First) | Captures urgency, not just impact. |
| Communicating cuts to stakeholders | **MoSCoW** (Must / Should / Could / Won't) | Built for negotiation, not analysis. |
| Feature ideation, "what would users love?" | **Kano** | Separates basic, performance, delight. |
| Launches, market windows | **Cost of Delay** | Quantifies the cost of *not* shipping by date. |
| Two-option fork (A vs B) | **Pros/cons + reversibility** | Frameworks are overkill for binary calls. |

If the user starts with "let's RICE the backlog" before defining the situation, push back: which framework fits?

## The frameworks

### RICE

`Score = (Reach × Impact × Confidence) / Effort`

- **Reach:** How many users/customers, in what window. Be concrete: "users per quarter", not "lots."
- **Impact:** Per-user effect on the goal, on a fixed scale (3 = massive … 0.25 = minimal), tied to a north-star metric. Better: with a specific goal ("convert 10,000 users"), express impact in those units — "this could convert ~200 users" beats "impact: 2."
- **Confidence:** As a percentage (100% / 80% / 50%). Below 50%, you're guessing — run a test instead of scoring.
- **Effort:** Person-months; round up — estimates skew optimistic.

Trap: **scoring inflation.** When everything is a 3, the framework adds nothing. Force a distribution.

### ICE

`Score = Impact × Confidence × Ease` (each 1–10).

Faster than RICE, more subjective. Good for early-stage triage. Bad for defending a roadmap to stakeholders — too easy to challenge any individual score.

### WSJF (Weighted Shortest Job First)

`WSJF = Cost of Delay / Job Size`, where Cost of Delay = User/Business Value + Time Criticality + Risk Reduction & Opportunity Enablement.

Use when items have very different urgency profiles — e.g., a compliance deadline competing with a discovery initiative. WSJF will (correctly) prioritize the small urgent thing.

### MoSCoW

Sort items into **Must**, **Should**, **Could**, **Won't (this round)**. Constraint: "Must" capacity should be ≤60% of total, or you have a strategy problem, not a prioritization problem. The "Won't" column is the most valuable — that's where commitments not to do things live.

### Kano

Classify features as:
- **Basic (Must-be):** absence dissatisfies; presence is invisible. Don't celebrate building these.
- **Performance:** more is better, linearly. Most "improvement" work.
- **Delight (Attractive):** absence is fine; presence creates loyalty. Differentiation lives here.
- **Indifferent / Reverse:** easy to over-invest in.

Particularly useful for AI features: most LLM "wow" features start as Delight and decay into Performance, then Basic, fast. Plan for that decay.

### Cost of Delay

For each item, estimate: *if we ship one week later, what does it cost us?* Dollars, lost users, missed deadline, competitor advantage. Items with steep CoD curves (or hard cliffs at a date) jump the queue.

Especially useful against a "fair queue" mentality — not all delays are equal.

## How to help the user

1. **Pick the framework.** Use the table above. State the choice and why.
2. **Force assumptions out.** "Reach = 5,000/quarter — analytics, guess, or sales request?" Confidence drops fast under questioning, which is the point.
3. **Run the math, but argue the result.** A score starts a conversation, not a verdict. If the top item *feels* wrong, the framework is missing a dimension — strategic alignment, technical sequencing, political reality; add a column rather than fudge scores.
4. **Insist on a "Won't this round" list.** What's cut, and the cost of cutting it.
5. **Write it down.** Pair with `decision-log` if the decision will be revisited (it always is) — the framework score *is* the rationale.

## Anti-patterns to flag

- **Score everything to one decimal place.** False precision. RICE scores within 20% of each other are tied — break ties with judgment.
- **Optimize for the framework, not the goal.** If answers keep feeling wrong, an input is missing.
- **Single-axis prioritization.** "Highest revenue impact wins" misses risk, sequencing, morale.
- **Frameworks as politics shields.** "The framework said so" is a dodge. Own the call.
- **No re-prioritization cadence.** Backlogs go stale — two-month-old estimates are wrong now.
