#!/usr/bin/env bash
# Handoff Context Capture Script
# Generates structured context summaries for seamless thread continuation

set -euo pipefail

# ============================================================================
# CONFIGURATION LOADER
# ============================================================================

# Default configuration values
CONFIG_FORMAT="yaml"
CONFIG_INCLUDE_LEARNINGS="true"
CONFIG_INCLUDE_APPROACHES="true"
CONFIG_INCLUDE_GIT_STATE="true"
CONFIG_INCLUDE_QUICK_START="true"
CONFIG_CONFIDENCE_MINIMUM="0.3"
CONFIG_CONFIDENCE_THRESHOLD="0.7"
CONFIG_SOURCE="builtin"

# Function: Parse YAML config file (handles nested keys like "include.learnings")
parse_config_value() {
  local file="$1"
  local key="$2"
  local default_value="$3"

  local value

  # Handle nested keys (e.g., "include.learnings")
  if [[ "$key" == *"."* ]]; then
    # Split key into parent and child
    local parent="${key%%.*}"
    local child="${key#*.}"

    # Find the parent section and extract the child value
    # NOTE: Assumes 2-space YAML indentation (standard for this project)
    # This handles YAML like:
    #   include:
    #     learnings: false
    value=$(awk -v parent="$parent" -v child="$child" '
      BEGIN { found = 0 }
      /^'"$parent"':/ { found = 1; next }
      found && /^  [^ ]+:/ {
        # Check if this is the child key we are looking for
        # Must be indented exactly 2 spaces and match the child name
        if ($0 ~ /^  '"$child"':/) {
          # Extract value (everything after the colon and space)
          sub(/^  '"$child"':[[:space:]]*/, "")
          # Remove comments
          gsub(/[[:space:]]*#.*/, "")
          # Remove carriage returns
          gsub(/\r/, "")
          print $0
          exit
        }
      }
      found && /^[^ ]/ { exit }  # End of parent section
    ' "$file" 2>/dev/null)
  else
    # Handle flat keys (e.g., "format: yaml")
    value=$(grep "^${key}:" "$file" 2>/dev/null | sed 's/^.*:[[:space:]]*//' | sed 's/[[:space:]]*#.*$//' | tr -d '\r')
  fi

  if [ -z "$value" ]; then
    echo "$default_value"
  else
    echo "$value"
  fi
}

# Function: Load configuration from file
load_config_file() {
  local config_file="$1"

  if [ ! -f "$config_file" ]; then
    return 1
  fi

  CONFIG_FORMAT=$(parse_config_value "$config_file" "format" "$CONFIG_FORMAT")
  CONFIG_INCLUDE_LEARNINGS=$(parse_config_value "$config_file" "include.learnings" "$CONFIG_INCLUDE_LEARNINGS")
  CONFIG_INCLUDE_APPROACHES=$(parse_config_value "$config_file" "include.approaches" "$CONFIG_INCLUDE_APPROACHES")
  CONFIG_INCLUDE_GIT_STATE=$(parse_config_value "$config_file" "include.git_state" "$CONFIG_INCLUDE_GIT_STATE")
  CONFIG_INCLUDE_QUICK_START=$(parse_config_value "$config_file" "include.quick_start" "$CONFIG_INCLUDE_QUICK_START")
  CONFIG_CONFIDENCE_MINIMUM=$(parse_config_value "$config_file" "confidence.minimum" "$CONFIG_CONFIDENCE_MINIMUM")
  CONFIG_CONFIDENCE_THRESHOLD=$(parse_config_value "$config_file" "confidence.threshold" "$CONFIG_CONFIDENCE_THRESHOLD")

  CONFIG_SOURCE="$config_file"
  return 0
}

# Function: Find and load configuration (priority order)
load_configuration() {
  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

  # Priority 1: Cross-tool standard (~/.config/agents/handoff-context-config.yml)
  if load_config_file "$HOME/.config/agents/handoff-context-config.yml"; then
    return 0
  fi

  # Priority 2: Claude Code specific (~/.claude/handoff-context-config.yml)
  if load_config_file "$HOME/.claude/handoff-context-config.yml"; then
    return 0
  fi

  # Priority 3: Project-local (.agents/handoff-context-config.yml)
  # Start from script directory, go up to find project root
  local check_dir="$PWD"
  local max_depth=5
  local depth=0

  while [ "$depth" -lt "$max_depth" ]; do
    if load_config_file "$check_dir/.agents/handoff-context-config.yml"; then
      return 0
    fi
    # Go up one directory
    if [ "$check_dir" = "/" ]; then
      break
    fi
    check_dir="$(dirname "$check_dir")"
    depth=$((depth + 1))
  done

  # Priority 4: Built-in defaults (already set above)
  CONFIG_SOURCE="builtin"
  return 0
}

# Load configuration
load_configuration

# ============================================================================
# HANDOFF FILE CREATION
# ============================================================================

# Create private temp directory (user-only, macOS/Linux/WSL compatible)
# Priority: CLAUDE_CODE_TMPDIR (Claude Code) → TMPDIR (system standard) → /tmp (fallback)
# Claude Code's sandbox denies /tmp/ writes but allows CLAUDE_CODE_TMPDIR (default: /tmp/claude)
HANDOFF_DIR=$(mktemp -d "${CLAUDE_CODE_TMPDIR:-${TMPDIR:-/tmp}}/handoff-XXXXXX")
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
    echo "\"unknown\""
  elif [ ${#types[@]} -eq 1 ]; then
    echo "\"${types[0]}\""
  else
    # Multiple types detected (monorepo) - format for YAML array
    local formatted=""
    for t in "${types[@]}"; do
      formatted="${formatted:+${formatted}, }\"${t}\""
    done
    echo "$formatted"
  fi
}

# Detect package manager and project type
PACKAGE_MANAGER=$(detect_package_manager)
PROJECT_TYPES=$(detect_project_type)
# Extract first type and strip quotes for primary_type display
PRIMARY_TYPE=$(echo "$PROJECT_TYPES" | awk '{print $1}' | tr -d '"')

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

# Build YAML template conditionally based on config
# Note: We use printf with a heredoc for better control over conditional sections

# Start with header
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
  confidence_score: $CONFIDENCE_SCORE  # Will be updated by agent: ${CONFIG_CONFIDENCE_MINIMUM}-0.95
  context_quality: "$CONTEXT_QUALITY"  # high|medium|low
  missing_context: []  # Will be populated by agent
  # Config source: $CONFIG_SOURCE
  config:
    source: "$CONFIG_SOURCE"
    format: "$CONFIG_FORMAT"
EOF

# Add quick_start section if enabled
if [ "$CONFIG_INCLUDE_QUICK_START" = "true" ]; then
  cat >> "$HANDOFF_FILE" << EOF

quick_start:
  project_types: [$PROJECT_TYPES]
  primary_type: "$PRIMARY_TYPE"
  package_manager: "$PACKAGE_MANAGER"
  verification_command: null  # Agent fills: "test"
  files_to_read_first: []  # Agent fills: ["src/auth/session.ts (45-89)"]
  context_priority: null  # Agent fills: "Focus on token expiry logic"
  estimated_time_minutes: null  # Agent fills
EOF
fi

# Add learnings section if enabled
if [ "$CONFIG_INCLUDE_LEARNINGS" = "true" ]; then
  cat >> "$HANDOFF_FILE" << EOF

learnings:  # Agent fills with patterns and techniques discovered
  - pattern: "Description of learned pattern"
    evidence: "How this was validated"
    confidence: 0.7  # 0.3-0.9 scale
  - technique: "Debugging technique that worked"
    context: "When to use this technique"
    confidence: 0.6
EOF
fi

# Add approaches section if enabled
if [ "$CONFIG_INCLUDE_APPROACHES" = "true" ]; then
  cat >> "$HANDOFF_FILE" << EOF

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
EOF
fi

# Add context section (always included)
cat >> "$HANDOFF_FILE" << EOF

context:
  current_work:
    - task: "Describe current work"
      status: "pending|in_progress|completed"
      files: ["affected-files"]
EOF

# Add git_state if enabled and in a git repo
if [ "$CONFIG_INCLUDE_GIT_STATE" = "true" ] && [ -n "$GIT_STATE" ]; then
  echo "$GIT_STATE" >> "$HANDOFF_FILE"
fi

# Add remaining context sections
cat >> "$HANDOFF_FILE" << EOF
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
