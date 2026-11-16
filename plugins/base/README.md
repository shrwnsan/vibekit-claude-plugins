# Base: Claude Code workflow tools

Commit crafting, systematic debugging, handoff context, branch cleanup,
test output filtering, and a workflow orchestrator (beta).

## Features

- `/commit` creates the commit: conventional formatting, quality validation, attribution, breaking-change detection
- The crafting-commits skill drafts commit messages from natural-language requests ("help me commit")
- `/systematic-debugging` runs a 5-step debugging workflow that targets root causes
- `/handoff-context` writes a structured YAML summary for continuing work in a fresh thread
- The workflow orchestrator (beta) chains commit, QA, and validation steps
- A PreToolUse hook filters verbose test output (npm, pytest, cargo, go, yarn, pnpm), typically a 50 to 95% token reduction

## Quick start

```bash
# Install from VibeKit marketplace
/plugin install base --marketplace shrwnsan/vibekit-claude-plugins

# Quick commit with a drafted message
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

### Git commit tools

Two ways to create commits:

#### 1. The /commit command
Explicit control with CLI options:
```bash
/commit                                    # Auto-detects complexity and routes appropriately
/commit -f                                 # Fast mode for simple, routine changes
/commit -v                                 # Verbose mode for detailed analysis
/commit "custom message"                   # Use your message with validation
```

#### 2. The crafting-commits skill
Drafts the message from natural-language requests:
- "help me commit"
- "draft a commit message"
- "create a proper commit"
- "write commit message for [changes]"
- "I need to commit these changes"

Not sure which to use? See [the comparison guide](docs/commit-approaches-comparison.md).

Both paths share:
- Conventional commit formatting
- Quality validation before committing
- Proper attribution handling
- Breaking change detection

### Systematic debugging

**Slash command:** `/systematic-debugging`

Activates when you hit errors, test failures, or unexpected behavior. No command needed. Describe the issue.

When it activates:
- Error messages or stack traces in conversation
- Test failures being discussed
- "Not working", "bug", "broken", or "unexpected behavior" mentioned
- Questions like "why is this happening?"

What it provides:
- 5-step debugging workflow
- Guardrails against common debugging pitfalls
- Guidance for multi-component systems
- Architecture questioning when 3+ fixes fail

Usage examples:
- "This test is failing"
- "Help me debug this error"
- "Why isn't this working?"
- "Something's broken after my changes"

Understand the root cause before attempting fixes. Random fixes are slower and often leave the bug in place.

### Handoff context

**Slash command:** `/handoff-context` (recommended)

Activates when you want to move to a new thread and keep the conversation context. No command needed. Say "handoff" in any phrasing.

When it activates:
- "Handoff and [action]" continues in a new thread with a goal, as in "Handoff and build an admin panel"
- "Handoff to [action]" targets the continuation at one task, as in "Handoff to implement the plan"
- "Handoff [context]" preserves context without a next action
- "Start a new thread with this" states the continuation explicitly

What it provides:
- A structured YAML summary written to `/tmp/handoff-TIMESTAMP.yaml`
- Git state, conversation phases, next steps, and key decisions
- Workflow-aware handoffs through the workflow orchestrator

Usage examples:
- "Handoff and refactor the authentication flow"
- "Handoff to implement the plan"
- "Start a new thread with this context"
- "Continue in a fresh thread"

The new thread reads the YAML file and resumes with the full state, so no context is lost in the switch.

### Branch and worktree hygiene

**Slash command:** `/branch-hygiene`

Classifies every local and remote branch and worktree against the mainline, then cleans up what is resolved. Detects squash-merges that `git branch --merged` cannot see (subject/PR matching, file presence, content diffs), which is the only reliable test in squash-merge workflows.

What it detects:
- Branches fully resolved via squash-merge (`merged-content`) or patch-equivalence (`merged-ancestry`)
- Superseded branches (content landed, mainline evolved past them) and stale-base branches (merging would regress)
- Remote-gone branches, prunable worktrees, orphaned worktree-looking directories
- Worktree-attached branches are never auto-delete eligible; dirty/unmerged work is never touched

**Safety model:** the classifier script is strictly read-only. Tiered action policy: auto (local branch delete, `worktree prune`), confirm (worktree remove, remote ref deletion), never (dirty or unmerged).

**Usage examples:**
- "Clean up my merged branches"
- "Prune stale worktrees"
- "Which branches are safe to delete?"

**Key principle:** Every deletion is backed by a verified verdict, never an ancestry guess.

### Test output filtering

Automatic. The hook filters test output by default to cut token costs.

Supported runners: npm test, pytest, go test, cargo test, yarn test, pnpm test, bun test, rspec, rails test, mvn test, gradle test

How it works: the hook intercepts test commands and pipes output through filters that keep errors, failures, and key results, typically a 50 to 95% token reduction.

Disable filtering:
```bash
export VIBEKIT_BASE_TEST_FILTER=none
# or
export VIBEKIT_BASE_TEST_FILTER=disable
```

**Requirements**: `jq` for JSON parsing (hook gracefully degrades if jq is missing)

For detailed documentation, see [test-output-filtering.md](docs/test-output-filtering.md).

### Workflow orchestrator (beta)
The workflow orchestrator chains git operations, QA checks, and validation into one flow. It creates isolated worktrees for parallel work, runs the QA scope your change type needs, and reports progress after each step.

#### Workflow types
```bash
"base: workflow commit"                    # Standard commit workflow with quality integration
"base: workflow qa --scope code"           # Quality assurance checks (code/docs/feature)
"base: workflow parallel feature"          # Parallel development with worktrees
"base: workflow clean"                     # Clean and reset workspace
```

#### Key capabilities
- Commit, quality check, and validation run as one pipeline
- Parallel development gets isolated worktrees
- QA scope follows the change type
- Errors come with rollback options and recovery guidance
- Progress is reported per step

#### QA scope options
- `--scope code` - Linting, testing, and build validation
- `--scope docs` - Link checking and formatting validation
- `--scope feature` - Comprehensive QA for new features
- `--scope minimal` - Basic syntax and structure validation

#### Usage examples
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

The orchestrator infers the workflow type from your request and reports progress and next steps as it runs.

### Terminal productivity (planned)
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
│   ├── handoff-context/            # Natural language handoff detection
│   └── branch-hygiene/             # Squash-merge-aware branch/worktree cleanup
├── agents/
│   └── workflow-orchestrator.md    # Workflow coordination (beta)
├── hooks/
│   ├── hooks.json                  # PreToolUse hook registration
│   └── scripts/
│       └── filter-test-output.sh   # Test output filtering script
├── docs/
│   ├── commit-approaches-comparison.md  # Usage guidance
│   └── test-output-filtering.md    # Feature documentation
├── README.md                      # This file
├── CHANGELOG.md                   # Version history
└── LICENSE                        # Apache 2.0
```

## Configuration (planned)
> These variables are planned for a future release

```bash
# VibeKit Base Plugin Configuration (defaults shown)
export VIBEKIT_BASE_DISABLE_TRASH=""         # Empty = trash enabled, "true"/"1" = disabled
export VIBEKIT_BASE_DISABLE_BACKUP=""        # Empty = backup enabled, "true"/"1" = disabled
export VIBEKIT_BASE_QA_SCOPE=standard        # Quality assurance level: standard, quick, minimal
```

## Support

- **Issues**: [GitHub Issues](https://github.com/shrwnsan/vibekit-claude-plugins/issues)

---

License: Apache 2.0 | Plugin Version: 1.12.0
## Standards

Ships with dual manifests: a Claude Code plugin (`.claude-plugin/plugin.json`)
and an [Agent Plugins](https://agent-plugins.org/) v1.0.0 package (`plugin.json`).
The skills conform to the [Agent Skills specification](https://agentskills.io/);
CI checks the two manifests stay in sync. Commands, agents, and hooks are
Claude Code-specific and not part of the portable package.
