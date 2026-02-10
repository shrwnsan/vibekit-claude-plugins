#!/usr/bin/env bash
set -euo pipefail

# Tests for match_test_runner() pattern matching in filter-test-output.sh
#
# Usage:
#   ./plugins/base/hooks/scripts/test-filter-patterns.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PASS=0
FAIL=0

GREP_PATTERN=""
MAX_LINES=200

# Extract match_test_runner from the source script
source <(sed -n '/^match_test_runner()/,/^}/p' "$SCRIPT_DIR/filter-test-output.sh")

assert_match() {
  local cmd="$1"
  local desc="${2:-$1}"
  GREP_PATTERN=""
  if match_test_runner "$cmd"; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
    echo "FAIL (expected match):    $desc"
  fi
}

assert_no_match() {
  local cmd="$1"
  local desc="${2:-$1}"
  GREP_PATTERN=""
  if match_test_runner "$cmd"; then
    FAIL=$((FAIL + 1))
    echo "FAIL (expected no match): $desc"
  else
    PASS=$((PASS + 1))
  fi
}

echo "=== Pattern Matching Tests ==="
echo ""

# --- Node.js: should match ---
assert_match "npm test"
assert_match "npm t"
assert_match "npm test -- --grep auth"          "npm test with args"
assert_match "npm test -- path/to/test.js"      "npm test with file path"
assert_match "npm test && npm run build"        "npm test in compound &&"
assert_match 'npm test || echo "failed"'        "npm test in compound ||"
assert_match "npm run test"
assert_match "yarn test"
assert_match "pnpm test"
assert_match "bun test"
assert_match "cd src && npm test"               "npm test after cd"
assert_match "cd src; npm test"                 "npm test after semicolon"

# --- Node.js: should NOT match ---
assert_no_match 'echo "npm test"'               "npm test inside echo quotes"
assert_no_match 'grep -r "npm test" .'          "npm test inside grep pattern"
assert_no_match "npm install"                   "npm install"
assert_no_match "npm run build"                 "npm run build"

# --- npx/bunx: should match ---
assert_match "npx vitest"
assert_match "npx jest"
assert_match "npx playwright test"
assert_match "npx cypress run"
assert_match "npx mocha"
assert_match "npx vitest run"
assert_match "bunx vitest"
assert_match "bunx jest"
assert_match "bunx playwright test"
assert_match "bunx vitest run"
assert_match "npm run build && npx vitest"      "npx vitest in compound &&"

# --- npx/bunx: should NOT match ---
assert_no_match 'echo "npx vitest"'             "npx vitest inside echo quotes"
assert_no_match "npx create-vite"               "npx non-test command"
assert_no_match "bunx create-vite"              "bunx non-test command"
assert_no_match "npx tsc"                       "npx tsc (compiler, not test runner)"

# --- Python: should match ---
assert_match "pytest"
assert_match "pytest tests/"
assert_match "python -m pytest"
assert_match "python -m pytest tests/"
assert_match "python -m unittest"
assert_match "python -m unittest discover"

# --- Python: should NOT match ---
assert_no_match 'echo "pytest"'                 "pytest inside echo quotes"

# --- Go: should match ---
assert_match "go test"
assert_match "go test ./..."
assert_match "go test -v ./pkg/..."

# --- Go: should NOT match ---
assert_no_match 'echo "go test"'                "go test inside echo"
assert_no_match "go build"

# --- Rust: should match ---
assert_match "cargo test"
assert_match "cargo test -- --nocapture"

# --- Rust: should NOT match ---
assert_no_match "cargo build"
assert_no_match 'echo "cargo test"'             "cargo test inside echo"

# --- Ruby: should match ---
assert_match "bundle exec rspec"
assert_match "bundle exec rspec spec/"
assert_match "rails test"
assert_match "rails test test/models/"

# --- Java: should match ---
assert_match "mvn test"
assert_match "./gradlew test"
assert_match "gradlew test"
assert_match "./gradle test"

echo ""
echo "=== Results ==="
echo "Passed: $PASS"
echo "Failed: $FAIL"
echo ""

if [[ "$FAIL" -gt 0 ]]; then
  echo "SOME TESTS FAILED"
  exit 1
else
  echo "ALL TESTS PASSED"
fi
