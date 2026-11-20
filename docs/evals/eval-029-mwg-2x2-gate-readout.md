# eval-029: prd-012 modern-web-guidance 2x2 gate readout

The reusable method distilled from this run lives in
[ref-007: skill-gate methodology](../ref/ref-007-skill-gate-methodology.md); this doc is the instance.

**Status:** complete. **Outcome: null result; the port is not landed.**
**Date:** 2026-11-19
**Gate:** docs/plans/prd-012-modern-web-guidance.md, section 6
**Runner:** scripts/tempo-gate/run.sh (TEMPO_GATE_*), Docker isolation, fresh container per run
**Harness:** Claude Code CLI 2.1.319; model recorded per run: `glm-5.3-flash[1m]` (via ANTHROPIC_BASE_URL gateway)
**Fixture:** docs/evals/fixtures/mwg-gate (four seeded defects: CLS, reduced motion, color scheme, dialog focus/inertness)
**Total measured spend:** ~$19.53 as listed by the harness (claude CLI prices tokens at Anthropic list rates), but the gateway served `glm-5.3-flash`. Repriced against OpenRouter's `z-ai/glm-5.3-flash` card ($0.15/M prompt, $0.50/M completion, $0.03/M cache-read), the actual cost was **~$0.56** (per arm: A $0.15, B $0.13, C $0.17, D $0.11). The harness-reported `total_cost_usd` in the manifests is therefore not a billing record; token counts are. This makes larger-n reruns and the flip-condition experiments near-zero-cost follow-ups.

## Result table

| Arm | Guidance | Verify | Full-fix runs (n=3) | Median cost (harness-listed)* | Median wall | False-claim runs |
|---|---|---|---|---|---|---|
| A | yes | yes (skill) | **2/3** | $2.06 | 320s | 0 |
| B | yes | no | **2/3** | $1.30 | 373s | **1** |
| C | no | yes | **3/3** | $2.32 | 432s | 0 |
| D | no | no | **3/3** | $1.35 | 485s | 0 |

Scoring is runner-owned (`run-gate-checks.sh` verdicts against the arm's edited page); "claims" are keyword counts from the agent's own report, compared against runner verdicts for the false-pass metric. A manifest writer bug printed `gateValid:false` on docker runs; the per-run `isolation:"docker"` field is authoritative.

\* Harness-listed costs price tokens at Anthropic rates; see the spend note above for the OpenRouter repricing (~35x lower).

## Predictions vs. observations

- **Primary (verification effect A,C > B,D): NOT SUPPORTED.** Treatment arms went 5/6; control arms also went 5/6. The effect is zero at this n and model tier.
- **Secondary (arm B produces the most false passes): weakly supported.** Arm B produced the only false-claim run (claimed fixes; reduced-motion check failed: identical `0.3s` durations under both preferences, the classic signature the skill targets). Arm A's failing run made no false claims (claimed 0 fixes; its dialog failed on focus return). n=3 cannot distinguish this from noise.

## The two failing runs (all other runs passed all four checks)

- **A run 2:** dialog. Focus stayed on the trigger; no Esc handling or focus return.
- **B run 3:** reduced motion. `0.3s` under both preferences.

## Interpretation

1. **Ceiling effect is the most likely cause.** The four defects are the four most famous frontend platform mistakes; a strong instructable model (2026 tier) repairs them from training data alone. Arm D's passing transcripts show it authoring `width`/`height` reservations, `prefers-reduced-motion` arms, real dark themes, and native `<dialog>` unprompted.
2. **Fixture difficulty is too low to detect a verification effect for this model tier.** The fixture remains valid as a *scoring instrument* (all four checks discriminate correctly in both directions; see the fixture README baseline), but as a *treatment test* it is saturated.
3. **Cost signal:** verification added wall time efficiency (A: 320s median vs D: 485s; verification arms converged faster despite doing more) at higher cost (A: $2.06 vs B: $1.30). Underpowered; worth a larger-n check.

## Decision (per prd-012 section 7.1)

The null result kills the port. `modern-web-guidance` does **not** land in tempo. The fixture and runner stay as reusable infrastructure:

- The fixture is the record of why, and the scoring instrument for any future re-test.
- The arm-runner is harness-agnostic (TEMPO_GATE_* config) and ready for prd-011's gate.

## Conditions that could flip the outcome (recorded, not scheduled)

- A weaker/cheaper model tier where the defects are not training-data-trivial.
- A harder fixture with defects that are *not* the canonical four (e.g., `color-scheme` on form controls only, popover/top-layer edge cases, CLS from web-font swap with `size-adjust`).
- Larger n on the secondary prediction alone (false-pass rate of guide-without-verification arms), which is the commercially interesting claim for the skill.

## Learnings (layered by confidence)

**Validated in this run (directly observed, reproducible):**

1. **Fixture environment is instruction surface.** The fixture's own HTML comments leaked "do not fix anything here" into a control workdir; an arm obeyed them and refused the task. Answer-bearing files (`fixed.html`) shipped into run workdirs were a near-miss of the same kind. Rule adopted for all future gates: a run workdir contains only what a real user's project would contain: no meta-commentary, no solutions. (Enforced by the runner's contamination guard.)
2. **Scoring hooks must be part of the task contract.** An arm legitimately reimplemented the modal under different markup and the scorer failed a possibly-correct page. The parity contract line in the common task text (`.cta`, `#open-modal`, `#dialog`/`#modal` preserved) is the honest fix; fuzzy behavioral scoring would reintroduce judgment into mechanical verdicts.
3. **Harness cost fields are not billing.** `total_cost_usd` priced tokens at harness rates while a gateway-served model ran at ~35x lower card rates. Runner now records token counts and a declared `pricingCard` per run; token arithmetic against a real price card is the only cost record.
4. **Pre-commitment did its job in both directions.** The primary prediction being on record made the null a decision, not a debate; the secondary prediction being on record made its weak support a finding, not a story. Both were written before any run data existed.

**Underpowered signals (one or two incidents; worth targeted follow-up, not conclusions):**

5. Verification arms converged faster in wall-clock median (320s vs 485s) despite doing strictly more checks; evidence-gathering may cut out the guess-and-check cycle. If this holds at larger n, it is a stronger pitch for the skill than correctness.
6. The single fabricated success came from the guide-without-verification arm (B); the failing verification arm (A run 2) honestly reported zero fixes. This is the exact mechanism the skill claims to fix, and is the most commercially interesting targeted follow-up: a larger-n B-vs-A false-pass study (~$0.10/run at the repriced card).
7. Ceiling effect is diagnosed but not proven as the sole cause: the fixture's four defects are the canonical four, plausibly training-data-trivial for current models. A fixture of non-canonical defects is the cleanest test of whether the verification effect exists for strong models.

**Process learnings (adopted for future gates):**

8. Smoke one arm before running the matrix. Every infrastructure defect (root-uid refusal, network-isolated browser, command drift, turn-cap truncation) was found for nickels in smoke runs; the written step is now "arm D, n=1, before anything else."
9. A fixture needs its two properties tested separately: scoring validity (discriminates known-good from known-bad; see the fixture README baseline) and treatment sensitivity (arms differ; that is what the 2x2 measures). Passing one says nothing about the other.
10. Never edit a running orchestration script; fix forward in the next invocation and annotate (the `gateValid` case bug was corrected at readout time, per-run `isolation` field authoritative).

## Run artifacts

Manifests: `scripts/tempo-gate/test-results/*.jsonl` (12 lines, committed). Per-run transcripts, prompts, edited pages, and score output: `scripts/tempo-gate/runs/` (43 MB, not committed; archived on oci-prime at `/tmp/vibekit-gate`, which is ephemeral; manifests are the durable record).

## Hygiene record

- Fresh container per run; control arms' config dirs and prompts asserted clean pre-launch (arm-aware assertions; one false positive on arm B's *negated* verification language was fixed pre-run, see runner commit history).
- Run workdirs contained only the defect page and its asset; fixture meta-comments stripped; `fixed.html` never shipped into any run.
- No skill residency in control harnesses; treatment arm A's skill file fetched from upstream at run time and asserted present.
