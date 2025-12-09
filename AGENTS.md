# AGENTS.md

Claude Code plugin marketplace with productivity-enhancing plugins for developers.

## Setup commands

- No dependencies required - this is a pure plugin marketplace
- Test marketplace configuration: `claude plugin validate .`
- List plugins: `ls plugins/`

## Plugin development

### Create new plugin
```bash
mkdir plugins/new-plugin
mkdir plugins/new-plugin/.claude-plugin
# Create plugin.json with required fields
```

### Plugin structure
```
plugins/plugin-name/
├── .claude-plugin/plugin.json    # Required: plugin manifest
├── agents/                       # Optional: custom agents
├── commands/                     # Optional: slash commands
├── hooks/                        # Optional: workflow hooks
├── skills/                       # Optional: auto-discoverable skills
└── README.md                     # Required: plugin docs
```

### Update marketplace
Add plugin to `.claude-plugin/marketplace.json`:
```json
{
  "name": "plugin-name",
  "source": "./plugins/plugin-name",
  "version": "1.0.0",
  "description": "Brief description"
}
```

## Code style

- Use conventional commit format: `type(scope): description`
- Plugin names: kebab-case
- JSON: 2-space indentation
- Markdown: GitHub-flavored

## Testing

- Validate marketplace: `claude plugin validate .`
- Test plugin installation locally before submitting
- Check all required fields in plugin.json
- Verify plugin documentation is complete

## Security

- Never commit API keys or secrets
- Use environment variables for sensitive config
- Validate all external inputs
- Follow principle of least privilege

## Current plugins

### Base (`plugins/base/`)
- Git workflow automation
- Intelligent commit message crafting
- Quality assurance automation

### Search Plus (`plugins/search-plus/`)
- Enhanced web search with error handling
- Multi-service fallback architecture
- URL content extraction

## PR guidelines

- Update marketplace.json version for new plugins
- Include plugin documentation
- Test installation works
- Follow conventional commit format