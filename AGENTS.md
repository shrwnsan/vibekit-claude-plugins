# AI Agent Guidelines for VibeKit Claude Code Marketplace

This document provides detailed context and instructions for AI coding agents working with this Claude Code plugin marketplace.

## Project Overview

This is a plugin marketplace for Claude Code that hosts custom plugins to enhance development productivity. The marketplace follows Claude Code's plugin architecture with standardized structure and configuration.


### Directory Structure

```
claude-vibekit-plugins/
├── .claude-plugin/marketplace.json    # Marketplace configuration
├── plugins/                           # Plugins directory
│   └── search-plus/                   # Plugin: Enhanced web search
├── README.md                          # Human-readable documentation
├── AGENTS.md                          # This file - AI agent guidelines
└── .git/                              # Git version control
```

### Scalable Plugin Architecture

The marketplace is organized to scale efficiently with multiple plugins:

```
plugins/
├── search-plus/                       # Enhanced web search functionality
└── [additional-plugins]/              # Additional plugins follow same structure
```

**Benefits of this organization:**
- **Modular Structure**: Each plugin is self-contained within the plugins/ directory
- **Consistent Patterns**: All plugins follow the same internal structure
- **Easy Maintenance**: Clear separation between marketplace config and plugin code
- **Scalable Design**: Can accommodate unlimited plugins without root directory clutter

### Plugin Structure Pattern

Each plugin follows this structure within the plugins/ directory:
```
plugins/plugin-name/
├── .claude-plugin/plugin.json         # Plugin manifest (required)
├── agents/                            # Custom AI agents (optional)
├── commands/                          # Slash commands (optional)
├── hooks/                             # Workflow hooks (optional)
└── README.md                          # Plugin documentation (required)
```

## Build and Development Workflow

### Adding New Plugins

1. **Create Plugin Directory**: `mkdir plugins/new-plugin-name`
2. **Create Plugin Manifest**: Add `plugins/new-plugin-name/.claude-plugin/plugin.json` with required fields
3. **Implement Plugin Components**: Add agents, commands, and/or hooks as needed
4. **Update Marketplace**: Add plugin entry to `.claude-plugin/marketplace.json` with source path `./plugins/new-plugin-name`
5. **Test Installation**: Verify plugin can be installed via Claude Code

### Plugin Creation Example

To create a new plugin called "code-formatter":

```bash
# Create plugin directory
mkdir plugins/code-formatter

# Create plugin structure
mkdir plugins/code-formatter/.claude-plugin
mkdir plugins/code-formatter/agents
mkdir plugins/code-formatter/commands
mkdir plugins/code-formatter/hooks

# Create plugin manifest
cat > plugins/code-formatter/.claude-plugin/plugin.json << EOF
{
  "name": "code-formatter",
  "version": "1.0.0",
  "description": "Automated code formatting utilities",
  "author": "your-name"
}
EOF

# Add to marketplace.json with source path "./plugins/code-formatter"
```

### Testing Plugins

Before submitting changes, test plugins by:

1. **Local Marketplace Setup**:
   ```bash
   /plugin marketplace add ./path/to/marketplace
   ```

2. **Plugin Installation**:
   ```bash
   /plugin install plugin-name@marketplace-name
   ```

3. **Functionality Testing**: Verify all plugin features work as expected

### Validation Commands

Validate marketplace JSON syntax:
```bash
claude plugin validate .
```

Check marketplace configuration:
```bash
/plugin marketplace list
```

## Code Standards and Guidelines

### Plugin Manifest Requirements

Every plugin must include:
- `name`: Unique plugin identifier (kebab-case)
- `description`: Brief functionality description
- `version`: Semantic version (e.g., "1.0.0")
- `author`: Author information

### Error Handling Standards

- All external API calls must include try-catch blocks
- Implement retry logic with exponential backoff for network operations
- Provide clear error messages to users
- Log errors appropriately for debugging

### Security Guidelines

- Never commit API keys or sensitive information
- Use environment variables for configuration secrets
- Validate all user inputs and external data
- Follow principle of least privilege for external service access

### Documentation Standards

- Each plugin must include comprehensive README.md
- Document all configuration options and requirements
- Provide usage examples and troubleshooting guidance
- Include information about external dependencies

## Marketplace Configuration

### marketplace.json Structure

The marketplace configuration file follows this schema:
```json
{
  "name": "vibekit",
  "owner": {
    "name": "shrwnsan",
    "email": "38465+shrwnsan@users.noreply.github.com"
  },
  "metadata": {
    "description": "Curated collection of productivity-enhancing plugins for Claude Code",
    "version": "1.0.0"
  },
  "plugins": [
    {
      "name": "plugin-name",
      "source": "./plugins/plugin-directory",
      "description": "Plugin description",
      "version": "1.0.0",
      "keywords": ["tag1", "tag2"],
      "category": "productivity"
    }
  ]
}
```

### Plugin Entry Requirements

When adding plugins to marketplace.json:
- Use relative paths with `./plugins/` prefix for all plugins in this repository
- Include comprehensive metadata for discoverability
- Specify appropriate categories and keywords
- Ensure version numbers match plugin.json
- Update homepage URLs to include the new directory structure

**Example plugin entry:**
```json
{
  "name": "search-plus",
  "source": "./plugins/search-plus",
  "description": "Enhanced web search with URL extraction and error handling",
  "version": "1.0.0",
  "homepage": "https://github.com/shrwnsan/claude-vibekit-plugins/tree/main/plugins/search-plus"
}
```

## Testing Strategy

### Plugin Testing Checklist

Before submitting changes:

- [ ] Plugin manifest is valid JSON
- [ ] All required files are present
- [ ] Plugin installs successfully from marketplace
- [ ] All plugin features work as documented
- [ ] Error scenarios are handled gracefully
- [ ] Documentation is complete and accurate
- [ ] No sensitive information is committed

### Common Issues to Avoid

- Missing required fields in plugin.json
- Incorrect relative paths in marketplace.json
- API keys or secrets in code
- Inconsistent version numbers
- Inadequate error handling
- Missing or outdated documentation

## Git Workflow

### Commit Message Standards

Use clear, descriptive commit messages:
- `feat: add new plugin functionality`
- `fix: resolve error handling issue`
- `docs: update plugin documentation`
- `test: add validation for plugin structure`

### Branch Strategy

- `main`: Stable, released versions
- `develop`: Integration branch for new features
- `feature/plugin-name`: Feature-specific development

## Security Considerations

### External Service Integration

- Validate all API responses before processing
- Implement rate limiting for external service calls
- Use secure storage for API credentials
- Monitor for unusual usage patterns

### Code Security

- Avoid eval() or similar dynamic code execution
- Sanitize all user inputs
- Use parameterized queries for database operations
- Keep dependencies updated and secure

## Troubleshooting Common Issues

### Plugin Installation Failures

1. **Check marketplace.json syntax**: Validate JSON format
2. **Verify plugin paths**: Ensure relative paths are correct
3. **Check plugin.json**: Verify all required fields exist
4. **Test plugin structure**: Ensure required files are present

### Marketplace Loading Issues

1. **Validate marketplace configuration**: Use `claude plugin validate`
2. **Check git repository**: Ensure repository is accessible
3. **Verify file paths**: Confirm .claude-plugin/marketplace.json exists
4. **Check permissions**: Ensure files are readable

### Plugin Functionality Issues

1. **Review error logs**: Check Claude Code logs for errors
2. **Test plugin components**: Verify agents, commands, and hooks work
3. **Check dependencies**: Ensure all required services are available
4. **Validate configuration**: Check plugin configuration values

## Plugin Management and Scalability

### Managing Multiple Plugins

As the marketplace grows, the plugins/ directory structure provides several advantages:

**Organization Benefits:**
- **Clean Root Directory**: Marketplace configuration remains separate from plugin code
- **Predictable Structure**: All plugins follow the same organizational pattern
- **Easy Navigation**: Developers can quickly find specific plugins
- **Scalable Growth**: Can accommodate dozens of plugins without confusion

**Plugin Discovery:**
```bash
# List all available plugins
ls plugins/

# Check specific plugin structure
tree plugins/search-plus/

# Find plugins by category (via marketplace.json)
grep -A 5 -B 5 "category.*search" .claude-plugin/marketplace.json
```

**Batch Operations:**
```bash
# Validate all plugin manifests
find plugins/ -name "plugin.json" -exec echo "Checking: {}" \; -exec cat {} \;

# Test all plugins locally (scriptable)
for plugin in plugins/*/; do
  plugin_name=$(basename "$plugin")
  echo "Testing plugin: $plugin_name"
  # Add testing commands here
done
```


## Performance Optimization

### Plugin Best Practices

- Minimize startup time for plugins
- Use lazy loading for heavy operations
- Implement efficient error handling
- Cache frequently accessed data
- Optimize external API calls

### Resource Management

- Clean up resources when plugins are disabled
- Avoid memory leaks in long-running operations
- Use appropriate timeouts for network operations
- Monitor plugin resource usage

## Agent-Specific Instructions

### For Claude Code Agents

- Read AGENTS.md files in plugin directories for specific guidance
- Follow plugin-specific conventions and workflows
- Respect plugin configuration and security settings
- Use plugin-provided tools and commands appropriately

### For Development Agents

- Maintain consistency with existing plugin patterns
- Follow established coding standards and practices
- Test changes thoroughly before submission
- Document any new patterns or conventions introduced
