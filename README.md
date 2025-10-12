# shrwnsan Claude Code Marketplace

A curated collection of productivity-enhancing plugins for Claude Code, designed to solve common development challenges and improve your coding workflow.

## 🚀 Quick Start

### Option 1: Install from GitHub (Recommended for users)

Add this marketplace to Claude Code:

```bash
/plugin marketplace add shrwnsan/claude-code-marketplace
```

Browse available plugins:

```bash
/plugin
```

Install a specific plugin:

```bash
/plugin install web-search-enhancer@shrwnsan-plugins
```

### Option 2: Test Locally (For developers)

Test the marketplace locally before publishing:

```bash
# Navigate to parent directory of test-marketplace
cd ~/

# Start Claude Code
claude

# Add local marketplace
/plugin marketplace add ./test-marketplace

# Install plugin locally
/plugin install web-search-enhancer@test-marketplace

# Restart Claude Code when prompted
```

### Verify Installation

Check that the plugin is working:

```bash
# Check available commands (should show /enhanced-search)
/help

# Test the enhanced search
/enhanced-search "Claude Code plugin documentation"

# Test URL extraction
/enhanced-search "https://docs.anthropic.com/en/docs/claude-code/plugins"
```

## 📦 Available Plugins

### 🔍 Web Search Enhancer

Enhanced web search with advanced error handling for rate limiting and blocking issues that commonly occur when Claude Code attempts to research websites.

**Features:**
- Advanced retry logic with exponential backoff
- Header manipulation to avoid detection
- Rate limit compliance and circuit breaker patterns
- Query reformulation when blocked
- Timeout management and connection refused handling
- **URL/Content Extraction**: Extract content directly from URLs and permalinks

**Usage Examples:**
```bash
# Search the web with error handling
/enhanced-search "Claude Code plugin documentation"

# Extract content from a specific URL
/enhanced-search "https://docs.anthropic.com/en/docs/claude-code/plugins"

# Research with fallback strategies
/enhanced-search "GitHub API rate limiting best practices"
```

**Use Case:** Perfect for developers who frequently encounter 403 Forbidden, 429 Rate Limit, or ECONNREFUSED errors when using Claude Code's built-in search functionality, or need reliable content extraction from specific URLs.

## 🎯 Use Cases

Our plugins help developers:

- **Enforce Standards**: Maintain consistency across teams with specialized workflows
- **Boost Productivity**: Solve common development challenges with purpose-built tools  
- **Handle Edge Cases**: Address limitations in Claude Code's native functionality
- **Integrate Tools**: Connect external services through custom implementations
- **Share Best Practices**: Distribute proven workflows and configurations

## 🏗️ Plugin Architecture

Each plugin includes:

- **Plugin Manifest**: Defines metadata and capabilities
- **Custom Commands**: Slash commands for frequent operations
- **Specialized Agents**: Purpose-built AI agents for specific tasks
- **Hooks**: Custom behavior at key workflow points
- **MCP Servers**: External tool integrations (when applicable)

## 🛠️ Development

### Project Structure

```
claude-code-marketplace/
├── .claude-plugin/
│   └── marketplace.json          # Marketplace configuration
├── web-search-enhancer/           # Plugin directory
│   ├── .claude-plugin/
│   │   └── plugin.json           # Plugin manifest
│   ├── agents/                   # Custom AI agents
│   ├── commands/                 # Slash commands
│   └── hooks/                    # Workflow hooks
├── README.md                     # This file
└── AGENTS.md                     # AI agent guidelines
```

### Contributing

We welcome contributions! See our [Contributing Guidelines](#contributing) for details.

### Security

- All plugins are designed with security best practices
- API keys and sensitive data are handled securely
- Requests respect website terms of service
- No data is stored beyond what's necessary for functionality

## 🤝 Contributing

We believe in the power of community-driven development. Here's how you can contribute:

### Adding New Plugins

1. **Fork the repository**
2. **Create your plugin** in a new directory following our architecture
3. **Test thoroughly** with various scenarios
4. **Update marketplace.json** with your plugin details
5. **Submit a Pull Request** with clear documentation

### Plugin Development Guidelines

- **Error Handling**: Include comprehensive error handling for all operations
- **Documentation**: Provide clear README files and inline comments
- **Testing**: Test with various error scenarios and edge cases
- **Security**: Never commit API keys or sensitive information
- **Compatibility**: Ensure compatibility with Claude Code's latest version

### Areas for Contribution

- [ ] **Proxy Support**: IP rotation for persistent blocks
- [ ] **Multiple Search Engines**: Alternative search providers
- [ ] **Testing Suite**: Comprehensive test coverage
- [ ] **Metrics Collection**: Success rate tracking
- [ ] **Configuration Management**: Environment-based configs

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Claude Code](https://claude.ai/code) plugin system
- Inspired by community needs and real-world development challenges
- Following standards from [agents.md](https://agents.md/) for AI agent compatibility

## 🔗 Links

- [Claude Code Documentation](https://docs.claude.com/en/docs/claude-code)
- [Plugin Development Guide](https://docs.claude.com/en/docs/claude-code/plugins)
- [Marketplace Documentation](https://docs.claude.com/en/docs/claude-code/plugin-marketplaces)
- [Issue Reporting](https://github.com/shrwnsan/claude-code-marketplace/issues)

---

**Made with ❤️ by the Claude Code community**
