# Advanced Patterns

This reference covers advanced commit message patterns for issue integration, breaking changes, attribution, and performance commits.

## Freedom Levels & Model Guidance

The skill operates at three autonomy levels based on commit complexity:

- **Level 1 (Autonomous)**: Simple commits like `fix`, `docs`, `style`, and `chore`. I can execute these autonomously.
- **Level 2 (Validation Required)**: Complex changes such as `feat`, `refactor`, and `perf`. I will ask for your confirmation before proceeding.
- **Level 3 (Explicit Approval)**: Critical modifications or breaking changes. I will require your explicit approval before committing.

See [validation.md](validation.md) for detailed checklists for each freedom level.

## Issue Integration

### Single Issue Reference

Simple format in subject line:
```
fix: resolve user login timeout (Fixes #123)
```

Or in body:
```
fix: resolve user login timeout

Fix authentication session expiration issue causing premature
logouts for active users.

Fixes #123
```

### Multiple Issues Reference

```
feat: add data export functionality

Implement CSV and JSON export options for user data with
configurable filters and batch processing support.

Fixes #45, Closes #67, Resolves #89
```

### Issue Reference Formats

- `Fixes #123` - Automatically closes issue when merged
- `Closes #45` - Alternative closing keyword
- `Resolves #89` - Another closing keyword
- `Related to #12` - Does not close, just references
- `See also #34` - Weak reference for additional context

## Breaking Change Notices

### Breaking Change in Type/Scope

```
feat(api)!: change user endpoint response format

BREAKING CHANGE: User profile endpoint now returns nested object
structure instead of flat fields.

Migration: Update client code to access user.profile.name
instead of user.name directly.

Deprecates: Direct field access removed in v2.0.0
```

### Breaking Change in Body

```
feat: add user endpoint response format changes

This commit updates the user profile endpoint structure.

BREAKING CHANGE: User profile endpoint now returns nested object
structure instead of flat fields.

Migration:
- Update client code to access user.profile.name
- Update all API consumers to use new nested structure
- Run migration script to transform existing data

Deprecates: Direct field access, removed in v2.0.0
```

### Breaking Change with Exclamation

Use '!' after type/scope to indicate breaking change:
```
feat!: remove deprecated authentication method
fix(api)!: change error response format
refactor(core)!: replace legacy data store
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
Co-Authored-By: Claude <noreply@anthropic.com>
```

### Single Contributor

```
feat: add new feature

Implementation details here.

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Multiple Contributors

```
feat: implement collaborative feature

This feature was developed through collaborative effort
with contributions from multiple team members.

Technical details:
- Component A developed by Alice
- Component B developed by Bob
- Integration and testing by Carlos

Co-Authored-By: Alice Chen <alice@company.com>
Co-Authored-By: Bob Smith <bob@company.com>
Co-Authored-By: Claude <noreply@anthropic.com>
```

## Performance Commits

### Performance Optimization

```
perf: optimize database query performance

Reduce query execution time by 40% through strategic indexing
and query restructuring.

Before: Average 250ms per user profile load
After: Average 150ms per user profile load

Impact: Improves user experience, reduces server load

Testing:
- Benchmark with 10k concurrent users
- Memory usage reduced by 15%
- CPU utilization improved by 25%

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Memory Optimization

```
perf: reduce memory footprint in data pipeline

Implement streaming data processing to reduce memory usage
during large file operations.

Before: Peak memory usage of 2GB for 100MB files
After: Peak memory usage of 200MB for 100MB files

Impact: Enables processing larger files on smaller instances

Testing: Verified with 1GB+ files without OOM errors

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Best Practices

### Commit Type Selection

Choose the most specific type:
- `feat` for new features
- `fix` for bug fixes
- `docs` for documentation only
- `style` for formatting (no functional change)
- `refactor` for restructuring (no functional change)
- `perf` for performance improvements
- `test` for adding/updating tests
- `chore` for maintenance tasks

### Scope Guidelines

Use scope to indicate the area affected:
```
feat(auth): add OAuth2 support
fix(api): resolve rate limiting bug
docs(readme): update installation instructions
```

Omit scope if changes affect multiple areas or scope is unclear.

### Body Content Guidelines

- Explain **what** and **why**, not **how**
- Use present tense ("Add feature" not "Added feature")
- Wrap lines at 72 characters
- Use bullet points for lists
- Include testing notes for non-trivial changes
- Reference issues when applicable
