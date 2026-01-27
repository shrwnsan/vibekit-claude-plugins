#!/usr/bin/env bash
# Handoff Context Capture Script
# Generates structured context summaries for seamless thread continuation

set -euo pipefail

# Create private temp directory (user-only, macOS/Linux/WSL compatible)
HANDOFF_DIR=$(mktemp -d /tmp/handoff-XXXXXX)
chmod 700 "$HANDOFF_DIR"

# Validate write permissions to temp directory
if ! touch "$HANDOFF_DIR/.write-test" 2>/dev/null; then
  echo "❌ Error: Cannot write to $HANDOFF_DIR" >&2
  echo "Check directory permissions or disk space" >&2
  exit 1
fi
rm -f "$HANDOFF_DIR/.write-test"

# Generate unique filename with timestamp
HANDOFF_FILE="$HANDOFF_DIR/handoff-$(date +%Y%m%d-%H%M%S).yaml"

# Capture git state if in a git repository
GIT_STATE=""
if git rev-parse --git-dir > /dev/null 2>&1; then
  BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
  STAGED=$(git diff --staged --name-only 2>/dev/null | tr '\n' ' ' | sed 's/ $//' || echo "")
  UNSTAGED=$(git diff --name-only 2>/dev/null | tr '\n' ' ' | sed 's/ $//' || echo "")
  UNTRACKED=$(git ls-files --others --exclude-standard 2>/dev/null | tr '\n' ' ' | sed 's/ $//' || echo "")

  GIT_STATE=$(cat <<GIT
  git_state:
    branch: "$BRANCH"
    staged: [$STAGED]
    unstaged: [$UNSTAGED]
    untracked: [$UNTRACKED]
GIT
)
fi

# Write YAML context template to file
cat > "$HANDOFF_FILE" << EOF
handoff:
  timestamp: "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  thread_id: "manual-$(date +%s)"
  continuation_action: null

context:
  current_work:
    - task: "Describe current work"
      status: "pending|in_progress|completed"
      files: ["affected-files"]
$GIT_STATE
  conversation_summary:
    - phase: "planning|implementation|debugging"
      outcome: "What was accomplished in this phase"
  next_steps:
    - action: "Continuation action"
      context: "Context for the next thread"
  preserved_context:
    - "Key decision or important detail to preserve"
EOF

# Display file path for Claude to capture
echo "HANDOFF_FILE=$HANDOFF_FILE"
echo ""
cat "$HANDOFF_FILE"
echo ""
echo "🔄 Handoff context template written to: $HANDOFF_FILE"
echo ""
echo "Next: Populate this file with conversation context and overwrite with complete handoff summary."
echo ""
echo "To continue in a new thread:"
echo "  1. Start a new AI agent conversation"
echo "  2. Tell the agent: \"Continue from $HANDOFF_FILE\""
