---
name: handoff-context
description: Detects natural language handoff requests and generates structured context summaries for seamless thread continuation. Use when user says "handoff", "new thread", "continue in fresh thread", or similar phrases.
user-invocable: true
disable-model-invocation: true
allowed-tools:
  - bash(git:*)
  - bash(mktemp:-d)
  - bash(mkdir:-p /tmp/handoff-*)
  - bash(ls:-la /tmp/handoff-*)
  - bash(chmod:700)
  - bash(touch:*)
  - bash(rm:-f)
  - bash(date:*)
  - bash(tr '\n' ' ')
  - bash(sed 's/ $//')
  - bash(cat /tmp/handoff-*)
  - bash(echo:*)
  - bash(write to /tmp/handoff-*)
  - Read(/tmp/handoff-*)
  - Write(/tmp/handoff-*)
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

## Configuration

### Config File Locations

The handoff-context skill looks for configuration in the following order (highest to lowest priority):

| Priority | Location | Scope | Use Case |
|----------|----------|-------|----------|
| 1 | `~/.config/agents/handoff-context-config.yml` | Cross-tool | Amp, other AI tools |
| 2 | `~/.claude/handoff-context-config.yml` | Claude Code | Claude Code specific |
| 3 | `.agents/handoff-context-config.yml` | Project-local | Per-project overrides |
| 4 | Built-in defaults | Fallback | Ships with plugin |

### Quick Setup

Copy the example config to your preferred location:

```bash
# Cross-tool location (recommended for multi-tool users)
mkdir -p ~/.config/agents
cp ~/.claude/plugins/base/skills/handoff-context/handoff-context-config.example.yml \
   ~/.config/agents/handoff-context-config.yml

# Claude Code specific
cp ~/.claude/plugins/base/skills/handoff-context/handoff-context-config.example.yml \
   ~/.claude/handoff-context-config.yml

# Project-local
mkdir -p .agents
cp ~/.claude/plugins/base/skills/handoff-context/handoff-context-config.example.yml \
   .agents/handoff-context-config.yml
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `format` | string | `yaml` | Output format: `yaml` or `markdown` |
| `include.learnings` | boolean | `true` | Include learnings section |
| `include.approaches` | boolean | `true` | Include approaches section (what worked/didn't) |
| `include.git_state` | boolean | `true` | Include git state (branch, files) |
| `include.quick_start` | boolean | `true` | Include quick_start section |
| `confidence.minimum` | float | `0.3` | Minimum confidence score floor |
| `confidence.threshold` | float | `0.7` | Warning threshold for low quality |

### Example Configuration

```yaml
# ~/.config/agents/handoff-context-config.yml

# Output format
format: yaml  # yaml | markdown

# Include optional sections
include:
  learnings: true
  approaches: true
  git_state: true
  quick_start: true

# Confidence scoring thresholds
confidence:
  minimum: 0.3      # Floor score (0.3 = tentative, still some value)
  threshold: 0.7    # Warning threshold (below = add more context)
```

### Config Metadata in Handoff

Each handoff file includes metadata about which config was used:

```yaml
metadata:
  config:
    source: "/home/user/.config/agents/handoff-context-config.yml"
    format: "yaml"
```

## Invocation Method Reliability

| Method | Reliability | Output |
|--------|-------------|--------|
| `/handoff-context` | ✅ 100% | YAML file + structured display |
| "Let's handoff" | ⚠️ Variable | May produce text-only or .txt file |

**Recommendation:** Use `/handoff-context` for consistent cross-agent behavior.

## Workflow Requirements

**When this skill is triggered, you MUST follow these steps exactly:**

1. **Execute the script first:**
```bash
# Find script in plugin cache (works across different directories)
# Alternative locations: ~/.claude/plugins, ~/.agent/skills
bash $(find ~/.claude/plugins -name "capture-context.sh" 2>/dev/null | head -1)
```

2. **Capture the HANDOFF_FILE path** from script output (format: `HANDOFF_FILE=/tmp/...`)

3. **Read that file** and populate conversation context:
   - Current work (tasks, status, affected files)
   - Conversation summary (phases, outcomes, decisions)
   - Next steps (continuation action context)
   - Preserved context (key details to remember)

4. **Overwrite the same file** with complete context

5. **Display summary** to user with file path

⚠️ **CRITICAL REQUIREMENTS:**
- ✅ MUST create .yaml file (not .txt)
- ✅ MUST use YAML format in file (not Markdown)
- ✅ MUST execute script (not bypass with manual commands)
- ✅ MUST display file path with continuation instruction

**What the script captures:**
- Session tracking (unique ID, timestamps)
- Metadata (confidence score, quality indicators)
- Quick start info (project type, package manager)
- Git state (branch, staged/unstaged/untracked files)
- YAML structure with dynamic timestamps
- Secure temp directory with proper permissions

**What you need to add:**
- Current work, conversation summary, next steps, preserved_context
- **Update confidence_score** based on populated content:
  - Base: 0.5
  - +0.1 if git_state has files
  - +0.1 if conversation_summary has 1+ items
  - +0.1 if current_work has 1+ items
  - +0.1 if next_steps has 1+ items
  - +0.1 if continuation_action is not null
  - -0.1 for each empty critical section
  - Cap: 0.3 minimum, 0.95 maximum
- **Populate learnings** with patterns/techniques discovered (0.3-0.9 confidence)
- **Populate approaches** (successful, failed, not attempted)
- **Fill session.started** and **session.duration_minutes**
- **Fill quick_start** fields (verification_command, files_to_read_first, context_priority, estimated_time_minutes)

**Result:** Complete `/tmp/handoff-XXX/handoff-YYYYMMDD-HHMMSS.yaml` with full context.

## Success Criteria

Before completing handoff, verify:

- [ ] Script was executed (find + bash, not manual commands)
- [ ] File has .yaml extension (not .txt)
- [ ] File contains valid YAML structure (not Markdown with ##)
- [ ] File path is shown to user
- [ ] Continuation instruction includes exact file path
- [ ] Human-readable summary displayed alongside file
- [ ] **Confidence score ≥ 0.7** (or document reason for lower score)
- [ ] **Session tracking populated** (started, duration_minutes)
- [ ] **Critical sections filled** (current_work, conversation_summary)

**If any criteria fails:** Re-invoke with `/handoff-context` slash command.

## Quality Thresholds

| Confidence Score | Quality Level | Recommendation |
|------------------|---------------|----------------|
| ≥ 0.9 | Comprehensive | Ready for immediate continuation |
| 0.7 - 0.9 | Good | Acceptable, minor gaps possible |
| 0.5 - 0.7 | Acceptable | Consider adding more context |
| < 0.5 | Needs Work | Add more context before handoff |

## What Gets Captured

| Category | Details |
|----------|---------|
| **Session** | Unique ID, timestamps, duration (calculated by agent) |
| **Metadata** | Confidence score (0.3-0.95), quality level, missing context flags |
| **Quick Start** | Project type, package manager, priority files, estimated time |
| **Git State** | Branch, staged/unstaged/untracked files |
| **Conversation** | Phase summaries, outcomes, decisions |
| **Current Work** | Active tasks with status and affected files |
| **Learnings** | Patterns discovered, debugging techniques, confidence levels |
| **Approaches** | What worked, what didn't, what's left to try |
| **Next Steps** | Continuation action (if specified) |
| **Preserved Context** | Key decisions and important details |

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

**Quick reference:** See [examples.md](examples.md) - 4 concrete scenarios:
1. Continuation Handoff - "Handoff and build an admin panel"
2. Context Preservation - "Handoff this context"
3. Targeted Handoff - "Handoff to code-reviewer for security check"
4. Fresh Thread for Next Phase - "Continue in a fresh thread"

## Documentation

| File | Purpose |
|------|---------|
| [references/patterns.md](references/patterns.md) | All trigger patterns and regex matching rules |
| [references/workflow.md](references/workflow.md) | Complete step-by-step workflow manual |
| [references/examples.md](references/examples.md) | Quick reference scenarios |
| [references/templates.md](references/templates.md) | YAML template structures |

## Evaluations

Test files for validating skill behavior:
- [assets/eval-continuation.json](assets/eval-continuation.json)
- [assets/eval-context-preservation.json](assets/eval-context-preservation.json)
- [assets/eval-targeted-handoff.json](assets/eval-targeted-handoff.json)
- [assets/eval-non-git-repo.json](assets/eval-non-git-repo.json)
- [assets/eval-negative-cases.json](assets/eval-negative-cases.json) - Failure scenario detection

Run evaluations to verify pattern detection, YAML generation, and failure handling.

## Common Scenarios

- After implementing a feature → move to next phase in fresh thread
- Long thread → start fresh with preserved context
- Bug fix → audit similar patterns elsewhere
- Planning → implementation transition

## Error Handling

| Scenario | Handling |
|----------|----------|
| Script not found | Follow manual workflow in [references/workflow.md](references/workflow.md) |
| Script execution fails | Fall back to manual workflow steps |
| No git repo | Script omits git_state, proceeds with conversation context |
| No action | Script sets continuation_action: null |
| Empty conversation | Script provides minimal context with working directory |

*See [references/workflow.md](references/workflow.md) for complete manual workflow and error scenarios.*

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
