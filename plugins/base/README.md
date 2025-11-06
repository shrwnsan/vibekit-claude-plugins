# Base: Essential Claude Code Workflow Tools

A Claude Code plugin providing foundational workflow automation tools for productive development.

## Features

- **Git Commit Crafting**: Professional commit messages with conventional standards and attribution
- **Workflow Orchestration**: Coordinates development workflows and quality assurance (WIP)

## Quick Start

```bash
# Install from VibeKit marketplace
claude plugin install base

# Try git commit crafting (automatic invocation)
"help me commit these changes"

# Use workflow orchestrator
"base: workflow commit --scope feature"
```

## Usage

### Git Commit Crafting
Automatically invoked for commit-related requests:
- "help me commit"
- "draft a commit message"
- "write commit message for [changes]"

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
├── skills/
│   └── git-commit-crafter/         # Professional commit crafting
├── agents/
│   └── workflow-orchestrator/     # Workflow coordination (WIP)
└── README.md                      # This file
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

License: Apache 2.0 | Plugin Version: 1.0.0