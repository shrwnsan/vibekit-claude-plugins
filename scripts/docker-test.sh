#!/bin/bash

# =============================================================================
# DOCKERIZED SEARCH-PLUS TESTING
# =============================================================================
# Portable script for running search-plus tests in Docker containers
# Works with standard Anthropic API or custom endpoints (Z.AI, Moonshot, etc.)
#
# Usage: ./docker-test.sh [test-mode] [target] [options]
#   test-mode: simulation | real | both
#   target: skill | agent | all
#   options: any additional test framework options
#
# Examples:
#   ./docker-test.sh real skill          # Real test with default Anthropic
#   ./docker-test.sh simulation all      # Simulation test
#   ./docker-test.sh both agent           # Both simulation and real
#
# For custom endpoints (Z.AI, etc.), set environment variables:
#   export CUSTOM_CLAUDE_URL="https://api.z.ai/v1"
#   export CUSTOM_CLAUDE_KEY="your-key"
#   export CUSTOM_CLAUDE_MODEL="claude-3-5-sonnet-20241022"
# =============================================================================

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$SCRIPT_DIR/docker"
ENV_FILE="$DOCKER_DIR/.env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Function to check dependencies
check_dependencies() {
    print_info "Checking dependencies..."

    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed or not in PATH"
        print_info "Please install Docker: https://docs.docker.com/get-docker/"
        exit 1
    fi

    # Check if docker-compose is available
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "docker-compose is not installed or not in PATH"
        print_info "Please install docker-compose: https://docs.docker.com/compose/install/"
        exit 1
    fi

    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running"
        print_info "Please start Docker daemon"
        exit 1
    fi

    print_status "Dependencies check passed"
}

# Function to setup environment
setup_environment() {
    print_info "Setting up environment..."

    # Check if .env file exists
    if [[ ! -f "$ENV_FILE" ]]; then
        print_warning ".env file not found, creating from example..."
        cp "$DOCKER_DIR/.env.example" "$ENV_FILE"
        print_status "Created $ENV_FILE"
        print_warning "Please edit $ENV_FILE and add your API key"
        print_info "Required: ANTHROPIC_API_KEY (or CUSTOM_CLAUDE_* for custom endpoints)"
        return 1
    fi

    # Load environment variables
    source "$ENV_FILE" 2>/dev/null || true

    # Check if API key is configured
    if [[ -z "$ANTHROPIC_API_KEY" && -z "$CUSTOM_CLAUDE_KEY" ]]; then
        print_error "No API key configured in $ENV_FILE"
        print_info "Please set either:"
        print_info "  ANTHROPIC_API_KEY=your-anthropic-key"
        print_info "  or for custom endpoints:"
        print_info "  CUSTOM_CLAUDE_URL=your-endpoint"
        print_info "  CUSTOM_CLAUDE_KEY=your-key"
        print_info "  CUSTOM_CLAUDE_MODEL=your-model"
        return 1
    fi

    print_status "Environment setup complete"
}

# Function to display configuration
display_config() {
    print_info "Configuration:"

    if [[ -n "$CUSTOM_CLAUDE_URL" ]]; then
        echo "  🔗 Custom Endpoint: $CUSTOM_CLAUDE_URL"
        echo "  🤖 Model: $CUSTOM_CLAUDE_MODEL"
        echo "  🔐 API Key: ${CUSTOM_CLAUDE_KEY:0:8}...${CUSTOM_CLAUDE_KEY: -8}"
    else
        echo "  🔗 Anthropic Endpoint: ${ANTHROPIC_BASE_URL:-https://api.anthropic.com}"
        echo "  🤖 Model: ${ANTHROPIC_MODEL:-claude-3-5-sonnet-20241022}"
        echo "  🔐 API Key: ${ANTHROPIC_API_KEY:0:8}...${ANTHROPIC_API_KEY: -8}"
    fi

    echo "  🧪 Test Mode: $1"
    echo "  🎯 Target: $2"
}

# Function to run tests
run_tests() {
    local test_mode="$1"
    local test_target="$2"
    shift 2

    print_info "Changing to Docker directory: $DOCKER_DIR"
    cd "$DOCKER_DIR" || exit 1

    # Build the Docker image
    print_info "Building Docker image..."
    docker-compose build --quiet

    # Run the tests based on mode
    case "$test_mode" in
        "real")
            print_status "Running REAL execution in Docker container..."
            docker-compose run --rm search-plus-test --"$test_target" --real "$@"
            ;;
        "simulation"|"sim"|"")
            print_status "Running SIMULATION in Docker container..."
            docker-compose run --rm search-plus-test --"$test_target" "$@"
            ;;
        "both")
            print_status "Running BOTH simulation and real execution in Docker container..."
            docker-compose run --rm search-plus-test --"$test_target" --both "$@"
            ;;
        *)
            print_error "Unknown test mode: $test_mode"
            print_info "Available modes: simulation, real, both"
            cd - > /dev/null
            exit 1
            ;;
    esac

    local exit_code=$?

    # Return to original directory
    cd - > /dev/null

    return $exit_code
}

# Function to cleanup
cleanup() {
    print_info "Cleaning up Docker resources..."
    cd "$DOCKER_DIR" 2>/dev/null || true
    docker-compose down 2>/dev/null || true
    cd - > /dev/null 2>/dev/null || true
}

# Function to show help
show_help() {
    cat << EOF
Dockerized Search-Plus Testing Script

USAGE:
    $0 [target] [options]              # Default: simulation mode
    $0 [test-mode] [target] [options]  # Explicit test mode

TEST MODES:
    simulation    Run simulated tests (fast, safe) [DEFAULT]
    real          Run real tests with actual API calls
    both          Run both simulation and real tests

TARGETS:
    skill         Test SKILL.md component
    agent         Test search-plus agent
    all           Test all components (default)

ENVIRONMENT SETUP:
    For standard Anthropic API:
        export ANTHROPIC_API_KEY="your-key"

    For custom endpoints (Z.AI, Moonshot, etc.):
        export CUSTOM_CLAUDE_URL="https://api.z.ai/v1"
        export CUSTOM_CLAUDE_KEY="your-key"
        export CUSTOM_CLAUDE_MODEL="claude-3-5-sonnet-20241022"

EXAMPLES:
    $0 skill                         # Simulation skill test (default mode)
    $0 all                           # Simulation test for all components
    $0 real skill                    # Real skill test with default settings
    $0 both agent                    # Both simulation and real agent test

    # With custom endpoint (Z.AI example):
    export CUSTOM_CLAUDE_URL="https://api.z.ai/v1"
    export CUSTOM_CLAUDE_KEY="your-zai-key"
    $0 real all

MANAGEMENT COMMANDS:
    $0 --help                        Show this help
    $0 --clean                       Clean up Docker resources
    $0 --logs                        Show container logs
    $0 --status                      Check Docker status

EOF
}

# Function to check Docker status
check_status() {
    print_info "Docker Status:"
    docker --version
    echo ""

    if docker info &> /dev/null; then
        print_status "Docker daemon is running"
    else
        print_error "Docker daemon is not running"
    fi

    echo ""
    print_info "Images:"
    docker images | grep search-plus || echo "  No search-plus images found"

    echo ""
    print_info "Containers:"
    docker ps -a | grep search-plus || echo "  No search-plus containers found"
}

# Function to show logs
show_logs() {
    print_info "Search-Plus container logs:"
    docker logs search-plus-testing 2>/dev/null || print_warning "No recent container logs found"
}

# Main execution
main() {
    # Handle special commands
    case "${1:-}" in
        "--help"|"-h")
            show_help
            exit 0
            ;;
        "--clean")
            cleanup
            print_status "Cleanup completed"
            exit 0
            ;;
        "--status")
            check_status
            exit 0
            ;;
        "--logs")
            show_logs
            exit 0
            ;;
    esac

    # Set trap for cleanup on exit
    trap cleanup EXIT

    # Parse arguments - simulation is default, so we handle the case where first arg is a target
    local test_mode="simulation"
    local test_target="all"

    # Check if first argument is a test mode or target
    case "${1:-}" in
        "simulation"|"sim"|"real"|"both")
            test_mode="$1"
            test_target="${2:-all}"
            shift 2 2>/dev/null || true
            ;;
        "skill"|"agent"|"all"|"")
            test_target="${1:-all}"
            shift 1 2>/dev/null || true
            ;;
        *)
            # If it's not a recognized mode or target, assume it's a target
            test_target="$1"
            shift 1 2>/dev/null || true
            ;;
    esac

    # Run the testing workflow
    print_status "Starting Dockerized Search-Plus Testing"
    echo ""

    check_dependencies
    setup_environment || exit 1
    display_config "$test_mode" "$test_target"
    echo ""

    run_tests "$test_mode" "$test_target" "$@"
    local exit_code=$?

    echo ""
    if [[ $exit_code -eq 0 ]]; then
        print_status "Dockerized testing completed successfully!"
        print_info "Results saved to: test-results/"
    else
        print_error "Dockerized testing failed with exit code: $exit_code"
    fi

    exit $exit_code
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi