# Advanced Patterns & Best Practices

This file covers advanced commit message patterns, best practices for formatting, and detailed attribution guidelines.

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

BREAKING CHANGE: The user profile endpoint now returns a nested object
structure instead of flat fields.

Migration: Update client code to access `user.profile.name`
instead of `user.name` directly.

Deprecates: Direct field access will be removed in v2.0.0.
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
