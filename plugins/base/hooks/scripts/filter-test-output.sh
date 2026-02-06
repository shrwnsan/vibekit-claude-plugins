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
  # jq not available, allow command unchanged
  echo "{}"
  exit 0
fi

# Read and parse input
INPUT=$(cat)

# Validate input is valid JSON
if ! echo "$INPUT" | jq empty &> /dev/null; then
  # Invalid JSON, allow command unchanged
  echo "{}"
  exit 0
fi

# Extract the command
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Exit if no command found
[[ -z "$CMD" ]] && echo "{}" && exit 0

# Test runner patterns and their corresponding filters
# Format: pattern -> filter_suffix
declare -A TEST_RUNNERS=(
    # Node.js/npm
    ["npm test(?="]="2>&1 | grep -E '(FAIL|PASS|Error|✓|✗|passed|failed)' | head -200"
    ["npm run test(?="]="2>&1 | grep -E '(FAIL|PASS|Error|✓|✗|passed|failed)' | head -200"
    ["npm t(?="]="2>&1 | grep -E '(FAIL|PASS|Error|✓|✗|passed|failed)' | head -200"
    ["yarn test(?="]="2>&1 | grep -E '(FAIL|PASS|Error|✓|✗|passed|failed)' | head -200"
    ["yarn test(?="]="2>&1 | grep -E '(FAIL|PASS|Error|✓|✗|passed|failed)' | head -200"
    ["pnpm test(?="]="2>&1 | grep -E '(FAIL|PASS|Error|✓|✗|passed|failed)' | head -200"
    ["pnpm test(?="]="2>&1 | grep -E '(FAIL|PASS|Error|✓|✗|passed|failed)' | head -200"
    ["bun test(?="]="2>&1 | grep -E '(FAIL|PASS|Error|✓|✗|passed|failed)' | head -200"
    ["bun test(?="]="2>&1 | grep -E '(FAIL|PASS|Error|✓|✗|passed|failed)' | head -200"

    # Python
    ["pytest(?="]="2>&1 | grep -A 3 -E '(FAILED|ERROR|test_)' | head -150"
    ["python -m pytest(?="]="2>&1 | grep -A 3 -E '(FAILED|ERROR|test_)' | head -150"
    ["python.* -m unittest(?="]="2>&1 | grep -A 3 -E '(FAIL|ERROR|OK)' | head -150"

    # Go
    ["go test(?="]="2>&1 | grep -A 5 -E '(FAIL|ERROR|--- FAIL)' | head -100"

    # Rust/Cargo
    ["cargo test(?="]="2>&1 | grep -E '(test result:|FAILED|error\[)' | head -100"

    # Ruby/Rails
    ["bundle exec rspec(?="]="2>&1 | grep -E '(Fail|Error|Pending)' | head -150"
    ["rails test(?="]="2>&1 | grep -E '(FAIL|Error|failure)' | head -150"

    # Java/Maven
    ["mvn test(?="]="2>&1 | grep -E '(FAIL|ERROR|BUILD)' | head -150"
    ["gradle test(?="]="2>&1 | grep -E '(FAIL|ERROR|FAILED)' | head -150"
)

# Match and filter
for pattern in "${!TEST_RUNNERS[@]}"; do
    if [[ "$CMD" =~ ^$pattern ]]; then
        filter_suffix="${TEST_RUNNERS[$pattern]}"
        filtered_cmd="$CMD $filter_suffix"

        # Output the hook response with updated command
        jq -n --arg cmd "$filtered_cmd" '{
            hookSpecificOutput: {
                hookEventName: "PreToolUse",
                permissionDecision: "allow",
                updatedInput: {command: $cmd}
            }
        }'
        exit 0
    fi
done

# No match - allow command unchanged
echo "{}"
