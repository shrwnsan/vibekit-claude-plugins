# Changelog

## 0.2.0 (2026-11-19)

- Optional decision-model triage layer (prd-010 §3.3, tasks-007): `scripts/triage-router.mjs`
  classifies via keyword floor → provider → confidence deferral, one deterministic call site.
- Keyword floor ships inside the router (canonical `floorDecide`, imported by the eval
  harness so runtime and eval can never drift) — floor hits decide for free, no provider
  call, and work with zero keys (local-only; the model layer stays opt-in). Same
  fast-path shape as reflex. `risk-triage` just runs the script and adopts `status:"tier"`.
- New providers are config, not code: any Jev-compatible endpoint registers via
  `TEMPO_PROVIDER_<NAME>_URL` (+ optional `_MODEL`/`_KEY`); built-ins TypeSafe/Liquid/local
  keep their env names, models overridable per provider.
- Provider-agnostic by design: TypeSafe Jev (`TYPESAFE_API_KEY`), Liquid d1
  (`LIQUID_API_KEY`), or a self-hosted open-weight endpoint (`TEMPO_LOCAL_URL`); any
  Jev-API-compatible server drops in. Provider failure cycles to the next, then
  defers to self-triage — fail-safe, never blocks.
- Opt-in, not a new default: no provider configured → behavior identical to 0.1.5.
  `TEMPO_TRIAGE=0` is the kill switch. Setting a provider key is the privacy consent:
  task text egresses to that hosted provider.
- Confidence deferral at t=0.7 (`TEMPO_TRIAGE_THRESHOLD`, tasks-006 N=2): low-confidence
  answers defer to main-model self-triage. The router proposes; the conflict rule,
  verify gate, and fail-twice promotion still decide everything.
- Runtime verdict log `~/.local/share/tempo/verdicts.jsonl` (0600, `$HOME`-abbreviated
  paths, task verbatim for replay) + provider-health failstate — same hygiene as reflex.
- risk-triage skill gains a router-assist step (only when configured and classification
  is not a clear first match).

## 0.1.5 (2026-11-07)

- README Install section uses the one-step marketplace install line
  (`/plugin install tempo --marketplace shrwnsan/vibekit-claude-plugins`),
  clearing the plugin-validate README warning.

## 0.1.0 (2026-10-31)

- Initial MVP per prd-010 §7: triage skill (tier router), tier-0-trivial /
  tier-1-standard / tier-2-risky flow skills, ~10-line static SessionStart
  routing table.
- Fail-twice auto-promotion rule; verify-before-done hard gate at every tier.
- No decision-model integration yet (prd-010 §3.3 is future work).

## 0.1.1 (2026-11-03)

- Skill cross-references are namespace-agnostic (`tier-1-standard`, not
  `tempo:tier-1-standard`), so the skills resolve correctly in any Agent
  Skills client (Pi, Amp, ...).
- README: Other clients section with install paths for Pi and Amp, and the
  honest list of what stays Claude Code-only (routing table, slash commands).

## 0.1.4 (2026-11-06)

- Tier-0 description gains the docs-update example; tier-2 description gains
  concurrency/rate-limiting signals — both found by the routing golden set
  (r2-ratelimiter-line under-tiered; docs edits were not exemplified as
  tier 0).

## 0.1.3 (2026-11-07)

- Skills published to the shrwnsan/agents hub: portability review passed —
  the set is client-agnostic (no Claude Code-only machinery in any skill
  body; cross-references are bare names that travel with the set; Apache-2.0).
  `tempo` moves from the allowlist's excluded map to `synced` (whole plugin —
  the router and flows only work as a unit). The four leaked pre-gate copies
  (`triage`, old tier names) are being removed from the hub separately
  (shrwnsan/agents#124).
- tier-0-trivial description no longer references the Claude Code-only
  session routing table — the one portability flaw the review found.
- Tier-1 flow: rerun discipline line — don't rerun the same test command
  with different output slices; quote from the run you have (from the
  tier-1 cost decomposition: 6 test runs vs bare's 2, several as
  pipe-rerun view changes).

## 0.1.2 (2026-11-03)

- `triage` renamed to `risk-triage` — collision-safe in shared Agent Skills
  directories (pi, Amp, agents hub); the tier names stay bare since the
  taxonomy itself is distinctive.
- Hook routing table: tier-0 line gains the config/auth/API carve-out
  ("not config/auth/API") — found by the tier-routing golden set: the
  table under-specified the tier-0 boundary, and a package.json script
  edit was classified tier 0 from table examples alone.
- Tempo skills no longer sync to the shrwnsan/agents hub: sync is now gated on
  a fail-closed portability allowlist (`.github/sync-skills.json`), and tempo
  stays unlisted — the tier skills are plugin-internal plumbing with
  portability unproven.
