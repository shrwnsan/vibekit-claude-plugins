# Dockerized Search-Plus A/B Testing

Secure Docker infrastructure for real A/B testing with search-plus plugin. This works with the hybrid architecture where the main script automatically delegates to Docker for real testing.

## 🎯 What This Provides

- **Security Isolation**: Tests run in isolated containers with no access to your system
- **Permission Safety**: Containerized environment where dangerous permissions are safe
- **Reproducible**: Same results everywhere, regardless of local setup
- **Portable**: Works with any Claude endpoint (Anthropic, Z.AI, Moonshot, etc.)

## 🚀 Quick Start (Hybrid Architecture)

### Single Script Usage (Recommended)

```bash
# Set your API credentials (standard or custom)
export ANTHROPIC_API_KEY="your-key"
# OR for custom endpoints like Z.AI:
export CUSTOM_CLAUDE_URL="$ZAI_API_URL"
export CUSTOM_CLAUDE_KEY="$ZAI_API_KEY"
export CUSTOM_CLAUDE_MODEL="$ZAI_MODEL"

# Run tests with smart auto-detection
node scripts/search-plus-ab-testing.mjs skill              # Simulation (fast)
node scripts/search-plus-ab-testing.mjs --real skill        # Real (auto-Docker)
node scripts/search-plus-ab-testing.mjs --real all         # Real all components
```

### Docker-Only Usage (Advanced)

```bash
# Direct Docker usage (not usually needed)
./scripts/docker-test.sh real skill
./scripts/docker-test.sh simulation all
./scripts/docker-test.sh both agent
```

## 📋 Available Commands

```bash
# Test modes
./scripts/docker-test.sh simulation    # Fast, safe testing (default)
./scripts/docker-test.sh real          # Real API calls with permissions
./scripts/docker-test.sh both          # Both simulation and real

# Test targets
./scripts/docker-test.sh skill         # Test SKILL.md component
./scripts/docker-test.sh agent         # Test search-plus agent
./scripts/docker-test.sh all           # Test all components (default)

# Management
./scripts/docker-test.sh --help        # Show help
./scripts/docker-test.sh --status      # Check Docker status
./scripts/docker-test.sh --logs        # Show container logs
./scripts/docker-test.sh --clean       # Clean up Docker resources
```

## 🔧 Configuration

### Environment File (Optional)

Create `scripts/docker/.env` file:

```bash
# Option 1: Standard Anthropic (works for everyone)
ANTHROPIC_API_KEY=your-anthropic-api-key

# Option 2: Custom endpoint (Z.AI, Moonshot, etc.)
CUSTOM_CLAUDE_URL=https://api.z.ai/v1
CUSTOM_CLAUDE_KEY=your-custom-key
CUSTOM_CLAUDE_MODEL=claude-3-5-sonnet-20241022
```

### Environment Variables

You can also set variables directly:

```bash
# Standard Anthropic
export ANTHROPIC_API_KEY="your-key"

# Custom endpoint (for your Z.AI setup)
export CUSTOM_CLAUDE_URL="$ZAI_API_URL"
export CUSTOM_CLAUDE_KEY="$ZAI_API_KEY"
export CUSTOM_CLAUDE_MODEL="$ZAI_MODEL"
```

## 🐳 Docker Requirements

- Docker Desktop, OrbStack, or Docker Engine
- docker-compose (or `docker compose` with newer Docker versions)
- ~512MB RAM minimum per container

## 🔒 Security Features

- **Isolated Filesystem**: Container can only access mounted directories
- **Non-root User**: Tests run as unprivileged user
- **Resource Limits**: CPU and memory constraints
- **Permission Safety**: Dangerous permissions are safe in container
- **Network Isolation**: Container uses isolated network

## 📊 Output

Test results are saved to:
- `test-results/` - Detailed JSON reports and logs
- `backups/` - Component backups before testing

## 🛠️ Troubleshooting

### Docker Issues
```bash
# Check Docker status
./scripts/docker-test.sh --status

# View container logs
./scripts/docker-test.sh --logs

# Clean up and restart
./scripts/docker-test.sh --clean
```

### Permission Issues
The container automatically handles dangerous permissions safely, so you should not encounter permission problems.

### Build Issues
```bash
# Force rebuild
docker-compose build --no-cache
```

## 🔄 CI/CD Integration

This Docker setup is perfect for CI/CD pipelines:

```yaml
# GitHub Actions example
- name: Run Search-Plus Tests
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
  run: |
    ./scripts/docker-test.sh real all
```

## 📝 Examples

### Development Workflow
```bash
# Quick simulation test during development
./scripts/docker-test.sh simulation skill

# Full real test before deployment
./scripts/docker-test.sh real all
```

### Endpoint Comparison
```bash
# Test with standard Anthropic
export ANTHROPIC_API_KEY="anthropic-key"
./scripts/docker-test.sh real skill

# Test with Z.AI
export CUSTOM_CLAUDE_URL="https://api.z.ai/v1"
export CUSTOM_CLAUDE_KEY="zai-key"
./scripts/docker-test.sh real skill
```

## 🤝 Contributing

This Docker setup is designed to be:
- **Portable**: Works on any system with Docker
- **Maintainable**: Simple configuration and setup
- **Extensible**: Easy to add new endpoints or test modes
- **Shareable**: Can be committed to GitHub for team use