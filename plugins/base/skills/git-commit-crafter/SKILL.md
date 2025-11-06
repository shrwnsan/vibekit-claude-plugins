---
name: crafting-git-commits
description: Professional git commit message drafting service with conventional standards, collaborative attribution, and quality validation. Automatically invoked for commit message creation, drafting, and formatting help.
allowed-tools:
  - bash
---

# Crafting Git Commits

Professional git commit message drafting service that follows modern conventional commit standards, provides collaborative attribution, and includes quality validation for reliable development workflows.

## Quick Start

### For Simple Commits (Level 1 Freedom)
**Use for:** fix, docs, style, chore commits
1. **Analyze**: Run `git status` and `git diff --staged`
2. **Draft**: Create commit message following conventional format
3. **Attribute**: Add Co-Authored-By line if collaborating
4. **Execute**: Commit with basic quality checks

### For Complex Commits (Level 2 Freedom)
**Use for:** feat, refactor, perf commits
1. **Plan**: Analyze impact and breaking changes
2. **Validate**: Confirm commit type and scope with user
3. **Draft**: Create detailed body with testing notes
4. **Execute**: Commit with comprehensive quality validation

### For Critical Changes (Level 3 Freedom)
**Use for:** Breaking changes, architectural decisions
1. **Assess**: Full impact analysis and risk assessment
2. **Review**: Explicit user approval required
3. **Document**: Comprehensive migration guide if needed
4. **Execute**: Commit with full validation and attribution

## Freedom Levels & Model Guidance

### Freedom Levels
- **Level 1**: Simple commits (autonomous) - fix, docs, style, chore
- **Level 2**: Complex changes (validation required) - feat, refactor, perf
- **Level 3**: Breaking changes (explicit approval) - critical modifications

### Model Capabilities
**Tested with Claude Haiku, Sonnet, and Opus**

- **Claude Haiku**: Best for simple commits, fast processing
- **Claude Sonnet**: Balanced for most commit types, good analysis
- **Claude Opus**: Best for complex, critical commits with comprehensive analysis

## Core Workflow

### Step 1: Analysis Phase
Always run these commands first:
```bash
git status          # Check working tree status
git diff --staged   # Review staged changes
git log --oneline -5 # Check recent commit style consistency
```

### Step 2: Planning Phase
- Identify change type and scope
- Assess impact and potential breaking changes
- Determine required attribution and collaboration credits
- Check for related issues or pull requests

### Step 3: Validation Phase
Use the appropriate validation checklist based on freedom level:

**Level 1 Validation:**
- [ ] Subject line under 50 characters
- [ ] Commit type matches change nature
- [ ] Basic formatting follows conventional standards

**Level 2 Validation:**
- [ ] All Level 1 checks
- [ ] Scope accurately reflects changes
- [ ] Body explains what changed and why
- [ ] Related issues properly referenced

**Level 3 Validation:**
- [ ] All Level 2 checks
- [ ] Breaking changes clearly identified with `!`
- [ ] Migration considerations documented
- [ ] Impact assessment completed

### Step 4: Execution Phase
- Draft commit message with proper formatting
- Add attribution lines for collaboration
- Execute commit with appropriate quality checks
- Verify commit appears correctly in history

## Quality Validation Checklist

### Pre-Commit Validation
**Always Complete:**
- [ ] Changes reviewed with `git diff --staged`
- [ ] Commit type matches change nature
- [ ] Subject line under 50 characters, imperative mood
- [ ] Breaking changes properly identified with `!`
- [ ] Related issues referenced correctly (Fixes #123, Closes #45)

**User Confirmation Points (for Level 2+):**
1. "Is this commit type correct for the changes?"
2. "Does this scope accurately reflect the modified areas?"
3. "Are there any breaking changes not mentioned?"
4. "Is the attribution correct for this collaboration?"

### Post-Commit Verification
```bash
git log --oneline -1    # Verify commit appears
git show --stat         # Check files and statistics
git log --grep="Fixes"  # Verify issue references work
```

## Error Handling & Recovery

### Common Issues and Solutions

**Git Repository Issues:**
- **Problem**: Not in a git repository or git not initialized
- **Solution**: Run `git init` or navigate to correct directory
- **Validation**: Check `.git` directory exists with `ls -la .git`

**No Staged Changes:**
- **Problem**: No changes staged for commit
- **Solution**: Run `git add .` or stage specific files
- **Validation**: Verify with `git status` shows "Changes to be committed"

**Commit Conflicts:**
- **Problem**: Merge conflicts during commit or push
- **Solution**: Use conflict resolution workflow
- **Recovery**:
  1. `git status` to identify conflicted files
  2. Edit files to resolve conflicts
  3. `git add resolved/files`
  4. `git commit` to complete merge

**Attribution Format Errors:**
- **Problem**: Incorrect Co-Authored-By format
- **Solution**: Validate email format, check special characters
- **Prevention**: Use `Co-Authored-By: Name <email>` format exactly

**Breaking Change Identification:**
- **Problem**: Missing breaking change indicators
- **Solution**: Add `!` before colon in commit type
- **Example**: `feat!: remove deprecated authentication method`

### Recovery Procedures

**Failed Commit Recovery:**
```bash
# Check if commit was attempted
git status

# If commit failed but changes are staged
git commit -m "recovery: fix failed commit attempt"

# If changes were lost, check reflog
git reflog
git reset --hard HEAD@{1}
```

**Commit Message Recovery:**
```bash
# Edit last commit message
git commit --amend

# Or if already pushed
git commit --amend
git push --force-with-lease origin branch-name
```

## When to Use

**Use this skill when you need to:**
- Draft commit messages that follow conventional commit standards
- Add proper Co-Authored-By attribution lines
- Structure commit messages with clear scope and description
- Ensure commit messages follow repository best practices
- Create commits with proper formatting and line length limits
- Validate commit quality before execution
- Handle complex commits with breaking changes

**This skill ensures your commits are professional, consistent, and properly attributed with built-in quality validation.**

## System Requirements

**Required Dependencies:**
- Git version 2.25.0 or higher
- Bash shell access
- Standard Unix tools (ls, grep, etc.)

**Verification:**
```bash
git --version    # Should be >= 2.25.0
bash --version   # Verify bash access
```

## Capabilities

### Conventional Commit Standards
- **Type-Scope-Format**: Follows `type(scope): description` structure
- **Proper Line Length**: Keeps subject line under 50 characters, body under 72
- **Imperative Mood**: Uses imperative verbs (Add, Fix, Update, Refactor)
- **Clear Scoping**: Properly scopes changes to specific areas

### Automatic Attribution
- **Model Detection**: Automatically detects current active model
- **Proper Formatting**: Adds correctly formatted Co-Authored-By lines
- **Multiple Contributors**: Handles multiple attribution lines if needed
- **Git Standards**: Follows Git's attribution best practices

### Content Analysis
- **Change Categorization**: Identifies commit type (feat, fix, docs, refactor, etc.)
- **Impact Assessment**: Determines scope and impact level
- **Breaking Change Detection**: Identifies and formats breaking change notices
- **Issue Integration**: Properly references related issues and PRs

## Examples

### Feature Addition
```
"feat: add user authentication system with JWT tokens

Implement secure user authentication using JSON Web Tokens with
password hashing, session management, and token refresh mechanisms.

Changes:
- Add login/logout endpoints with password validation
- Implement JWT token generation and verification
- Add user registration with email confirmation
- Include session timeout and refresh token logic

Fixes #123
Related to #45

Co-Authored-By: GLM <zai-org@users.noreply.github.com>"
```

### Bug Fix
```
fix: resolve memory leak in data processing pipeline

Fix memory allocation issue in batch processing where temporary
objects were not properly garbage collected after large dataset
operations.

Root cause: Missing cleanup in finally block of processBatch()
function causing cumulative memory usage over time.

Testing: Verified memory usage remains stable during 24h stress test
with 1M+ records processed.

Fixes #89
Co-Authored-By: GLM <zai-org@users.noreply.github.com>"
```

### Documentation Update
```
docs: update API documentation with new authentication endpoints

Add comprehensive documentation for the new JWT-based authentication
system including request/response examples, error codes, and
integration patterns.

Updated sections:
- Authentication overview and flow diagrams
- Endpoint specifications with curl examples
- Error handling and troubleshooting guide
- Integration examples for popular frameworks

Related to feature implementation in commit 7a2b3c4
Co-Authored-By: GLM <zai-org@users.noreply.github.com>"
```

### Refactoring
```
refactor: simplify data validation logic with chainable validators

Replace complex nested validation functions with a more elegant
chainable validator pattern that improves readability and reduces
code duplication.

Benefits:
- Cleaner API with method chaining
- Easier to add new validation rules
- Better error message aggregation
- Reduced cognitive complexity in validation logic

Performance impact: Minimal (<1ms per validation)
Co-Authored-By: GLM <zai-org@users.noreply.github.com>"
```

## Best Practices Implemented

### Conventional Commit Types
- **feat**: New features or functionality
- **fix**: Bug fixes and corrections
- **docs**: Documentation changes only
- **style**: Code formatting changes (no functional impact)
- **refactor**: Code restructuring without functional changes
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Maintenance tasks, dependency updates

### Formatting Standards
- **Subject Line**: Max 50 characters, imperative mood, no period
- **Body Lines**: Max 72 characters, present tense
- **Empty Line**: Blank line between subject and body
- **Bullet Points**: Use hyphens or asterisks for lists

### Attribution Guidelines
- **Single Author**: One Co-Authored-By line
- **Multiple Authors**: Multiple Co-Authored-By lines
- **Format**: `Co-Authored-By: Name <email>`
- **Placement**: After commit body, before signatures

## Usage Patterns

### For Simple Changes
"feat: add user profile page"
"fix: resolve null pointer exception"
"docs: update installation guide"

### For Complex Changes
Include detailed body explaining:
- What was changed and why
- Breaking changes (if any)
- Testing performed
- Related issues or PRs

### For Collaborative Work
Always include Co-Authored-By lines when working with:
- AI models and assistants
- Multiple human contributors
- Code reviewers who provided significant input
- Pair programming sessions

## Attribution Guidelines

### When to Add Attribution
**Always include Co-Authored-By lines when:**
- Working with AI models and assistants
- Multiple human contributors made significant changes
- Code reviewers provided substantial input
- Pair programming sessions occurred
- External dependencies or libraries were integrated

### Attribution Format
```
Co-Authored-By: Full Name <email@example.com>
Co-Authored-By: GitHub Username <username@users.noreply.github.com>
Co-Authored-By: GLM <zai-org@users.noreply.github.com>
```

### Multiple Contributors
For significant collaboration:
```
feat: implement collaborative feature

This feature was developed through collaborative effort
with contributions from multiple team members.

Co-Authored-By: Alice Chen <alice@company.com>
Co-Authored-By: Bob Smith <bob@company.com>
Co-Authored-By: GLM <zai-org@users.noreply.github.com>
```

## Advanced Patterns

### Issue Integration
**Single Issue:**
```
fix: resolve user login timeout (Fixes #123)
```

**Multiple Issues:**
```
feat: add data export functionality

Implement CSV and JSON export options for user data.

Fixes #45, Closes #67, Resolves #89
```

### Breaking Change Notices
```
feat(api)!: change user endpoint response format

Breaking: User profile endpoint now returns nested object
structure instead of flat fields.

Migration: Update client code to access user.profile.name
instead of user.name directly.

Deprecates: Direct field access removed in v2.0.0
```

### Performance Commits
```
perf: optimize database query performance

Reduce query execution time by 40% through strategic indexing
and query restructuring.

Before: Average 250ms per user profile load
After: Average 150ms per user profile load

Impact: Improves user experience, reduces server load
```