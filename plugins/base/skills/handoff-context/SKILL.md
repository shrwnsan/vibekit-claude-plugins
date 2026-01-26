---
name: handoff-context
description: Detects natural language handoff requests and generates structured context summaries for seamless thread continuation. Use when user says "handoff", "new thread", "continue in fresh thread", or similar phrases.
allowed-tools:
  - bash(git:*)
  - bash(mktemp:*)
  - bash(chmod:*)
  - bash(write to /tmp/handoff-*)
---

# Handoff Context

A lightweight skill that detects when you want to transition to a new thread and generates a structured context summary to preserve your work and conversation state.

## When to Use

**This skill activates when you say:**
- "Handoff and [action]" → continuation workflow (e.g., "Handoff and build an admin panel")
- "Handoff to [agent/skill]" → targeted handoff (e.g., "Handoff to implement the plan")
- "Handoff [context]" → context preservation (e.g., "Handoff this context")
- "Start a new thread with this" → explicit continuation
- "Continue in a fresh thread" → explicit continuation
- "Handoff, [action]" → comma-separated variant

**Common scenarios:**
- After implementing a feature and wanting to start fresh for the next phase
- When the thread has become long and you want a clean slate with preserved context
- After fixing a bug and wanting to check for similar issues elsewhere
- After planning and wanting to move to implementation in a new thread
- When you want to pause work and resume in a new session later

## Core Workflow

### 1. Detect Handoff Trigger

Match user message against trigger patterns and extract:
- **Handoff type**: continuation, targeted, or context-only
- **Continuation action**: what to do next (if specified)
- **Context scope**: how much conversation history to include

### 2. Capture Current Context

Gather relevant state information:

**Git state:**
```bash
git status --porcelain          # Check git repo state
git rev-parse --abbrev-ref HEAD  # Current branch
git diff --staged --name-only    # Staged files
git diff --name-only             # Unstaged files
git ls-files --others --exclude-standard  # Untracked files
```

**Conversation summary:**
- Identify conversation phases (planning, implementation, debugging, etc.)
- Extract outcomes from each phase
- Note active work items and their status
- Capture key decisions and important details

**Current work:**
- Active tasks with status (pending/in_progress/completed)
- Affected files for each task
- Any in-progress operations

### 3. Generate Handoff Summary

Generate unique filename and write structured context to `/tmp/`:

```bash
# Create private temp directory (user-only, macOS/Linux/WSL compatible)
HANDOFF_DIR=$(mktemp -d /tmp/handoff-XXXXXX)
chmod 700 "$HANDOFF_DIR"

# Generate unique filename with timestamp
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

### 4. Provide Continuation Instruction

Display the handoff summary and provide clear next steps:

```text
🔄 Handoff ready

Context written to: /tmp/handoff-20260125-092412.yaml

To continue in a new thread:
  1. Start a new AI agent conversation
  2. Tell the agent: "Continue from /tmp/handoff-20260125-092412.yaml"
```

## Examples

See [examples.md](examples.md) for detailed handoff scenarios:
- Feature implementation handoff
- Bug fix handoff with auditing
- Context-preservation handoff
- Planning to implementation handoff

## Trigger Patterns

See [patterns.md](patterns.md) for the complete list of detected patterns and how continuation actions are extracted.

## Error Handling

| Scenario | Handling |
|----------|----------|
| No active git repo | Omit `git_state` section, proceed with conversation context |
| No continuation action | Set `continuation_action: null`, mark as context-preservation |
| Empty conversation | Provide minimal context with current message and working directory |
| Malformed trigger | Best-effort extraction, warn user if action unclear |
| Unable to determine current work | Summarize visible state, ask user to clarify |

## Integration

This skill integrates with other Base plugin capabilities:

- **workflow-orchestrator**: Handoff detection during workflow execution
- **crafting-commits**: Context preservation before committing
- **systematic-debugging**: Handoff during debugging sessions preserves error context

## Output Templates

See [templates.md](templates.md) for context summary templates per handoff type.

## Philosophy

**Seamless continuation without losing context.**

The goal is to let you stay in flow while transitioning to a fresh thread. No buttons to click, no commands to remember—just say "handoff" and continue working.

## Limitations

- Does not automatically create new threads (that's a platform capability)
- Context directories in `/tmp/` may be cleared on system reboot
- Git state is captured at handoff time, not live-synced
- Large conversations may produce extensive summaries

---

*Rationale: This skill provides lightweight handoff detection and context preservation. Use when helpful, skip when the thread is still fresh and manageable.*
