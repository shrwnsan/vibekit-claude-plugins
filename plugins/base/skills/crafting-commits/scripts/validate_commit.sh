#!/bin/bash
# validate_commit.sh

# Simple conventional commit message validator
# Usage: ./validate_commit.sh "feat(scope): your commit message"

COMMIT_MSG="$1"
# Regex for conventional commit format: type(scope): subject
# Allows for optional scope and breaking change indicator '!'
CONVENTIONAL_COMMIT_REGEX="^(feat|fix|docs|style|refactor|perf|test|chore|build|ci)(\(.+\))?(!?): .{1,50}$"

if [[ "$COMMIT_MSG" =~ $CONVENTIONAL_COMMIT_REGEX ]]; then
  echo "✅ Commit message follows conventional commit format."
  exit 0
else
  echo "❌ Error: Commit message does not follow conventional commit format."
  echo "   Required format: type(scope): subject"
  echo "   Example: feat(auth): add password reset functionality"
  exit 1
fi
