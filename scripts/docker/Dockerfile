FROM node:22-alpine

# Install Claude Code CLI
RUN npm install -g @anthropic-ai/claude-code

# Create non-root user for security
RUN addgroup -g 1001 -S testuser && \
    adduser -u 1001 -S testuser -G testuser

# Set up working directory
WORKDIR /app

# Copy necessary files with proper permissions
COPY --chown=testuser:testuser scripts/ ./scripts/
COPY --chown=testuser:testuser plugins/ ./plugins/
COPY --chown=testuser:testuser package*.json ./

# Create environment setup script
COPY --chown=testuser:testuser <<'EOF' /app/setup-claude-env.sh
#!/bin/sh
# Claude environment setup for Docker container

echo "🔗 Setting up Claude endpoint for search-plus testing..."

# Claude environment setup (simplified)
export ANTHROPIC_BASE_URL="${ANTHROPIC_BASE_URL:-https://api.anthropic.com}"
export ANTHROPIC_MODEL="${ANTHROPIC_MODEL:-claude-3-5-sonnet-20241022}"
echo "🌐 Using endpoint: $ANTHROPIC_BASE_URL"
echo "🤖 Model: $ANTHROPIC_MODEL"

# Claude Code permissions for testing
export CLAUDE_ALLOW_DANGEROUS_PERMISSIONS=true
export CLAUDE_DANGEROUSLY_SKIP_PERMISSIONS=true

# Testing environment
export NODE_ENV=test

# Display configuration
if [[ -n "$ANTHROPIC_AUTH_TOKEN" ]]; then
    echo "🔐 API Key: ${ANTHROPIC_AUTH_TOKEN:0:8}...${ANTHROPIC_AUTH_TOKEN: -8}"
fi
echo "📊 Test Mode: Real execution with permissions in isolated container"

EOF

# Make setup script executable
RUN chmod +x /app/setup-claude-env.sh

# Switch to non-root user
USER testuser

# Set up environment and run tests
ENTRYPOINT ["/bin/sh", "-c", ". /app/setup-claude-env.sh && exec /app/scripts/docker-ab-entrypoint.sh \"$@\""]