# Changelog

## 0.1.3 (2026-11-12)

- Fixed: the gate was blind to the session's permission mode and ran on
  every Bash call. In manual modes a reflex `allow` bypassed the human
  prompt and a reflex `deny` took the decision from the human — both
  violations of "can only sharpen, never loosen". The gate now reads
  `permission_mode` from the hook input and silently exits unless it is
  `auto`, restoring the untouched default flow everywhere else.
- Fixed: the read-only fast path could auto-allow reads of secrets files
  (`cat .env`, `head ~/.aws/credentials`) ahead of the auto-mode
  classifier's own secrets review — read-only is not safe. A new local
  fast path asks a human whenever a command names secrets/key material
  (`.env`, `.pem`, `.key`, `.p12`, `.pfx`, `id_rsa`, `id_ed25519`,
  `id_ecdsa`, `credentials.json`, `.aws/credentials`, `.netrc`).
- Improved: fast-path hook reasons now name what fired — the matched
  pattern's label and the matched snippet (≤60 chars), e.g.
  `risky pattern — force push: "git push --force" (human decides)`
  instead of `risky pattern needs human eyes (local regex)`. Deny/ask/
  secrets regexes became labeled pattern lists; the verdict log gains a
  `pattern` field.

- Added: `REFLEX_ALL_MODES=1` extends gating to non-auto modes, ask/deny
  only — reflex never allows outside auto mode in any configuration, and
  `bypassPermissions` is always excluded (with no prompts beneath the
  gate, a deny there would make reflex the sole authority). Default
  scope is unchanged: auto mode only.
- Improved: verdict log carries the same 2,000-char command the gate
  decided on (the old 200-char prefix silently mislabeled eval-harness
  replays of long compound commands), plus `mode`, `ms` (end-to-end hook
  latency) and `callMs` (provider round-trip) on verdicts, and
  command/cwd on `provider-error` lines so an outage can be correlated
  with the calls it affected. All additive keys; the existing harness
  keeps working.

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
  `-o`/`--output`), `find` (without `-delete/-exec*`/`-ok`/`-fls`/
  `-fprint*`), `sed -n` with pure line-print scripts, parse-only
  interpreters (`bash -n`, `node --check`), `echo`/`printf`/`true`/`sleep`,
  `command -v`, `git check-ignore`/`ls-files`/`cat-file`/`rev-list`, and
  read-only `gh pr|issue|repo view/list/checks/diff`. Plain `curl` GETs
  deliberately stay on the model chain: a literal secret in a URL must
  never be silently allowed.
- Fixed: fd duplication (`2>&1`) was treated as a file-write redirection,
  killing the fast path for most read-only pipelines; fd-dup redirects are
  now stripped like `/dev/null`. Bundled curl short flags (`curl -sI`)
  fast-path when no token anywhere carries a body/method/upload/output
  flag.
- Fixed (review): four write-mode escapes in the new fast-path patterns,
  found by behavioral probing and verified on disk — `sed -ni` (in-place
  edit) and unchecked `sed` tails (`-e`/`-f` after the script, `w`/`e`
  script commands), `sort -oFILE`/`--output=`, `find -fls`/`--delete`, and
  curl body/method/output flags positioned after the first flag bundle
  (`curl -sI -T f`, `-X POST`, `-o file`). Also closed: `git diff
  --output=FILE`, and the curl check is now token-based so flag position
  can't dodge it.
- Fixed (review): the `/dev/null` strip only matched `&>`-forms, so plain
  `>/dev/null` and `2>/dev/null` killed the fast path for every command
  carrying them (mid-command forms were already broken in 0.1.1; the
  trailing form regressed here). All redirect-to-/dev/null shapes now
  strip. Escaped pipes (`grep 'a\|b'`) no longer split compounds.
- Fixed (review): non-numeric `REFLEX_RECOVERY_MS`/`REFLEX_MAX_FAILURES`/
  `REFLEX_TIMEOUT_MS` values silently disabled the failure breaker (NaN
  comparisons are always false); invalid values now fall back to defaults.
- Measured by replaying real verdict logs through the gate: 9 of 29
  model-chain commands (31%) on the author's session; on a second
  machine's log 11 of 58 with the PR as pushed, 17 of 58 (29%) after the
  review fixes, with zero previously-allowed commands lost. Remaining
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
