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

## Baseline results (final, 2026-10-16 — all tiers complete)

39 result rows recorded (incl. probes); 33 real-task runs, of which 3 are
excluded as infrastructure failures (2 zero-token API stalls, 1 quota-killed
mid-run — `completed: false`, counted as flakiness, not as agent outcomes).
Medians over completed runs; verify is hidden-tests-only:

| Condition | Tier | n | Turns | Tokens | Wall | Verify |
|---|---|---|---|---|---|---|
| bare | 0 | 7 | 16 | 21,335 | 46s | 7/7 |
| superpowers | 0 | 7 | 24 | 26,409 | 69s | 7/7 |
| bare | 1 | 6 | 16.5 | 19,127 | 82s | 6/6 |
| superpowers | 1 | 6 | 29 | 51,026 | 199s | 6/6 |
| bare | 2 | 4 | 28 | 51,433 | 397s | 4/4 |
| superpowers | 2 | 4 | 40.5 | 60,908 | 308s | 4/4 |

Findings:

1. **Tier 1 is the damning one.** Superpowers costs 2.7× tokens, 1.8× turns,
   2.4× wall-clock versus bare with identical verify outcomes (6/6 both).
   prd-010's tier-1 target (≤60% of superpowers' tokens) is already met by the
   bare floor — tempo's job at tier 1 is keeping bare's cost while adding the
   safety net, not beating superpowers.
2. **Tier 2 narrows but never inverts.** Tokens 1.19×, turns 1.45× in favor of
   bare; the wall-clock median reverses (sp 308s vs bare 397s) but is an
   artifact of one 1,688s bare outlier (n=4 medians are fragile). Ceremony is
   *least* wasteful exactly where it is justified — supporting prd-010's
   risk-tiered thesis — yet it still costs strictly positive turns everywhere.
3. **Tier 0 separates on turns and wall, not tokens.** Turns +50% and wall +52%
   are consistent; token medians are inconclusive because same-task variance
   spans 7.7k–43k on this model. The ceremony *floor* is the stable tier-0
   signal: superpowers never used fewer than 20 turns on any tier-0/1 task;
   bare went as low as 3.
4. **No safety divergence anywhere.** 33/33 completed runs passed hidden
   verification, both conditions, all tiers. On this task set the ceremony
   bought no measurable correctness — only cost. (Caveat: hidden tests measure
   task correctness, not maintainability; the tier-2 refactor tasks' behavior
   pins are the closest proxy.)
5. **Strategy divergence is real and measurable.** On t0-pagesize, bare's
   minimal fixers changed 1 file (the constant); superpowers' runs changed 2
   (code + test). Both satisfy the hidden ground truth — visible in
   `git.files_changed`, not verify. This is the safety-proportional-process
   spectrum tempo will formalize.
6. **Operational notes for future runs.** Same-task variance (5.6k–62.9k tokens)
   demands n≥3 and medians; background wrappers need explicit ~60-min timeouts
   or they kill the harness's own 1,800s cap before a row is written; missed
   completion notifications require a disk-check fallback (result files are the
   ground truth); the backend's 5-hour usage quota can cut a batch mid-run.

## Next steps

1. ~~Smoke run~~ done.
2. ~~Full `bare` and `superpowers` baselines~~ done — final table above.
3. ~~MVP skeleton~~ built against these numbers (prd-010 §7) — see the tempo
   smoke section below.

## tempo MVP smoke (2026-10-31, glm-5.3-flash via z.ai provider shim)

First measurement of the built plugin (feat/tempo-mvp, PR #121). Sessions ran
via `--bin bin/zai` — the Z.AI provider-env shim (no permission/effort
overrides; protocol semantics unchanged). One run per task, n=1 — directional
signal only, not a release gate:

| Task | Tier | Turns | Tokens | Wall | Cache hit | Verify |
|---|---|---|---|---|---|---|
| t0-typo | 0 | 13 | 14,635 | 16s | 84.8% | PASS |
| t0-pagesize | 0 | 9 | 23,793 | 12s | 63.1% | PASS |
| t1-slugify | 1 | 18 | 20,977 | 42s | 84.0% | PASS |
| t1-items-limit | 1 | 22 | 23,813 | 44s | 86.4% | PASS |
| t2-dedupe | 2 | 49 | 35,440 | 223s | 95.1% | PASS |
| t2-fetch-cache | 2 | 24 | 33,090 | 67s | 81.1% | PASS |

6/6 completed, 6/6 hidden-test passes, zero infra failures. Against the
baseline medians (caveats: n=1 here, CLI drifted 2.1.292 → 2.1.308, same
backend):

- **Tier 0**: 11 turns / 19.2k tokens / 14s avg vs bare 16 / 21.3k / 46s — at
  or under the bare floor; the routing table plus skill discipline did not tax
  trivial fixes. t0-pagesize diff was 1 file (the constant), matching bare's
  minimal fixers rather than superpowers' 2-file pattern.
- **Tier 1**: 20 turns / 22.4k tokens / 43s avg vs bare 16.5 / 19.1k / 82s and
  superpowers 29 / 51k / 199s — the target "bare-floor cost + safety net"
  holds on first look (tokens 44% of superpowers'; wall under half of bare's).
- **Tier 2**: 36.5 turns / 34.3k tokens / 145s avg vs bare 28 / 51.4k / 397s —
  the plan file and review gate cost turns (49 on t2-dedupe) but total tokens
  came in at 0.67× bare, inside the prd-010 ~1.2× gate.
- **Cache**: real-task mean 82.4%, median 84.4% — consistent with the
  baseline finding that cache ratio is parity across conditions (short
  sessions mathematically cap the ratio; t0-pagesize's 63.1% is a 9-turn
  session, not a cache regression).

For release-gate numbers per prd-010 §6: rerun with n≥3 and medians, and
re-base the `bare` rows on the current CLI version so version drift drops out.

Note: skills were renamed after this smoke (tier-0/1/2 → tier-0-trivial /
tier-1-standard / tier-2-risky). Name strings and the routing-table text
changed; the flows themselves are unchanged.
