# Search Plus: Reliable Web Search for Claude Code

**Stop seeing "search failed" messages.** Get reliable web search and URL extraction that actually works when Claude Code's built-in search fails.

> **From 20% to 95% success rate** - transforms Claude Code's search reliability with intelligent fallback strategies

## Quick Start (2 minutes)

```bash
# 1. Install from VibeKit Marketplace
/plugin marketplace add shrwnsan/vibekit-claude-plugins
/plugin install search-plus@vibekit

# 2. Test it works — just ask Claude to research something
"Research Claude Code plugin documentation"

# 3. Extract from blocked URLs
"Extract content from https://docs.anthropic.com/en/docs/claude-code/plugins"
```

## Why You Need This

**The Problem**: Claude Code's search frequently fails with:
- ❌ "403 Forbidden" - Access denied
- ❌ "422 Unprocessable Entity" - Schema validation errors
- ❌ "429 Too Many Requests" - Rate limiting
- ❌ "Did 0 searches..." - Silent failures

**The Solution**: Search Plus handles all these errors automatically and finds the content you need.

## What It Does

### 🔍 Enhanced Web Search
Searches the web when Claude Code's built-in search fails:

> "Research latest React best practices 2025"

### 📄 URL Content Extraction
Extracts content from blocked or problematic URLs:

> "Extract content from https://github.com/facebook/react/blob/main/README.md"

### ⚡ Intelligent Fallback
Automatically tries multiple services until one works:
- **Primary**: Tavily API (if configured)
- **Fallback**: Jina.ai, SearXNG, DuckDuckGo, Startpage
- **GitHub Integration**: Native GitHub CLI access for repository content (when enabled)
- **Result**: You get answers instead of errors

## Performance Results

Based on 35 comprehensive test scenarios:

| Metric | Claude Code (Default) | With Search Plus | Improvement |
|--------|----------------------|------------------|-------------|
| **Overall Success Rate** | 0-20% | **95%+** | +400% |
| **422 Schema Errors** | 100% failure | **100% success** | Complete fix |
| **429 Rate Limiting** | 100% failure | **90% success** | Major recovery |
| **403 Forbidden** | 100% failure | **80% success** | High recovery |
| **Silent Failures** | 100% occurrence | **0%** | Eliminated |

*Tested on real-world problematic domains including documentation sites, financial platforms, and social media.*

## When to Use Search Plus

**Use instead of Claude's default search when**:
- 🚫 You see "403 Forbidden" errors
- 🚫 You get "Did 0 searches..." responses
- 🚫 Research fails on documentation sites
- 🚫 Financial or news content blocks access
- 🚫 You need reliable content extraction

**Works great for**:
- 📚 Documentation research
- 🔍 Technical blog posts
- 📰 News and current events
- 💼 Professional and academic research
- 🛠️ Development best practices

## Setup Options

### Option 1: Free Usage (Recommended for Start)
Works immediately without any configuration using free services.

### Option 2: Enhanced Performance (Optional)
Add API keys for maximum reliability and speed:

```bash
# Add these to your environment (optional)
export SEARCH_PLUS_TAVILY_API_KEY=your_tavily_key_here
export SEARCH_PLUS_JINA_API_KEY=your_jina_key_here
```

**Free tiers available**:
- Tavily: 1,000 searches/month free
- Jina.ai: 20-500 requests/minute free

See [docs/CONFIGURATION.md](docs/CONFIGURATION.md) for complete setup details.

> **Sandbox users**: If Claude Code's sandbox is enabled, add `api.tavily.com`, `r.jina.ai`, and `api.jina.ai` to the `allowedDomains` list in your settings. Without these, the extraction script cannot reach external services. See [skills/meta-search/README.md](skills/meta-search/README.md) for details.

### Option 3: GitHub CLI Integration (Advanced)

Enable native GitHub repository access for maximum reliability with GitHub URLs:

```bash
# Install GitHub CLI
brew install gh  # macOS
gh auth login    # Authenticate

# Enable GitHub integration
export SEARCH_PLUS_GITHUB_ENABLED=true
```

See [docs/CONFIGURATION.md#github-cli-integration](docs/CONFIGURATION.md#github-cli-integration) for complete setup details.

## Usage Examples

### Basic Web Search
```
# When Claude's search fails
"Research Python async await best practices"
"Find React hooks documentation"
```

### URL Content Extraction
```
# Extract from documentation sites
"Extract content from https://nextjs.org/docs/api-reference/create-next-app"

# Handle blocked or problematic URLs
"Get the content from https://reddit.com/r/programming/comments/example"
```

### Complex Research
```
# Multi-topic research
"Research microservices vs monolith pros cons 2025"

# Site-specific searches
"Search site:github.com awesome list machine learning"
```

## Two Ways to Use Search Plus

### 1. Automatic (Skill)
Claude automatically uses Search Plus when it detects you need web research or encounters search errors. Just ask:
> "Research the latest Claude Code plugin architecture"

### 2. Agent Mode (Advanced)
For complex multi-step research:
> "Use the search-plus agent to investigate this topic"

## FAQ

**Q: Is this safe to use?**
A: Yes. Uses industry-standard APIs with randomized headers. No data stored beyond what's necessary.

**Q: Will this make my searches slower?**
A: Actually faster on average (2.3 seconds) compared to failed searches that require retries.

**Q: Do I need to pay for this?**
A: No. Works with free services out-of-the-box. API keys are optional for enhanced performance.

**Q: Can this get me blocked from websites?**
A: Uses respectful access patterns with rate limiting and header rotation to avoid issues.

## Advanced Information

- **Configuration**: [docs/CONFIGURATION.md](docs/CONFIGURATION.md) - API keys and advanced setup
- **Technical Details**: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - Implementation and design
- **Performance Data**: [docs/PERFORMANCE.md](docs/PERFORMANCE.md) - Comprehensive test results
- **Contributing**: See the [main project/marketplace's contributing guidelines](https://github.com/shrwnsan/vibekit-claude-plugins#contributing)

## License

Apache License 2.0 - See main project [LICENSE](../../LICENSE) for details.

---

**Stop fighting with search failures.** Install Search Plus and get reliable web research that just works.