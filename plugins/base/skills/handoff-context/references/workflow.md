# Handoff Context Workflow

Complete step-by-step process for generating handoff context summaries.

## Table of Contents

- [Step 1: Detect Handoff Trigger](#step-1-detect-handoff-trigger)
- [Step 2: Capture Current Context](#step-2-capture-current-context)
- [Step 3: Generate Handoff Summary](#step-3-generate-handoff-summary)
- [Step 4: Provide Continuation Instruction](#step-4-provide-continuation-instruction)
- [Error Handling](#error-handling)
- [Advanced Scenarios](#advanced-scenarios)

## Step 1: Detect Handoff Trigger

Match user message against trigger patterns and extract:

**Extract:**
- **Handoff type**: continuation, targeted, or context-only
- **Continuation action**: what to do next (if specified)
- **Context scope**: how much conversation history to include

**Trigger patterns:** See [patterns.md](patterns.md) for complete list.

## Step 2: Capture Current Context

Gather relevant state information:

### Git State

```bash
git status --porcelain          # Check git repo state
git rev-parse --abbrev-ref HEAD  # Current branch
git diff --staged --name-only    # Staged files
git diff --name-only             # Unstaged files
git ls-files --others --exclude-standard  # Untracked files
```

### Conversation Summary

Identify:
- Conversation phases (planning, implementation, debugging, etc.)
- Outcomes from each phase
- Active work items and their status
- Key decisions and important details

### Current Work

Capture:
- Active tasks with status (pending/in_progress/completed)
- Affected files for each task
- Any in-progress operations

## Step 3: Generate Handoff Summary

Generate unique filename and write structured context to `/tmp/`:

```bash
# Create private temp directory (user-only, macOS/Linux/WSL compatible)
# Priority: CLAUDE_CODE_TMPDIR → TMPDIR → /tmp
HANDOFF_DIR=$(mktemp -d "${CLAUDE_CODE_TMPDIR:-${TMPDIR:-/tmp}}/handoff-XXXXXX")
chmod 700 "$HANDOFF_DIR"

# Generate unique filename with timestamp (dynamic, not hardcoded)
HANDOFF_FILE="$HANDOFF_DIR/handoff-$(date +%Y%m%d-%H%M%S).yaml"

# Write YAML context to file
cat > "$HANDOFF_FILE" << 'EOF'
handoff:
  timestamp: "ISO 8601"
  thread_id: "current_thread_identifier"
  continuation_action: "extracted action or null"

context:
  current_work:
    - task: "description"
      status: "pending|in_progress|completed"
      files: ["affected files"]
  git_state:
    branch: "current_branch"
    staged: ["files"]
    unstaged: ["files"]
    untracked: ["files"]
  conversation_summary:
    - phase: "planning|implementation|debugging"
      outcome: "what was accomplished"
  next_steps:
    - action: "continuation action"
      context: "what to continue with"
  preserved_context:
    - "key decision or important detail"
EOF

# Display file path and contents
echo "🔄 Handoff context written to: $HANDOFF_FILE"
cat "$HANDOFF_FILE"
```

**Note:** The timestamp in the filename is generated dynamically via `$(date +%Y%m%d-%H%M%S)`. Each handoff creates a unique file like:
- `/tmp/claude/handoff-20260126-143022.yaml` (Claude Code)
- `/tmp/handoff-20260126-153145.yaml` (other tools, or `$TMPDIR` on macOS)

## Step 4: Provide Continuation Instruction

Display the handoff summary and provide clear next steps:

```text
🔄 Handoff ready

Context written to: /tmp/claude/handoff-20260126-143022.yaml

To continue in a new thread:
  1. Start a new AI agent conversation
  2. Tell the agent: "Continue from /tmp/claude/handoff-20260126-143022.yaml"
```

**Note:** Paths may vary by tool (Claude Code: `/tmp/claude/handoff-XXX/`, others: `$TMPDIR/handoff-XXX/` or `/tmp/handoff-XXX/`).

**Important workflow note:** When using the capture-context.sh script:
1. Script generates template at `$TMPDIR/handoff-XXX/handoff-YYYYMMDD-HHMMSS.yaml`
2. Script outputs `HANDOFF_FILE=$TMPDIR/handoff-XXX/handoff-YYYYMMDD-HHMMSS.yaml`
3. Read the file, populate conversation context
4. **Overwrite the same file** with complete summary
5. Display the final file path to user

This ensures only ONE final handoff file is created, populated with both git state (from script) and conversation context (from Claude).

## Error Handling

| Scenario | Handling |
|----------|----------|
| No active git repo | Omit `git_state` section, proceed with conversation context |
| No continuation action | Set `continuation_action: null`, mark as context-preservation |
| Empty conversation | Provide minimal context with current message and working directory |
| Malformed trigger | Best-effort extraction, warn user if action unclear |
| Unable to determine current work | Summarize visible state, ask user to clarify |

## Advanced Scenarios

### Feature Implementation Handoff

After completing a feature implementation and wanting to start fresh for the next phase:

**User says:** "Handoff and build the admin panel"

**Workflow:**
1. Detect: continuation type with action "build the admin panel"
2. Capture: feature implementation outcomes, affected files, git state
3. Generate: context with continuation_action pointing to admin panel work
4. Instruct: user to start new thread with admin panel context

### Bug Fix Handoff with Auditing

After fixing a bug and wanting to audit similar patterns elsewhere:

**User says:** "Handoff this to audit similar patterns"

**Workflow:**
1. Detect: context-preservation type with audit context
2. Capture: bug fix details, files changed, patterns identified
3. Generate: context emphasizing the bug patterns found
4. Instruct: user to start new thread for audit work

### Context-Preservation Handoff

When the thread has become long and you want a clean slate with preserved context:

**User says:** "Handoff this context"

**Workflow:**
1. Detect: context-preservation type (no specific action)
2. Capture: full conversation summary, all active work, complete state
3. Generate: comprehensive context without specific continuation
4. Instruct: user can use this for any future work

*See [examples.md](examples.md) for more detailed scenarios.*
