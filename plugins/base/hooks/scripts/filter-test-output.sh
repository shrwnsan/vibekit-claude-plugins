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

  # Node.js runners
  if [[ "$cmd" =~ ^npm[[:space:]]+(test|t)([[:space:]]|$) ]] ||
     [[ "$cmd" =~ ^npm[[:space:]]+run[[:space:]]+test([[:space:]]|$) ]] ||
     [[ "$cmd" =~ ^yarn[[:space:]]+test([[:space:]]|$) ]] ||
     [[ "$cmd" =~ ^pnpm[[:space:]]+test([[:space:]]|$) ]] ||
     [[ "$cmd" =~ ^bun[[:space:]]+test([[:space:]]|$) ]]; then
    GREP_PATTERN='(FAIL|PASS|Error|✓|✗|passed|failed|Tests:|Test Suites:)'
    MAX_LINES=200
    return 0
  fi

  # Python
  if [[ "$cmd" =~ ^pytest([[:space:]]|$) ]] ||
     [[ "$cmd" =~ ^python[[:space:]]+-m[[:space:]]+pytest([[:space:]]|$) ]]; then
    GREP_PATTERN='(FAILED|ERROR|PASSED|test_|=====)'
    MAX_LINES=150
    return 0
  fi
  if [[ "$cmd" =~ ^python.*[[:space:]]+-m[[:space:]]+unittest([[:space:]]|$) ]]; then
    GREP_PATTERN='(FAIL|ERROR|OK|Ran[[:space:]])'
    MAX_LINES=150
    return 0
  fi

  # Go
  if [[ "$cmd" =~ ^go[[:space:]]+test([[:space:]]|$) ]]; then
    GREP_PATTERN='(FAIL|PASS|ERROR|--- FAIL|--- PASS|ok[[:space:]])'
    MAX_LINES=100
    return 0
  fi

  # Rust/Cargo
  if [[ "$cmd" =~ ^cargo[[:space:]]+test([[:space:]]|$) ]]; then
    GREP_PATTERN='(test result:|FAILED|error\[)'
    MAX_LINES=100
    return 0
  fi

  # Ruby/Rails
  if [[ "$cmd" =~ ^bundle[[:space:]]+exec[[:space:]]+rspec([[:space:]]|$) ]]; then
    GREP_PATTERN='(Fail|Error|Pending|example)'
    MAX_LINES=150
    return 0
  fi
  if [[ "$cmd" =~ ^rails[[:space:]]+test([[:space:]]|$) ]]; then
    GREP_PATTERN='(FAIL|Error|failure|runs,)'
    MAX_LINES=150
    return 0
  fi

  # Java/Maven/Gradle
  if [[ "$cmd" =~ ^mvn[[:space:]]+test([[:space:]]|$) ]] ||
     [[ "$cmd" =~ ^(\.\/)?gradlew?[[:space:]]+test([[:space:]]|$) ]]; then
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

# Build filtered command that:
# 1. Runs original command in a subshell to isolate it
# 2. Filters output, falling back to a summary message if grep finds no matches
#    (e.g., when all tests pass and no error lines exist)
# 3. Limits output to MAX_LINES
filtered_cmd="( ${CMD} ) 2>&1 | { grep -E '${GREP_PATTERN}' || echo 'All tests passed (output filtered by vibekit-base)'; } | head -${MAX_LINES}"

jq -n --arg cmd "$filtered_cmd" '{
    hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "allow",
        updatedInput: {command: $cmd}
    }
}'
