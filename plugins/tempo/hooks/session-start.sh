#!/usr/bin/env bash
# tempo SessionStart hook.
# Injects the tier routing table. Content is static and identical every session
# (prd-010 section 3.2): no dynamic reads, no philosophy lecture, ~12 lines.
set -euo pipefail

table='tempo — safety-proportional process. Tier each task before starting:
- tier 0 trivial (typo, copy tweak, one-line fix): do it now, verify, done. Load no skills.
- tier 1 standard change: one-line plan note, test-first, single agent. Load tempo:tier-1-standard.
- tier 2 architectural / risky / ambiguous: short plan file, review gate before done. Load tempo:tier-2-risky.
Rules with no exceptions:
- Same approach failed twice (tests, edit-revert, repeated debug) -> promote one tier automatically.
- Verify before claiming done, every tier: run the checks and quote the evidence.
- Pick the tier once; no mid-conversation process re-reads.'

# Escape for JSON embedding (single-pass substitutions).
esc=${table//\\/\\\\}
esc=${esc//\"/\\\"}
esc=${esc//$'\n'/\\n}
esc=${esc//$'\t'/\\t}

printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"}}\n' "$esc"
