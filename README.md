# VibeKit: Productivity Plus Claude Code Plugin Marketplace

A curated collection of productivity-enhancing plugins for Claude Code, designed to solve common development challenges and improve your coding workflow.

**What we offer:**
- Battle-tested plugins for real-world development problems
- Enhanced error handling for Claude Code limitations
- Community-driven solutions with comprehensive documentation
- Simple installation and reliable performance

## 🚀 Quick Start

Add this marketplace to Claude Code:

```bash
/plugin marketplace add shrwnsan/vibekit-claude-plugins
```

Browse available plugins and install search-plus:

```bash
/plugin
# Select "Browse and install plugins" and choose search-plus
```

### Verify Installation

Check that the plugin is working:

```bash
# Check available commands (should show /search-plus in custom-commands tab)
/help

# Test the enhanced search
/search-plus "Claude Code plugin documentation"

# Test URL extraction
/search-plus "https://docs.anthropic.com/en/docs/claude-code/plugins"

# Or invoke the search-plus agent
Use the search-plus agent to investigate a topic

# Or use the meta-searching skill
Research latest web development trends
```

## 📦 Available Plugins

### 🔍 Search Plus

Enhanced web search with advanced error handling for 403, 429, 451, and connection issues that commonly occur when Claude Code attempts to research websites. Features multi-service fallback, retry logic, and reliable URL content extraction.

**Performance Results:**
- 🎯 **95%+ Success Rate**: From 0-20% baseline to reliable search (+400% improvement)
- 🚀 **Complete Error Recovery**: 100% success for 422 errors, 90% for 429, 80% for 403
- 🎯 **Real-World Validation**: Successfully extracts from documentation, financial sites, and social media
- ⏱️ **Fast Response Times**: 2.3 seconds average with intelligent service selection
- 📊 **Zero Silent Failures**: Eliminates "Did 0 searches..." responses

**Multi-Service Architecture:**
- **Primary**: Tavily API for fast, reliable access (95-98% success, ~863ms avg)
- **Fallback**: Hybrid free services (SearXNG, DuckDuckGo, Startpage) in parallel
- **Smart Activation**: Only triggers fallback when needed (failed requests or empty content)
- **Zero Configuration**: Works out-of-the-box with free services

[→ Detailed Documentation](plugins/search-plus/README.md)

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
- **Skills**: Auto-discoverable capabilities that Claude can use automatically
- **Custom Commands**: Slash commands for frequent operations
- **Specialized Agents**: Purpose-built AI agents for specific tasks
- **Hooks**: Custom behavior at key workflow points
- **MCP Servers**: External tool integrations (when applicable)


## 🛠️ Development

### Project Structure

```
vibekit-claude-plugins/
├── .claude-plugin/
│   └── marketplace.json          # Marketplace configuration
├── plugins/                      # Plugins directory
│   └── your-plugin/              # Individual plugin directories
│       ├── .claude-plugin/
│       │   └── plugin.json       # Plugin manifest (required)
│       ├── agents/               # Custom AI agents (optional)
│       ├── commands/             # Slash commands (optional)
│       ├── hooks/                # Workflow hooks (optional)
│       ├── skills/               # Auto-discoverable capabilities (optional)
│       └── README.md             # Plugin documentation (required)
├── README.md                     # Marketplace documentation
└── AGENTS.md                     # AI agent guidelines
```

### Plugin Discovery and Management

The `plugins/` directory structure makes it easy to organize and discover plugins:

```bash
# List all available plugins
ls plugins/

# Explore a specific plugin
tree plugins/search-plus/
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
2. **Create your plugin** in the `plugins/` directory following our architecture:
   ```bash
   mkdir plugins/your-plugin-name
   ```
3. **Test thoroughly** with various scenarios
4. **Update marketplace.json** with your plugin details (use `./plugins/your-plugin-name` as the source path)
5. **Submit a Pull Request** with clear documentation

### Plugin Directory Structure

Each plugin should follow this consistent structure within the `plugins/` directory:

```
plugins/your-plugin-name/
├── .claude-plugin/
│   └── plugin.json           # Plugin manifest (required)
├── agents/                   # Custom AI agents (optional)
├── commands/                 # Slash commands (optional)
├── hooks/                    # Workflow hooks (optional)
├── skills/                   # Auto-discoverable capabilities (optional)
└── README.md                 # Plugin documentation (required)
```

### Plugin Development Guidelines

- **Error Handling**: Include comprehensive error handling for all operations
- **Documentation**: Provide clear README files and inline comments
- **Testing**: Test with various error scenarios and edge cases
- **Security**: Never commit API keys or sensitive information
- **Compatibility**: Ensure compatibility with Claude Code's latest version

## 📄 License

This marketplace and all included plugins are licensed under the Apache License 2.0.

Copyright 2025 shrwnsan - Licensed under Apache 2.0

See the [LICENSE](LICENSE) file for complete license terms and conditions.

## 🙏 Acknowledgments

- Built with [Claude Code](https://claude.ai/code) plugin system
- Inspired by community needs and real-world development challenges
- Following standards from [agents.md](https://agents.md/) for AI agent compatibility

## 🔗 Links

- [Claude Code Documentation](https://docs.claude.com/en/docs/claude-code)
- [Plugin Development Guide](https://docs.claude.com/en/docs/claude-code/plugins)
- [Marketplace Documentation](https://docs.claude.com/en/docs/claude-code/plugin-marketplaces)
- [Issue Reporting](https://github.com/shrwnsan/vibekit-claude-plugins/issues)

---

**Made with ❤️ by the Claude Code community**
