# research-001: reflex ask-economy findings + tuning roadmap

Distilled from the 2026-11-23/24 review sessions (live-log correlator run,
three analysis iterations including a Gilfoyle-persona adversarial round,
sandbox-off hypothesis testing). Raw iteration notes: `/tmp` (ephemeral, do
not rely on them); this doc is the canonical record.

Back: [docs README](../README.md) · Related: tasks-007/tasks-008 (tempo
follow-ups), PRs #172-#175, #180, #183.

## Findings (measured on the author box, 2026-11-10 → 11-24)

Ask-layer override rates, **conditional on outcome labels** (unlabeled =
missing data, never divide by the unlabeled; v1's "13% model asks" pooled
agreed *allows* into the denominator — Simpson's paradox, do not repeat it):

| layer / class | asks | labeled | overridden | rate |
|---|---|---|---|---|
| model asks (typesafe) | 256 | 211 | 208 | **98.6%** |
| fast-path asks (all) | 88 | 88 | 78 | **88.6%** |
| — inline credential (Bearer) | 53 | 53 | 53 | 100% (but **3 sessions** — dev/eval cluster) |
| — .env file | 36 | 29 | 20 | 69% (the only ask with refusals) |
| **denies** | 17 | 17 | **0** | hard boundary never crossed |
| **allows** | ~1,971 | ~1,974 | 3 | 0.15% |

- The gate's **hard edges are the product**: denies/allows are empirically
  sound. The ask layer is a ~98%-overridden information-free tax.
- Session decomposition matters: Bearer's 100% is a dev-cluster artifact
  (synthetic payloads); the model chain's 98.6% spans 30 real sessions —
  broad, not contamination.
- Pull-rot measured: `/reflex:status` invoked in 15 of 1,915 sessions; 12 on
  its ship day. Steady-state pulls ≈ 0.
- Asks/day is spiky with dev intensity (2 → 106), no upward trend — a flat
  wall of yes, not growing habituation.

## Design decisions (adversarially reviewed; the survivors)

1. **Fix the footer lie** — shipped in 0.3.0 (footer pointed at a repo-side
   correlator no plugin install has).
2. **`reflex-status --check`** — exit-code trip-detector; trips =
   protection/integrity (deny-overridden is the headline), deliberate
   accounting states (`LOG=off`) are INFO. SessionStart hook rejected:
   nobody reads injections and the measurement proved the audience empty.
3. **Approval latency** — the discriminator between rubber-stamping and
   legitimate yes; `resultTs` shipped in the correlator, consumed by tune.
4. **Prune by evidence bar, consent-gated** — ≥90% override across ≥5
   sessions and ≥10 asks, or sub-second approval p95. Proposals never
   self-apply (a gate that auto-loosens from its own telemetry is baitable).
5. **Ask economy** — cost per ask (now real token metering since 0.2.2)
   against value per catch; makes pattern-removal arithmetic.
6. **Nudge cadence (future)** — signal-bound, rising-edge, re-arm only on
   material change; time-bound checkpoint as opt-in variant. Presence-bound
   repetition is empirically wallpaper (PERMS WIDE nagged unnoticed).
7. **Rejected**: shipping the cross-session correlator inside the plugin
   (privacy inversion + self-contaminated label corpus); in-process gate
   rewrite (trust regression); SessionStart hooks.

## Shipped

- **P1 — reflex 0.3.0 (#183, 2026-11-25)**: `/reflex:tune` +
  `scripts/reflex-tune.mjs`, config file (`~/.claude/reflex-config.json`,
  env > config > defaults, `disabledClasses` exact-label match),
  `reflex-status --check`, footer fix, correlator `resultTs`, README docs.
  Live smoke: `model:typesafe` flagged (99%/208-211/30 sessions) — matches
  this doc exactly; Bearer 100% correctly NOT flagged (4 sessions < bar).
  Implementation bug caught by its own test pre-merge: numeric-string env
  thresholds fell through to config values.
- **Correlator resultTs** (#183 second commit): approval latency stamped on
  new outcome lines; existing lines stay unstamped (latency "unavailable"
  until re-correlated).

## Pending (next sessions, in order)

- **P2 — reflex 0.4.0**: ship a **mod** in the plugin (`hooks/hooks.json` +
  module): band health line, trip toasts, analytics pane with tune controls.
  Gate stays an out-of-process settings hook (mod = observability only —
  mods run in-process, unsandboxed; do not move the gate in-process).
  Poller must stat-gate the log (grew 2.0 → 3.2 MB in two days; mods
  `$.fs.read` caps at 4 MiB).
- **Middle grounds** (thin riders on P2, not a phase): scheduled nudge
  (checkpoint cadence, opt-in) + one-press apply from toast.
- **P3 reserved, recommended against**: in-process gate rewrite.
- Watch: tempo promote outcomes under live `TEMPO_EVIDENCE_REFLEX=1`
  (first field validation p=0.61, thin by design — tasks-008).
- Known gap: reflex log has no rotation; growth math above.

## Meta-lessons (process, worth keeping)

- Condition on `decision` before any rate claim. Non-negotiable.
- Soft-skips (`console.log` + return) masquerade as passes and hid a
  never-tested code path across two PRs and CI — `t.skip()` exists for that.
- `spawnSync` + an in-process mock freezes the event loop serving the mock;
  the repo's own `run.mjs` documented the trap before we rediscovered it.
- Environment-shaped assumptions generalize poorly (sandbox loopback,
  umask 022 runners, this box's furniture) — test the hypothesis, not the
  home turf.
- Adversarial persona review caught two denominator errors the author
  missed twice; symmetric skepticism applies to one's own N=1 generalizations.
