# Base: Essential Claude Code Workflow Tools

A Claude Code plugin providing foundational workflow automation tools for productive development.

## Features

- **Git Commit Command**: Quick, intelligent commit creation with `/commit` slash command
- **Git Commit Crafting**: Professional commit messages with conventional standards and attribution
- **Systematic Debugging**: Structured debugging approach that finds root causes efficiently
- **Handoff Context**: Natural language handoff detection for seamless thread continuation
- **Workflow Orchestration**: Coordinates development workflows and quality assurance (beta)

## Quick Start

```bash
# Install from VibeKit marketplace
claude plugin install base

# Quick commit with intelligent message drafting
/commit

# Try git commit crafting (automatic invocation)
"help me commit these changes"

# Debug errors systematically (automatic invocation)
"this test is failing" or "help me debug this issue"

# Handoff to new thread with context (automatic invocation)
"handoff and build an admin panel for this"
"handoff to implement the plan"
"start a new thread with this context"

# Use workflow orchestrator
"base: workflow commit --scope feature"
```

## Usage

### Git Commit Tools

The Base Plugin offers two complementary approaches to creating commits:

#### 1. /commit Command
Explicit control with flexible CLI options:
```bash
/commit                                    # Auto-detects complexity and routes appropriately
/commit -f                                 # Fast mode for simple, routine changes
/commit -v                                 # Verbose mode for detailed analysis
/commit "custom message"                   # Use your message with validation
```

#### 2. crafting-commits Skill
Intelligent automation that adapts to your changes. Use for phrases like:
- "help me commit"
- "draft a commit message"
- "create a proper commit"
- "write commit message for [changes]"
- "I need to commit these changes"

**Which to use?** See [Commit Approaches Comparison](docs/commit-approaches-comparison.md) for detailed guidance.

**Shared Features:**
- Conventional commit formatting
- Quality validation before committing
- Proper attribution handling
- Breaking change detection

### Systematic Debugging

Automatically activates when you encounter errors, test failures, or unexpected behavior. No command needed—just describe the issue.

**When it activates:**
- Error messages or stack traces in conversation
- Test failures being discussed
- "Not working", "bug", "broken", or "unexpected behavior" mentioned
- Questions like "why is this happening?"

**What it provides:**
- 5-step systematic debugging workflow
- Guardrails against common debugging pitfalls
- Guidance for multi-component systems
- Architecture questioning when 3+ fixes fail

**Usage examples:**
- "This test is failing"
- "Help me debug this error"
- "Why isn't this working?"
- "Something's broken after my changes"

**Key principle:** Understand the root cause before attempting fixes. Systematic debugging is faster than random fixes.

### Handoff Context

Automatically activates when you want to transition to a new thread and preserve your conversation context. No command needed—just say "handoff" naturally.

**When it activates:**
- "Handoff and [action]" → Continue work in new thread (e.g., "Handoff and build an admin panel")
- "Handoff to [action]" → Targeted continuation (e.g., "Handoff to implement the plan")
- "Handoff [context]" → Context preservation only (e.g., "Handoff this context")
- "Start a new thread with this" → Explicit thread continuation

**What it provides:**
- Structured YAML context summary written to `/tmp/handoff-TIMESTAMP.yaml`
- Preserves git state, conversation phases, next steps, and key decisions
- Integrates with workflow-orchestrator for workflow-aware handoffs

**Usage examples:**
- "Handoff and refactor the authentication flow"
- "Handoff to implement the plan"
- "Start a new thread with this context"
- "Continue in a fresh thread"

**Key principle:** Seamless continuation without losing context. Stay in flow while transitioning to a fresh thread.

### Workflow Orchestrator (beta)
The workflow orchestrator coordinates complex development workflows, integrating git operations, quality assurance, and productivity automation. It manages parallel development, enforces quality gates, and sequences tasks for smooth development processes.

#### Workflow Types
```bash
"base: workflow commit"                    # Standard commit workflow with quality integration
"base: workflow qa --scope code"           # Quality assurance checks (code/docs/feature)
"base: workflow parallel feature"          # Parallel development with worktrees
"base: workflow clean"                     # Clean and reset workspace
```

#### Key Capabilities
- **Git Workflow Integration**: Automated commit → quality check → validation pipeline
- **Parallel Development**: Creates isolated worktrees for feature branches
- **Quality Gate Enforcement**: Runs scoped QA based on change type and scope
- **Error Recovery**: Provides rollback options and recovery guidance
- **Progress Tracking**: Monitors workflow status with detailed reporting

#### Quality Assurance Scope Options
- `--scope code` - Linting, testing, and build validation
- `--scope docs` - Link checking and formatting validation
- `--scope feature` - Comprehensive QA for new features
- `--scope minimal` - Basic syntax and structure validation

#### Usage Examples
```bash
# Standard feature development with QA
"base: workflow commit"

# Quality check specific changes
"base: workflow qa --scope code"

# Parallel feature development
"base: workflow parallel feature-branch-name"

# Clean workspace after development session
"base: workflow clean"
```

The orchestrator automatically determines the appropriate workflow type based on your context and requirements, providing detailed progress reports and recommendations for next steps.

### Terminal Productivity (Planned Features)
```bash
"base: clean-deps --safe"         # Uses trash instead of rm (planned)
"base: quality-check"             # Run lint + test + build (planned)
"base: backup-state"              # Create workspace backup (planned)
```

## Architecture

```
plugins/base/
├── .claude-plugin/plugin.json
├── commands/
│   └── commit.md                   # Quick commit command
├── skills/
│   ├── crafting-commits/           # Professional commit crafting
│   ├── systematic-debugging/       # Systematic debugging approach
│   └── handoff-context/            # Natural language handoff detection
├── agents/
│   └── workflow-orchestrator.md    # Workflow coordination (beta)
├── docs/
│   └── commit-approaches-comparison.md  # Usage guidance
├── README.md                      # This file
├── CHANGELOG.md                   # Version history
└── LICENSE                        # Apache 2.0
```

## Configuration (Planned Features)
> Note: The following environment variables are planned for future releases

```bash
# VibeKit Base Plugin Configuration (defaults shown)
export VIBEKIT_BASE_DISABLE_TRASH=""         # Empty = trash enabled, "true"/"1" = disabled
export VIBEKIT_BASE_DISABLE_BACKUP=""        # Empty = backup enabled, "true"/"1" = disabled
export VIBEKIT_BASE_QA_SCOPE=standard        # Quality assurance level: standard, quick, minimal
```

## Support

- **Issues**: [GitHub Issues](https://github.com/shrwnsan/vibekit-claude-plugins/issues)

---

License: Apache 2.0 | Plugin Version: 1.6.0