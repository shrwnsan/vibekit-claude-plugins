#!/usr/bin/env bash
#
# validate_commit.sh - Validate conventional commit message format
#
# Usage:
#   ./scripts/validate_commit.sh "commit message"
#   echo "commit message" | ./scripts/validate_commit.sh
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Validation results
VALID=true
ERRORS=()
WARNINGS=()

# Get commit message from argument or stdin
COMMIT_MSG="${1:-$(</dev/stdin)}"

if [[ -z "$COMMIT_MSG" ]]; then
    echo -e "${RED}Error: No commit message provided${NC}"
    echo "Usage: $0 \"commit message\""
    exit 1
fi

# Split into lines (compatible approach)
# Get first line as subject
SUBJECT="${COMMIT_MSG%%$'\n'*}"
# Get remaining lines for body validation
BODY="${COMMIT_MSG#*$'\n'}"
if [[ "$BODY" == "$COMMIT_MSG" ]]; then
    BODY=""
fi

# Validate subject line
if [[ ${#SUBJECT} -gt 50 ]]; then
    ERRORS+=("Subject line exceeds 50 characters (${#SUBJECT} chars)")
    VALID=false
fi

# Check for trailing period in subject
if [[ "$SUBJECT" =~ \.$ ]]; then
    ERRORS+=("Subject line should not end with a period")
    VALID=false
fi

# Validate conventional commit format
# Format: type(scope): description or type!: description
commit_pattern='^[a-z]+(\([a-z]+\))?: .'
if [[ ! "$SUBJECT" =~ $commit_pattern ]]; then
    ERRORS+=("Subject line does not follow conventional commit format 'type(scope): description'")
    VALID=false
fi

# Check imperative mood in subject
# Common past tense/passive indicators (exclude "add" which is valid imperative)
if [[ "$SUBJECT" =~ (added|fixed|updated|removed|changed|adds|fixes|updates|removes|changes)\  ]]; then
    WARNINGS+=("Subject line should use imperative mood (e.g., 'Add feature' not 'Added feature')")
fi

# Validate body line length
if [[ -n "$BODY" ]]; then
    line_num=2  # Start from line 2 (after subject)
    while IFS= read -r LINE; do
        if [[ ${#LINE} -gt 72 ]]; then
            ERRORS+=("Line $line_num exceeds 72 characters (${#LINE} chars)")
            VALID=false
        fi
        ((line_num++))
    done <<< "$BODY"
fi

# Check for BREAKING CHANGE if '!' is used
if [[ "$SUBJECT" =~ ! ]] && [[ ! "$COMMIT_MSG" =~ BREAKING\ CHANGE ]]; then
    WARNINGS+=("Exclamation mark used but no BREAKING CHANGE footer found")
fi

# Output results
if [[ "$VALID" == true ]]; then
    echo -e "${GREEN}✓ Commit message format is valid${NC}"
else
    echo -e "${RED}✗ Commit message has validation errors:${NC}"
    for error in "${ERRORS[@]}"; do
        echo -e "  ${RED}•${NC} $error"
    done
fi

if [[ ${#WARNINGS[@]} -gt 0 ]]; then
    echo -e "\n${YELLOW}Warnings:${NC}"
    for warning in "${WARNINGS[@]}"; do
        echo -e "  ${YELLOW}•${NC} $warning"
    done
fi

# Exit with appropriate code
[[ "$VALID" == true ]] && exit 0 || exit 1
