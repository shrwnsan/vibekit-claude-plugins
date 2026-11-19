# eval-029: prd-012 modern-web-guidance 2x2 gate readout

**Status:** complete. **Outcome: null result — the port is not landed.**
**Date:** 2026-11-19
**Gate:** docs/plans/prd-012-modern-web-guidance.md, section 6
**Runner:** scripts/tempo-gate/run.sh (TEMPO_GATE_*), Docker isolation, fresh container per run
**Harness:** Claude Code CLI 2.1.319; model recorded per run: `glm-5.3-flash[1m]` (via ANTHROPIC_BASE_URL gateway)
**Fixture:** docs/evals/fixtures/mwg-gate (four seeded defects: CLS, reduced motion, color scheme, dialog focus/inertness)
**Total measured spend:** ~$18 (12 runs)

## Result table

| Arm | Guidance | Verify | Full-fix runs (n=3) | Median cost | Median wall | False-claim runs |
|---|---|---|---|---|---|---|
| A | yes | yes (skill) | **2/3** | $2.06 | 320s | 0 |
| B | yes | no | **2/3** | $1.30 | 373s | **1** |
| C | no | yes | **3/3** | $2.32 | 432s | 0 |
| D | no | no | **3/3** | $1.35 | 485s | 0 |

Scoring is runner-owned (`run-gate-checks.sh` verdicts against the arm's edited page); "claims" are keyword counts from the agent's own report, compared against runner verdicts for the false-pass metric. A manifest writer bug printed `gateValid:false` on docker runs; the per-run `isolation:"docker"` field is authoritative.

## Predictions vs. observations

- **Primary (verification effect A,C > B,D): NOT SUPPORTED.** Treatment arms went 5/6; control arms also went 5/6. The effect is zero at this n and model tier.
- **Secondary (arm B produces the most false passes): weakly supported.** Arm B produced the only false-claim run (claimed fixes; reduced-motion check failed: identical `0.3s` durations under both preferences — the classic signature the skill exists to catch). Arm A's failing run made no false claims (claimed 0 fixes; its dialog failed on focus return). n=3 cannot distinguish this from noise.

## The two failing runs (all other runs passed all four checks)

- **A run 2:** dialog — focus stayed on the trigger after `showModal()`-adjacent open path; no Esc/focus-return.
- **B run 3:** reduced motion — `0.3s` under both preferences.

## Interpretation

1. **Ceiling effect is the most likely cause.** The four defects are the four most famous frontend platform mistakes; a strong instructable model (2026 tier) repairs them from training data alone. Arm D's passing transcripts show it authoring `width`/`height` reservations, `prefers-reduced-motion` arms, real dark themes, and native `<dialog>` unprompted.
2. **Fixture difficulty is too low to detect a verification effect for this model tier.** The fixture remains valid as a *scoring instrument* (all four checks discriminate correctly in both directions — see the fixture README baseline), but as a *treatment test* it is saturated.
3. **Cost signal:** verification added wall time efficiency (A: 320s median vs D: 485s — verification arms converged faster despite doing more) at higher cost (A: $2.06 vs B: $1.30). Interesting, underpowered.

## Decision (per prd-012 section 7.1)

The null result kills the port. `modern-web-guidance` does **not** land in tempo. The fixture and runner stay as reusable infrastructure:

- The fixture is the record of why, and the scoring instrument for any future re-test.
- The arm-runner is harness-agnostic (TEMPO_GATE_* config) and ready for prd-011's gate.

## Conditions that could flip the outcome (recorded, not scheduled)

- A weaker/cheaper model tier where the defects are not training-data-trivial.
- A harder fixture with defects that are *not* the canonical four (e.g., `color-scheme` on form controls only, popover/top-layer edge cases, CLS from web-font swap with `size-adjust`).
- Larger n on the secondary prediction alone (false-pass rate of guide-without-verification arms), which is the commercially interesting claim for the skill.

## Run artifacts

Manifests: `scripts/tempo-gate/test-results/*.jsonl` (12 lines, committed). Per-run transcripts, prompts, edited pages, and score output: `scripts/tempo-gate/runs/` (43 MB, not committed; archived on oci-prime at `/tmp/vibekit-gate` — ephemeral; manifests are the durable record).

## Hygiene record

- Fresh container per run; control arms' config dirs and prompts asserted clean pre-launch (arm-aware assertions; one false positive on arm B's *negated* verification language was fixed pre-run, see runner commit history).
- Run workdirs contained only the defect page and its asset; fixture meta-comments stripped; `fixed.html` never shipped into any run.
- No skill residency in control harnesses; treatment arm A's skill file fetched from upstream at run time and asserted present.
