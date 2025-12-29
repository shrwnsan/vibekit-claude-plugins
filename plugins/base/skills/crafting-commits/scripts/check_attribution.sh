#!/usr/bin/env bash
#
# check_attribution.sh - Validate Co-Authored-By format
#
# Usage:
#   ./scripts/check_attribution.sh "Co-Authored-By: Name <email>"
#   echo "Co-Authored-By: Name <email>" | ./scripts/check_attribution.sh
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

VALID=true
ERRORS=()

# Get attribution line from argument or stdin
ATTRIBUTION="${1:-$(</dev/stdin)}"

if [[ -z "$ATTRIBUTION" ]]; then
    echo -e "${RED}Error: No attribution line provided${NC}"
    echo "Usage: $0 \"Co-Authored-By: Name <email>\""
    exit 1
fi

# Check if line starts with Co-Authored-By:
if [[ ! "$ATTRIBUTION" =~ ^Co-Authored-By: ]]; then
    ERRORS+=("Line must start with 'Co-Authored-By:'")
    VALID=false
fi

# Validate format: Co-Authored-By: Name <email>
# Accepts both regular emails and GitHub noreply emails
if [[ ! "$ATTRIBUTION" =~ ^Co-Authored-By:\ .+\<[^\>]+\>$ ]]; then
    ERRORS+=("Invalid format. Expected: Co-Authored-By: Name <email>")
    VALID=false
fi

# Extract email part for validation
if [[ "$ATTRIBUTION" =~ \<(.+)\> ]]; then
    EMAIL="${BASH_REMATCH[1]}"

    # Basic email validation
    if [[ ! "$EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        # Check if it's a GitHub noreply email (exception to standard format)
        if [[ ! "$EMAIL" =~ [a-zA-Z0-9._%+-]+@users\.noreply\.github\.com$ ]]; then
            ERRORS+=("Invalid email format: $EMAIL")
            VALID=false
        fi
    fi

    # Check for special characters that shouldn't be in email
    if [[ "$EMAIL" =~ [^a-zA-Z0-9._%+-@] ]]; then
        ERRORS+=("Email contains invalid characters: $EMAIL")
        VALID=false
    fi
fi

# Check for proper spacing
if [[ ! "$ATTRIBUTION" =~ ^Co-Authored-By:\ .+\ \<.+\> ]]; then
    if [[ ! "$ATTRIBUTION" =~ ^Co-Authored-By:\ .+\ \<.+\> ]]; then
        ERRORS+=("Missing proper spacing around email brackets")
        VALID=false
    fi
fi

# Check for common mistakes
# Missing space after colon
if [[ "$ATTRIBUTION" =~ ^Co-Authored-By:\< ]]; then
    ERRORS+=("Missing space after colon")
    VALID=false
fi

# Missing space before email
if [[ "$ATTRIBUTION" =~ Co-Authored-By:\ +\< ]]; then
    ERRORS+=("Missing space between name and email")
    VALID=false
fi

# Output results
if [[ "$VALID" == true ]]; then
    echo -e "${GREEN}✓ Attribution format is valid${NC}"
    echo ""
    echo "Validated attribution:"
    echo "  $ATTRIBUTION"
    exit 0
else
    echo -e "${RED}✗ Attribution has validation errors:${NC}"
    echo ""
    for error in "${ERRORS[@]}"; do
        echo -e "  ${RED}•${NC} $error"
    done
    echo ""
    echo "Correct format examples:"
    echo "  Co-Authored-By: Alice Chen <alice@example.com>"
    echo "  Co-Authored-By: bob <bob@users.noreply.github.com>"
    echo "  Co-Authored-By: GLM <zai-org@users.noreply.github.com>"
    exit 1
fi
