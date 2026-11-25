# tasks-008: Fail-once promotion detector for `tempo`

**Status:** Implemented — 32/32 unit tests, live smoke pass (2026-11-19)
**Date:** 2026-11-19
**Parent:** [prd-010](prd-010-lean-sdlc-plugin.md) §3.3 integration point 4;
[tasks-007](tasks-007-tempo-decision-model-triage-wiring.md) (the router this consumes)

## Why

prd-010 §3.3.4: "after each failed attempt, a Noul call: escalate tier?
Threshold-configurable (e.g. p > 0.6 → promote)." Until now the only
promotion trigger was the deterministic fail-twice rule — right as a
backstop, but it burns a full wasted attempt on tasks that were visibly
under-tiered from their first failure. The router shipped in 0.2.0 already
has the transport, consent gates, failstate cycle, and verdict log; this is
a second elicitation on the same infrastructure, not new machinery.

## Design

1. **`promoteCheck(task, evidence, opts)` in `triage-router.mjs`** + CLI
   `--promote --task … --evidence …`. One Noul question (`escalate`) whose
   rules demand *signal*, not mere failure: risk surface (security, auth,
   concurrency, data lifecycle, architecture), hidden scope, or a dead end
   the current flow cannot absorb. Noul wire shape is the one reflex proved
   live (`type: "noul"` → `answers.<q>.noul`; `Number()` coerces both
   probability and bool returns).
2. **Adopt at p ≥ `TEMPO_PROMOTE_THRESHOLD`** (default 0.6, clamp 0.3–0.95 —
   prd-010's number). Below → `hold`. Same kill switch (`TEMPO_TRIAGE=0`),
   same provider cycle, same failstate backoff, same https/consent rules,
   same verdict log (mode `promote`, evidence verbatim, paths
   home-abbreviated, 0600).
3. **No keyword floor for promotion — deliberately.** A deterministic
   early-escalation rule would be guessing from failure text; the floor
   concept doesn't transfer from intake triage. The skill's fail-twice rule
   *is* the floor and always stands.
4. **One-directional, proposes-never-disposes.** The detector can only move
   an escalation earlier. `unconfigured` / `disabled` / `hold` / `error` all
   mean the same thing to the caller: the existing rule applies unchanged.
   It can never suppress or delay the backstop, and never gates anything
   irreversible (tier flows are process weight, not permissions).
5. **Call site: skill prose in `tier-0-trivial` + `tier-1-standard`** —
   one sentence each, before the existing promotion rule. Skill frontmatter
   descriptions are untouched: they are the router's *triage* elicitation
   criteria (`loadCriteria` reads them), and changing them would invalidate
   the Stage A comparison baseline.
6. `callNoul` mirrors `callProvider`'s retry skeleton rather than
   parameterizing it — a shared abstraction would touch the shipped triage
   transport for ~30 duplicated lines; zero regression surface wins.

## Verification

- **Unit (32/32):** 8 new tests in
  `plugins/tempo/scripts/tests/promote-check.test.mjs` — unconfigured,
  kill switch, escalate/hold thresholds, threshold override, bool coercion,
  garbage-answer error path, shared failstate backoff, log shape (mode
  `promote`, host, task + evidence verbatim). Plus 3 Stage-C fallback drills
  added to `triage-router.test.mjs` under this task's PR (timeout,
  garbage-body, unknown-choice fallthroughs — the last untested legs of the
  0.2.0 degradation promise).
- **Live smoke (2026-11-19, jev-1.14.0 served, typesafe):** benign first
  failure (test assertion mismatch) → `hold` p=0.04; under-tiered signal
  (rate limiting + concurrency deadlock, two failed mutex fixes) →
  `escalate` p=0.83. Both ends of the distribution correct at ~290 ms,
  ~$0.0002/call.
- **Golden-set triage parity untouched:** floor + Choice elicitation code
  paths byte-identical; `routing-golden.json` scores cannot move.

## Follow-ups

- Per-call reasoning effort: a `{model}@{effort}` convention (e.g.
  `TEMPO_MODEL_TYPESAFE="jev-latest@low"` parsed into the body's model plus an
  effort field) is an idea, not a feature — no provider documents an effort
  parameter on the systemone protocol today. Revisit in the checkpoint-adjudication
  design (the judgment most likely to want per-call effort control: a done-claim
  deserves more thought than tier routing), and only if a provider documents or a
  smoke call proves the field is honored rather than silently ignored.
- Enacted measurement (Stage B-style): how often the check fires in real
  sessions and its override rate — from the verdict log's `mode:"promote"`
  lines, reflex `correlate-outcomes.mjs` pattern.
- §3.3 point 3, checkpoint adjudication (done?/flaky?/review-depth) — next
  consumer of the same router; needs verify-gate call-site design.
- §3.3 point 2, skill-route selection, folded with the ops re-tiering finding
  (issue #170): long ops sessions re-scope continuously, and tiering once at
  intake under-tiered a day-long infra session end to end. Re-tier each
  request against a session baseline (or nudge via a hook when commands
  start matching infra patterns).

Validated live 2026-11-25, first session after 0.3.1 shipped: a real
permission-gate denial was merged into the promote check's evidence within
seconds (deny reasons only — the command fragment was stripped per the
privacy invariant the security review enforced), and the judge escalated at
p=0.61. Enabled via `TEMPO_EVIDENCE_REFLEX=1` in settings.
