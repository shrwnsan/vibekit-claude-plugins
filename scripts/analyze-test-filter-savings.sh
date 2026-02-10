#!/usr/bin/env bash
set -euo pipefail

# Analyze Test Output Filter Token Savings
#
# Analyzes Claude Code debug sessions to estimate token savings from
# the test output filtering PreToolUse hook.
#
# Usage:
#   ./scripts/analyze-test-filter-savings.sh
#
# Environment Variables:
#   CLAUDE_DEBUG_DIR - Path to Claude debug directory (default: ~/.claude/debug)

CLAUDE_DEBUG_DIR="${CLAUDE_DEBUG_DIR:-~/.claude/debug}"

echo "=== Test Output Filter - Token Savings Analysis ==="
echo ""

# Expand debug directory path
DEBUG_DIR="${CLAUDE_DEBUG_DIR/#\~/$HOME}"
if [[ ! -d "$DEBUG_DIR" ]]; then
  echo "Error: Debug directory not found: $DEBUG_DIR"
  exit 1
fi

# Count sessions with test commands
TEST_SESSIONS=$(find "$DEBUG_DIR" -name "*.txt" -type f -exec grep -l "npm test\|yarn test\|pnpm test\|bun test\|pytest\|go test\|cargo test" {} \; 2>/dev/null | wc -l | tr -d ' ')
echo "📊 Sessions with test commands: $TEST_SESSIONS"

# Find sessions where hook was applied
FILTERED=$(find "$DEBUG_DIR" -name "*.txt" -type f -exec grep -l "output filtered by vibekit-base" {} \; 2>/dev/null | wc -l | tr -d ' ')
echo "✅ Sessions with filtered output: $FILTERED"

# Calculate filter adoption rate
if [[ "$TEST_SESSIONS" -gt 0 ]]; then
  ADOPTION_RATE=$(awk "BEGIN {printf \"%.1f\", ($FILTERED / $TEST_SESSIONS) * 100}")
  echo "📈 Filter adoption rate: ${ADOPTION_RATE}%"
fi

# Find sample filtered outputs and count lines
echo ""
echo "=== Sample Output Analysis ==="

SAMPLE_FILES=$(find "$DEBUG_DIR" -name "*.txt" -type f -exec grep -l "output filtered by vibekit-base" {} \; 2>/dev/null | head -5)
SAMPLE_COUNT=0
TOTAL_FILTERED_LINES=0

for file in $SAMPLE_FILES; do
  if [[ -f "$file" ]]; then
    LINES=$(grep -A 50 "output filtered by vibekit-base" "$file" 2>/dev/null | wc -l | tr -d ' ')
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
echo "=== Estimated Savings ==="
echo "Assumptions:"
echo "  - Typical unfiltered test output: ~800 lines"
echo "  - Average filtered output: ~${AVG_FILTERED_LINES:-30} lines"
echo "  - Average line length: ~50 characters"
echo "  - Token ratio: ~4 chars per token"
echo ""

if [[ "$FILTERED" -gt 0 ]]; then
  # Calculate savings based on observed session averages
  # 800 lines × 50 chars/line ÷ 4 chars/token = ~10,000 tokens for unfiltered output
  UNFILTERED_TOKENS=$((800 * 50 / 4))
  # Filtered output uses measured average lines × same char/token ratios
  FILTERED_TOKENS=$((AVG_FILTERED_LINES * 50 / 4))
  SAVINGS_PER_RUN=$((UNFILTERED_TOKENS - FILTERED_TOKENS))
  TOTAL_SAVINGS=$((SAVINGS_PER_RUN * FILTERED))

  echo "Per test run:"
  echo "  Before: ~${UNFILTERED_TOKENS} tokens"
  echo "  After:  ~${FILTERED_TOKENS} tokens"
  echo "  Savings: ~${SAVINGS_PER_RUN} tokens (~$(awk "BEGIN {printf \"%.0f\", ($SAVINGS_PER_RUN / $UNFILTERED_TOKENS) * 100}")%)"
  echo ""
  echo "Total estimated savings (from ${FILTERED} filtered runs):"
  echo "  ~${TOTAL_SAVINGS} tokens saved"
else
  echo "No filtered sessions found yet. The hook may not be installed or test runs"
  echo "may have occurred before installation."
fi

echo ""
echo "=== Configuration ==="
echo "Debug directory: $DEBUG_DIR"
echo "Hook script: ~/.claude/plugins/base/hooks/scripts/filter-test-output.sh"
echo ""
echo "To disable filtering:"
echo "  export VIBEKIT_BASE_TEST_FILTER=none"
echo ""
echo "For more details, see: plugins/base/docs/test-output-filtering.md"
