# Crafting Commits Skill

A professional git commit message drafting service that follows modern conventional commit standards, provides collaborative attribution, and includes quality validation for reliable development workflows.

## Quick Start

**Recommended: Use the slash command**
```bash
/crafting-commits
```

**Or use natural language triggers:**
- "help me commit these changes"
- "draft a commit message"
- "create a proper commit"
- "write commit message for [changes]"
- "I need to commit these changes"

The skill will:
1. Analyze staged changes with `git diff --staged`
2. Check recent commit history for style consistency
3. Draft a conventional commit message with proper attribution
4. Validate the message against quality standards
5. Execute the commit with the drafted message

## Features

### Conventional Commit Format
Follows the [Conventional Commits](https://www.conventionalcommits.org/) specification:
- **feat**: New features
- **fix**: Bug fixes
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **test**: Test additions or modifications
- **chore**: Maintenance tasks
- **perf**: Performance improvements

### Collaborative Attribution
Automatically includes `Co-Authored-By` trailers for collaborative development:
```bash
Co-Authored-By: GLM <zai-org@users.noreply.github.com>
Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

### Dynamic Context Injection
Pre-loads git context for faster commit generation:
- Current git status
- Recent commits for style consistency
- Branch information

### Quality Validation
Validates commit messages against:
- Conventional commit format
- Character limits (subject: 50, body: 72)
- Imperative mood in subject line
- Proper attribution format

## Reference Documents

The skill follows progressive disclosure—core workflow is in SKILL.md, with detailed references:

- **[examples.md](examples.md)** - Comprehensive commit message examples for different scenarios
- **[validation.md](validation.md)** - Detailed checklists for validating commits at all freedom levels
- **[patterns.md](patterns.md)** - Advanced patterns, formatting best practices, attribution guidelines
- **[troubleshooting.md](troubleshooting.md)** - Common Git errors and recovery procedures

## Utility Scripts

Executable scripts for validation and analysis:

- **`scripts/validate_commit.sh`** - Checks if a commit message follows conventional commit format
- **`scripts/check_attribution.sh`** - Validates the `Co-Authored-By` format in commit messages
- **`scripts/analyze_changes.sh`** - Provides a summary of staged changes for commit drafting

## Usage Examples

### Simple Feature Commit
```bash
# Stage your changes
git add src/new-feature.ts

# Trigger the skill
/crafting-commits

# Result: Professional commit message like:
# feat(auth): add OAuth2 integration
#
# Implement Google OAuth provider with proper session management
#
# Co-Authored-By: GLM <zai-org@users.noreply.github.com>
```

### Bug Fix Commit
```bash
# Stage bug fix
git add src/bugfix.ts

# Natural language trigger
"help me commit this bug fix"

# Result:
# fix(auth): resolve token refresh race condition
#
# Added proper locking mechanism to prevent concurrent refresh attempts
#
# Co-Authored-By: GLM <zai-org@users.noreply.github.com>
```

### Breaking Change
```bash
# Stage breaking changes
git add src/api-v2.ts

# Trigger the skill
/crafting-commits

# Result:
# feat(api): migrate to v2 API with breaking changes
#
# BREAKING CHANGE: Removed deprecated endpoints /users/legacy and /auth/basic
# Clients must update to OAuth2 authentication
#
# Co-Authored-By: GLM <zai-org@users.noreply.github.com>
```

## System Requirements

- Git version 2.25.0 or higher
- Bash shell access
- Standard Unix tools (`ls`, `grep`, etc.)

## Integration

Works seamlessly with other Base plugin capabilities:
- **workflow-orchestrator**: Coordinates commit workflows with quality checks
- **systematic-debugging**: Preserves error context during debugging
- **handoff-context**: Context preservation before committing

## Philosophy

**Professional commits that stand the test of time.**

Clear, well-formitted commit messages make code reviews easier, debugging faster, and project history more valuable. This skill encodes professional commit standards so every contribution tells its story clearly.

## Documentation

- [SKILL.md](SKILL.md) - Core workflow and implementation details
- [examples.md](examples.md) - Comprehensive commit message examples
- [validation.md](validation.md) - Quality validation checklists
- [patterns.md](patterns.md) - Advanced patterns and best practices
- [troubleshooting.md](troubleshooting.md) - Common Git errors and recovery

## License

Apache 2.0
