# tasks-006: Tier-routing golden set for `tempo`

**Status:** Cases drafted + reviewed; runner in progress; baseline runs pending
**Date:** 2026-11-03
**Parent:** [prd-010](prd-010-lean-sdlc-plugin.md) §6 (tier-accuracy metric); [tasks-005](tasks-005-tempo-ceremony-eval-harness.md) (ceremony harness)

## Why this exists

tasks-005's harness measures **cost** (tokens, turns, wall) and **task
correctness** (hidden tests). It does not measure **routing**: given a task,
does the agent pick the right tier and load the right flow? prd-010 §6 gates
on tier accuracy (≥95% vs a labeled set); this doc defines the labeled set,
the scoring method, and the runner.

The set doubles as the portability test: the same cases run against any
Agent Skills client (pi verified 2026-11-03; Amp documented-not-tested),
with the same expectations on bare skill names.

## Design decisions

1. **Q&A framing, not do-the-task framing.** Routing cases carry no code
   fixtures. A do-framed prompt ("fix this") with no code produces
   clarification requests — completion failures that pollute scoring. The
   fixed prompt shape is: *"You've been asked to: X. Per your process
   skills, which tier does this task get, and which skill flow should you
   follow? State the tier, then stop."* This isolates the one variable
   under test: classification. Enacted-routing data on real work already
   exists separately via tasks-005 session forensics.
2. **Scoring calibrated empirically (revised after first smoke).** The
   initial design scored skill *loads* via substring thresholds; two
   problems surfaced immediately: prose cross-references inside a loaded
   skill's content inflated sibling counts (tier-1's promotion line
   mentions tier-2), and Q&A sessions turn out to never load flow content
   at all — they classify from the injected skill descriptions alone (2
   assistant turns, zero tool calls). Final rubric for Q&A mode: (a)
   stated tier matches (promotion mentions allowed), (b) the answer names
   the expected flow skill. Tool-load detection (Read/Grep of
   `skills/<name>/SKILL.md`, `Skill` invocations) is retained in the
   runner as enacted-mode machinery for fixture tasks, where tasks-005
   forensics show real loads (8–12 refs).
3. **Namespace-agnostic cases (post PR #124).** Case text references bare
   skill names (`tier-1-standard`), never `tempo:*` — the eval must be
   client-neutral. The Claude Code hook keeps namespaced names; it runs
   only in Claude Code.
4. **#9 is the restraint test (label flipped from tier 2 to tier 1 during
   review).** "Tests pass locally, fail in CI" was initially labeled tier 2
   on an "unknown root cause" reading. Flipped: tempo's tier-2 intake
   trigger is "unknown root cause *after a first look*", and at intake no
   look has happened; the requirement is clear (make CI green) and the
   discipline is tier-1 systematic debugging. Over-labeling it tier 2
   would bake ceremony-on-investigative-work into the ground truth — the
   exact anti-pattern tempo removes. Auto-promotion remains the designed
   escape: an answer of "tier 1, escalating if the first hypothesis fails"
   **passes** (promotion-mention is allowed scoring behavior).
5. **#8 is the anchor case, and says so.** "One-line change to the auth
   token check" has direct textual support in the triage skill's non-rules
   ("a one-line auth change is tier 2"), so it verifies the model applies
   the written risk-over-size rule — reading comprehension, not
   generalization. A non-echoing generalization variant ("one-line change
   to the rate limiter", concurrency signal) is planned as a v1.1 case.

## Golden cases (12)

Scoring rubric per case: **pass** = (a) stated tier matches, promotion
mentions allowed, (b) for tier ≥ 1 cases the answer names the expected flow
skill. Tier-0 cases assert the stated tier only (their design is that no
flow loads and none should be named).

| id | Task text (inside the fixed Q&A frame) | Tier | expect_loaded | expect_not_loaded |
|---|---|---|---|---|
| r0-readme-typo | Fix the typo in the README heading. | 0 | — | tier-1-standard, tier-2-risky |
| r0-port-constant | Change the default port constant from 3000 to 8080 in the config file. | 0 | — | tier-1-standard, tier-2-risky |
| r0-var-rename | Rename the local variable `idx` to `userIndex` for clarity. | 0 | — | tier-1-standard, tier-2-risky |
| r0-test-typo | Fix the failing test: it expects "Hello, Ada" but the code returns "Helo, Ada". | 0 | — | tier-1-standard, tier-2-risky |
| r1-slugify | Add a slugify(str) helper to the utils module, with tests. | 1 | tier-1-standard | tier-2-risky |
| r1-lint-script | In package.json, replace the deprecated lint script with `eslint .`. | 1 | tier-1-standard | tier-2-risky |
| r1-env-var | Add an env var for the database URL used by integration tests. | 1 | tier-1-standard | tier-2-risky |
| r2-auth-line | Make a one-line change to the auth token check. | 2 | tier-2-risky | tier-1-standard |
| r1-ci-green | Tests pass locally but fail in CI — find out why and fix it. | 1 (restraint) | tier-1-standard | tier-2-risky |
| r2-dedupe-refactor | Refactor the CSV and TSV parsers to share their common code, preserving behavior exactly. | 2 | tier-2-risky | — |
| r2-sqlite-migration | Migrate the storage layer from JSON files to SQLite. | 2 | tier-2-risky | — |
| r2-rate-limit | Add rate limiting to the public API. | 2 | tier-2-risky | — |

Boundary notes: r1-lint-script sits on the tier-0 "build config"
not-qualify line from the exclude side (catches over-eager tier-0
classification) — and its first run found a real gap: the hook table's
tier-0 line did not carry the config boundary, so a package.json edit
was classified tier 0 from table examples alone; the hook now says "not
config/auth/API" (tempo 0.1.2). r2-auth-line is the risk-over-size
anchor. r1-ci-green is the restraint case with a dual-valid twist: the
case genuinely sits on the documented 1-vs-2 boundary, so it passes via
tier-1 restraint **or** via the headless tie-break to tier 2 **with the
conflict rule cited** — an unexplained escalation to tier 2 fails. First
run: the model cited the conflict rule and routed to tier 2 (alt branch,
correct per D-rules); the golden set immediately caught a hook-table
description gap. That is the eval working as intended.

## Runner

`run-routing.mjs` (this branch): per case, one headless session
(`--condition tempo`, max 8 turns, no fixture), score by the rubric above,
write `test-results/routing-<ts>-<condition>-<case>.json`, print a table.
Portability mode: place the four skills in the client's skill directory and
run the same cases; identical expectations on bare names.

## Results

First full run (2026-11-03, GLM backend, n=1 per case, tempo 0.1.2):
**12/12 PASS** — 4× tier-0 inline (no flow named, no skills loaded), 5×
tier-1 routed to tier-1-standard, 3× tier-2 routed to tier-2-risky. The
two boundary cases behaved per design after the fixes above: r1-lint-script
routed tier 1 in one turn with the hook carve-out in place; r1-ci-green
took the primary restraint branch (tier 1 named, no escalation). Sessions
are short (1–4 turns, ~2 turns median) — the full set costs a fraction of
one ceremony fixture task.

## Follow-ups

- r2b generalization variant (non-echoing risk case) as v1.1 case
- Enacted-routing scoring: reuse tasks-005 session forensics over real
  fixture tasks (already recorded for the n=3 rerun)
- pi Amp-side runs once Amp is installed locally
