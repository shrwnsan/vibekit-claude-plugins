#!/usr/bin/env bash
# classify-branches.sh — read-only branch + worktree hygiene classifier.
# NEVER mutates: no delete, no push, no prune. Prints verdict lines:
#   <verdict>	<kind>	<ref-or-path>	<evidence>
# Verdicts: merged-ancestry merged-content remote-gone stale-base superseded
#           unmerged active worktree-prunable worktree-clean-merged
#           worktree-dirty orphan-dir
set -euo pipefail

MAIN="${1:-}"
[ -z "$MAIN" ] && { git show-ref --verify --quiet refs/heads/main && MAIN=main || MAIN=master; }
git show-ref --verify --quiet "refs/heads/$MAIN" || { echo "error: mainline '$MAIN' not found" >&2; exit 2; }

# --- helpers ---------------------------------------------------------------

merged_ancestry() {  # $1 = ref
  git merge-base --is-ancestor "$1" "refs/heads/$MAIN" 2>/dev/null
}

cherry_clean() {  # $1 = ref; true if every unique commit's patch exists on mainline
  [ -z "$(git cherry "$MAIN" "$1" | grep '^+')" ]
}

squash_evidence() {  # $1 = ref; prints matching mainline squash commits or empty
  local subj pr
  while read -r subj; do
    [ -z "$subj" ] && continue
    pr=$(git log "$MAIN" --oneline --grep="$subj" | head -1)
    [ -n "$pr" ] && echo "$pr"
  done < <(git log "$MAIN..$1" --format='%s' | head -20)
}

content_landed() {  # $1 = ref; true if branch's key non-docs files all exist on mainline
  local f found=0
  while IFS= read -r f; do
    found=$((found+1))
    git cat-file -e "refs/heads/$MAIN:$f" 2>/dev/null || return 1
  done < <(git diff --name-only "$MAIN...$1" | grep -vE '(^docs/|\.md$)' | head -3)
  # docs-only (or empty) diff carries no content evidence — caller must pair with squash_evidence
  [ "$found" -gt 0 ]
}

mainline_newer() {  # $1 = ref; true if mainline's copy of touched files diverged from branch's
  local f newer=0 same=0
  while IFS= read -r f; do
    git cat-file -e "refs/heads/$MAIN:$f" 2>/dev/null || continue
    if git diff --quiet "$1" "$MAIN" -- "$f" 2>/dev/null; then same=$((same+1)); else newer=$((newer+1)); fi
  done < <(git diff --name-only "$MAIN...$1" | head -5)
  [ "$newer" -gt 0 ] && [ "$newer" -ge "$same" ]
}

# --- branches ---------------------------------------------------------------

for b in $(git for-each-ref --format='%(refname:short)' refs/heads/ | grep -vx "$MAIN"); do
  # a branch checked out in a worktree is never auto-delete material, whatever its merge state
  wt=$(git worktree list --porcelain | awk -v ref="refs/heads/$b" '/^worktree /{path=substr($0,10)} $0=="branch "ref{print path; exit}')
  if merged_ancestry "$b"; then
    if [ -n "$wt" ]; then
      echo -e "active\tbranch\t$b\tancestor of $MAIN but checked out in worktree: $wt"
    else
      echo -e "merged-ancestry\tbranch\t$b\tancestor of $MAIN"
    fi
    continue
  fi
  # remote-gone: upstream deleted
  up=$(git for-each-ref --format='%(upstream:track)' "refs/heads/$b")
  if [[ "$up" == *"gone"* ]]; then
    # still check content before endorsing deletion
    if cherry_clean "$b" || { [ -n "$(squash_evidence "$b")" ] && content_landed "$b"; }; then
      echo -e "remote-gone\tbranch\t$b\tupstream deleted AND content resolved"
    else
      echo -e "unmerged\tbranch\t$b\tupstream gone but unique commits remain: $(git rev-list --count "$MAIN..$b") ahead"
    fi
    continue
  fi
  if cherry_clean "$b"; then
    echo -e "merged-ancestry\tbranch\t$b\tall patches present on $MAIN (cherry)"
    continue
  fi
  if [ -n "$(squash_evidence "$b")" ] && content_landed "$b"; then
    if mainline_newer "$b"; then
      echo -e "superseded\tbranch\t$b\tcontent landed ($(squash_evidence "$b" | head -1)) and $MAIN evolved past it"
    else
      echo -e "merged-content\tbranch\t$b\t$(squash_evidence "$b" | head -1)"
    fi
    continue
  fi
  if [ -n "$(squash_evidence "$b")" ] && content_landed "$b" && mainline_newer "$b"; then
    echo -e "stale-base\tbranch\t$b\tfiles exist on $MAIN but diverged; merging may regress"
  else
    echo -e "unmerged\tbranch\t$b\t$(git rev-list --count "$MAIN..$b") unique commits: $(git log "$MAIN..$b" --oneline | head -1)"
  fi
done

# --- remote branches without locals -----------------------------------------

for rb in $(git for-each-ref --format='%(refname:short)' refs/remotes/origin/ | grep -vxE 'origin|origin/HEAD'); do
  short="${rb#origin/}"
  git show-ref --verify --quiet "refs/heads/$short" && continue
  if merged_ancestry "$rb"; then
    echo -e "merged-ancestry\tremote\t$rb\tancestor of $MAIN"
  elif [ -n "$(squash_evidence "$rb")" ] && content_landed "$rb"; then
    echo -e "merged-content\tremote\t$rb\t$(squash_evidence "$rb" | head -1)"
  else
    echo -e "unmerged\tremote\t$rb\t$(git rev-list --count "$MAIN..$rb" | awk '{print $1}') unique commits (no local copy)"
  fi
done

# --- worktrees ---------------------------------------------------------------

while IFS=$'\t' read -r path head branch; do
  [ -d "$path" ] || { echo -e "worktree-prunable\tworktree\t$path\tdirectory missing (git worktree prune)"; continue; }
  dirty=$(git -C "$path" status --porcelain | head -1)
  if [ -n "$dirty" ]; then
    echo -e "worktree-dirty\tworktree\t$path\tuncommitted changes — never touch"
    continue
  fi
  ref="${branch#refs/heads/}"
  if [ -z "$branch" ]; then ref="$head"; fi
  if merged_ancestry "$head"; then
    echo -e "worktree-clean-merged\tworktree\t$path\tHEAD $head contained in $MAIN, tree clean"
  elif cherry_clean "$head" || { [ -n "$(squash_evidence "$head")" ] && content_landed "$head"; }; then
    echo -e "worktree-clean-merged\tworktree\t$path\tHEAD $head content-resolved, tree clean"
  else
    echo -e "worktree-unmerged\tworktree\t$path\tunique work at $ref — never touch"
  fi
done < <(git worktree list --porcelain | awk '
  /^worktree / { path = substr($0, 10) }
  /^HEAD /     { head = $2 }
  /^branch /   { branch = $2 }
  /^$/         { if (path != "") { print path "\t" head "\t" branch; path=""; head=""; branch="" } }
  END          { if (path != "") print path "\t" head "\t" branch }')

# --- orphaned worktree-looking directories -----------------------------------

for d in .worktrees .claude/worktrees ../worktrees; do
  [ -d "$d" ] || continue
  for sub in "$d"/*/; do
    [ -d "$sub" ] || continue
    [ -f "$sub/.git" ] || continue
    # registered under this repo? (compare canonical paths)
    if ! git worktree list --porcelain | grep -qF "$(cd "$sub" && pwd -P)"; then
      echo -e "orphan-dir\tworktree\t$sub\tcontains .git file but not registered"
    fi
  done
done
