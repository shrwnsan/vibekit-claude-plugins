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

### Skills sync to the agents hub

`plugins/<name>/skills/` directories sync to the public [shrwnsan/agents](https://github.com/shrwnsan/agents) hub (Apache-2.0) on push to main via `.github/workflows/sync-skills.yml`. The gate is fail-closed and lives in `.github/sync-skills.json` — repo-level CI config, deliberately not inside plugin dirs, where it would ship with plugin installs:

- A skill syncs only if its plugin (`"base"`) or the individual skill (`"tempo/risk-triage"`) is listed under `"synced"`.
- No entry = no sync (default for any new plugin).
- `"excluded"` is an inert reason map for the sync log — haku (CC BY-SA 4.0 licensing).

To publish a plugin's skills to the hub, deliberately add it to `"synced"` in `.github/sync-skills.json` after reviewing each skill for portability.

## Code style

- Use conventional commit format: `type(scope): description`
- Plugin names: kebab-case
- JSON: 2-space indentation
- Markdown: GitHub-flavored
- Plugin outputs (logs, hook JSON, generated docs, skill examples) never carry absolute home paths (`/Users/<name>`, `/home/<name>`) — abbreviate `$HOME` to `~`

## Testing

- Validate marketplace: `claude plugin validate .`
- search-plus offline suite: `cd plugins/search-plus/skills/meta-search/scripts && node --test tests/*.test.mjs` (runs in CI via `.github/workflows/search-plus-tests.yml`)
- reflex offline suites: `node evals/reflex/run.mjs` (mock-provider gate matrix) and `node --test evals/reflex/tests/*.test.mjs` (outcome correlator; run in CI via `.github/workflows/reflex-tests.yml`)
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

A version bump is **required whenever a plugin's content changes** — skills, agents, commands, hooks, scripts, README — at minimum patch, in the same PR as the change. Un-bumped content changes make release-train bodies unreliable (e.g. #114 shipped a base-skills fix without one, so base 1.12.0 content differed between trains).

### Release Train (marketplace tags and releases)
Tags and GitHub Releases are keyed to the **marketplace version** (`.claude-plugin/marketplace.json` `metadata.version`), not to individual plugins — this repo ships several plugins and the Releases page should reflect the marketplace as a whole.

When cutting a release:
1. Bump `metadata.version` in `.claude-plugin/marketplace.json` (patch for plugin-level fixes, minor for plugin features or new plugins)
2. Tag the release commit: `git tag -a v<version> -m "..." && git push origin v<version>`
3. Publish the release titled `v<version>`. The body lists the **changes in the bump** — only plugins that changed since the previous train, each with its old → new version range and highlight bullets pulled from its CHANGELOG at the cut; unchanged plugins are omitted. If a cut contains no plugin changes (marketplace/docs-only), say so in one line. No convention-explainer copy in the body. Example: [v1.7.0](https://github.com/shrwnsan/vibekit-claude-plugins/releases/tag/v1.7.0)

Per-plugin change detail stays in each plugin's `CHANGELOG.md`; plugin bumps ride the next train. (The former plugin-keyed `v2.x`/`v3.x` tags and releases were removed on 2026-10-27, and the marketplace stream is the sole release history — backfilled to v1.0.0, 2025-10-12.)

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
- Git workflow automation (commit crafting, branch hygiene)
- Quality assurance automation and systematic debugging
- Handoff context for session continuation

### Search Plus (`plugins/search-plus/`)
- Enhanced web search with multi-service fallback (Tavily, Brave, Exa, Jina, keyless Firecrawl/Defuddle)
- Works without API keys
- URL content extraction and structured failure detection

### Ping (`plugins/ping/`)
- Sound notifications for session events, prompts, and task completion
- Cross-platform: macOS, Linux, Windows
- Configurable via `~/.claude/ping-config.json`

### Haku (`plugins/haku/`, vendored from [shrwnsan/haku](https://github.com/shrwnsan/haku))
- Lean leadership loop: decide → spec → evidence
- 8-skill core + 5 gate agents + 8 opt-in role packs
- License: CC BY-SA 4.0 (only non-Apache plugin)

### tempo (`plugins/tempo/`)
- Safety-proportional process: risk-triage router + tier-0/1/2 flow skills + SessionStart routing table
- Measured against bare Claude Code and a process-heavy reference (tasks-005); skills hub-published to shrwnsan/agents
- Skills sync allowlisted in `.github/sync-skills.json`; routing golden set in `evals/ceremony/`

### Reflex (`plugins/reflex/`)
- Pre-classifier permission gate for auto mode: typed allow/ask/deny PreToolUse decisions from System One decision models (TypeSafe Jev, Liquid d1, compatible endpoints)
- Local regex fast paths (allow read-only, deny unambiguous destruction); decision-model chain only for risky-but-contextual commands
- Fails safe: provider error or uncertainty hands the call back to Claude Code's own classifier; `REFLEX_DISABLED=1` kill switch; every verdict logged as JSONL
- v0.1.0: thresholds uncalibrated by design — verdict log + `evals/reflex/` harness accumulate labels for tuning
- v0.1.3: auto-mode-only scope (hook reads `permission_mode`; `REFLEX_ALL_MODES=1` extends ask/deny, never allows outside auto), secrets fast-path ask, labeled fast-path reasons (label + matched snippet), verdict log carries full command + `mode`/`ms`/`callMs`/`pattern`
- v0.1.4: verdict log and failstate created 0600/0700 (the log stores verbatim command text); inline credential literals (Authorization/Bearer headers, `sk-`/GitHub/AWS/Slack tokens, PEM blocks) fire the step-0 secrets ask before the provider chain, so a literal credential reaches a human and never egresses to a decision-model provider
- v0.1.5: verdict lines carry hook-correlation ids (`tool_use_id`/`session_id`/`transcript_path`); post-hoc `evals/reflex/correlate-outcomes.mjs` joins verdicts to session transcripts and appends `kind:"outcome"` labels (agreed/overridden/no-match) with an override-rate-per-pattern-class summary — threshold-tuning ground truth, kept out of the gate process; eval matrix fixed (silently red since 0.1.3: harness sent no `permission_mode`)
- v0.1.6: reflex-authored paths home-abbreviated (`$HOME` → `~`) in the verdict log's `cwd` and the provider prompt — no username in shared logs or provider payloads; `command`/`transcript_path` stay verbatim (replay + transcript join)
- v0.2.0: `/reflex:status` command + `scripts/reflex-status.mjs` reader (health, windowed metrics, outcome tallies, version-drift detection — running gate inferred from verdict field shape); `transcript_path` now home-abbreviated too (last username-carrying field; correlator expands `~`, basename fallback covers older absolute lines; `command` stays verbatim for replay); status output is paste-safe — labels/counts only, never command text

## PR guidelines

- Update marketplace.json version for new plugins
- Include plugin documentation
- Test installation works
- Follow conventional commit format