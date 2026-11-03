---
name: triage
description: Classify a coding task as risk tier 0, 1, or 2 before starting work, and route to the matching tier flow. Use at the start of any non-trivial task, whenever a task's risk is unclear, or after a second failed attempt on the same fix. Part of the tempo plugin.
license: Apache-2.0
user-invocable: true
---

# Triage

One decision: which tier is this task? Then follow that tier's flow. This skill
is the only routing step — it does not contain the flows themselves.

## Classify (first match wins)

**Tier 0 — trivial.** All of:
- change is fully specified and small (typo, copy tweak, constant, log line, obvious one-liner)
- one file, no API or contract change
- correctness is checkable by running existing checks, not by reasoning about behavior

**Tier 1 — standard** (the default for real work):
- new or changed behavior with clear requirements
- a few files in one module; no architecture decisions
- tests exist for the seam, or writing them is straightforward

**Tier 2 — risky.** Any of:
- architecture, cross-module contracts, or public API changes
- ambiguous or conflicting requirements; unknown root cause after a first look
- security, auth, data migration, concurrency
- multi-file behavior-preserving refactor

Conflict rule: take the higher tier. Genuinely torn between 1 and 2 with the user
present — ask one question; headless, take tier 2.

## Route (one line each)

- **Tier 0** → do the change now; rules in `tempo:tier-0-trivial` only if unsure it qualifies.
- **Tier 1** → follow `tempo:tier-1-standard`.
- **Tier 2** → follow `tempo:tier-2-risky`.

## Promotion (automatic, not a judgment call)

The same approach failing twice — two failing test runs, two edit-and-revert
cycles, two debugging dead ends — promotes the task one tier. Say "promoting to
tier N" in one line and switch flows. A second failure at tier 2 stops for a
human decision instead of a third attempt.

## Non-rules

- Tiers are about risk, not size alone: a one-line auth change is tier 2.
- Never downgrade mid-task because things look easy; finish the tier you started.
- If the user names a tier ("just a quick fix"), take their word, note it, proceed.
