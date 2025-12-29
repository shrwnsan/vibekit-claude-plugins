#!/bin/bash
# analyze_changes.sh

# Provides a summary of staged changes to help draft a commit message.
# Usage: ./analyze_changes.sh

echo "🔎 Analyzing staged changes..."

# Get a summary of changed files
FILE_SUMMARY=$(git diff --staged --stat)

if [ -z "$FILE_SUMMARY" ]; then
  echo "   No changes staged. Use 'git add' to stage files for commit."
  exit 1
fi

echo "📊 Staged file summary:"
echo "$FILE_SUMMARY"
echo ""

# Show a compact summary of the changes
echo "📄 Compact diff summary:"
git diff --staged --summary
echo ""

# Pro-tip for detailed review
echo "✨ Pro-tip: For a full review, run 'git diff --staged'"
exit 0
