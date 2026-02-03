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

# Generate unique session ID (YYYYMMDD-HHMMSS-XXXXX format)
generate_random_suffix() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS: use random hex from /dev/urandom
    openssl rand -hex 3 2>/dev/null | tr -d '\n' | head -c 5 || echo "xxxxx"
  else
    # Linux: use urandom with LC_ALL=C
    LC_ALL=C head /dev/urandom 2>/dev/null | tr -dc 'a-z0-9' | head -c 5 || echo "xxxxx"
  fi
}
SESSION_ID="$(date +%Y%m%d-%H%M%S)-$(generate_random_suffix)"

# Generate unique filename with timestamp
HANDOFF_FILE="$HANDOFF_DIR/handoff-$(date +%Y%m%d-%H%M%S).yaml"

# Function: Calculate confidence score (rule-based)
calculate_confidence_score() {
  local has_git=0
  local has_summary=0
  local has_current_work=0
  local has_next_steps=0
  local has_continuation=0

  # Check git state (will be set later)
  if git rev-parse --git-dir > /dev/null 2>&1; then
    has_git=1
  fi

  # Note: Other checks require post-processing of agent-populated content
  # This function returns the BASE score that will be updated after agent fills content
  echo "0.5"  # Base score - agent will update based on actual content
}

# Function: Detect missing context (placeholder for agent to populate)
detect_missing_context() {
  # This will be populated by the agent after validation
  echo "[]"
}

# Function: Detect package manager (for quick_start section)
detect_package_manager() {
  # Priority 1: Environment variable
  if [ -n "${PACKAGE_MANAGER:-}" ]; then
    echo "$PACKAGE_MANAGER"
    return
  fi

  # Priority 2: Lock file detection
  if [ -f "bun.lockb" ]; then
    echo "bun"
  elif [ -f "pnpm-lock.yaml" ]; then
    echo "pnpm"
  elif [ -f "yarn.lock" ]; then
    echo "yarn"
  elif [ -f "package-lock.json" ]; then
    echo "npm"
  # Priority 3: Check what's installed
  elif command -v bun >/dev/null 2>&1; then
    echo "bun"
  elif command -v pnpm >/dev/null 2>&1; then
    echo "pnpm"
  elif command -v yarn >/dev/null 2>&1; then
    echo "yarn"
  else
    echo "npm"  # Fallback
  fi
}

# Function: Detect project type
detect_project_type() {
  local types=()

  # Check for various project markers
  if [ -f "package.json" ] || [ -f "bun.lockb" ] || [ -f "pnpm-lock.yaml" ] || [ -f "yarn.lock" ] || [ -f "package-lock.json" ]; then
    types+=("javascript")
  fi

  if [ -f "pyproject.toml" ] || [ -f "requirements.txt" ] || [ -f "setup.py" ] || [ -f "Pipfile" ]; then
    types+=("python")
  fi

  if [ -f "go.mod" ]; then
    types+=("go")
  fi

  if [ -f "Cargo.toml" ]; then
    types+=("rust")
  fi

  # Default to unknown if no types detected
  if [ ${#types[@]} -eq 0 ]; then
    echo "unknown"
  elif [ ${#types[@]} -eq 1 ]; then
    echo "${types[0]}"
  else
    # Multiple types detected (monorepo)
    echo "${types[@]}"
  fi
}

# Detect package manager and project type
PACKAGE_MANAGER=$(detect_package_manager)
PROJECT_TYPES=$(detect_project_type)
PRIMARY_TYPE=$(echo "$PROJECT_TYPES" | awk '{print $1}')

# Capture git state if in a git repository
GIT_STATE=""
if git rev-parse --git-dir > /dev/null 2>&1; then
  BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
  STAGED=$(git diff --staged --name-only 2>/dev/null | LC_ALL=C tr '\n' ' ' | sed 's/ $//' || echo "")
  UNSTAGED=$(git diff --name-only 2>/dev/null | LC_ALL=C tr '\n' ' ' | sed 's/ $//' || echo "")
  UNTRACKED=$(git ls-files --others --exclude-standard 2>/dev/null | LC_ALL=C tr '\n' ' ' | sed 's/ $//' || echo "")

  GIT_STATE=$(cat <<GIT
  git_state:
    branch: "$BRANCH"
    staged: [$STAGED]
    unstaged: [$UNSTAGED]
    untracked: [$UNTRACKED]
GIT
)
fi

# Calculate initial confidence score (will be updated by agent)
CONFIDENCE_SCORE=$(calculate_confidence_score)

# Detect if we have git state for quality assessment
if git rev-parse --git-dir > /dev/null 2>&1; then
  CONTEXT_QUALITY="medium"
else
  CONTEXT_QUALITY="low"
fi

# Write YAML context template to file
cat > "$HANDOFF_FILE" << EOF
handoff:
  timestamp: "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  thread_id: "manual-$(date +%s)"
  continuation_action: null

session:
  id: "$SESSION_ID"
  started: null  # To be filled by agent
  ended: "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  duration_minutes: null  # To be calculated by agent

metadata:
  confidence_score: $CONFIDENCE_SCORE  # Will be updated by agent: 0.3-0.95
  context_quality: "$CONTEXT_QUALITY"  # high|medium|low
  missing_context: []  # Will be populated by agent

quick_start:
  project_types: [$PROJECT_TYPES]
  primary_type: "$PRIMARY_TYPE"
  package_manager: "$PACKAGE_MANAGER"
  verification_command: null  # Agent fills: "test"
  files_to_read_first: []  # Agent fills: ["src/auth/session.ts (45-89)"]
  context_priority: null  # Agent fills: "Focus on token expiry logic"
  estimated_time_minutes: null  # Agent fills

learnings:  # Agent fills with patterns and techniques discovered
  - pattern: "Description of learned pattern"
    evidence: "How this was validated"
    confidence: 0.7  # 0.3-0.9 scale
  - technique: "Debugging technique that worked"
    context: "When to use this technique"
    confidence: 0.6

approaches:  # Agent fills with what worked, what didn't, what's left
  successful:
    - approach: "Description of what worked"
      evidence: "How we know it worked"
      files: []
  attempted_but_failed:
    - approach: "What was tried"
      reason: "Why it didn't work"
      files: []
  not_attempted:
    - approach: "Alternative not yet tried"
      reason: "Why it was deferred"
      priority: "high|medium|low"

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
