# Changelog

All notable changes to the Ping Claude Code plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] - 2026-02-13

### Added ✨
- **Relative Sound Filenames**: Sound files can now be specified relative to `PING_SOUNDS_DIR` or using absolute paths
- **Per-Event Disable**: Individual sound events can be disabled by setting them to empty string (`""`)
- **`${CLAUDE_PLUGIN_ROOT}` Variable**: Automatic resolution to plugin installation directory in configuration

### Changed 🔄
- **Configuration System**: Migrated from environment file to `settings.json` for better integration with Claude Code
- **Documentation**: Enhanced configuration examples with relative/absolute path options

### Configuration ⚙️
- `PING_SOUND_SESSION_START` - Sound for session start event (set to `""` to disable)
- `PING_SOUND_USER_PROMPT` - Sound when Claude needs your input (set to `""` to disable)
- `PING_SOUND_NOTIFICATION` - Sound for general notifications (set to `""` to disable)
- `PING_SOUND_STOP` - Sound when session completes (set to `""` to disable)

## [1.0.0] - 2025-12-23

### Added ✨
- **Initial Release**: Sound notifications for Claude Code events
- **Four Event Types**: Session Start, User Prompt, Notification, Stop
- **Cross-Platform Support**: macOS (afplay), Linux (paplay/aplay), Windows (PowerShell)
- **Default Sounds**: Included Warcraft-inspired Peon sounds
- **Hook-Based Integration**: Uses Claude Code hooks for event detection

[Unreleased]: https://github.com/shrwnsan/vibekit-claude-plugins/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/shrwnsan/vibekit-claude-plugins/compare/v1.0.0...v1.2.0
[1.0.0]: https://github.com/shrwnsan/vibekit-claude-plugins/releases/tag/v1.0.0
