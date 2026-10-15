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
- **This backend (z.ai GLM proxy) omits per-message usage** — only the final
  `result` event carries token/cache totals. Session totals are therefore
  authoritative from the result event, but `tokens_to_first_edit` is structurally
  unusable here (it stays 0). The metric works on backends that populate
  per-assistant usage.
- Cache-hit ratio *is* reported in the result event on this backend (~0.85–0.93
  across all runs so far, parity between conditions — the proxy's cache behavior
  is not where process plugins lose; turns and output are).
- `prompt → first test green` is not directly observable; total wall-clock is
  the proxy.
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

## Baseline results (interim, 2026-10-15/16 — tiers 0–1 complete, tier 2 in flight)

Medians per condition × tier (tier 0: n=7 incl. smoke rows; tier 1: n=6; verify
is hidden-tests-only after the fix committed mid-run):

| Condition | Tier | Turns | Tokens | Wall | Verify |
|---|---|---|---|---|---|
| bare | 0 | 16 | 21,335 | 46s | 7/7 |
| superpowers | 0 | 24 | 26,409 | 69s | 7/7 |
| bare | 1 | 16.5 | 19,127 | 82s | 6/6 |
| superpowers | 1 | 29 | 51,026 | 199s | 6/6 |

Findings so far:

1. **Tier 1 is the damning one.** Superpowers costs 2.7× tokens, ~1.8× turns,
   2.4× wall-clock versus bare with identical verify outcomes (6/6 both).
   prd-010's tier-1 target (≤60% of superpowers' tokens) is already met by the
   bare floor — tempo's job at tier 1 is keeping bare's cost while adding the
   safety net, not beating superpowers.
2. **Tier 0 separates on turns and wall, not tokens.** Turns +50% and wall +52%
   are consistent; token medians are inconclusive at n=3 because same-task
   variance spans 7.7k–43k on this model. The ceremony *floor* (superpowers
   never used fewer than 20 turns on tier-0/1 tasks; bare went as low as 3) is
   the stable tier-0 signal.
3. **Strategy divergence is real and measurable.** On t0-pagesize, bare's
   minimal fixers changed 1 file (the constant); superpowers' runs changed 2
   (code + test). Both satisfy the hidden ground truth — the difference shows
   up in `git.files_changed`, not verify. This is exactly the
   safety-proportional-process spectrum tempo will formalize.
4. **Variance argues for n≥3 + medians** (already the protocol). Same task,
   same condition: 5.6k–38.7k tokens at tier 0.
5. **Tier 2 (partial, n=1 each): near-parity** — 47 turns both, 75.3k vs 55.7k
   tokens on t2-dedupe. Early hint that full-loop ceremony is *least* wasteful
   exactly where it's justified. Awaiting the remaining runs before claiming.

## Next steps

1. ~~Smoke run~~ done (results above).
2. ~~Full `bare` and `superpowers` baselines~~ tiers 0–1 recorded above; tier 2
   completing — final table replaces the interim one when all runs land.
3. MVP skeleton work begins against these numbers (prd-010 §7).
