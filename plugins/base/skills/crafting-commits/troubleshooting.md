# Troubleshooting & Recovery

This reference provides solutions for common git issues and recovery procedures when things go wrong.

## Common Issues and Solutions

### Git Repository Issues

**Problem**: Not in a git repository or git not initialized

**Symptoms**:
```
fatal: not a git repository (or any of the parent directories): .git
```

**Solution**:
```bash
# Initialize new repository
git init

# Or navigate to existing repository
cd path/to/repository
```

**Verification**:
```bash
# Check .git directory exists
ls -la .git

# Verify git status
git status
```

### No Staged Changes

**Problem**: No changes staged for commit

**Symptoms**:
```
fatal: There is nothing to commit
```

**Solution**:
```bash
# Stage all changes
git add .

# Stage specific files
git add path/to/file

# Stage interactively
git add -i
```

**Verification**:
```bash
# Verify staged changes
git status

# Should show "Changes to be committed"
```

### Commit Conflicts

**Problem**: Merge conflicts during commit or push

**Symptoms**:
```
CONFLICT (content): Merge conflict in file.txt
Automatic merge failed; fix conflicts and then commit the result.
```

**Solution**:
```bash
# 1. Check status to identify conflicted files
git status

# 2. Edit files to resolve conflicts
# Look for: <<<<<<<, =======, >>>>>>>
# Remove conflict markers and choose content

# 3. Mark files as resolved
git add resolved/file

# 4. Complete the merge
git commit
```

**Prevention**:
```bash
# Pull before push
git pull --rebase origin main

# Or fetch and rebase manually
git fetch origin
git rebase origin/main
```

### Attribution Format Errors

**Problem**: Incorrect Co-Authored-By format

**Symptoms**:
```
Author identity unknown
*** Please tell me who you are.
```

**Solution**:
```bash
# Configure git user
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Or use --global flag for all repositories
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

**Correct Attribution Format**:
```
Co-Authored-By: Name <email@example.com>
```

**Common Mistakes**:
- Missing angle brackets: `Co-Authored-By: Name email@example.com`
- Invalid email characters: `Co-Authored-By: Name <email at example.com>`
- Missing space: `Co-Authored-By:Name <email@example.com>`

### Breaking Change Identification

**Problem**: Missing breaking change indicators

**Solution**:
Add '!' before colon in commit type or scope:
```
feat!: remove deprecated authentication method
fix(api)!: change error response format
```

Include BREAKING CHANGE footer:
```
feat: update user endpoint

BREAKING CHANGE: User profile endpoint structure changed.

Migration: Update client code to use new nested format.
```

## Recovery Procedures

### Failed Commit Recovery

**Scenario**: Commit failed but changes are still staged

**Recovery**:
```bash
# Check if commit was attempted
git status

# If commit failed but changes are staged
git commit -m "recovery: fix failed commit attempt"

# If you want to retry with corrected message
git commit -m "corrected: commit message here"
```

**Scenario**: Commit message was incorrect

**Recovery**:
```bash
# Edit last commit message
git commit --amend

# This opens editor to modify message
# Save and close to update commit
```

**Scenario**: Need to add forgotten file to last commit

**Recovery**:
```bash
# Stage the forgotten file
git add forgotten-file.txt

# Amend the last commit
git commit --amend --no-edit
```

### Commit Message Recovery

**Scenario**: Edit last commit message

**Recovery**:
```bash
# Edit last commit message
git commit --amend

# Or specify new message directly
git commit --amend -m "new corrected message"
```

**Scenario**: Already pushed and need to amend

**Recovery**:
```bash
# Amend the commit
git commit --amend -m "corrected message"

# Force push (use with caution!)
git push --force-with-lease origin branch-name

# Note: --force-with-lease is safer than --force
```

**Warning**: Force pushing rewrites history and can cause issues for collaborators. Only use this on your own branches or with team coordination.

### Lost Changes Recovery

**Scenario**: Changes were lost, check reflog

**Recovery**:
```bash
# Check reflog for recent operations
git reflog

# Find the commit you want to restore (e.g., HEAD@{1})
# Reset to that commit
git reset --hard HEAD@{1}

# Or reset to specific commit hash
git reset --hard abc123def
```

**Scenario**: Accidentally deleted important commit

**Recovery**:
```bash
# Find the lost commit in reflog
git reflog --all

# Cherry-pick the lost commit
git cherry-pick <commit-hash>

# Or create branch from that commit
git branch recovery-branch <commit-hash>
```

### Merge Conflict Recovery

**Scenario**: Want to abort merge and start over

**Recovery**:
```bash
# Abort the merge
git merge --abort

# Or reset to before merge
git reset --hard HEAD

# Then try again
git pull origin main
```

**Scenario**: Resolved conflicts but want to re-resolve

**Recovery**:
```bash
# Reset conflicted files
git reset --hard HEAD

# Start merge again
git merge branch-name
```

## System Requirements

**Required Dependencies**:
- Git version 2.25.0 or higher
- Bash shell access
- Standard Unix tools (ls, grep, etc.)

**Verification**:
```bash
git --version    # Should be >= 2.25.0
bash --version   # Verify bash access
```

## Additional Help Resources

**Git Documentation**:
- Official git docs: https://git-scm.com/doc
- Git reference manual: https://git-scm.com/docs

**Conventional Commits**:
- Specification: https://www.conventionalcommits.org/
- Utilities: https://github.com/conventional-changelog/commitlint

**Common Git Issues**:
- Stack Overflow: https://stackoverflow.com/questions/tagged/git
- Git Issues: https://github.com/git/git/issues
