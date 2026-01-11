# Changelog

All notable changes to the Base Plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.0] - 2025-01-11

### Added
- **/review-arch command** for comprehensive architecture reviews
  - Analyzes components, data flows, and risks
  - Provides prioritized improvement opportunities
  - Supports optional focus areas (backend, frontend, auth, performance)
  - Delivers actionable insights with concrete next steps

### Changed
- Updated plugin version to 1.5.0 for marketplace consistency

## [1.3.0] - 2025-12-08

### Added
- **Enhanced /commit command** with flexible CLI modes:
  - `-f` or `--fast` flag for quick commits with minimal validation
  - `-v` or `--verbose` flag for detailed analysis and comprehensive review
  - Auto-detection based on change complexity (default behavior)
- Support for both short (`-f`, `-v`) and long (`--fast`, `--verbose`) flags
- Progressive disclosure design - simple by default, detailed when needed
- Updated terminology from "complex" to "detailed" for positive framing
- Enhanced argument-hint showing all available options

### Changed
- Improved command description to include flag hints
- Better UX with user choice over verbosity level based on context

### Documentation
- Added comprehensive evaluation document (`eval-014`) comparing with Anthropic's official commit-commands plugin
- Reframed positioning to emphasize "adaptive productivity" for VibeKit's brand

## [1.2.0] - Previous

### Added
- Base plugin workflow orchestration capabilities
- Crafting-commits skill for intelligent commit message creation
- Essential Claude Code workflow tools

[Unreleased]: https://github.com/shrwnsan/vibekit-claude-plugins/compare/v1.5.0...HEAD
[1.5.0]: https://github.com/shrwnsan/vibekit-claude-plugins/compare/v1.3.0...v1.5.0
[1.3.0]: https://github.com/shrwnsan/vibekit-claude-plugins/compare/v1.2.0...v1.3.0