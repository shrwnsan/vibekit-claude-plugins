#!/bin/sh
# classify-branches.sh — read-only branch + worktree hygiene classifier.
# NEVER mutates: no delete, no push, no prune. Prints verdict lines:
#   <verdict>	<kind>	<ref-or-path>	<evidence>
# Verdicts: merged-ancestry merged-content remote-gone stale-base superseded
#           unmerged active worktree-prunable worktree-clean-merged
#           worktree-dirty orphan-dir
# POSIX sh: run with `sh classify-branches.sh` or `bash classify-branches.sh`.
set -eu

cd "$(git rev-parse --show-toplevel)"   # anchor relative orphan-dir scan to repo root

MAIN="${1:-}"
[ -z "$MAIN" ] && { git show-ref --verify --quiet refs/heads/main && MAIN=main || MAIN=master; }
git show-ref --verify --quiet "refs/heads/$MAIN" || { echo "error: mainline '$MAIN' not found" >&2; exit 2; }

TAB=$(printf '\t')

# --- helpers ---------------------------------------------------------------

merged_ancestry() {  # $1 = ref
  git merge-base --is-ancestor "$1" "refs/heads/$MAIN" 2>/dev/null
}

cherry_clean() {  # $1 = ref; true if every unique commit's patch exists on mainline
  [ -z "$(git cherry "$MAIN" "$1" | grep '^+')" ]
}

squash_evidence() {  # $1 = ref; prints matching mainline squash commits or empty
  git log "$MAIN..$1" --format='%s' | head -20 | while IFS= read -r subj; do
    [ -n "$subj" ] || continue
    git log "$MAIN" --oneline --grep="$subj" | head -1
  done
  return 0   # never propagate the loop's status — callers cache us in bare assignments under set -e
}

content_landed() {  # $1 = ref; true if branch's key non-docs files all exist on mainline
  tmp=$(mktemp)
  git diff --name-only "$MAIN...$1" | grep -vE '(^docs/|\.md$)' | head -3 > "$tmp"
  found=0
  rc=0
  while IFS= read -r f; do
    found=$((found+1))
    git cat-file -e "refs/heads/$MAIN:$f" 2>/dev/null || { rc=1; break; }
  done < "$tmp"
  rm -f "$tmp"
  # docs-only (or empty) diff carries no content evidence — caller must pair with squash_evidence
  [ "$found" -gt 0 ] && [ "$rc" -eq 0 ]
}

mainline_newer() {  # $1 = ref; true if mainline's copy of touched files diverged from branch's
  tmp=$(mktemp)
  git diff --name-only "$MAIN...$1" | head -5 > "$tmp"
  newer=0
  same=0
  while IFS= read -r f; do
    git cat-file -e "refs/heads/$MAIN:$f" 2>/dev/null || continue
    if git diff --quiet "$1" "$MAIN" -- "$f" 2>/dev/null; then
      same=$((same+1))
    else
      newer=$((newer+1))
    fi
  done < "$tmp"
  rm -f "$tmp"
  [ "$newer" -gt 0 ] && [ "$newer" -ge "$same" ]
}

# --- branches ---------------------------------------------------------------

for b in $(git for-each-ref --format='%(refname:short)' refs/heads/ | grep -vx "$MAIN"); do
  # a branch checked out in a worktree is never auto-delete material, whatever its merge state
  wt=$(git worktree list --porcelain | awk -v ref="refs/heads/$b" '/^worktree /{path=substr($0,10)} $0=="branch "ref{print path; exit}')
  if merged_ancestry "$b"; then
    if [ -n "$wt" ]; then
      printf 'active\tbranch\t%s\tancestor of %s but checked out in worktree: %s\n' "$b" "$MAIN" "$wt"
    else
      printf 'merged-ancestry\tbranch\t%s\tancestor of %s\n' "$b" "$MAIN"
    fi
    continue
  fi
  # remote-gone: upstream deleted
  up=$(git for-each-ref --format='%(upstream:track)' "refs/heads/$b")
  case "$up" in
  *gone*)
    # still check content before endorsing deletion
    if cherry_clean "$b" || { [ -n "$(squash_evidence "$b")" ] && content_landed "$b"; }; then
      printf 'remote-gone\tbranch\t%s\tupstream deleted AND content resolved\n' "$b"
    else
      printf 'unmerged\tbranch\t%s\tupstream gone but unique commits remain: %s ahead\n' "$b" "$(git rev-list --count "$MAIN..$b")"
    fi
    continue
    ;;
  esac
  if cherry_clean "$b"; then
    printf 'merged-ancestry\tbranch\t%s\tall patches present on %s (cherry)\n' "$b" "$MAIN"
    continue
  fi
  ev=$(squash_evidence "$b")
  if [ -n "$ev" ] && content_landed "$b"; then
    if mainline_newer "$b"; then
      printf 'superseded\tbranch\t%s\tcontent landed (%s) and %s evolved past it\n' "$b" "$(echo "$ev" | head -1)" "$MAIN"
    else
      printf 'merged-content\tbranch\t%s\t%s\n' "$b" "$(echo "$ev" | head -1)"
    fi
    continue
  fi
  printf 'unmerged\tbranch\t%s\t%s unique commits: %s\n' "$b" "$(git rev-list --count "$MAIN..$b")" "$(git log "$MAIN..$b" --oneline | head -1)"
done

# --- remote branches without locals (origin only — known limitation) --------

if git remote get-url origin >/dev/null 2>&1; then
for rb in $(git for-each-ref --format='%(refname:short)' refs/remotes/origin/ | grep -vxE 'origin|origin/HEAD'); do
  short="${rb#origin/}"
  git show-ref --verify --quiet "refs/heads/$short" && continue
  if merged_ancestry "$rb"; then
    printf 'merged-ancestry\tremote\t%s\tancestor of %s\n' "$rb" "$MAIN"
  elif [ -n "$(squash_evidence "$rb")" ] && content_landed "$rb"; then
    printf 'merged-content\tremote\t%s\t%s\n' "$rb" "$(squash_evidence "$rb" | head -1)"
  else
    printf 'unmerged\tremote\t%s\t%s unique commits (no local copy)\n' "$rb" "$(git rev-list --count "$MAIN..$rb")"
  fi
done
fi

# --- worktrees ---------------------------------------------------------------

wtlist=$(git worktree list --porcelain | awk '
  /^worktree / { path = substr($0, 10) }
  /^HEAD /     { head = $2 }
  /^branch /   { branch = $2 }
  /^$/         { if (path != "") { print path "\t" head "\t" branch; path=""; head=""; branch="" } }
  END          { if (path != "") print path "\t" head "\t" branch }')
printf '%s\n' "$wtlist" | while IFS="$TAB" read -r path head branch; do
  [ -n "$path" ] || continue
  [ -d "$path" ] || { printf 'worktree-prunable\tworktree\t%s\tdirectory missing (git worktree prune)\n' "$path"; continue; }
  dirty=$(git -C "$path" status --porcelain | head -1)
  if [ -n "$dirty" ]; then
    printf 'worktree-dirty\tworktree\t%s\tuncommitted changes — never touch\n' "$path"
    continue
  fi
  ref="${branch#refs/heads/}"
  if [ -z "$branch" ]; then ref="$head"; fi
  if merged_ancestry "$head"; then
    printf 'worktree-clean-merged\tworktree\t%s\tHEAD %s contained in %s, tree clean\n' "$path" "$head" "$MAIN"
  elif cherry_clean "$head" || { [ -n "$(squash_evidence "$head")" ] && content_landed "$head"; }; then
    printf 'worktree-clean-merged\tworktree\t%s\tHEAD %s content-resolved, tree clean\n' "$path" "$head"
  else
    printf 'worktree-unmerged\tworktree\t%s\tunique work at %s — never touch\n' "$path" "$ref"
  fi
done

# --- orphaned worktree-looking directories -----------------------------------

for d in .worktrees .claude/worktrees ../worktrees; do
  [ -d "$d" ] || continue
  for sub in "$d"/*/; do
    [ -d "$sub" ] || continue
    [ -f "$sub/.git" ] || continue
    # registered under this repo? (compare canonical paths)
    if ! git worktree list --porcelain | grep -qF "$(cd "$sub" && pwd -P)"; then
      printf 'orphan-dir\tworktree\t%s\tcontains .git file but not registered\n' "$sub"
    fi
  done
done
