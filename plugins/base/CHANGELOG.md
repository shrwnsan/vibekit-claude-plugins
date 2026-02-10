# Changelog

All notable changes to the Base Plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.11.0] - 2026-02-11

### Added
- Test output filter: added npx/bunx support (vitest, jest, playwright, cypress, mocha, ava, tape)
- Supports compound commands (e.g., `npm run build && npx vitest`)
- Covers common one-off test runs, CI/CD workflows, and tool evaluation patterns
- Added 11 new test cases for npx/bunx pattern validation

## [1.10.1] - 2026-02-10

### Changed
- Test output filter: removed `^` anchor from patterns to match `npm test -- <args>`, compound commands like `npm test && build`
- Test output filter: added negative grep to exclude application logs (ISO timestamps, time-only stamps)
- Test output filter: removed redundant subshell wrapper and outer redirection for cleaner command syntax

## [1.10.0] - 2026-02-06

### Added
- PreToolUse hook for automatic test output filtering (npm, pytest, cargo, go, yarn, pnpm, bun, rspec, rails test, mvn test, gradle test)
- Reduces token costs by showing only errors, failures, and key test results
- Enabled by default, disable with `VIBEKIT_BASE_TEST_FILTER=none` or `VIBEKIT_BASE_TEST_FILTER=disable`
- Graceful degradation when `jq` is not installed
- Comprehensive documentation in `docs/test-output-filtering.md`

## [1.9.0] - 2026-02-05

### Skill Frontmatter Improvements

#### Added
- `user-invocable: true` to all skills for reliable slash command invocation
- `disable-model-invocation: true` to handoff-context to prevent accidental activation
- Dynamic context injection (`!` syntax) to systematic-debugging and crafting-commits skills
  - systematic-debugging: git log, recent test logs, build output
  - crafting-commits: git status, recent commits, branch information
- Expanded `allowed-tools` lists with explicit tool declarations for clarity

#### Changed
- Skills now support reliable `/skill-name` slash command invocation
- systematic-debugging skill pre-loads error context for faster debugging
- crafting-commits skill pre-loads git history for style consistency
- handoff-context no longer auto-activates during normal conversation

## [1.8.0] - 2026-02-04

### handoff-context skill

P1/P2 improvements from eval-021 analysis:

#### Added
- Confidence/completeness scoring (0.3-0.95 scale) with missing context detection
- Enhanced session tracking (unique session IDs, timestamps, duration)
- Learnings/debugging section for tracking patterns and techniques
- Quick start section (package manager detection, project type detection)
- Approaches tracking (what worked, what didn't, what's left to try)
- Iterative validation with `validate-context.sh` script
- YAML-based configuration system with multi-location support
  - `~/.config/agents/` (cross-tool standard)
  - `~/.claude/` (Claude Code specific)
  - `.agents/` (project-local)
- Monorepo support with multi-type project detection

#### Changed
- Updated templates with new YAML sections
- Updated documentation (eval-021, tasks-003, SKILL.md, templates.md)
- Improved package manager detection (npm, pnpm, yarn, bun with fallback chain)
- macOS-compatible random generation using openssl rand

## [1.7.7] - 2026-02-03

### handoff-context skill

#### Added
- `/handoff-context` slash command as the most reliable invocation method
- "Let's handoff" and "Lets handoff" trigger patterns
- Confidence scoring system (0.3-0.95 scale) for quality evaluation
- Validation script (`validate-context.sh`) for checking completeness
- `HANDOFF_FILE` output variable for easy file path capture

#### Changed
- Restructured to follow [agentskills.io](https://agentskills.io) standard
- Improved workflow to populate template in-place (single file)
- Tightened bash tool permissions for security
- Enhanced documentation with progressive disclosure structure

#### Fixed
- Script execution issue with imperative "you must:" language
- Cross-directory compatibility with `find ~/.claude/plugins`
- Double file creation issue
- Missing trigger patterns causing skill to be ignored

## [1.7.0] - 2026-02-03

### handoff-context skill

#### Added
- Progressive disclosure implementation with capture-context.sh
- Automated git state capture (branch, staged/unstaged files)
- Structured YAML context generation with unique timestamps
- Error handling for non-git repos and script failures
- Quick reference examples (examples-quick.md)
- Evaluation test suite for validation scenarios
- Screenshots demonstrating usage

#### Changed
- Refactored documentation with progressive disclosure
- Simplified SKILL.md with quick start section
- Moved detailed workflow to references/workflow.md

### CI workflow

#### Added
- docs-bypass.yml for auto-merging documentation-only changes

## [1.6.0] - 2026-01-26

### handoff-context skill

#### Added
- Natural language thread continuation
- Detects handoff triggers: "handoff and", "handoff to", "start a new thread with this"
- Captures git state, conversation summary, active work, next steps
- Writes to `/tmp/` with private temp directory for security
- Agent-agnostic output compatible with agentskills.io standard
- Complements Claude Code Tasks system for clean slate continuation

## [1.5.0] - 2026-01-11

### systematic-debugging skill

#### Added
- Structured debugging approach with 5-step workflow: capture context, reproduce, isolate, fix, verify
- Guardrails against common debugging pitfalls
- Multi-component system debugging guidance
- Architecture questioning when 3+ fixes fail
- Auto-activates on error language and debugging context

### /review-arch command

#### Added
- Comprehensive architecture reviews
- Analyzes components, data flows, and risks
- Provides prioritized improvement opportunities
- Supports optional focus areas (backend, frontend, auth, performance)
- Delivers actionable insights with concrete next steps

## [1.3.0] - 2025-12-08

### /commit command

#### Added
- Flexible CLI modes: `-f`/`--fast` for quick commits, `-v`/`--verbose` for detailed analysis
- Auto-detection based on change complexity (default behavior)
- Support for both short (`-f`, `-v`) and long (`--fast`, `--verbose`) flags
- Progressive disclosure design - simple by default, detailed when needed
- Enhanced argument-hint showing all available options

#### Changed
- Improved command description to include flag hints
- Better UX with user choice over verbosity level based on context
- Updated terminology from "complex" to "detailed" for positive framing

### Documentation

#### Added
- Comprehensive evaluation document (`eval-014`) comparing with Anthropic's official commit-commands plugin
- Reframed positioning to emphasize "adaptive productivity" for VibeKit's brand

## [1.2.0] - Previous

### Added
- Base plugin workflow orchestration capabilities
- Crafting-commits skill for intelligent commit message creation
- Essential Claude Code workflow tools

[Unreleased]: https://github.com/shrwnsan/vibekit-claude-plugins/compare/v1.11.0...HEAD
[1.11.0]: https://github.com/shrwnsan/vibekit-claude-plugins/compare/v1.10.1...v1.11.0
[1.10.1]: https://github.com/shrwnsan/vibekit-claude-plugins/compare/v1.10.0...v1.10.1
[1.10.0]: https://github.com/shrwnsan/vibekit-claude-plugins/compare/v1.9.1...v1.10.0
[1.9.0]: https://github.com/shrwnsan/vibekit-claude-plugins/compare/v1.8.0...v1.9.0
[1.8.0]: https://github.com/shrwnsan/vibekit-claude-plugins/compare/v1.7.7...v1.8.0
[1.7.7]: https://github.com/shrwnsan/vibekit-claude-plugins/compare/v1.7.0...v1.7.7
[1.7.0]: https://github.com/shrwnsan/vibekit-claude-plugins/compare/v1.6.0...v1.7.0
[1.6.0]: https://github.com/shrwnsan/vibekit-claude-plugins/compare/v1.5.0...v1.6.0
[1.5.0]: https://github.com/shrwnsan/vibekit-claude-plugins/compare/v1.3.0...v1.5.0
[1.3.0]: https://github.com/shrwnsan/vibekit-claude-plugins/compare/v1.2.0...v1.3.0
