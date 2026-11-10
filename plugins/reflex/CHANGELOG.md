# Changelog

## 0.1.2 (2026-11-10)

- Changed: default provider cycle order is now `typesafe,liquid` — Jev
  answers first, Liquid is the failover.

- Fixed: a provider that hit `REFLEX_MAX_FAILURES` consecutive failures was
  disabled until the failstate file was deleted by hand — the documented
  "for the day" recovery was never implemented, so a dead provider stayed
  dead forever. Failstate entries now record `{count, since}` and expire
  after `REFLEX_RECOVERY_MS` (default 30 min); a past-cooldown retry either
  clears the entry or re-opens the breaker. Legacy bare-number entries
  (e.g. the stuck `{"liquid":3}`) load as expired, self-healing existing
  installs.
- Fixed: the liquid preset used model `d1:free`, which does not exist on
  the hosted Decisions API — every call 404'd. Preset is now `d1.1`
  (endpoint path unchanged and verified against docs.liquid.ai).
- Improved: read-only fast path now covers `cd`, `grep`, `sort` (without
  `-o`), `find` (without `-delete/-exec*`/`-ok`/`-fprint*`), `sed -n` with
  pure line-print scripts, parse-only interpreters (`bash -n`, `node
  --check`), `echo`/`printf`/`true`/`sleep`, `git check-ignore`/`ls-files`/
  `cat-file`/`rev-list`, and read-only `gh pr|issue|repo view/list/checks/
  diff`. Plain `curl` GETs deliberately stay on the model chain: a literal
  secret in a URL must never be silently allowed.
- Fixed: fd duplication (`2>&1`) was treated as a file-write redirection,
  killing the fast path for most read-only pipelines; fd-dup redirects are
  now stripped like `/dev/null`. Bundled curl short flags (`curl -sI`)
  fast-path when the bundle carries no body/method flag (`d/D/f/F/T/X`).
- Measured against a real session's verdict log (54 verdicts): model-chain
  traffic on that session's read-only commands drops by ~40%; remaining
  fall-throughs are write-mode or execution-mode commands, correctly.

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
