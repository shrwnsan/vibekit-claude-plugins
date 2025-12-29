#!/bin/bash
# check_attribution.sh

# Checks for valid "Co-Authored-By" attribution lines in a commit message body.
# Usage: ./check_attribution.sh "$(git log -1 --pretty=%B)"

COMMIT_MSG_BODY="$1"
ATTRIBUTION_REGEX="^Co-Authored-By: (.+) <(.+)>$"

# Use grep to find all attribution lines
ATTRIBUTION_LINES=$(echo "$COMMIT_MSG_BODY" | grep -E "^Co-Authored-By:")

if [ -z "$ATTRIBUTION_LINES" ]; then
  echo "✅ No Co-Authored-By lines found."
  exit 0
fi

# Validate each line
while IFS= read -r line; do
  if [[ ! "$line" =~ $ATTRIBUTION_REGEX ]]; then
    echo "❌ Error: Invalid Co-Authored-By format found."
    echo "   Invalid line: $line"
    echo "   Required format: Co-Authored-By: Name <email@example.com>"
    exit 1
  fi
done <<< "$ATTRIBUTION_LINES"

echo "✅ All Co-Authored-By lines are correctly formatted."
exit 0
