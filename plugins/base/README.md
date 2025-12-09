# Base: Essential Claude Code Workflow Tools

A Claude Code plugin providing foundational workflow automation tools for productive development.

## Features

- **Git Commit Command**: Quick, intelligent commit creation with `/commit` slash command
- **Git Commit Crafting**: Professional commit messages with conventional standards and attribution
- **Workflow Orchestration**: Coordinates development workflows and quality assurance (WIP)

## Quick Start

```bash
# Install from VibeKit marketplace
claude plugin install base

# Quick commit with intelligent message drafting
/commit

# Try git commit crafting (automatic invocation)
"help me commit these changes"

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

### Workflow Orchestrator (WIP)
```bash
"base: workflow commit"           # Standard commit workflow
"base: workflow qa --scope code"   # Quality assurance checks
"base: workflow clean"            # Clean and reset workspace
```

### Terminal Productivity
```bash
"base: clean-deps --safe"         # Uses trash instead of rm
"base: quality-check"             # Run lint + test + build
"base: backup-state"              # Create workspace backup
```

## Architecture

```
plugins/base/
├── .claude-plugin/plugin.json
├── commands/
│   └── commit.md                   # Quick commit command
├── skills/
│   └── crafting-commits/           # Professional commit crafting
├── agents/
│   └── workflow-orchestrator.md    # Workflow coordination (WIP)
├── docs/
│   └── commit-approaches-comparison.md  # Usage guidance
├── README.md                      # This file
├── CHANGELOG.md                   # Version history
└── LICENSE                        # Apache 2.0
```

## Configuration

```bash
export BASE_USE_TRASH=true          # Safe file operations
export BASE_QA_SCOPE=standard       # QA thoroughness level
export BASE_BACKUP_ON_DELETE=true   # Auto-backup before destructive ops
```

## Support

- **Issues**: [GitHub Issues](https://github.com/shrwnsan/vibekit-claude-plugins/issues)

---

License: Apache 2.0 | Plugin Version: 1.3.0