---
name: branch-hygiene
description: Classify and clean up merged, stale, and orphaned git branches and worktrees. Detects squash-merges that git branch --merged cannot see, stale worktrees, and remote-gone branches. Use when user asks to clean up branches, prune worktrees, tidy the repo, or perform git housekeeping.
user-invocable: true
allowed-tools:
  - bash(git:*)
  - bash(sh:*)
  - bash(bash:*)
  - Read
---

# Branch & Worktree Hygiene

Classifies every local/remote branch and worktree against the mainline, then
cleans up what is resolved. Never guesses — every deletion is backed by a
verified verdict.

## The core problem

`git branch --merged` is **useless in squash-merge workflows**: it reports
nothing mergeable even when branches are fully resolved (content landed via
squashed PRs). The only reliable test is content-level: PR-number log matching,
file presence, and feature greps.

## Workflow

1. **Classify** — run the read-only classifier:
   ```bash
   sh <skill-dir>/scripts/classify-branches.sh [mainline-ref]
   ```
   Default mainline: `main` (falls back to `master`). Emits one line per item:
   `<verdict>	<kind>	<ref-or-path>	<evidence>`

2. **Verify** — the classifier's output is *evidence, not authority*. Before
   acting on any verdict, spot-check it: open the cited PR commit, diff the
   named files, confirm the feature grep. Classifiers hallucinate less than
   models but more than never.

3. **Act per tier**:

   | Verdict | Action | Confirmation |
   |---|---|---|
   | `merged-ancestry` / `merged-content` (branch) | `git branch -D` | none (reflog recovers) |
   | `remote-gone` (local branch, upstream deleted) | `git branch -D` + remove any worktree | none |
   | `stale-base` (branch predates mainline; merging would regress) | surface to user | user decides |
   | `superseded` (content landed, mainline evolved past it) | surface to user | user decides |
   | `unmerged` (genuinely unique commits) | surface to user, never delete | user decides |
   | `worktree-prunable` (directory gone, registry entry remains) | `git worktree prune` | none (metadata only) |
   | `worktree-clean-merged` (clean tree, branch resolved) | `git worktree remove` | **always confirm** (deletes a directory) |
   | `worktree-dirty` / `worktree-unmerged` | never touch | — |
   | `orphan-dir` (looks like a worktree, not registered) | surface, move with `trash` on confirm | user decides |

4. **Remote branches** — deleting `origin/*` refs is outward-facing: list them
   with verdicts, delete only after explicit user approval, in one batch push.

## Squash-merge detection (how the classifier thinks)

For each branch not mergeable by ancestry:
1. Extract its commit subjects; grep mainline log for the same subjects with
   `(#N)` suffixes — squash-merges preserve the subject.
2. Check file presence: key files the branch adds, present on mainline?
3. Feature greps: distinctive strings from the branch's diff, present in
   mainline's version of those files?
All three hit → `merged-content`. Content present but mainline's copy is
larger/newer → `superseded`. Diff would *remove* lines mainline has → `stale-base`.

## Worktree specifics

- `git worktree list --porcelain` is the source of truth; each entry's `branch`
  or detached `HEAD` gets the same verdict engine as free branches.
- Detached-HEAD worktrees: verdict keyed on the commit — `merged-ancestry`
  if contained in mainline and tree is clean.
- Tool-created worktrees (e.g. `.claude/worktrees/`) are included; their
  auto-cleanup is best-effort, this is the backstop.

## Hard rules

- The classifier script is **read-only** — it never deletes, pushes, or prunes.
- Dirty worktrees and `unmerged` refs are never modified, only reported.
- `git worktree remove` and remote ref deletion always require user confirmation.
- Use `trash`, never `rm -rf`, for orphaned directories.
