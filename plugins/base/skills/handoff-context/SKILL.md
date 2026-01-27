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

Generates structured context summaries for seamless thread continuation.

## Quick Start

**Direct invocation (most reliable):**
```bash
/handoff-context
```

**Natural language trigger phrases:**
- "Handoff and [action]" → continuation workflow
- "Handoff to [agent/skill]" → targeted handoff
- "Start a new thread with this" → explicit continuation
- "Let's handoff" / "Lets handoff" / "Just handoff" → context preservation

**Note:** The slash command works reliably across all agents. Natural language triggers depend on each agent's semantic understanding.

**When this skill is triggered, you must:**

1. **Execute the script first:**
```bash
bash plugins/base/skills/handoff-context/scripts/capture-context.sh
```

2. **Capture the HANDOFF_FILE path** from script output (format: `HANDOFF_FILE=/tmp/...`)

3. **Read that file** and populate conversation context:
   - Current work (tasks, status, affected files)
   - Conversation summary (phases, outcomes, decisions)
   - Next steps (continuation action context)
   - Preserved context (key details to remember)

4. **Overwrite the same file** with complete context

5. **Display summary** to user with file path

**What the script captures:**
- Git state (branch, staged/unstaged/untracked files)
- YAML structure with dynamic timestamps
- Secure temp directory with proper permissions

**What you need to add:**
- Current work, conversation summary, next steps, preserved_context

**Result:** Complete `/tmp/handoff-XXX/handoff-YYYYMMDD-HHMMSS.yaml` with full context.

## What Gets Captured

| Category | Details |
|----------|---------|
| **Git State** | Branch, staged/unstaged/untracked files |
| **Conversation** | Phase summaries, outcomes, decisions |
| **Current Work** | Active tasks with status and affected files |
| **Next Steps** | Continuation action (if specified) |

## Example Output

```text
🔄 Handoff ready

Context written to: /tmp/handoff-20260126-143022.yaml

To continue in a new thread:
  1. Start a new AI agent conversation
  2. Tell the agent: "Continue from /tmp/handoff-20260126-143022.yaml"
```

## Quick Examples

**Continuation:** "Handoff and build an admin panel" → action extracted
**Preservation:** "Handoff this context" → full state saved
**Targeted:** "Handoff to code-reviewer" → specific agent

**Quick reference:** See [examples-quick.md](examples-quick.md) - 4 concrete scenarios
**Detailed examples:** See [examples.md](examples.md) - Full YAML output

## Evaluations

Test files for validating skill behavior:
- [evaluations/eval-continuation.json](evaluations/eval-continuation.json)
- [evaluations/eval-context-preservation.json](evaluations/eval-context-preservation.json)
- [evaluations/eval-targeted-handoff.json](evaluations/eval-targeted-handoff.json)
- [evaluations/eval-non-git-repo.json](evaluations/eval-non-git-repo.json)

Run evaluations to verify pattern detection and YAML generation.

## Common Scenarios

- After implementing a feature → move to next phase in fresh thread
- Long thread → start fresh with preserved context
- Bug fix → audit similar patterns elsewhere
- Planning → implementation transition

## Error Handling

| Scenario | Handling |
|----------|----------|
| Script not found | Follow manual workflow in [workflow.md](workflow.md) |
| Script execution fails | Fall back to manual workflow steps |
| No git repo | Script omits git_state, proceeds with conversation context |
| No action | Script sets continuation_action: null |
| Empty conversation | Script provides minimal context with working directory |

*See [workflow.md](workflow.md) for complete manual workflow and error scenarios.*

## Integration

Works with:
- **workflow-orchestrator**: Handoff detection during workflow execution
- **crafting-commits**: Context preservation before committing
- **systematic-debugging**: Preserves error context during debugging

## Philosophy

**Seamless continuation without losing context.**

No buttons to click, no commands to remember—just say "handoff" and continue working.

## Limitations

- Does not automatically create new threads (platform capability)
- Context in `/tmp/` may be cleared on system reboot
- Git state is captured at handoff time, not live-synced

---

*Use when transitioning to a fresh thread. Skip when the conversation is still manageable.*
