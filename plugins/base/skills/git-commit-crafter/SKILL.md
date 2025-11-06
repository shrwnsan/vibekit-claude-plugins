---
name: git-commit-crafter
description: Automatically invoked when user requests git commit message creation, commit drafting, or needs help with conventional commit formatting. Use for phrases like "help me commit", "draft a commit message", "create a proper commit", "write commit message for [changes]", "I need to commit these changes". Handles conventional commit standards, line length limits, and adds proper Co-Authored-By attribution for collaborative development.
allowed-tools:
  - bash
---

# Git Commit Crafter

Professional git commit message drafting service that follows modern conventional commit standards and automatically adds proper attribution for collaborative development.

## When to Use

**Use this skill when you need to:**
- Draft commit messages that follow conventional commit standards
- Add proper Co-Authored-By attribution lines
- Structure commit messages with clear scope and description
- Ensure commit messages follow repository best practices
- Create commits with proper formatting and line length limits

**This skill ensures your commits are professional, consistent, and properly attributed.**

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