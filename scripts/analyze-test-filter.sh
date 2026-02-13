#!/usr/bin/env bash
set -euo pipefail

# Analyze Test Output Filter
#
# Measures PreToolUse hook activity using debug log signals and estimates
# token savings from the test output filtering hook.
#
# Usage:
#   ./scripts/analyze-test-filter.sh
#
# Environment Variables:
#   CLAUDE_DEBUG_DIR - Path to Claude debug directory (default: ~/.claude/debug)

CLAUDE_DEBUG_DIR="${CLAUDE_DEBUG_DIR:-~/.claude/debug}"
DEBUG_DIR="${CLAUDE_DEBUG_DIR/#\~/$HOME}"

if [[ ! -d "$DEBUG_DIR" ]]; then
  echo "Error: Debug directory not found: $DEBUG_DIR"
  exit 1
fi

echo "=== Test Output Filter Analysis ==="
echo ""

# Cache file list to avoid arg-list-too-long on large debug dirs
ALL_FILES=$(find "$DEBUG_DIR" -name "*.txt" -type f 2>/dev/null)

# --- Section 1: Hook Registration ---
echo "── Hook Registration ──"

BASH_SESSIONS=$(echo "$ALL_FILES" | xargs grep -l "executePreToolHooks called for tool: Bash" 2>/dev/null | wc -l | tr -d ' ')
HOOK_ACTIVE=$(echo "$ALL_FILES" | xargs grep -l "Matched [1-9].*hooks for query.*Bash" 2>/dev/null | wc -l | tr -d ' ')
HOOK_MISSING=$((BASH_SESSIONS - HOOK_ACTIVE))

echo "Sessions with Bash tool use:        $BASH_SESSIONS"
echo "Sessions with hook registered:       $HOOK_ACTIVE"
echo "Sessions without hook (pre-install): $HOOK_MISSING"

if [[ "$BASH_SESSIONS" -gt 0 ]]; then
  REGISTRATION_RATE=$(awk "BEGIN {printf \"%.1f\", ($HOOK_ACTIVE / $BASH_SESSIONS) * 100}")
  echo "Hook registration rate:              ${REGISTRATION_RATE}%"
fi

# --- Section 2: Invocation Counts ---
echo ""
echo "── Hook Invocations ──"

# Total times the hook ran (returned {} or hookSpecificOutput)
TOTAL_INVOCATIONS=$(echo "$ALL_FILES" | xargs grep -h "Hook PreToolUse:Bash (PreToolUse) success:" 2>/dev/null | wc -l | tr -d ' ')

# Filtered: hookSpecificOutput follows the success line (test command matched)
FILTERED_INVOCATIONS=$(echo "$ALL_FILES" | xargs grep -A 2 "Hook PreToolUse:Bash (PreToolUse) success:" 2>/dev/null \
  | grep "hookSpecificOutput" | wc -l | tr -d ' ')

# No-op: {} follows the success line (non-test command, correctly skipped)
NOOP_INVOCATIONS=$((TOTAL_INVOCATIONS - FILTERED_INVOCATIONS))

echo "Total hook invocations:      $TOTAL_INVOCATIONS"
echo "  Filtered (test commands):  $FILTERED_INVOCATIONS"
echo "  No-op (non-test commands): $NOOP_INVOCATIONS"

if [[ "$TOTAL_INVOCATIONS" -gt 0 ]]; then
  FILTER_RATE=$(awk "BEGIN {printf \"%.1f\", ($FILTERED_INVOCATIONS / $TOTAL_INVOCATIONS) * 100}")
  echo "Filter trigger rate:         ${FILTER_RATE}%"
fi

# --- Section 3: Session-Level Filtering ---
echo ""
echo "── Sessions with Filtered Tests ──"

FILTERED_SESSION_FILES=$(echo "$ALL_FILES" | xargs grep -B 2 "hookSpecificOutput" 2>/dev/null \
  | grep -v '^--$' \
  | grep "Hook PreToolUse:Bash (PreToolUse) success:" \
  | sed 's/:.*//;s/\.txt.*/.txt/' | sort -u)
FILTERED_SESSIONS=$(echo "$FILTERED_SESSION_FILES" | grep -c . 2>/dev/null || echo 0)

echo "Sessions with filtered test output: $FILTERED_SESSIONS"

if [[ "$HOOK_ACTIVE" -gt 0 ]]; then
  SESSION_FILTER_RATE=$(awk "BEGIN {printf \"%.1f\", ($FILTERED_SESSIONS / $HOOK_ACTIVE) * 100}")
  echo "Of hook-active sessions:            ${SESSION_FILTER_RATE}% ran tests"
fi

# --- Section 4: Estimated Token Savings ---
echo ""
echo "── Estimated Token Savings ──"

# Sample filtered outputs to measure average output size
SAMPLE_FILES=$(echo "$FILTERED_SESSION_FILES" | head -5)
SAMPLE_COUNT=0
TOTAL_FILTERED_LINES=0
AVG_FILTERED_LINES=30

for file in $SAMPLE_FILES; do
  if [[ -f "$file" ]]; then
    LINES=$(grep -A 50 "hookSpecificOutput" "$file" 2>/dev/null | wc -l | tr -d ' ')
    if [[ "$LINES" -gt 0 && "$LINES" -lt 100 ]]; then
      TOTAL_FILTERED_LINES=$((TOTAL_FILTERED_LINES + LINES))
      SAMPLE_COUNT=$((SAMPLE_COUNT + 1))
    fi
  fi
done

if [[ "$SAMPLE_COUNT" -gt 0 ]]; then
  AVG_FILTERED_LINES=$((TOTAL_FILTERED_LINES / SAMPLE_COUNT))
  echo "📝 Average filtered output lines: $AVG_FILTERED_LINES (from $SAMPLE_COUNT samples)"
fi

echo ""
echo "Assumptions:"
echo "  - Typical unfiltered test output: ~800 lines"
echo "  - Average filtered output: ~${AVG_FILTERED_LINES} lines"
echo "  - Average line length: ~50 characters"
echo "  - Token ratio: ~4 chars per token"
echo ""

if [[ "$FILTERED_INVOCATIONS" -gt 0 ]]; then
  # 800 lines × 50 chars/line ÷ 4 chars/token = ~10,000 tokens for unfiltered output
  UNFILTERED_TOKENS=$((800 * 50 / 4))
  FILTERED_TOKENS=$((AVG_FILTERED_LINES * 50 / 4))
  SAVINGS_PER_RUN=$((UNFILTERED_TOKENS - FILTERED_TOKENS))
  TOTAL_SAVINGS=$((SAVINGS_PER_RUN * FILTERED_INVOCATIONS))

  echo "Per test run:"
  echo "  Before: ~${UNFILTERED_TOKENS} tokens"
  echo "  After:  ~${FILTERED_TOKENS} tokens"
  echo "  Savings: ~${SAVINGS_PER_RUN} tokens (~$(awk "BEGIN {printf \"%.0f\", ($SAVINGS_PER_RUN / $UNFILTERED_TOKENS) * 100}")%)"
  echo ""
  echo "Total estimated savings (from ${FILTERED_INVOCATIONS} filtered runs):"
  echo "  ~${TOTAL_SAVINGS} tokens saved"
else
  echo "No filtered invocations found yet. The hook may not be installed or test"
  echo "runs may have occurred before installation."
fi

# --- Section 5: Security Check ---
echo ""
echo "── Security Indicators ──"

ALLOW_COUNT=$(echo "$ALL_FILES" | xargs grep -A 5 "Hook PreToolUse:Bash (PreToolUse) success:" 2>/dev/null \
  | { grep "permissionDecision.*allow" || true; } | wc -l | tr -d ' ')
PIPESTATUS_COUNT=$(echo "$ALL_FILES" | xargs grep -A 8 "Hook PreToolUse:Bash (PreToolUse) success:" 2>/dev/null \
  | { grep "PIPESTATUS" || true; } | wc -l | tr -d ' ')
FALSE_PASS_COUNT=$(echo "$ALL_FILES" | xargs grep -A 8 "Hook PreToolUse:Bash (PreToolUse) success:" 2>/dev/null \
  | { grep "All tests passed" || true; } | wc -l | tr -d ' ')

echo "permissionDecision: allow (pre-fix): $ALLOW_COUNT"
echo "PIPESTATUS exit code (post-fix):     $PIPESTATUS_COUNT"
echo "False 'All tests passed' (pre-fix):  $FALSE_PASS_COUNT"

# --- Section 6: Configuration ---
echo ""
echo "=== Configuration ==="
echo "Debug directory: $DEBUG_DIR"
echo "Hook script: plugins/base/scripts/filter-test-output.sh"
echo ""
echo "To disable filtering:"
echo "  export VIBEKIT_BASE_TEST_FILTER=none"
echo ""
echo "For more details, see: plugins/base/docs/test-output-filtering.md"
