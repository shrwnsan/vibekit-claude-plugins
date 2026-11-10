# Changelog

## 0.1.1 (2026-11-10)

- Fixed: the PreToolUse hook invoked `reflex-gate.mjs` directly without an
  executable bit (git mode 644), so every Bash call failed with
  `permission denied` (exit 126) and the gate never ran — reflex was inert
  in real sessions. The hook now invokes the script via `node` and quotes
  `${CLAUDE_PLUGIN_ROOT}` (same convention as the base/search-plus hook fix
  in #129), and the script carries the exec bit. Verified: allow / deny /
  ask fast paths all emit verdicts and append to the JSONL log.

## 0.1.0 (2026-11-10)

- Initial release: PreToolUse permission gate for auto mode — local regex
  fast paths (allow read-only, deny unambiguous destruction, ask
  risky-but-contextual), System One decision-model chain (TypeSafe Jev,
  Liquid d1, compatible endpoints) for everything else. Fails silent on
  any gate error (classifier hand-off); every verdict logged as JSONL.
