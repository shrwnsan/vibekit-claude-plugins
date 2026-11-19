# tasks-007: Wire the decision-model triage layer for `tempo`

**Status:** Implemented — Stage A gate passed 27/28 (2026-11-19, run
`routing-stage-a-wired-2026-11-19T09-12-24.json`); PR pending
**Date:** 2026-11-19
**Parent:** [prd-010](prd-010-lean-sdlc-plugin.md) §3.3 / §7 item 4; [tasks-006](tasks-006-tier-routing-golden-set.md) (golden set, Jev A/B, deferral threshold)

## Why now

prd-010 §3.3 was scoped as future work when the MVP shipped (tempo 0.1.0:
"no decision-model integration yet"). Since then every prerequisite has
landed elsewhere, so the remaining work is assembly, not research:

| Prerequisite | Where it stands |
|---|---|
| Calibrated golden set (28 cases, N=2 reproducible) | tasks-006: floor 27/28 = 96%, jev-1.14.0 25/28 = 89%, **+ t≈0.7 deferral → 96%** |
| Jev-compatible provider transport, fail-safe chain, env-gating | proven live in reflex (`reflex-gate.mjs`, 1.3k verdicts, typesafe+liquid) |
| Elicitation format for tier routing | `evals/ceremony/jev-router.mjs` (pin jev-1.14.0, decision-citing run) |
| Threshold tuning lifecycle | reflex `correlate-outcomes.mjs` pattern (log now, label later) |

Scope guard: this task wires **triage** (§3.3 integration point 1) plus the
shared router layer. Points 2–4 (skill selection, checkpoint adjudication,
promotion detection) reuse the same router and are follow-ups, not gates.

## Design decisions

1. **Opt-in via env, never by default.** No provider key set → no network,
   no egress; the router's keyword floor still tiers obvious cases (local,
   free, zero keys — added during implementation: outcome-identical to the
   skill prose floor, just deterministic). Presence of
   `TYPESAFE_API_KEY` or `LIQUID_API_KEY` enables the model layer;
   `TEMPO_TRIAGE=0` is the kill switch (mirrors `REFLEX_DISABLED`).
   Setting a key is the privacy consent: task context egresses to the
   hosted provider, stated in the README.
2. **Jev-compatible protocol, vendor-agnostic script.** Jev-API
   compatibility is the de-facto standard (prd-010 §5 — Clef adopted it;
   Liquid d1 is drop-in). The shipped script is `triage-router.mjs`, not
   `jev-router.mjs` (that name stays with the eval spike, which is
   decision-citing history). Provider table mirrors reflex:

   ```js
   const providers = {
     typesafe: { url: "...", model: "jev-latest", apiKeyEnv: "TYPESAFE_API_KEY" },
     liquid:   { url: "...", model: "d1.1",       apiKeyEnv: "LIQUID_API_KEY" },
     // local: open-weight d1-3B / Clef self-hosted — TEMPO_PROVIDERS=local + TEMPO_LOCAL_URL
   }
   ```

   `TEMPO_PROVIDERS` cycles order (default: whichever keys are present);
   provider error/timeout/garbage → next provider → main-model self-triage.
   Fails safe, always. **Proposes, never disposes**: the router only sets
   the tier suggestion; the verify gate, humans, and fail-twice backstop
   are untouched.
3. **Confidence deferral at t≈0.7.** Router p < 0.7 → hand to main model.
   Value from tasks-006 N=2 (miss confidences 0.25–0.69, stable across
   runs); overridable `TEMPO_TRIAGE_THRESHOLD`. Floor hits never spend a
   call.
4. **Runtime state lives outside the repo.** `~/.local/share/tempo/`
   (`TEMPO_LOG` / `TEMPO_STATE_FILE` overridable):
   - `verdicts.jsonl` — one line per triage call: tier set, per-tier
     probabilities, provider, confidence, `mode`/`ms`, correlation ids;
     0600/0700 like reflex; cwd and prompt home-abbreviated (`$HOME` → `~`)
     so shared/pasted logs carry no username; task text verbatim (needed
     for replay + outcome joins).
   - `failstate.json` — provider health for the fail-safe cycle.
   Repo `evals/ceremony/` + `test-results/` remain **dev-time published
   methodology** (labeled cases, decision-citing runs — the public-good
   falsifiability story), not runtime output. Ad-hoc personal runs go to
   `$TMPDIR` or `~/.local/share/tempo/evals/`; only curated labeled runs
   are promoted into `test-results/`.
5. **Acceptance gate before ship:** wired router must score **≥ heuristic
   floor (27/28 = 96%)** on the frozen 28-case set with deferral active,
   and no regression on the enacted/Q&A runs. If it can't beat-or-match the
   free floor, it doesn't ship — the floor stays, the layer waits.

## Eval plan

Data source: `evals/ceremony/routing-golden.json` (frozen; the planned
v1.1 additions run separately, never mixed into the 28-case gate). The
reflex verdict log (`~/.local/share/reflex/verdicts.jsonl`) is unrelated —
different plugin, different decision. No live traffic feeds the gate.

**Stage A — router unit gate** (cheap, reproducible, primary):
run `triage-router.mjs` directly over all 28 cases, same Choice elicitation
as `jev-router.mjs`. Gate: floor+router+deferral ≥ 27/28, per-tier
breakdown no worse than floor. Needs a live provider key; sandboxed runs
skip with the existing "live smoke skipped" pattern.

**Stage B — enacted end-to-end**: `run-routing.mjs --condition
tempo-wired` (headless sessions hitting the real wired path). Gate: no
regression vs committed runs (12/12 Q&A, 26/28 expanded). Catches hook
wiring, env-gating, and fallback-path breakage Stage A cannot see.

**Stage C — fallback paths** (ship blockers; they *are* the degradation
promise):
- no key set → diff against committed tempo-condition results, expect
  identical
- provider timeout/garbage → falls through to main model, verdict logged
- `TEMPO_TRIAGE=0` → router inert

**Results**: `test-results/routing-<ts>-triage-wired-<case>.json` (existing
convention); Stage A/B tables recorded in a Results section here; the
passing Stage A run is the decision-citing citation for the tempo 0.2.0
release-train body.

## Cost framing (measured rates, honest rounding)

Per triage decision, ~4K-token state:

| Decision maker | Cost/call | Per 1,000 tasks | Latency | Golden-set accuracy* |
|---|---|---|---|---|
| Keyword floor (local) | $0 | $0.00 | ~0 ms | 96% (27/28) |
| Jev (jev-1.14.0) | ~$0.0002 | ~$0.17 | ~ms | 89% → **96%** w/ deferral |
| Main model self-triage | ~$0.01–0.03 | ~$10–30 | ~seconds | 93% (26/28) |

Blended pipeline (floor ≈65% → router ≈32% → deferral ≈3%): **~$0.07 per
1,000 triages** vs ~$10–30 all-main-model. Split is estimated from miss
distribution, not measured — Stage B/B+ live logging replaces it with
observed share. Pricing: $0.042/M input, output free (jev-1.13 published
rate, 2026-10-15); 1.14.0 assumed same order; Liquid `d1:free` and local
d1-3B = $0 alternatives behind the same interface.

\* 28-case tempo routing golden set (tasks-006), N=2 reproducible.

## Results (Stage A, 2026-11-19)

Live run, TEMPO_MODEL_TYPESAFE pinned jev-1.14.0, frozen 28-case set:

| Source | n | Correct | Notes |
|---|---|---|---|
| keyword floor (no call) | 18 | 18 | incl. both keyword traps and all r2 risk anchors |
| router adopted (conf ≥ 0.7) | 3 | 3 | conf 0.80–0.92 |
| deferred (conf < 0.7) → main model | 7 | 7 | conf 0.24–0.65; scored by floor-proxy (no model-condition artifact exists) |
| **blend** | **28** | **27 (96%)** | parity with the floor; same single miss (r0-test-typo) |

**Gate PASS.** The blend spends 10 provider calls on 28 tasks (~$0.002 total
at published rates). Deferred confidences for lint-script / env-var /
deprecated-call (0.56 / 0.28 / 0.24) track the tasks-006 N=2 values
(0.68 / 0.39 / 0.27) — deferral character is reproducible across elicitation
harnesses. Floor-miss r0-test-typo reached the router (its text carries no
floor keyword), Jev deferred at 0.49, floor-proxy scored it — the exact
case where a main-model answer would be needed for a full 28/28.

Operational note for live runs: Node's native fetch ignores HTTP(S)_PROXY, so
inside the Claude Code bash sandbox provider calls fail ("fetch failed") even
when the host is allowlisted (curl works — it honors the proxy). Run Stage A
live with sandbox egress disabled; the shipped router is unaffected (it runs
in hook/skill context, outside the agent sandbox — reflex's 900+ verdicts
prove the path).

Re-run after the review-driven rework (floor moved inside the router, keyless
floor, env-registered custom providers): identical **27/28** — floor 18,
router 3, defer 7, same single miss (`routing-stage-a-wired-2026-11-19T14-39-11.json`) —
now measured through the exact shipped code path rather than a runner-side
floor pre-check.

## Security review (post-implementation, 2026-11-19)

Automated review flagged the keyless env-registered provider surface as
SSRF/exfil: a URL-only activation means any env source — including a cloned
repo's project-scoped `env` settings, which the script cannot distinguish
from the user's shell — becomes a task-text egress path. Adopted mitigations:

1. **https-only** for custom-provider URLs (plaintext HTTP is both exfil and
   a probe primitive; malformed URLs are ignored, never fatal).
2. **Explicit activation**: customs join the cycle only when named in
   `TEMPO_PROVIDERS` (typing the name is consent) or behind
   `TEMPO_CUSTOM_PROVIDERS=1`. Ambient auto-discovery is opt-in.
3. **Egress visibility**: every provider verdict line logs the destination
   `host`.

Rejected: private-range/localhost blocking — `TEMPO_LOCAL_URL` and customs
exist precisely to reach self-hosted endpoints, so IP-range rules would break
the feature; the consent gate covers the intent. Residual risk, stated
plainly: if an attacker controls env wholesale (both URL and flag), they
control the destination — the gate raises the bar against stray/untrusted
settings, not against full env control, which is outside any script's threat
model. Covered by tests 16–18.

Addendum (deliberate `/security-review` pass, 2026-11-19): the review found
`TEMPO_LOCAL_URL` bypassed both mitigations — it auto-joined on URL presence
alone and was the one env-supplied destination with no https check. Scored
7/10 (below its reporting bar) on a defensible counter-reading ("setting the
URL is consent", by analogy with API keys), but the analogy is structurally
wrong: an API key consents to sending to a fixed, audited host, while
`TEMPO_LOCAL_URL` chooses the destination itself. Closed rather than
accepted: `local` now follows the customs rules — https-only, active only
when named in `TEMPO_PROVIDERS`. Tests 19–21.

## Resolved open questions

- **Call site: skill-mediated, no new hook.** The risk-triage skill runs the
  router only when classification is not a clear first match and a provider
  key exists. No UserPromptSubmit moving parts; the Q&A golden set measures
  exactly this path. Stage B (enacted) would measure the hook alternative if
  ever needed.
- **Pin policy: runtime `jev-latest` + per-provider override
  (`TEMPO_MODEL_TYPESAFE`), evals pin explicitly.** Users get current
  weights; decision-citing runs pin jev-1.14.0 (this run) and record the pin
  in the results artifact.

## Follow-ups (post-0.2.0, each its own task)

- §3.3 points 2–4: skill-route selection, checkpoint adjudication
  (done?/flaky?/review-depth Noul calls), fail-once promotion detector
  (p > 0.6 → promote) — all consumers of the same router
- Outcome labeling: post-hoc join of `~/.local/share/tempo/verdicts.jsonl`
  to session transcripts (reflex `correlate-outcomes.mjs` pattern,
  deliberately outside the gate process); scrub-before-publish step for any
  derived cases promoted into the golden set
- Weekly accuracy-vs-cost curve per provider from the log (prd-010 §6)
- v1.1 golden cases (non-echoing risk variants, generalization set) run
  against the wired router
- A model-condition per-case artifact (test-results JSON) so deferred cases
  score against recorded main-model answers instead of the floor proxy
