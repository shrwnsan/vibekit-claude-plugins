#!/bin/bash

# =============================================================================
# DOCKER A/B TESTING ENTRY POINT
# =============================================================================
# This script runs inside Docker containers for secure real testing
# It's called by the main search-plus-ab-testing.mjs script
#
# Usage: Called automatically, not run directly by users
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Docker environment setup
setup_docker_environment() {
    print_info "Setting up Docker environment for secure A/B testing..."

    # Claude environment setup
    export ANTHROPIC_BASE_URL="${ANTHROPIC_BASE_URL:-https://api.anthropic.com}"
    export ANTHROPIC_AUTH_TOKEN="$ANTHROPIC_AUTH_TOKEN"
    export ANTHROPIC_MODEL="${ANTHROPIC_MODEL:-claude-3-5-sonnet-20241022}"
    print_info "Using endpoint: $ANTHROPIC_BASE_URL"

    # Security permissions for testing
    export CLAUDE_ALLOW_DANGEROUS_PERMISSIONS=true
    export CLAUDE_DANGEROUSLY_SKIP_PERMISSIONS=true

    # Testing environment
    export NODE_ENV=test

    print_status "Docker environment configured for secure testing"
}

# Display container configuration
display_container_config() {
    print_info "🐳 Docker A/B Testing Container Configuration:"
    echo "  🔗 Endpoint: $ANTHROPIC_BASE_URL"
    echo "  🤖 Model: $ANTHROPIC_MODEL"
    echo "  🔐 API Key: ${ANTHROPIC_AUTH_TOKEN:0:8}...${ANTHROPIC_AUTH_TOKEN: -8}"
    echo "  📊 Mode: Real execution with secure permissions"
    echo "  🛡️  Container: Isolated environment"
}

# Main execution
main() {
    local test_mode="${1:-real}"
    local test_target="${2:-all}"
    shift 2 2>/dev/null || true

    print_status "Starting Docker A/B Testing Entry Point"
    echo ""

    setup_docker_environment
    display_container_config
    echo ""

    print_info "🚀 Running A/B testing in secure Docker environment..."
    print_info "📊 Test Mode: $test_mode"
    print_info "🎯 Target: $test_target"
    echo ""

    # Execute the core A/B testing script with real mode forced
    exec node /app/scripts/search-plus-ab-testing.mjs --$test_target --real "$@"
}

# Run main function
main "$@"