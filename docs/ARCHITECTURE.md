# Search-Plus Automated A/B Testing Architecture

## Overview

This document describes the hybrid architecture for automated A/B testing of the search-plus plugin updates, combining simulation and real testing capabilities with Docker security isolation.

📚 **For practical usage instructions and testing workflows, see [Testing Guide](./TESTING-GUIDE.md)**

## Architecture Components

### 1. Main Orchestration Script
- **File**: `scripts/search-plus-ab-testing.mjs` (renamed from `search-plus-automated-ab-testing.mjs`)
- **Purpose**: Smart orchestration with auto-Docker delegation for real testing
- **Features**:
  - Default simulation mode for quick testing
  - Auto Docker delegation when `--real` flag is used
  - Support for skill, agent, and command testing
  - Comprehensive result tracking and comparison

### 2. Docker Security Layer
- **Entry Point**: `scripts/docker-ab-entrypoint.sh`
- **Purpose**: Secure execution environment for real API calls
- **Features**:
  - Security isolation with minimal privileges
  - Environment variable hierarchy support
  - Multi-endpoint compatibility (Anthropic, Z.AI, custom endpoints)
  - Resource limits and network isolation

### 3. Docker Configuration
- **Dockerfile**: `scripts/docker/Dockerfile`
- **Compose**: `scripts/docker/docker-compose.yml`
- **Environment**: `scripts/docker/.env.example`
- **Features**:
  - Multi-stage build for security
  - Read-only filesystem with selective write access
  - Resource limits (512MB memory, 1.0 CPU)
  - Volume mounting for results and backups

## Environment Variable Hierarchy

The system supports multiple configuration methods with clear precedence:

1. **`.env.local`** (highest priority, gitignored)
2. **`.env.docker`** (Docker-specific overrides)
3. **`.env`** (base configuration)
4. **Environment variables** (runtime exports)

## Usage Patterns

### Quick Simulation Testing (Default)
```bash
# Test all components
node scripts/search-plus-ab-testing.mjs --all

# Test specific skill
node scripts/search-plus-ab-testing.mjs --skill
```

### Real API Testing (Secure)
```bash
# Auto-delegates to Docker for security
node scripts/search-plus-ab-testing.mjs --skill --real

# Using environment variables
export ANTHROPIC_AUTH_TOKEN="your-key"
node scripts/search-plus-ab-testing.mjs --real skill

# Using .env.local file
echo "ANTHROPIC_AUTH_TOKEN=your-key" > .env.local
node scripts/search-plus-ab-testing.mjs --real skill
```

### Custom Endpoint Support
```bash
# Z.AI endpoint
export ANTHROPIC_BASE_URL="https://api.z.ai/v1"
export ANTHROPIC_AUTH_TOKEN="zai-key"
export ANTHROPIC_MODEL="glm-4.6"
node scripts/search-plus-ab-testing.mjs --real skill
```

## Security Features

### Docker Isolation
- **Read-only filesystem** except for designated directories
- **Minimal capabilities** (CHOWN, SETGID, SETUID only)
- **No new privileges** enforcement
- **Network isolation** with dedicated bridge network
- **Resource limits** to prevent abuse

### API Key Protection
- **Gitignored `.env.local`** for personal credentials
- **No credential logging** in test results
- **Secure environment variable** passing to container
- **Multiple endpoint support** to avoid key sharing

## Testing Flow

### Simulation Mode
1. Load current and previous versions of components
2. Generate simulated test results based on heuristics
3. Compare improvements and generate report
4. Save results to `test-results/` directory

### Real Mode (Docker)
1. Detect `--real` flag and auto-delegate to Docker
2. Container setup with secure environment
3. Execute actual Claude Code commands
4. Capture real performance metrics and responses
5. Compare with previous versions or baseline
6. Generate comprehensive A/B analysis report

## Result Tracking

### Backup Strategy
- **Automatic backups** before testing
- **Timestamped backup files** in `backups/` directory
- **Version restoration** capabilities

### Result Storage
- **JSON format results** in `test-results/` directory
- **Timestamped filenames** for historical tracking
- **Comparison metrics** and improvement analysis
- **Execution metadata** (environment, timing, success rates)

## Error Handling

### Timeout Management
- **Configurable timeouts** for API calls (default 60s)
- **Retry mechanisms** with exponential backoff
- **Graceful degradation** to simulation when real testing fails

### Permission Safety
- **Docker isolation** prevents permission issues
- **Fallback to simulation** when Docker unavailable
- **Clear error messages** with resolution guidance

## Migration Benefits

### From Dual-Script to Hybrid
- **Simplified user experience** - single command for both modes
- **Automatic security** - Docker delegation when needed
- **Reduced complexity** - no manual Docker management required
- **Better portability** - works across different environments

### Configuration Improvements
- **Standardized environment patterns** following industry best practices
- **Clear documentation** with comprehensive examples
- **Security-focused setup** with proper warnings and guidance
- **Multiple endpoint support** for flexibility

## Future Extensibility

The architecture supports easy addition of:
- New testing components (skills, agents, commands)
- Additional API endpoints and providers
- Enhanced security features and monitoring
- Advanced testing scenarios and benchmarks
- Integration with CI/CD pipelines

## Conclusion

This hybrid architecture provides the best balance between:
- **Security** (Docker isolation for real testing)
- **Usability** (simple commands with smart defaults)
- **Portability** (GitHub-distributable testing framework)
- **Reliability** (comprehensive error handling and fallbacks)
- **Flexibility** (multiple endpoints and configuration methods)

The system automatically handles the complexity of secure real testing while maintaining the simplicity of quick simulation testing for development workflows.