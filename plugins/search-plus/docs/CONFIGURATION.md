# Search Plus Configuration Guide

Complete setup guide for maximizing Search Plus performance with API keys and advanced options.

## Quick Setup

### Option 1: Free Usage (Default)
Works immediately without any configuration using free services.

### Option 2: Enhanced Performance (Recommended)
Add API keys for maximum reliability and speed:

```bash
# Add these to your environment (optional but recommended)
export SEARCH_PLUS_TAVILY_API_KEY=your_tavily_key_here
export SEARCH_PLUS_JINA_API_KEY=your_jina_key_here

# Or add to your ~/.bashrc or ~/.zshrc for persistence
echo 'export SEARCH_PLUS_TAVILY_API_KEY=your_tavily_key_here' >> ~/.bashrc
echo 'export SEARCH_PLUS_JINA_API_KEY=your_jina_key_here' >> ~/.bashrc
```

### Option 3: Project-Specific Configuration
Create a `.env` file in your project root:

```bash
# .env file (add to .gitignore!)
SEARCH_PLUS_TAVILY_API_KEY=your_tavily_key_here
SEARCH_PLUS_JINA_API_KEY=your_jina_key_here
```

## API Keys and Services

### Tavily API (Primary Service)

**What it does**: Premium web search and URL extraction service

**Performance**:
- Success Rate: 95-98%
- Average Response Time: 863ms (fastest)
- Best for: All content types, especially problematic domains

**Free Tier**:
- 1,000 API credits/month
- No credit card required
- Students can request additional access

**Setup**:
1. Sign up at [tavily.com](https://tavily.com)
2. Get your API key from the dashboard
3. Set `SEARCH_PLUS_TAVILY_API_KEY`

```bash
export SEARCH_PLUS_TAVILY_API_KEY=tvly-your-key-here
```

### Jina.ai API (Enhanced Fallback)

**What it does**: URL content extraction with metadata

**Performance**:
- Success Rate: 87-92%
- Average Response Time: 2,331ms (slower, enhanced metadata)
- Best for: Documentation sites, API docs, technical content

**Free Tiers**:
- Without API Key: 20 RPM (requests per minute)
- With Free API Key: 500 RPM
- Premium API Keys: Up to 5000 RPM

**Setup**:
1. Sign up at [jina.ai](https://jina.ai)
2. Get your API key from the dashboard
3. Set `SEARCH_PLUS_JINA_API_KEY`

```bash
export SEARCH_PLUS_JINA_API_KEY=your_jina_key_here
```

## Environment Variables Reference

### Required Variables (Optional)
```bash
# Primary search service (recommended)
SEARCH_PLUS_TAVILY_API_KEY=tvly-your-key-here

# Enhanced URL extraction (optional)
SEARCH_PLUS_JINA_API_KEY=your_jina_key_here
```

### Optional Performance Tuning
```bash
# Recovery timeout for individual strategies (default: 5000ms)
SEARCH_PLUS_RECOVERY_TIMEOUT_MS=5000

# 404 error handling mode (default: normal)
SEARCH_PLUS_404_MODE=normal

# 451 error handling - minimal output (default: false)
SEARCH_PLUS_451_SIMPLE_MODE=false
```

### 404 Mode Configuration
Controls how aggressively the plugin tries to find archived content for 404 errors:

```bash
export SEARCH_PLUS_404_MODE=conservative  # 30% archive probability, 1 attempt
export SEARCH_PLUS_404_MODE=normal        # 70% archive probability, 2 attempts (default)
export SEARCH_PLUS_404_MODE=aggressive    # 100% archive probability, 3 attempts
export SEARCH_PLUS_404_MODE=disabled      # Disable 404 enhancement completely
```

### Recovery Timeout Configuration
Controls timeout for 451 SecurityCompromiseError recovery strategies:

```bash
# Default: 5000ms (5 seconds per strategy)
export SEARCH_PLUS_RECOVERY_TIMEOUT_MS=5000

# Examples:
export SEARCH_PLUS_RECOVERY_TIMEOUT_MS=3000  # Fast recovery (3 seconds)
export SEARCH_PLUS_RECOVERY_TIMEOUT_MS=10000 # Slow networks (10 seconds)
export SEARCH_PLUS_RECOVERY_TIMEOUT_MS=1000  # Development testing (1 second)
```

### 451 Error Simple Mode
Reduce logging output for 451 domain blocking recovery:

```bash
# Enhanced mode (default): Detailed progress logging
unset SEARCH_PLUS_451_SIMPLE_MODE

# Simple mode: Minimal output
export SEARCH_PLUS_451_SIMPLE_MODE=true
```

## Service Tiers Comparison

| Configuration | Success Rate | Response Time | Cost | Setup |
|---------------|--------------|---------------|------|-------|
| **Free Only** | 70-80% | 2.1s | $0 | None |
| **Tavily Only** | 90-95% | 1.2s | Free tier | API key |
| **Jina.ai Only** | 75-85% | 2.8s | Free tier | API key |
| **Both Keys** | 95-98% | 0.9s | Free tiers | 2 API keys |

## Migration from Legacy Variables

Previous versions used different environment variable names. These are still supported but show deprecation warnings:

```bash
# Legacy (deprecated but still supported)
TAVILY_API_KEY=your_key_here
JINA_API_KEY=your_key_here

# New namespaced variables (recommended)
SEARCH_PLUS_TAVILY_API_KEY=your_key_here
SEARCH_PLUS_JINA_API_KEY=your_key_here
```

**Migration steps**:
1. Update your environment to use new variable names
2. Legacy variables will continue to work during transition
3. Remove legacy variables after confirming new ones work

## Security Best Practices

### Environment File Setup
Create a `.env` file in your project root:

```bash
# .env
SEARCH_PLUS_TAVILY_API_KEY=your_tavily_key_here
SEARCH_PLUS_JINA_API_KEY=your_jina_key_here
```

**Important**: Add `.env` to your `.gitignore` file:

```bash
# .gitignore
.env
**/.env
```

### API Key Security Guidelines

**DO**:
- ✅ Store API keys in environment variables
- ✅ Use `.env` files for local development
- ✅ Add `.env` to `.gitignore`
- ✅ Rotate API keys regularly
- ✅ Use different keys for different environments

**DON'T**:
- ❌ Commit API keys to version control
- ❌ Hardcode keys in source code
- ❌ Share API keys in public repositories
- ❌ Use production keys in development
- ❌ Log API keys in application output

## Troubleshooting

### API Key Issues

**Problem**: Plugin not using configured API keys
```bash
# Check if keys are set
echo $SEARCH_PLUS_TAVILY_API_KEY
echo $SEARCH_PLUS_JINA_API_KEY

# Test with explicit export
export SEARCH_PLUS_TAVILY_API_KEY=your_key_here
/search-plus "test query"
```

**Problem**: Invalid API key format
- Tavily keys start with `tvly-`
- Jina.ai keys are alphanumeric strings
- Ensure no extra spaces or quotes

**Problem**: API rate limits exceeded
- Check your service dashboards for usage
- Consider upgrading to paid tiers if needed
- Use the recovery timeout configuration to slow down requests

### Service Connectivity

**Problem**: Services not responding
```bash
# Test network connectivity
curl -I https://api.tavily.com
curl -I https://r.jina.ai

# Check if Claude Code can access external services
/search-plus "network connectivity test"
```

**Problem**: Corporate firewall blocking services
- Check if your network allows outbound HTTPS
- Consider using proxy configuration if available
- Test with free services that may have different endpoints

### Performance Issues

**Problem**: Slow response times
```bash
# Increase recovery timeout for slow networks
export SEARCH_PLUS_RECOVERY_TIMEOUT_MS=10000

# Enable simple mode to reduce logging overhead
export SEARCH_PLUS_451_SIMPLE_MODE=true
```

**Problem**: High failure rate
- Ensure you have API keys configured
- Check service status pages for outages
- Verify your internet connection is stable

## Support

If you encounter configuration issues:

1. **Check the FAQ** in the main README.md
2. **Verify environment variables** are set correctly
3. **Test network connectivity** to API services
4. **Review service dashboards** for API key status and usage
5. **Open an issue** at the main project repository with configuration details (excluding actual API keys)