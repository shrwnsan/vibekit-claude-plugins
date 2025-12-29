#!/usr/bin/env bash
#
# analyze_changes.sh - Analyze staged changes for commit drafting
#
# Usage:
#   ./scripts/analyze_changes.sh
#

set -euo pipefail

# Colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}=== Analyzing Staged Changes ===${NC}\n"

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}Error: Not in a git repository${NC}"
    exit 1
fi

# Check if there are staged changes
if ! git diff --cached --quiet; then
    echo -e "${GREEN}✓ Staged changes found${NC}\n"
else
    echo -e "${YELLOW}⚠ No staged changes found${NC}"
    echo "Stage changes with: git add ."
    exit 0
fi

# Get list of changed files
FILES=$(git diff --cached --name-only --diff-filter=ACM)
FILE_COUNT=$(echo "$FILES" | wc -l | tr -d ' ')

echo -e "${BLUE}Files changed: ${FILE_COUNT}${NC}\n"

# Categorize files by type
declare -A CATEGORIES
CATEGORIES[docs]=0
CATEGORIES[src]=0
CATEGORIES[test]=0
CATEGORIES[config]=0
CATEGORIES[build]=0
CATEGORIES[other]=0

declare -a FILE_LIST
declare -a EXTENSIONS

while IFS= read -r file; do
    if [[ -n "$file" ]]; then
        FILE_LIST+=("$file")

        # Get file extension
        ext="${file##*.}"
        EXTENSIONS+=("$ext")

        # Categorize by file type
        case "$file" in
            *.md|*.txt|*.rst|docs/*)
                ((CATEGORIES[docs]++))
                ;;
            *.ts|*.js|*.py|*.go|*.rs|*.java|*.c|*.cpp|*.h|src/*)
                ((CATEGORIES[src]++))
                ;;
            *.test.*|*.spec.*|*test*.ts|*test*.py|tests/*)
                ((CATEGORIES[test]++))
                ;;
            *.json|*.yaml|*.yml|*.toml|*.ini|*.cfg|config/*)
                ((CATEGORIES[config]++))
                ;;
            *Makefile|*.cmake|CMakeLists.txt|*.gradle|build.xml|build/*)
                ((CATEGORIES[build]++))
                ;;
            *)
                ((CATEGORIES[other]++))
                ;;
        esac
    fi
done <<< "$FILES"

# Show category breakdown
echo -e "${BLUE}File Categories:${NC}"
for cat in "${!CATEGORIES[@]}"; do
    count=${CATEGORIES[$cat]}
    if [[ $count -gt 0 ]]; then
        echo -e "  ${CYAN}$cat:${NC} $count files"
    fi
done

# Show changed files
echo -e "\n${BLUE}Changed Files:${NC}"
for file in "${FILE_LIST[@]}"; do
    # Get change stats for this file
    stats=$(git diff --cached --numstat "$file" 2>/dev/null | awk '{print "+"$1" -"$2}')
    if [[ -n "$stats" ]]; then
        echo -e "  ${CYAN}•${NC} $file ${GREEN}($stats)${NC}"
    else
        echo -e "  ${CYAN}•${NC} $file"
    fi
done

# Analyze changes to suggest commit type
echo -e "\n${BLUE}Suggested Commit Type:${NC}\n"

# Count additions and deletions
total_additions=0
total_deletions=0

while IFS= read -r line; do
    additions=$(echo "$line" | cut -f1)
    deletions=$(echo "$line" | cut -f2)
    total_additions=$((total_additions + additions))
    total_deletions=$((total_deletions + deletions))
done < <(git diff --cached --numstat)

# Determine likely change type
COMMIT_TYPE=""
SCOPE=""

if [[ ${CATEGORIES[docs]} -gt $((FILE_COUNT / 2)) ]]; then
    COMMIT_TYPE="docs"
    SCOPE="documentation"
elif [[ ${CATEGORIES[test]} -gt $((FILE_COUNT / 2)) ]]; then
    COMMIT_TYPE="test"
    SCOPE="tests"
elif [[ ${CATEGORIES[config]} -gt $((FILE_COUNT / 2)) ]]; then
    COMMIT_TYPE="chore"
    SCOPE="config"
elif [[ ${CATEGORIES[build]} -gt $((FILE_COUNT / 2)) ]]; then
    COMMIT_TYPE="build"
    SCOPE="build"
elif [[ $total_additions -gt $total_deletions ]] && [[ $total_additions -gt 100 ]]; then
    COMMIT_TYPE="feat"
    SCOPE="features"
elif [[ $total_deletions -gt $total_additions ]] && [[ $total_deletions -gt 100 ]]; then
    COMMIT_TYPE="refactor"
    SCOPE="cleanup"
elif [[ ${CATEGORIES[src]} -gt 0 ]]; then
    COMMIT_TYPE="fix"
    SCOPE="code"
else
    COMMIT_TYPE="chore"
    SCOPE="updates"
fi

echo -e "${GREEN}Type:${NC}    $COMMIT_TYPE"
echo -e "${GREEN}Scope:${NC}   $SCOPE"
echo -e "${GREEN}Impact:${NC}  $total_additions additions, $total_deletions deletions"

# Show diff summary
echo -e "\n${BLUE}Diff Summary:${NC}"
git diff --cached --stat

# Suggest next steps
echo -e "\n${BLUE}Next Steps:${NC}"
echo -e "  1. Review the changes above"
echo -e "  2. Run: ${GREEN}git commit -m \"$COMMIT_TYPE($SCOPE): description\"${NC}"
echo -e "  3. Or use the crafting-commits skill for detailed commit drafting"
