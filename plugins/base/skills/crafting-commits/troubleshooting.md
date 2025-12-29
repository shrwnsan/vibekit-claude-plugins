# Troubleshooting & Recovery

This document provides solutions for common Git issues and recovery procedures for failed commits.

## Common Issues

### Git Repository Issues
- **Problem**: Not inside a Git repository or `git` is not initialized.
- **Solution**: Run `git init` to initialize a new repository, or navigate to the correct directory.
- **Validation**: Check for a `.git` directory by running `ls -la .git`.

### No Staged Changes
- **Problem**: Attempting to commit with no changes staged.
- **Solution**: Run `git add .` to stage all changes, or `git add <file>` to stage specific files.
- **Validation**: Run `git status` and look for files under the "Changes to be committed" section.

### Commit Conflicts
- **Problem**: Merge conflicts prevent a commit or push from completing.
- **Solution**: Follow the standard conflict resolution workflow:
  1. Run `git status` to identify files with conflicts.
  2. Open the conflicted files and manually resolve the differences.
  3. Stage the resolved files using `git add <resolved-file>`.
  4. Run `git commit` to finalize the merge.

### Attribution Format Errors
- **Problem**: The `Co-Authored-By` line has an incorrect format.
- **Solution**: Ensure the format is exactly `Co-Authored-By: Name <email@example.com>`. Check for special characters or incorrect email formatting.

### Missing Breaking Change Indicator
- **Problem**: A breaking change was introduced, but the commit message does not reflect it.
- **Solution**: Add a `!` after the commit type/scope (e.g., `feat(api)!: ...`) and include a `BREAKING CHANGE:` footer in the body.

## Recovery Procedures

### Failed Commit Recovery
If a commit fails mid-process, your changes should still be staged.
```bash
# 1. Check the status to see what's staged
git status

# 2. If changes are still staged, try committing again
git commit -m "feat: your commit message"

# 3. If you lose your changes, use the reflog to find them
git reflog
git reset --hard HEAD@{1} # Resets to the state before the failed commit
```

### Amending a Commit Message
If you made a mistake in the last commit message:
```bash
# If you have NOT pushed the commit yet
git commit --amend

# If you HAVE pushed the commit (use with caution)
git commit --amend
git push --force-with-lease origin <branch-name>
```
