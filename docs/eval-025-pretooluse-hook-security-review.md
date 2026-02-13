# Eval 025: PreToolUse Hook Security & Correctness Review

**Date:** 2026-02-13
**Plugin:** base (v1.11.0)
**Scope:** `plugins/base/hooks/scripts/filter-test-output.sh`
**Status:** Issues found — fixes required

## Summary

Review of the PreToolUse hook that intercepts Bash tool calls containing test runner commands and rewrites them with grep filters to reduce verbose output and save tokens.

## Findings

### 🔴 Issue 1: `permissionDecision: "allow"` auto-approves dangerous compound commands

**Severity:** High
**Type:** Security

The hook returns `permissionDecision: "allow"` in its `hookSpecificOutput`, which bypasses Claude Code's entire permission system for the matched command. The regex patterns intentionally support compound commands (e.g., `cd /tmp; npm test`, `npm test && rm -rf /`). When matched, the entire compound command — including non-test portions — is auto-approved.

**Evidence from docs:** `permissionDecision: "allow"` — "bypasses the permission system" (Claude Code hooks reference).

**Fix:** Remove `"permissionDecision": "allow"` from the JSON output. `updatedInput` still applies without it, and Claude Code's normal permission flow will handle approval.

### 🟡 Issue 2: Exit code swallowed by pipe chain

**Severity:** Medium
**Type:** Correctness

The rewritten command wraps the original in `( ${CMD} ) 2>&1 | grep ... | head -N`. The pipeline's exit code comes from `head` (always 0), not the test runner. Claude sees exit 0 even when tests fail, losing critical signal for its reasoning.

**Fix:** Preserve the test command's exit code using bash `PIPESTATUS`:

```bash
FILTERED_CMD="set -o pipefail; ( ${CMD} ) 2>&1 \
  | grep ... | head -${MAX_LINES}; \
  exit \${PIPESTATUS[0]}"
```

### 🟡 Issue 3: False "All tests passed" fallback message

**Severity:** Medium
**Type:** Correctness

The fallback `grep -E '...' || echo 'All tests passed (output filtered by vibekit-base plugin)'` triggers whenever grep finds zero matching lines. This can happen when tests fail but the failure output doesn't match the grep pattern (different error format, unexpected output). The message actively misleads Claude into believing tests passed.

**Fix:** Change the fallback to a neutral message: `"(output filtered by vibekit-base plugin)"`.

## What's working well

- Clean `match_test_runner()` function with thorough regex boundary patterns
- Good coverage: Node.js, Python, Go, Rust, Ruby, Java ecosystems
- Proper `jq` dependency check with graceful fallback
- `VIBEKIT_BASE_TEST_FILTER` env var for disabling
- Comprehensive test suite (58/58 passing) with positive and negative cases
- Debug logs confirm hook is loaded and executed by Claude Code

## Debug log observations

- Hook is correctly registered and fires on Bash tool calls (`Matched 1 unique hooks for query "Bash"`)
- In all observed sessions, the hook returned `{}` (no test commands were being run), confirming the pattern matching correctly excludes non-test commands
- No timeout or error conditions observed in logs
