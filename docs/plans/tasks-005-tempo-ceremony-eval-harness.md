# tasks-005: Ceremony-cost eval harness for `tempo`

**Status:** In progress (harness + golden set built; baseline runs pending)
**Date:** 2026-10-15
**Parent:** [prd-010](prd-010-lean-sdlc-plugin.md) (success metrics, §6)

## Why this exists

prd-010's thesis is quantitative: tempo must deliver fewer tokens, faster
iteration, and equal safety versus process-flat baselines. Those claims are only
falsifiable with measurements taken **before tempo exists**. This harness is the
measurement instrument, built first so the baselines are clean.

It also produces the labeled task set (tier 0/1/2 ground truth) that the later
decision-model vs. heuristic triage experiments need — one asset, two uses.

## Protocol

Fixed golden task set, run headlessly (`claude -p --output-format stream-json`)
under controlled plugin conditions, in disposable sandboxes under `$TMPDIR`
(outside any repo ancestry so no parent CLAUDE.md/AGENTS.md leaks in):

| Condition | Plugin configuration |
|---|---|
| `bare` | Fresh `CLAUDE_CONFIG_DIR` per session: no user plugins, no global rules — the built-in floor |
| `superpowers` | Same, plus superpowers 5.1.0 loaded via `--plugin-dir` from the local marketplace cache |
| `tempo` | (future) Same, plus the tempo plugin directory |

Isolation note (validated in smoke): project-level `enabledPlugins: false` and
`disableAllPlugins: true` do **not** disable user-scope plugins — a fresh
`CLAUDE_CONFIG_DIR` is the only reliable kill switch, and it also removes the
user's global AGENTS.md rules, which is desirable: the experiment wants an
identical environment across conditions.

Prompts are natural user requests — no methodology words ("plan", "TDD",
"test-first") — so the treatment variable is purely the plugin set. Verification
uses hidden tests the agent never sees, copied into the sandbox after the
session: behavioral correctness is judged by us, not by the agent's own tests.

## Golden task set

| ID | Tier | Task | Verifies |
|---|---|---|---|
| `t0-typo` | 0 | Fix a failing test (typo in a greeting) | hidden assertion on the string |
| `t0-pagesize` | 0 | Change a constant 20 → 50 | hidden assertion catches test-gaming |
| `t1-slugify` | 1 | Add `slugify()` per precise spec | 10 hidden edge cases |
| `t1-items-limit` | 1 | Add `?limit=N` validation to a route | hidden cases incl. invalid inputs |
| `t2-dedupe` | 2 | Unify duplicated CSV/TSV logic, preserve behavior exactly | hidden behavioral pins (quotes, round-trips) |
| `t2-fetch-cache` | 2 | Add TTL cache to a fetch wrapper without API break | hidden counting-transport tests |

All fixtures are zero-dependency Node (ESM + `node:test`) so verification is
deterministic and offline. The `tier` labels are the ground truth for future
triage-accuracy evals (prd-010 §8 open question: heuristic vs. decision model).

## Metrics per run (one JSON per run in `test-results/`)

- tokens: input, output, cache_creation, cache_read, total
- `tokens_to_first_edit` — the "ceremony before code" metric (PRD: prompt → first code change)
- cache-hit ratio = cache_read / (input + cache_creation + cache_read)
- turns, tool_calls, wall_ms
- `completed` (clean session exit) and `verified` (hidden tests pass) — separate:
  a session that stops to ask questions is a *completion* failure, which is
  real signal for headless/VPS use, not a safety failure
- git diffstat (files changed, insertions, deletions) — output volume vs. process cost
- `cache_fields_reported` flag — backends may not populate cache fields; relative
  comparisons across conditions remain valid on a fixed backend

## Usage

```bash
cd evals/ceremony

# validate the harness itself (4 short sessions: probe + t0 under bare/superpowers)
node run-eval.mjs --smoke

# full baselines (12 sessions; tier-2 superpowers runs can be slow and token-heavy)
node run-eval.mjs --condition bare
node run-eval.mjs --condition superpowers

# subsets and aggregation
node run-eval.mjs --condition superpowers --tier 2
node run-eval.mjs --summary
```

## Known limitations (accepted for v1)

- Single-shot sessions only; multi-turn interactive flows are not measured.
- Cache-hit ratio depends on the backend populating cache fields in stream-json.
- `prompt → first test green` is not directly observable; `tokens_to_first_edit`
  and total wall-clock are the proxies.
- One backend per run — absolute numbers are only comparable within a run set.

## Smoke results (2026-10-15, glm-5.3-flash backend)

Protocol validated end-to-end: isolation confirmed (bare lists 12 built-in
skills only; superpowers condition adds exactly its 14), SessionStart injection
**does fire headlessly** (probe: 20,983 tok vs 18,883 bare = +2.1k for
`using-superpowers`), verify pipeline works, both conditions completed.

First ceremony-cost signal, same tier-0 typo fix, single run each:

| Condition | Turns | Tokens | Wall | Verify |
|---|---|---|---|---|
| bare | 17 | 21,128 | 55s | PASS |
| superpowers | 26 | 26,642 | 69s | PASS |

+26% tokens, +53% turns, +25% wall-clock for a one-character fix — direction
matches prd-010's thesis; magnitude needs the full baseline (and note run-to-run
variance is real, so baselines should run each task more than once and use the
median; `--summary` already medians across result files).

## Next steps

1. ~~Smoke run~~ done (results above).
2. Full `bare` and `superpowers` baselines (consider 2–3 runs per task); record
   numbers in this doc.
3. MVP skeleton work begins against these numbers (prd-010 §7).
