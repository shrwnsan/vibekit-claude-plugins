# Ceremony-cost eval harness (tempo)

Measures what process plugins cost — tokens, turns, wall-clock, cache behavior —
against a fixed golden task set, so `tempo` (prd-010) can prove it is leaner
without being less safe. Full protocol and rationale:
[docs/plans/tasks-005](../../docs/plans/tasks-005-tempo-ceremony-eval-harness.md).

## Layout

- `golden-tasks.json` — the task set (id, tier, prompt, limits); tier labels are
  ground truth for future triage evals
- `conditions.json` — plugin conditions: `bare`, `superpowers`, `tempo` (future)
- `run-eval.mjs` — runner: sandboxes under `$TMPDIR`, isolation via a fresh
  `CLAUDE_CONFIG_DIR` per session (no user plugins, no global rules), treatment
  via `--plugin-dir`
- `collect.mjs` — stream-json parser; `node collect.mjs <log>` or `--summary`
- `fixtures/<id>/repo/` — seeded zero-dependency Node repo
- `fixtures/<id>/verify/hidden/` — verification tests the agent never sees,
  copied in after the session; `t2-dedupe`'s are behavior-preservation pins and
  pass against pristine code by design

## Usage

```bash
node run-eval.mjs --smoke                 # harness validation: probe + t0, both conditions
node run-eval.mjs --condition bare        # full baseline (6 sessions)
node run-eval.mjs --condition superpowers # full baseline (6 sessions, tier-2 can be heavy)
node run-eval.mjs --condition bare --tier 1 --task t1-slugify  # subsets
node run-eval.mjs --condition tempo --bin bin/zai              # Z.AI provider shim
node run-eval.mjs --list
node collect.mjs --summary                # aggregate test-results/ceremony-*.json
```

`--bin` names the claude-compatible CLI that runs the sessions (default
`claude`). A relative path resolves against this directory. `bin/zai` is an
example shim for provider-env authentication: it sources the local zsh
config, maps provider variables to the `ANTHROPIC_*` names claude reads, and
execs claude. It passes provider env only — no permission or effort
overrides — so eval protocol semantics hold. Adapt it for your own provider;
secrets move process-to-process only and are never logged.

Runs are headless (`claude -p`) in disposable sandboxes with bounded,
condition-identical permissions (`acceptEdits` + a read/edit/test allowlist —
no approval-gate bypass). They are real sessions on your configured backend, so
full baselines cost real tokens. Results land in
`test-results/ceremony-<ts>-<condition>-<task>.json`.

## Notes

- Sandboxes live in `$TMPDIR` and are left for OS cleanup; the session log is
  kept next to each sandbox (`<sandbox>.session.jsonl`).
- The `probe` task lists available skills per condition — use it to verify
  plugin isolation actually works headless before trusting any numbers.
- Backends that don't populate cache fields in stream-json leave
  `cache_hit_ratio` null; condition-relative comparisons stay valid.
