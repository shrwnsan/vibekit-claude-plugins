# Handoff Context Skill

A lightweight skill for natural language thread continuation in AI agent conversations.

## Quick Start

Say any of these phrases to trigger a handoff:
- "Handoff and [action]" → continuation workflow
- "Handoff to [agent/skill]" → targeted handoff
- "Start a new thread with this" → explicit continuation
- "Continue in a fresh thread" → explicit continuation

The skill will:
1. Capture your current context (git state, conversation summary, active work)
2. Create a private temp directory and write the context file
3. Provide instructions to continue in a new thread

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

Context written to: /tmp/handoff-20260125-092412.yaml

To continue in a new thread:
  1. Start a new AI agent conversation
  2. Tell the agent: "Continue from /tmp/handoff-20260125-092412.yaml"
```

## Relationship to Claude Code Tasks

This skill complements [Claude Code's Tasks system](https://www.reddit.com/r/ClaudeAI/comments/1qkjznp/anthropic_replaced_claude_codes_old_todos_with/) (announced [2025-01-24](https://x.com/bcherny/status/2014485078815211652)). They serve different purposes:

| Aspect | Tasks | Handoff-Context |
|--------|-------|-----------------|
| **Purpose** | Ongoing project management with cross-session collaboration | Clean slate continuation with conversation summary |
| **Direction** | Bidirectional sync across sessions | Unidirectional snapshot (current → new thread) |
| **Use case** | "Track this work across multiple sessions" | "Start fresh with preserved context" |
| **Scope** | Project-level task tracking with dependencies | Thread-level context transfer |

### When to Use Which

**Use Tasks for:**
- Long-running projects requiring subagent coordination
- Real-time synchronization across multiple sessions
- Complex dependency management between work items

**Use Handoff-Context for:**
- Transitioning to a fresh thread while preserving conversation context
- When a thread becomes too long and you want a clean slate
- Starting a new phase of work with full context from previous phase

The two systems are complementary—Tasks manages ongoing work across sessions, while Handoff-Context enables clean slate continuation when you want to start fresh without losing context.

## Compatibility

This skill follows the [agentskills.io](https://agentskills.io) standard and is compatible with:
- ✅ Claude Code
- ✅ Gemini CLI (with skill support)
- ✅ Other agents implementing the Agent Skills standard

The output is agent-agnostic and works across platforms that support:
- Natural language skill triggers
- File system access (`/tmp/` directory)
- YAML context parsing

## Documentation

- [SKILL.md](SKILL.md) - Core workflow and implementation details
- [patterns.md](patterns.md) - Complete trigger pattern reference
- [examples.md](examples.md) - Detailed handoff scenarios
- [templates.md](templates.md) - Context summary templates per handoff type

## Philosophy

**Seamless continuation without losing context.**

No buttons to click, no commands to remember—just say "handoff" and continue working. The goal is to keep you in flow while transitioning to a fresh thread with full context preservation.

## Limitations

- Does not automatically create new threads (platform capability)
- Context directories in `/tmp/` may be cleared on system reboot
- Git state is captured at handoff time, not live-synced
- Large conversations may produce extensive summaries

## Contributing

This is an experimental feature. See [GitHub Issue #41](https://github.com/shrwnsan/vibekit-claude-plugins/issues/41) for ongoing discussion and known platform constraints.
