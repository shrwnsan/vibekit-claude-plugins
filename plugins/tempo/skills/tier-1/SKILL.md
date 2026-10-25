---
name: tier-1
description: Tier-1 standard-change flow — one-line plan note, test-first, single agent, systematic debugging on failures. Use for normal feature work and bug fixes with clear requirements. Promote to tempo:tier-2 if the same fix fails twice.
user-invocable: true
---

# Tier 1 — standard change

The whole flow is here; no other tempo skills are needed.

**Plan note (one line, in your reply — not a file):** "Plan: <what changes, how
verified>." Can't state it in one line? The task is tier 2 — switch to
`tempo:tier-2` and say so.

## Test-first

1. Write the smallest failing test that pins the new behavior or the bug. Run
   it; watch it fail for the expected reason.
2. Implement the minimal change that makes it pass.
3. Run the full relevant test suite, not just the new test. All green before
   claiming done.

## When something fails (systematic debugging)

- Reproduce first; never fix what you haven't seen fail.
- Read the actual error and the actual code path before editing again — root
  cause, then fix.
- Change one variable at a time; revert anything that didn't help before trying
  the next idea. No shotgun fixes.

## Done gate

- tests written and passing; full suite run with output quoted
- diff matches the plan note — nothing extra snuck in
- one agent did the work; no subagent fan-out at this tier

**Promotion:** the same approach failing twice (test runs, edit-revert cycles,
debug dead ends) → promote to tier 2 in one line and follow `tempo:tier-2` from
there. Never attempt the same failing approach a third time.
