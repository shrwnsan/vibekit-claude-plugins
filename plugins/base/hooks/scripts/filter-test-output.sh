#!/usr/bin/env bash
set -euo pipefail

# PreToolUse Hook: Filter Test Output
# Reduces token costs by filtering verbose test output to show only errors/failures
#
# Environment Variables:
#   VIBEKIT_BASE_TEST_FILTER - Set to "none" or "disable" to bypass filtering
#
# Output:
#   JSON hook response with updated command or empty object for no changes

# Check if filtering is disabled
if [[ "${VIBEKIT_BASE_TEST_FILTER:-}" =~ ^(none|disable)$ ]]; then
  echo "{}"
  exit 0
fi

# Check for jq dependency
if ! command -v jq &> /dev/null; then
  echo "{}"
  exit 0
fi

# Read and parse input
INPUT=$(cat)

# Validate input is valid JSON
if ! echo "$INPUT" | jq empty &> /dev/null; then
  echo "{}"
  exit 0
fi

# Extract the command
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Exit if no command found
[[ -z "$CMD" ]] && echo "{}" && exit 0

# Determine filter based on command pattern
GREP_PATTERN=""
MAX_LINES=200

match_test_runner() {
  local cmd="$1"

  # Node.js runners — prefix boundary allows compound commands (e.g., npm test && build)
  if [[ "$cmd" =~ (^|[;\&\|[:space:]])npm[[:space:]]+(test|t)([[:space:]]|$|\||&) ]] ||
     [[ "$cmd" =~ (^|[;\&\|[:space:]])npm[[:space:]]+run[[:space:]]+test([[:space:]]|$|\||&) ]] ||
     [[ "$cmd" =~ (^|[;\&\|[:space:]])yarn[[:space:]]+test([[:space:]]|$|\||&) ]] ||
     [[ "$cmd" =~ (^|[;\&\|[:space:]])pnpm[[:space:]]+test([[:space:]]|$|\||&) ]] ||
     [[ "$cmd" =~ (^|[;\&\|[:space:]])bun[[:space:]]+test([[:space:]]|$|\||&) ]]; then
    GREP_PATTERN='(FAIL|PASS|Error|✓|✗|passed|failed|Tests:|Test Suites:)'
    MAX_LINES=200
    return 0
  fi

  # npx/bunx test runners — common for one-off test runs, CI/CD, and tool evaluation
  # Covers: vitest, jest, mocha, ava, tape (generic), playwright test, cypress run (specific)
  if [[ "$cmd" =~ (^|[;\&\|[:space:]])npx[[:space:]]+(vitest|jest|mocha|ava|tape)([[:space:]]|$|\||&) ]] ||
     [[ "$cmd" =~ (^|[;\&\|[:space:]])npx[[:space:]]+playwright[[:space:]]+test([[:space:]]|$|\||&) ]] ||
     [[ "$cmd" =~ (^|[;\&\|[:space:]])npx[[:space:]]+cypress[[:space:]]+run([[:space:]]|$|\||&) ]] ||
     [[ "$cmd" =~ (^|[;\&\|[:space:]])bunx[[:space:]]+(vitest|jest|mocha|ava|tape)([[:space:]]|$|\||&) ]] ||
     [[ "$cmd" =~ (^|[;\&\|[:space:]])bunx[[:space:]]+playwright[[:space:]]+test([[:space:]]|$|\||&) ]] ||
     [[ "$cmd" =~ (^|[;\&\|[:space:]])bunx[[:space:]]+cypress[[:space:]]+run([[:space:]]|$|\||&) ]]; then
    GREP_PATTERN='(FAIL|PASS|Error|✓|✗|passed|failed|Tests:|Test Suites:)'
    MAX_LINES=200
    return 0
  fi

  # Python — prefix boundary prevents false positives in quoted strings
  if [[ "$cmd" =~ (^|[;\&\|[:space:]])pytest([[:space:]]|$|\||&) ]] ||
     [[ "$cmd" =~ (^|[;\&\|[:space:]])python[[:space:]]+-m[[:space:]]+pytest([[:space:]]|$|\||&) ]]; then
    GREP_PATTERN='(FAILED|ERROR|PASSED|test_|=====)'
    MAX_LINES=150
    return 0
  fi
  # Pattern matches: python -m unittest, python -m unittest discover, etc.
  # Note: Uses explicit -m unittest pattern (not .*) to avoid matching unrelated commands
  if [[ "$cmd" =~ (^|[;\&\|[:space:]])python[[:space:]]+-m[[:space:]]+unittest([[:space:]]|$|\||&) ]]; then
    GREP_PATTERN='(FAIL|ERROR|OK|Ran[[:space:]])'
    MAX_LINES=150
    return 0
  fi

  # Go
  if [[ "$cmd" =~ (^|[;\&\|[:space:]])go[[:space:]]+test([[:space:]]|$|\||&) ]]; then
    GREP_PATTERN='(FAIL|PASS|ERROR|--- FAIL|--- PASS|ok[[:space:]])'
    MAX_LINES=100
    return 0
  fi

  # Rust/Cargo
  if [[ "$cmd" =~ (^|[;\&\|[:space:]])cargo[[:space:]]+test([[:space:]]|$|\||&) ]]; then
    GREP_PATTERN='(test result:|FAILED|error\[)'
    MAX_LINES=100
    return 0
  fi

  # Ruby/Rails
  if [[ "$cmd" =~ (^|[;\&\|[:space:]])bundle[[:space:]]+exec[[:space:]]+rspec([[:space:]]|$|\||&) ]]; then
    GREP_PATTERN='(Fail|Error|Pending|example)'
    MAX_LINES=150
    return 0
  fi
  if [[ "$cmd" =~ (^|[;\&\|[:space:]])rails[[:space:]]+test([[:space:]]|$|\||&) ]]; then
    GREP_PATTERN='(FAIL|Error|failure|runs,)'
    MAX_LINES=150
    return 0
  fi

  # Java/Maven/Gradle
  if [[ "$cmd" =~ (^|[;\&\|[:space:]])mvn[[:space:]]+test([[:space:]]|$|\||&) ]] ||
     [[ "$cmd" =~ (^|[;\&\|[:space:]])(\.\/)?gradlew?[[:space:]]+test([[:space:]]|$|\||&) ]]; then
    GREP_PATTERN='(FAIL|ERROR|BUILD|Tests run:)'
    MAX_LINES=150
    return 0
  fi

  return 1
}

if ! match_test_runner "$CMD"; then
  echo "{}"
  exit 0
fi

# Build filtered command
# Using a subshell approach to properly handle the pipe chain
# The filter: 1) captures stderr, 2) excludes timestamps, 3) includes test output, 4) limits lines
FILTERED_CMD="( ${CMD} ) 2>&1 \
  | grep -vE '^\\[?[0-9]{4}-[0-9]{2}-[0-9]{2}' \
  | grep -vE '^\\[?[0-9]{2}:[0-9]{2}:[0-9]{2}' \
  | ( grep -E '${GREP_PATTERN}' || echo 'All tests passed (output filtered by vibekit-base plugin)' ) \
  | head -${MAX_LINES}"

jq -n --arg cmd "$FILTERED_CMD" '{
    hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "allow",
        updatedInput: {command: $cmd}
    }
}'
