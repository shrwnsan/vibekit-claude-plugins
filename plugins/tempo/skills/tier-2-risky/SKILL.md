---
name: tier-2-risky
description: Tier-2 risky-change flow — short plan file, deliberate build, review gate and verify gate before done. Use for architectural changes, public API changes, ambiguous requirements, security/auth/data work, or after a tier-1 task failed twice.
license: Apache-2.0
user-invocable: true
---

# Tier 2 — risky change

The ceremony lives here so it doesn't have to exist anywhere else. Subagents are
allowed; the review gate is not optional.

## 1. Unknowns first (short)

List what you don't know — requirements, root cause, constraints — at the top of
the plan file. Ambiguous requirements with the user present: resolve first, one
round of questions. Headless: take the conservative reading and record it as an
assumption.

## 2. Plan file

Write `<slug>-plan.md` in the repo (or its existing plan location if one exists):

- approach in a few bullets; alternatives rejected, one line each
- risks and the verification list (commands that prove it works)

Small enough to read in one pass. Update it when reality disagrees — a working
note, not a deliverable.

## 3. Build

- Commits sized for review, each with tests green.
- Behavior-preserving parts stay pinned by existing tests; change behavior only
  where the plan says to.
- Subagents may parallelize independent pieces; one agent owns integration and
  the final state.

## 4. Review gate (before claiming done)

Re-read the full diff against the plan:

- [ ] every plan item is in the diff, and nothing else
- [ ] behavior pins held — pre-existing tests pass unmodified
- [ ] new logic has tests; edge cases from the risks list covered
- [ ] no secrets, no debug leftovers, no TODO-as-done

Fix what the gate catches before continuing.

## 5. Verify before completion (hard gate, no exceptions)

- Run the verification list from the plan — tests, build, lint — and quote the
  passing output.
- Never claim done from inspection or reasoning. "Should work" is a failure
  state: if a check can't run, stop and say exactly what couldn't run and why.
- A check failing after "done" means the gate failed; fix before reporting.

## Stuck rule

Two failed approaches at tier 2 → stop and report: current state, what was
tried, the decision needed. Escalate to a human, don't grind.
