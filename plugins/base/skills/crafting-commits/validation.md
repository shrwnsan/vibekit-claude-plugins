# Commit Validation Checklists

This file provides detailed validation checklists for different levels of commit complexity.

## Level 1 Validation (Simple Commits)
- [ ] Subject line under 50 characters
- [ ] Commit type matches change nature (e.g., fix, docs, chore)
- [ ] Basic formatting follows conventional standards
- [ ] Imperative mood used in the subject line (e.g., "Add," "Fix," "Update")

## Level 2 Validation (Complex Commits)
- [ ] All Level 1 checks passed
- [ ] Scope accurately reflects the changed areas (e.g., `feat(auth): ...`)
- [ ] The body clearly explains what was changed and why
- [ ] Related issues are properly referenced (e.g., `Fixes #123`)
- [ ] No unintentional breaking changes are introduced

## Level 3 Validation (Critical/Breaking Changes)
- [ ] All Level 2 checks passed
- [ ] Breaking changes are clearly identified with a `!` after the type/scope (e.g., `refactor(api)!: ...`)
- [ ] The commit body includes a `BREAKING CHANGE:` footer with a clear description of the change and migration instructions
- [ ] The impact and risk of the change have been carefully assessed
- [ ] User approval has been explicitly obtained before committing

## Pre-Commit Quick Check
**Always complete before running `git commit`:**
- [ ] Changes have been reviewed with `git diff --staged`
- [ ] The commit type matches the nature of the changes
- [ ] The subject line is under 50 characters and uses the imperative mood
- [ ] Any breaking changes are properly marked with `!` and documented

## Post-Commit Verification
**Run these commands after committing to ensure correctness:**
```bash
# Verify the latest commit appears as expected
git log --oneline -1

# Check the files and statistics of the latest commit
git show --stat

# Verify that any issue references are working (if applicable)
git log --grep="Fixes"
```
