#!/bin/bash
# Search Plus Docker Mode Runner
# Makes it easy to run the container in different modes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script info
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Function to show usage
show_usage() {
    echo -e "${BLUE}Search Plus Docker Mode Runner${NC}"
    echo ""
    echo "Usage: $0 <mode> [command]"
    echo ""
    echo "Modes:"
    echo "  ${GREEN}production${NC}     - Production testing with full API access and security"
    echo "  ${YELLOW}clean-testing${NC} - Isolated testing without external API keys"
    echo ""
    echo "Commands:"
    echo "  ${GREEN}up${NC}           - Start the container"
    echo "  ${GREEN}down${NC}         - Stop and remove the container"
    echo "  ${GREEN}shell${NC}        - Start interactive shell"
    echo "  ${GREEN}logs${NC}         - Show container logs"
    echo "  ${GREEN}build${NC}        - Build the Docker image"
    echo "  ${GREEN}status${NC}       - Show container status"
    echo ""
    echo "Examples:"
    echo "  $0 production up                    # Start production mode"
    echo "  $0 clean-testing shell              # Interactive shell in clean mode"
    echo "  $0 production logs                  # Show production logs"
    echo ""
}

# Function to check if mode is valid
validate_mode() {
    local mode=$1
    if [[ "$mode" != "production" && "$mode" != "clean-testing" ]]; then
        echo -e "${RED}Error: Invalid mode '$mode'${NC}"
        echo -e "${RED}Valid modes: production, clean-testing${NC}"
        exit 1
    fi
}

# Function to get compose file for mode
get_compose_files() {
    local mode=$1
    echo "-f $SCRIPT_DIR/docker-compose.yml"

    if [[ "$mode" == "clean-testing" ]]; then
        echo "-f $SCRIPT_DIR/docker-compose.clean-testing.yml"
    elif [[ "$mode" == "production" ]]; then
        echo "-f $SCRIPT_DIR/docker-compose.production.yml"
    fi
}

# Function to run docker-compose command
run_compose() {
    local mode=$1
    local command=$2
    shift 2
    local extra_args="$@"

    cd "$SCRIPT_DIR"
    local compose_files=$(get_compose_files "$mode")

    echo -e "${BLUE}Mode: $mode${NC}"
    echo -e "${BLUE}Command: docker-compose $compose_files $command $extra_args${NC}"
    echo ""

    docker-compose $compose_files $command $extra_args
}

# Main script logic
main() {
    if [[ $# -lt 2 ]]; then
        show_usage
        exit 1
    fi

    local mode=$1
    local command=$2

    validate_mode "$mode"

    case "$command" in
        "up")
            run_compose "$mode" "up" "-d"
            echo -e "${GREEN}✅ Container started in $mode mode${NC}"
            ;;
        "down")
            run_compose "$mode" "down"
            echo -e "${YELLOW}🛑 Container stopped${NC}"
            ;;
        "shell")
            echo -e "${BLUE}🐚 Starting interactive shell in $mode mode...${NC}"
            run_compose "$mode" "exec" "search-plus-${mode}" "/bin/sh"
            ;;
        "logs")
            run_compose "$mode" "logs" "-f"
            ;;
        "build")
            echo -e "${BLUE}🔨 Building Docker image for $mode mode...${NC}"
            run_compose "$mode" "build"
            echo -e "${GREEN}✅ Build completed${NC}"
            ;;
        "status")
            run_compose "$mode" "ps"
            ;;
        *)
            echo -e "${RED}Error: Unknown command '$command'${NC}"
            show_usage
            exit 1
            ;;
    esac
}

# Handle help flag
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    show_usage
    exit 0
fi

# Run main function with all arguments
main "$@"