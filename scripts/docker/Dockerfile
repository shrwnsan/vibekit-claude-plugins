# Modular Dockerfile for Search Plus Plugin Testing
# Supports two modes: clean-testing, production
FROM node:22-alpine

# Install bash and Claude Code CLI
RUN apk add --no-cache bash && \
    npm install -g @anthropic-ai/claude-code

# Create users for different security levels
RUN addgroup -g 1001 -S claudeuser && \
    addgroup -g 2000 -S testuser && \
    adduser -u 1001 -S claudeuser -G claudeuser && \
    adduser -u 2000 -S testuser -G testuser

# Set up working directory
WORKDIR /app

# Copy necessary files with proper permissions
COPY --chown=claudeuser:claudeuser scripts/ ./scripts/
COPY --chown=claudeuser:claudeuser plugins/ ./plugins/
COPY --chown=claudeuser:claudeuser package*.json ./

# Create modular environment setup script
COPY --chown=claudeuser:claudeuser <<'EOF' /app/modular-env-setup.sh
#!/bin/sh
# Modular environment setup for Search Plus Plugin Testing

MODE="${MODE:-production}"
echo "🚀 Starting Search Plus Plugin in mode: $MODE"

# Claude environment setup
export ANTHROPIC_BASE_URL="${ANTHROPIC_BASE_URL:-https://api.anthropic.com}"
export ANTHROPIC_MODEL="${ANTHROPIC_MODEL:-claude-3-5-sonnet-20241022}"
echo "🌐 Claude endpoint: $ANTHROPIC_BASE_URL"
echo "🤖 Claude model: $ANTHROPIC_MODEL"

# Mode-specific configurations
case "$MODE" in
    "production")
        echo "🔒 Production Mode: Full security with API access"

        # Claude Code permissions for production testing
        export CLAUDE_ALLOW_DANGEROUS_PERMISSIONS=true
        export CLAUDE_DANGEROUSLY_SKIP_PERMISSIONS=true
        export NODE_ENV=production

        # Keep all API keys for real testing
        echo "🔐 API keys preserved for production testing"
        USER_TYPE="claudeuser"
        ;;

    "clean-testing")
        echo "🧪 Clean Testing Mode: Isolated environment without external APIs"

        # Claude Code permissions for testing
        export CLAUDE_ALLOW_DANGEROUS_PERMISSIONS=true
        export CLAUDE_DANGEROUSLY_SKIP_PERMISSIONS=true
        export NODE_ENV=test

        # Clear all external API keys for clean testing
        unset TAVILY_API_KEY
        unset JINAAI_API_KEY
        unset SERPER_API_KEY
        unset BING_API_KEY
        unset GOOGLE_API_KEY
        unset SEARCH_API_KEY

        echo "🧹 External API keys cleared for isolated testing"
        USER_TYPE="testuser"
        ;;

    *)
        echo "❌ Unknown mode: $MODE"
        echo "Available modes: production, clean-testing"
        exit 1
        ;;
esac

# Display configuration
if [ -n "$ANTHROPIC_AUTH_TOKEN" ]; then
    echo "🔐 Claude API Key: $(echo "$ANTHROPIC_AUTH_TOKEN" | cut -c1-8)...$(echo "$ANTHROPIC_AUTH_TOKEN" | rev | cut -c1-8 | rev)"
else
    echo "⚠️  No Claude API key found"
fi

echo "📊 Environment: $NODE_ENV"
echo "🎯 Mode: $MODE"
echo "👤 User: $USER_TYPE"

# Store user type for later use
echo "USER_TYPE=$USER_TYPE" > /tmp/mode-config

EOF

# Make setup script executable
RUN chmod +x /app/modular-env-setup.sh

# Create mode-specific entrypoint script
COPY --chown=claudeuser:claudeuser <<'EOF' /app/mode-entrypoint.sh
#!/bin/sh
# Mode-specific entrypoint logic

# Load mode configuration
if [ -f /tmp/mode-config ]; then
    . /tmp/mode-config
else
    USER_TYPE="claudeuser"
fi

MODE="$1"
shift

echo "🎬 Executing in $MODE mode as $USER_TYPE"

# In Docker, we should already be running as the correct user
# The user is set by the docker-compose file (user: directive)
echo "✅ Executing as expected user: $USER_TYPE"

# Handle command execution properly
if [ $# -gt 0 ]; then
    # If there are arguments, execute them
    exec "$@"
else
    # No arguments provided
    echo "No command provided"
    exit 1
fi

EOF

RUN chmod +x /app/mode-entrypoint.sh

# Default entrypoint
ENTRYPOINT ["/bin/sh", "-c", ". /app/modular-env-setup.sh && exec /app/mode-entrypoint.sh $MODE /app/scripts/docker-ab-entrypoint.sh \"$@\""]