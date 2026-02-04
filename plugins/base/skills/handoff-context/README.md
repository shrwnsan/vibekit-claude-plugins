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

## Configuration

The skill supports flexible configuration through YAML files. Configuration is loaded in priority order:

| Priority | Location | Use Case |
|----------|----------|----------|
| 1 | `~/.config/agents/handoff-context-config.yml` | Cross-tool standard (Amp, other AI tools) |
| 2 | `~/.claude/handoff-context-config.yml` | Claude Code specific |
| 3 | `.agents/handoff-context-config.yml` | Project-local |
| 4 | Built-in defaults | Fallback |

### Quick Setup

**For multi-tool users (recommended):**
```bash
mkdir -p ~/.config/agents
cp ~/.claude/plugins/base/skills/handoff-context/handoff-context-config.example.yml \
   ~/.config/agents/handoff-context-config.yml
```

**Claude Code specific:**
```bash
cp ~/.claude/plugins/base/skills/handoff-context/handoff-context-config.example.yml \
   ~/.claude/handoff-context-config.yml
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `format` | string | `yaml` | Output format (`yaml` or `markdown`) |
| `include.learnings` | boolean | `true` | Include learnings section with confidence levels |
| `include.approaches` | boolean | `true` | Include approaches section (what worked/didn't) |
| `include.git_state` | boolean | `true` | Include git state (branch, staged/unstaged/untracked) |
| `include.quick_start` | boolean | `true` | Include quick start section (project type, package manager) |
| `confidence.minimum` | float | `0.3` | Floor score (0.3 = tentative, still some value) |
| `confidence.threshold` | float | `0.7` | Warning threshold (below = add more context) |

## What Gets Captured

For the complete YAML structure and all available sections, see **[templates.md](references/templates.md)**.

Key sections include:
- **handoff** - Timestamp, thread ID, continuation action
- **session** - Unique session ID, start/end times, duration
- **metadata** - Confidence score, quality level, config source
- **quick_start** - Project type, package manager, priority files
- **git_state** - Branch, staged/unstaged/untracked files
- **learnings** - Patterns and techniques discovered
- **approaches** - What worked, what didn't, what's left to try
- **context** - Current work, conversation summary, next steps, preserved context

## Quality & Confidence

The skill evaluates context quality using a confidence score (0.3-0.95 scale):

| Confidence Score | Quality Level | Recommendation |
|------------------|---------------|----------------|
| ≥ 0.9 | High | Comprehensive - ready for immediate continuation |
| 0.7 - 0.9 | Medium | Good quality - minor gaps possible |
| 0.5 - 0.7 | Low | Acceptable - consider adding more context |
| < 0.5 | Poor | Critical gaps - add more context before handoff |

### Validation Script

Use the `validate-context.sh` script to check handoff quality:

```bash
validate-context.sh /tmp/handoff-*/handoff-*.yaml
```

The script checks:
- Required sections are present (timestamp, session ID, confidence score)
- Critical content is populated (not just template placeholders)
- Git state structure is valid
- Next steps or continuation action is specified

## Example Output

```text
🔄 Handoff ready

Context written to: /tmp/handoff-20260204-143022.yaml

To continue in a new thread:
  1. Start a new AI agent conversation
  2. Tell the agent: "Continue from /tmp/handoff-20260204-143022.yaml"
```

For complete YAML examples showing all sections, see:
- **[examples.md](references/examples.md)** - Quick scenarios with input/output pairs
- **[examples-detailed.md](references/examples-detailed.md)** - Full real-world scenarios with complete context
- **[templates.md](references/templates.md)** - YAML templates per handoff type

## Screenshots

Early testing demonstrates the handoff feature working as expected:

### Handoff Detection and Context Generation

![Handoff detection screenshot](https://github.com/user-attachments/assets/f5570d4e-6487-4ddf-b8aa-f8d289a66b3f)

The skill activates when natural language handoff phrases are detected, capturing git state and conversation context automatically.

### Generated Context File

![Generated YAML context](https://github.com/user-attachments/assets/aa0b4d92-bef9-4b24-9933-8e80cde40f82)

A structured YAML file is written to `/tmp/` with timestamp, thread metadata, and comprehensive context for continuation in a new thread.

*See [GitHub Issue #41](https://github.com/shrwnsan/vibekit-claude-plugins/issues/41#issuecomment-3797783132) for the original testing report.*

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
- ✅ Other agents implementing the Agent Skills standard

The output is agent-agnostic and works across platforms that support:
- Natural language skill triggers
- File system access (`/tmp/` directory)
- YAML context parsing

## Documentation

- [SKILL.md](SKILL.md) - Core workflow and implementation details
- [references/patterns.md](references/patterns.md) - Complete trigger pattern reference
- [references/examples.md](references/examples.md) - Detailed handoff scenarios
- [references/templates.md](references/templates.md) - Context summary templates per handoff type

## Skill Structure

This skill follows the [agentskills.io](https://agentskills.io) standard structure:

```
handoff-context/
├── SKILL.md                          # Main instructions (entry point)
├── handoff-context-config.example.yml # Configuration template
├── scripts/                          # Executable code
│   ├── capture-context.sh            # Enhanced context capture with config support
│   └── validate-context.sh           # Quality validation script
├── references/                       # Documentation (progressive disclosure)
│   ├── patterns.md                   # Trigger patterns and regex
│   ├── workflow.md                   # Complete step-by-step workflow
│   ├── examples.md                   # Quick scenarios
│   ├── examples-detailed.md          # Full YAML output examples
│   └── templates.md                  # YAML templates per handoff type
└── assets/                           # Evaluation files (flat structure)
    ├── eval-continuation.json
    ├── eval-context-preservation.json
    ├── eval-targeted-handoff.json
    └── eval-non-git-repo.json
```

### Scripts

- **[capture-context.sh](scripts/capture-context.sh)** - Generates YAML templates with config support, package manager detection, and session tracking
- **[validate-context.sh](scripts/validate-context.sh)** - Validates handoff quality and provides actionable recommendations

For complete workflow details, see **[workflow.md](references/workflow.md)**.

## Philosophy

**Seamless continuation without losing context.**

No buttons to click, no commands to remember—just say "handoff" and continue working. The goal is to keep you in flow while transitioning to a fresh thread with full context preservation.

## Limitations

- Does not automatically create new threads (platform capability)
- Context directories in `/tmp/` may be cleared on system reboot
- Git state is captured at handoff time, not live-synced
- Large conversations may produce extensive summaries
- Cross-tool compatibility requires hook integration (e.g., Warp Agent Mode)
- Configuration priority complexity: project-local configs are searched up to 5 directories up

## Contributing

This is an experimental feature. See [GitHub Issue #41](https://github.com/shrwnsan/vibekit-claude-plugins/issues/41) for ongoing discussion and known platform constraints.
