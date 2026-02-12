# Contributing to VibeKit

Thank you for your interest in contributing to VibeKit! This document provides guidelines for contributing plugins, reporting issues, and understanding the plugin architecture.

## 🤝 Community & Feedback

VibeKit is currently maintained as a solo project, but community feedback is invaluable! Here's how you can help improve it:

### 🐛 Report Issues
Found a bug or unexpected behavior? Please open an issue with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Your environment (OS, Claude Code version)

### 💡 Request Features
Have an idea for a new plugin or improvement? Please share:
- Use case and problem it solves
- Expected functionality
- Any relevant examples or references

### 📝 General Feedback
- What plugins do you find most useful?
- Any pain points in installation or usage?
- Suggestions for better documentation

### 📞 Stay Connected
- ⭐ **Star the repository** if you find VibeKit helpful
- 👀 **Watch for updates** when new plugins are released
- 🐛 **Report issues** at [github.com/shrwnsan/vibekit-claude-plugins/issues](https://github.com/shrwnsan/vibekit-claude-plugins/issues)

Your feedback helps prioritize development and ensures VibeKit continues to solve real-world development challenges!

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

### Creating a New Plugin

1. **Create Plugin Directory**: Create a new directory under `plugins/`
2. **Add Plugin Manifest**: Create `.claude-plugin/plugin.json` with metadata
3. **Implement Features**: Add skills, commands, agents, or hooks as needed
4. **Write Documentation**: Create a comprehensive README.md
5. **Test Thoroughly**: Ensure the plugin works as expected
6. **Update Marketplace**: Add your plugin to `.claude-plugin/marketplace.json`

### Plugin Manifest Example

```json
{
  "name": "your-plugin",
  "version": "1.0.0",
  "description": "Brief description of your plugin",
  "author": "Your Name",
  "license": "Apache-2.0",
  "capabilities": [
    "skills",
    "commands",
    "agents"
  ]
}
```

### Security Guidelines

- All plugins should be designed with security best practices
- API keys and sensitive data must be handled securely
- Requests should respect website terms of service
- No data should be stored beyond what's necessary for functionality
- Validate all user inputs
- Use secure communication protocols (HTTPS, etc.)

### Code Style

- Follow existing code style and conventions
- Use clear, descriptive variable and function names
- Add comments for complex logic
- Keep functions focused and modular
- Write self-documenting code where possible

### Documentation

Each plugin MUST include:
- Overview and purpose
- Installation instructions
- Configuration options
- Usage examples
- Platform requirements (if applicable)
- License information

## 📄 License

Contributions are licensed under the same license as the project (Apache License 2.0).

By contributing, you agree that your contributions will be licensed under the Apache 2.0 License.

## 🔗 Links

- [Claude Code Documentation](https://docs.claude.com/en/docs/claude-code)
- [Plugin Development Guide](https://docs.claude.com/en/docs/claude-code/plugins)
- [Marketplace Documentation](https://docs.claude.com/en/docs/claude-code/plugin-marketplaces)
- [Issue Reporting](https://github.com/shrwnsan/vibekit-claude-plugins/issues)
