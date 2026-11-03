# Changelog

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
