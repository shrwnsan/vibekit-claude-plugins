# Dockerized Search-Plus A/B Testing

Secure Docker infrastructure for real A/B testing with search-plus plugin. This works with the hybrid architecture where the main script automatically delegates to Docker for real testing.

## 🎯 What This Provides

- **Security Isolation**: Tests run in isolated containers with no access to your system
- **Permission Safety**: Containerized environment where dangerous permissions are safe
- **Reproducible**: Same results everywhere, regardless of local setup
- **Portable**: Works with any Claude endpoint (Anthropic, Z.AI, Moonshot, etc.)
- **Modular Architecture**: Single Docker setup supporting multiple testing modes

## 🚀 Quick Start (New Modular System)

### Using the Mode Runner (Recommended)

```bash
# Production testing with full API access
./scripts/docker/docker-run.sh production up

# Clean testing without external APIs (for debugging)
./scripts/docker/docker-run.sh clean-testing up

# Interactive shell in production mode
./scripts/docker/docker-run.sh production shell

# View logs
./scripts/docker/docker-run.sh production logs

# Stop containers
./scripts/docker/docker-run.sh production down
```

### Hybrid Architecture (Single Script)

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

## 🔄 Testing Modes

The modular Docker system supports two distinct testing modes:

### Local Development Setup
This modular system consolidates what was previously:
- **Local `docker/test-env/`** (untracked) → Now `clean-testing` mode
- **Production `scripts/docker/`** → Now `production` mode

The new unified system provides both capabilities in a single, maintainable Docker setup.

### Production Mode
- **Purpose**: Full A/B testing with real API calls
- **API Keys**: Preserved and used for external services
- **Security**: Maximum Docker hardening (read-only filesystem, capability dropping)
- **Use Case**: Production-ready testing, CI/CD pipelines, performance validation
- **Resources**: 512MB RAM, 1 CPU core

### Clean Testing Mode
- **Purpose**: Isolated testing without external API dependencies
- **API Keys**: Automatically cleared for fallback behavior testing
- **Security**: Balanced security (more permissive for debugging)
- **Use Case**: Debugging plugin behavior, testing fallback mechanisms, offline development
- **Resources**: 1GB RAM, 2 CPU cores

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

### Mode Runner (New Modular System)
```bash
# Container management
./scripts/docker/docker-run.sh production up           # Start production container
./scripts/docker/docker-run.sh clean-testing up        # Start clean testing container
./scripts/docker/docker-run.sh production down         # Stop production container
./scripts/docker/docker-run.sh clean-testing shell     # Interactive shell

# Utilities
./scripts/docker/docker-run.sh production logs         # View logs
./scripts/docker/docker-run.sh production build        # Build image
./scripts/docker/docker-run.sh production status       # Check status
```

**Purpose**: Container lifecycle management and interactive debugging
- Use when you want shell access for manual testing
- Use when you want to switch between production/clean-testing modes
- Use when you want to start/stop containers without running automated tests

### Legacy System (Automated Testing)
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

**Purpose**: Complete automated A/B testing framework
- Use when you want to run actual A/B tests with results
- Use when you need automated testing with proper result handling
- Use when you want the full testing workflow (simulation, real, or both)

## 🔄 Tool Comparison

| Feature | `docker-run.sh` | `docker-test.sh` |
|---------|-----------------|------------------|
| **Primary Purpose** | Container management | Automated testing |
| **Interactive Shell** | ✅ `shell` command | ❌ No interactive mode |
| **Mode Switching** | ✅ `production`/`clean-testing` | ✅ Clean mode by default (secure) |
| **Test Execution** | ❌ Manual only | ✅ `simulation`/`real`/`both` |
| **Results Handling** | ❌ No automatic results | ✅ Saves to `test-results/` |
| **Target Selection** | ❌ Not applicable | ✅ `skill`/`agent`/`all` |
| **Environment Setup** | ✅ Manual control | ✅ Automatic setup |
| **Best For** | Debugging, manual testing | Automated testing, CI/CD |

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

# External search API keys (loaded in production mode)
TAVILY_API_KEY=your-tavily-key
JINAAI_API_KEY=your-jinaai-key
SERPER_API_KEY=your-serper-key
```

**⚠️ Security Note**: `.env` files are only loaded in production mode for security. docker-test.sh and clean-testing mode run without loading .env files to prevent accidental API key usage.

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

### 🔐 API Key Isolation (Critical Security Feature)

The modular Docker system implements strict API key isolation to prevent leakage:

- **docker-test.sh**: Runs in secure mode by default, **does NOT** load local API keys from .env files
- **clean-testing mode**: Explicitly blocks all external API keys (TAVILY, JINAAI, SERPER, BING, etc.)
- **production mode**: Preserves API keys only when explicitly using production compose file
- **API Key Storage**: Keys are truncated in logs (first/last 8 chars only), never stored in plain text

### 🛡️ Security Compliance

- ✅ **POSIX Shell Compatibility**: All scripts use `/bin/sh` compatible syntax
- ✅ **No API Key Leakage**: Local environment variables isolated from containers
- ✅ **Minimal Logging Exposure**: Only truncated API key fragments in logs
- ✅ **Container Hardening**: Read-only filesystem, capability dropping, user separation

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