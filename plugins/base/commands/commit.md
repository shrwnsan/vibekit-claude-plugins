---
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git commit:*), Bash(git diff:*), Bash(git log:*)
argument-hint: [optional-message]
description: Create a git commit with intelligent message drafting
model: inherit
---

# Git Commit Creation

## Your task

Create a git commit following this workflow:

### Step 1: Analysis
First, run these commands to understand the current state:
1. Check git status
2. Review all changes (staged and unstaged)
3. Check recent commit style

Then:
1. Review all changes (staged and unstaged)
2. Identify change patterns and complexity level
3. Check for potential breaking changes
4. Match commit style with recent commits

### Step 2: Determine Complexity Route
**Route A (Simple)** - For changes matching these patterns:
- Documentation updates (`docs:`)
- Style/formatting fixes (`style:`)
- Simple bug fixes (`fix:`)
- Chore/maintenance (`chore:`)
- Test additions/updates (`test:`)

**Route B (Complex)** - For changes requiring:
- Feature additions (`feat:`)
- Refactoring (`refactor:`)
- Performance improvements (`perf:`)
- Breaking changes (with exclamation mark)
- Detailed explanations needed

### Step 3: Execute Route

#### Route A: Simple Commit (autonomous)
1. Stage relevant unstaged changes
2. Create commit message following conventional format
3. Execute commit
4. Verify success

#### Route B: Complex Commit (with intelligent analysis)
1. **Analyze changes**: Determine commit type and scope based on actual changes
2. **Check for breaking changes**: Identify API changes, removed features, or incompatible modifications
3. **Show files to be committed**: List specific files that will be included in this commit
4. **Propose commit details**:
   - Recommend commit type (feat, fix, refactor, etc.)
   - Identify if breaking changes exist and need highlighting
   - Suggest scope if applicable
5. **Ask user**: "I recommend [type] for these files: [file list]. [Breaking/No breaking] changes detected. Should I proceed?"
6. Stage relevant unstaged changes
7. Create detailed commit message with body and proper breaking change formatting
8. **Ask user**: "Please review the commit message above. Should I proceed with this commit?"
9. Execute commit
10. Verify success

### Step 4: Quality Checks
Always ensure:
- Subject line under 50 characters, imperative mood
- Proper conventional commit format
- No secrets committed (.env, credentials.json, etc.)

## Custom Message Support
If user provided arguments, incorporate their message while maintaining conventional commit format and quality standards.

## Final Output
Show:
- Commit message that was used
- Files that were committed
- Git status after commit
- Next step suggestions