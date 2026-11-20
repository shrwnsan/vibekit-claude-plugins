# ref-007: skill-gate methodology

The reusable method for adopt/derive decisions on outside skills and
techniques: how to run a validation gate that produces a trustworthy answer
cheaply. Born from eval-029 (the prd-012 modern-web-guidance 2x2, first
end-to-end execution); will host prd-011's gate via the same runner.

Back: [root README](../README.md) · Instance: [eval-029](../evals/eval-029-mwg-2x2-gate-readout.md) · Runner: [scripts/tempo-gate](../../scripts/tempo-gate/)

## The shape of a gate

1. **Plan of record** (`docs/plans/prd-0XX-*.md`) states the prediction
   *before* any data exists — primary and secondary, with direction.
   A prediction not written down in advance is a story written after.
2. **2x2 (or k-arm) crossing** the treatment's claimed ingredients, spec
   parity across arms, so each ingredient's effect is separable.
3. **Runner-owned scoring.** Pass/fail is decided by a mechanical check
   runner against the produced artifact, never by the agent's own report.
   Agent claims are parsed separately, into a false-pass metric.
4. **Readout whatever the result.** Null kills the candidate and the doc
   becomes the record of why; flip conditions are recorded so the question
   is parked with a re-open price, not dead.

## Fixture design: two properties, tested separately

- **Scoring validity** — the check runner discriminates a known-bad page
  from a known-fixed page in both directions. Test with a seeded-defect page
  and its repaired twin before any agent sees it.
- **Treatment sensitivity** — arms actually differ. A fixture whose defects
  are training-data-trivial for the model tier under test saturates: control
  arms pass without treatment, and the gate reads null regardless of the
  treatment's real value. Choose defects the model does not canonically know.

The two properties are independent. Passing one says nothing about the other
(eval-029 passed validity and read null on sensitivity).

## Contamination rules

- The run workdir contains only what a real user's project would contain:
  no meta-commentary, no "do not fix" notes, no answer files, no solved
  variants. Fixture comments are stripped on copy; the runner enforces this.
- Control arms' harness environments are asserted clean *before launch*
  (skill files, prompt language), fail-closed. Negated instructions
  ("do NOT verify") are not violations — match non-negated sentences only.
- Scoring hooks (ids/classes the check runner selects on) are preserved via
  a contract line in the *common* task text, identical across arms.
  Real verification suites depend on stable selectors; stating that contract
  in the task is how production repos work, not a fixture artifact.

## Cost discipline

- Token counts are the cost record; the harness's own `total_cost_usd`
  prices at harness rates and can be tens of times off a gateway-served
  model (eval-029: $19.53 listed, ~$0.56 actual). Declare the pricing card
  per run (`TEMPO_GATE_PRICING_CARD`), reprice from tokens, and never let a
  tool's self-reported dollar figure into a readout table uncorrected.
- Smoke one arm (typically D, n=1) before running the matrix: every
  infrastructure defect found in eval-029 (root-uid refusal, network-isolated
  browser, command drift, turn-cap truncation) was found for nickels there.

## Harness notes (claude CLI + agent-browser, as of gate 001)

- `--dangerously-skip-permissions` refuses under root; run containers as the
  host uid with a writable HOME.
- agent-browser ≥0.39 uses `set media`; older builds use bare `media`.
  Probe at runtime, don't assume.
- Budget the turn cap above the task's natural turn count; a capped session
  exits non-zero and looks like a failure that isn't.
- Managed browsers may be network-isolated from the orchestrator; fixtures
  that load as `data:` URLs (single self-contained file) sidestep serving
  entirely. Keep a served mode for parity, but don't require it.
- Never edit a running orchestration script; bash reads incrementally.
  Fix forward in the next invocation, annotate the manifest.
