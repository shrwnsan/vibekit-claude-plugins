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

**Trigger phrases:**
- "Handoff and [action]" → continuation workflow
- "Handoff to [agent/skill]" → targeted handoff
- "Start a new thread with this" → explicit continuation

**When triggered, execute this script:**
```bash
bash plugins/base/skills/handoff-context/scripts/capture-context.sh
```

This script:
- Captures git state automatically
- Generates unique timestamped YAML file
- Displays output and continuation instructions
- Handles errors gracefully (no git repo, permissions, etc.)

Creates `/tmp/handoff-YYYYMMDD-HHMMSS.yaml` with current context.

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
