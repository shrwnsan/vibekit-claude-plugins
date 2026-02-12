# VibeKit: Productivity Plus Claude Code Plugin Marketplace

A curated collection of productivity-enhancing plugins for Claude Code, designed to solve common development challenges and improve your coding workflow.

**Why VibeKit?**
- 🚀 **Just Works**: Reliable plugins that handle Claude Code's limitations seamlessly
- 🎯 **Battle-Tested**: Proven solutions for real-world development problems
- 📚 **Well Documented**: Clear examples and comprehensive guides
- 🔧 **Zero Config**: Install and use immediately - no setup required

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

### 🛠️ Base

Essential workflow and context engineering tools for productive development. Includes intelligent git commit crafting, quality assurance automation, and workflow orchestration to streamline your development process.

**Key Features:**
- ✍️ **Smart Commit Messages**: Conventional commit formatting with co-authorship
- 🔄 **Workflow Orchestration**: Automated git workflows with quality gates
- 📊 **Quality Assurance**: Pre-commit hooks and validation automation
- ⚡ **Parallel Development**: Support for concurrent development tasks
- 🎯 **Systematic Debugging**: Structured approach to find root causes efficiently
- 🔗 **Handoff Context**: Natural language thread continuation with context preservation

**Example Usage:**
```bash
# Create intelligent git commits
/base:commit

# Run with verbose output
/base:commit --verbose

# Quick commit with automatic message
/base:commit --fast
```

[→ Detailed Documentation](plugins/base/README.md)

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

**Example Usage:**
```bash
# Search the web
/search-plus "latest React best practices"

# Extract content from URLs
/search-plus "https://docs.anthropic.com/claude-code"

# Use as an agent for research
@search-plus investigate latest web development trends
```

[→ Detailed Documentation](plugins/search-plus/README.md)

### 🔔 Ping

Sound notifications and alerts for Claude Code tasks. Get audio feedback when tasks complete, when Claude needs your input, or when sessions start/end.

**Key Features:**
- 🎵 **Session Events**: Sounds for session start and stop
- 💬 **User Prompts**: Audio alert when Claude needs your input
- 🔔 **Notifications**: General notification sounds
- 🎮 **Custom Sounds**: Use nostalgic game sounds or custom audio files
- 🖥️ **Cross-Platform**: Support for macOS, Linux, and Windows

**Platform Support:**
- **macOS**: Uses `afplay` command
- **Linux**: Uses `paplay` (PulseAudio) or `aplay` (ALSA)
- **Windows**: Uses PowerShell `Media.SoundPlayer`

**Example Usage:**
```bash
# Enable sounds
export PING_ENABLED=true

# Override default sound directory
export PING_SOUNDS_DIR=/path/to/your/sounds

# Override specific sounds
export PING_SOUND_SESSION_START=/path/to/start.wav
export PING_SOUND_USER_PROMPT=/path/to/prompt.wav
```

[→ Detailed Documentation](plugins/ping/README.md)

## 🎯 What You Can Do

Our plugins help developers:

- **Automate Git Workflows**: Create intelligent commits with proper formatting
- **Research Reliably**: Search the web without hitting rate limits or errors
- **Extract Web Content**: Pull information from documentation and tutorials
- **Boost Productivity**: Solve common development challenges with purpose-built tools
- **Handle Edge Cases**: Address limitations in Claude Code's native functionality

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

See [CONTRIBUTING.md](CONTRIBUTING.md) for details on reporting issues, requesting features, and providing feedback.

## 🏗️ Plugin Architecture

Each plugin includes:

- **Plugin Manifest**: Defines metadata and capabilities
- **Skills**: Auto-discoverable capabilities that Claude can use automatically
- **Custom Commands**: Slash commands for frequent operations
- **Specialized Agents**: Purpose-built AI agents for specific tasks
- **Hooks**: Custom behavior at key workflow points
- **MCP Servers**: External tool integrations (when applicable)

## 🛠️ Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Project structure and guidelines
- How to create new plugins
- Security best practices
- Code style conventions

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
