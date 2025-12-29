# Validation Checklists

This reference provides detailed validation checklists for each freedom level. Use these to ensure commit message quality before execution.

## Level 1 Validation (Simple Commits)

**Use for:** fix, docs, style, chore commits (autonomous execution)

### Pre-Commit Checklist
- [ ] Subject line under 50 characters
- [ ] Commit type matches change nature
- [ ] Subject uses imperative mood (Add, Fix, Update, not "Added" or "Fixes")
- [ ] No period at end of subject line
- [ ] Basic formatting follows conventional standards
- [ ] Changes reviewed with `git diff --staged`

### Validation Commands
```bash
git log --oneline -1    # Verify commit appears
git show --stat         # Check files and statistics
```

## Level 2 Validation (Complex Changes)

**Use for:** feat, refactor, perf commits (validation required)

### All Level 1 Checks Plus:
- [ ] Scope accurately reflects changes (if used)
- [ ] Body explains what changed and why
- [ ] Body lines wrapped at 72 characters
- [ ] Related issues properly referenced (Fixes #123, Closes #45)
- [ ] Breaking changes mentioned if applicable

### User Confirmation Points
Ask the user before committing:
1. "Is this commit type correct for the changes?"
2. "Does this scope accurately reflect the modified areas?"
3. "Are there any breaking changes not mentioned?"
4. "Is the attribution correct for this collaboration?"

### Validation Commands
```bash
git log --oneline -1       # Verify commit appears
git show --stat            # Check files and statistics
git log --grep="Fixes"     # Verify issue references work
```

## Level 3 Validation (Critical Changes)

**Use for:** Breaking changes, architectural decisions (explicit approval required)

### All Level 2 Checks Plus:
- [ ] Breaking changes clearly identified with '!' in type/scope
- [ ] BREAKING CHANGE section included in body
- [ ] Migration considerations documented
- [ ] Impact assessment completed
- [ ] Deprecation warnings included if applicable
- [ ] Rollback procedures documented if needed

### User Confirmation Points
Ask the user before committing:
1. "Are you sure this breaking change is necessary?"
2. "Have all affected consumers been notified?"
3. "Is the migration guide complete?"
4. "Have you considered backwards compatibility?"
5. "Is the attribution correct for this collaboration?"

### Validation Commands
```bash
git log --oneline -1              # Verify commit appears
git show --stat                   # Check files and statistics
git log --grep="BREAKING"         # Verify breaking change notices
git log --grep="Fixes"            # Verify issue references work
```

## Pre-Commit Validation (All Levels)

**Always Complete These Checks:**
- [ ] Changes reviewed with `git diff --staged`
- [ ] Commit type matches change nature
- [ ] Subject line under 50 characters, imperative mood
- [ ] Breaking changes properly identified with '!'
- [ ] Related issues referenced correctly (Fixes #123, Closes #45)
- [ ] Attribution lines formatted correctly

## Conventional Commit Types Reference

- **feat**: New features or functionality
- **fix**: Bug fixes and corrections
- **docs**: Documentation changes only
- **style**: Code formatting changes (no functional impact)
- **refactor**: Code restructuring without functional changes
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Maintenance tasks, dependency updates

## Formatting Standards

- **Subject Line**: Max 50 characters, imperative mood, no period
- **Body Lines**: Max 72 characters, present tense
- **Empty Line**: Blank line between subject and body
- **Bullet Points**: Use hyphens or asterisks for lists
- **Breaking Changes**: Use '!' after type/scope, add BREAKING CHANGE footer
