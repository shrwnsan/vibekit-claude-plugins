#!/usr/bin/env bash
# Handoff Context Validation Script
# Validates handoff files for completeness and quality

set -euo pipefail

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Usage
if [ $# -eq 0 ]; then
  echo "Usage: $0 <handoff-file.yaml>"
  echo "Example: $0 /tmp/handoff-xxx/handoff-20260203-143022.yaml"
  exit 1
fi

HANDOFF_FILE="$1"

# Check if file exists
if [ ! -f "$HANDOFF_FILE" ]; then
  echo -e "${RED}❌ Error: File not found: $HANDOFF_FILE${NC}"
  exit 1
fi

# Validation counters
total_checks=0
passed_checks=0
warnings=0

# Function to check YAML key exists (supports nested keys with different indentation)
check_key() {
  local key="$1"
  local description="$2"
  total_checks=$((total_checks + 1))

  # Remove trailing colon if present, then search for key:
  local search_key="${key%:}"

  # Use grep -q with fixed string matching (more reliable)
  if grep -qF "${search_key}:" "$HANDOFF_FILE" 2>/dev/null; then
    echo -e "${GREEN}✅${NC} $description"
    passed_checks=$((passed_checks + 1))
    return 0
  else
    echo -e "${RED}❌${NC} $description"
    return 1
  fi
}

# Function to check if a section has content (not just placeholder/template)
check_section_populated() {
  local section="$1"
  local description="$2"
  total_checks=$((total_checks + 1))

  # Check if section has non-template, non-null content
  # Look for actual values beyond template placeholders
  local content
  content=$(sed -n "/${section}:/,/^[a-z]/p" "$HANDOFF_FILE" 2>/dev/null | grep -v "${section}:" | grep -v "^#" | grep -v "^$" | head -5 || true)

  # Check if content exists and doesn't match common template placeholders
  if [ -n "$content" ] && ! echo "$content" | grep -qE "(Describe current work|planning\|implementation\|debugging|Continuation action|affected-files)"; then
    echo -e "${GREEN}✅${NC} $description"
    passed_checks=$((passed_checks + 1))
    return 0
  else
    echo -e "${YELLOW}⚠️${NC} $description (appears to be template)"
    warnings=$((warnings + 1))
    return 1
  fi
}

echo "🔍 Validating: $HANDOFF_FILE"
echo ""

# Required sections
echo "Required Sections:"
check_key "timestamp:" "Timestamp present"
check_key "id:" "Session ID present"
check_key "confidence_score:" "Confidence score present"
check_key "context_quality:" "Context quality present"
echo ""

# Content checks
echo "Content Checks:"

# Check git_state (may be missing for non-git repos)
if grep -q "^  git_state:" "$HANDOFF_FILE"; then
  echo -e "${GREEN}✅${NC} Git state present"

  # Check if git_state has any files
  if grep -A 3 "^  git_state:" "$HANDOFF_FILE" | grep -q "\["; then
    echo -e "${GREEN}✅${NC} Git state structure valid"
    passed_checks=$((passed_checks + 1))
  fi
  total_checks=$((total_checks + 2))
else
  echo -e "${YELLOW}⚠️${NC} Git state missing (non-git repository?)"
  warnings=$((warnings + 1))
  total_checks=$((total_checks + 1))
fi

# Check critical content sections
check_section_populated "conversation_summary:" "Conversation summary populated" || true
check_section_populated "current_work:" "Current work populated" || true

# Check for next_steps OR continuation_action
has_next_steps=0
has_continuation=0

if grep -A 2 "^  next_steps:" "$HANDOFF_FILE" 2>/dev/null | grep -q -v "^  next_steps:" | grep -q -v "^  $" 2>/dev/null; then
  has_next_steps=1
fi

if grep "continuation_action:" "$HANDOFF_FILE" 2>/dev/null | grep -q -v "null"; then
  has_continuation=1
fi

total_checks=$((total_checks + 1))
if [ $has_next_steps -eq 1 ] || [ $has_continuation -eq 1 ]; then
  echo -e "${GREEN}✅${NC} Next steps or continuation action present"
  passed_checks=$((passed_checks + 1))
else
  echo -e "${YELLOW}⚠️${NC} No next steps or continuation action"
  warnings=$((warnings + 1))
fi

echo ""

# Calculate quality score
quality_percentage=0
if [ $total_checks -gt 0 ]; then
  quality_percentage=$((passed_checks * 100 / total_checks))
fi

# Convert to 0-1 scale for confidence
confidence_score=$(echo "scale=2; $passed_checks / $total_checks" | bc 2>/dev/null || echo "0.5")

# Map to quality level
if [ "$quality_percentage" -ge 90 ]; then
  quality_level="high"
  recommendation="Comprehensive handoff ready for continuation"
elif [ "$quality_percentage" -ge 70 ]; then
  quality_level="medium"
  recommendation="Good quality handoff - minor gaps possible"
elif [ "$quality_percentage" -ge 50 ]; then
  quality_level="low"
  recommendation="Acceptable - consider adding more context"
else
  quality_level="poor"
  recommendation="Critical gaps - add more context before handoff"
fi

echo "Quality Assessment:"
echo "  Score: $passed_checks/$total_checks checks passed ($quality_percentage%)"
echo "  Confidence: $confidence_score"
echo "  Level: $quality_level"
echo ""

if [ $warnings -gt 0 ]; then
  echo -e "${YELLOW}⚠️${NC} Warnings: $warnings"
fi

echo ""
echo "Recommendation: $recommendation"

# Exit with appropriate code
if [ "$quality_percentage" -lt 50 ]; then
  exit 1
elif [ "$quality_percentage" -lt 70 ]; then
  exit 2
else
  exit 0
fi
