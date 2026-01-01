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

## Critical Boundaries

### Files Requiring Explicit Permission
Never modify these without user confirmation:
- `.claude-plugin/marketplace.json` - Registry of all plugins
- `plugins/[name]/.claude-plugin/plugin.json` - Plugin manifests
- Plugin version numbers in published plugins

### Historical Records (Context Only)
Use these for pattern reference, never modify existing entries:
- `test-results/*.json` - Historical test outputs (read-only)
- `docs/research-*.md` - Historical research records
- `docs/eval-*.md` - Completed evaluations
- `docs/retro-*.md` - Past retrospectives

**Note**: Creating NEW test results or documentation files is encouraged - these restrictions apply to existing historical records only.

## Common Workflows

### Adding a New Plugin
```bash
# 1. Create plugin structure (minimal required)
mkdir -p plugins/new-plugin/.claude-plugin

# 2. Add optional directories as needed
mkdir -p plugins/new-plugin/agents     # Only if plugin has agents
mkdir -p plugins/new-plugin/skills     # Only if plugin has skills
mkdir -p plugins/new-plugin/commands   # Only if plugin has commands
mkdir -p plugins/new-plugin/hooks      # Only if plugin has hooks

# 3. Create manifest
cat > plugins/new-plugin/.claude-plugin/plugin.json <<'EOF'
{
  "name": "new-plugin",
  "description": "Brief description",
  "version": "1.0.0",
  "author": {"name": "shrwnsan"}
}
EOF

# 4. Create README
cat > plugins/new-plugin/README.md <<'EOF'
# Plugin Name

Brief description of what this plugin does.

## Installation
\`\`\`
claude plugin install https://github.com/shrwnsan/vibekit-claude-plugins
\`\`\`

## Usage
[Usage instructions]
EOF

# 5. Register in marketplace (requires approval)
# Edit .claude-plugin/marketplace.json

# 6. Validate
claude plugin validate .
```

### Creating New Test Results
```bash
# Historical test results are preserved, but new outputs are encouraged
# Use timestamped filenames for new test runs:
test-results/baseline-YYYY-MM-DDTHH-MM-SS-SSSZ.json
test-results/enhanced-YYYY-MM-DDTHH-MM-SS-SSSZ.json
```

### Creating New Documentation
```bash
# Use appropriate prefix for new docs:
docs/prd-NNN-description.md        # Product Requirements
docs/research-NNN-description.md    # Research findings
docs/eval-NNN-description.md        # Evaluations/comparisons
docs/retro-NNN-description.md       # Retrospectives
```

### Modifying Existing Plugin
```bash
# 1. Read plugin context
cat plugins/[plugin-name]/README.md
cat plugins/[plugin-name]/.claude-plugin/plugin.json

# 2. Make changes

# 3. Validate marketplace integrity
claude plugin validate .

# 4. Update CHANGELOG if applicable
```

### Version Bumping Protocol
- **Patch** (1.x.X): Bug fixes, documentation updates
- **Minor** (x.X.0): New features, backward compatible
- **Major** (X.0.0): Breaking changes

Always update BOTH:
- `plugins/[name]/.claude-plugin/plugin.json`
- `.claude-plugin/marketplace.json`

## Decision Principles

1. **Marketplace Integrity**: Never break plugin validation
2. **Backward Compatibility**: Avoid breaking changes to published plugins
3. **Documentation Parity**: Code changes require doc updates
4. **Historical Preservation**: Existing test results and research docs are immutable
5. **Progressive Creation**: New plugins only need directories for features they actually implement

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