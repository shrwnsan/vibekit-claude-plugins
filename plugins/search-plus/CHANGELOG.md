# Changelog: Search Plus Plugin

All notable changes to the Search Plus Claude Code plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.4.1] - 2025-11-04

### Added
- **CHANGELOG.md**: Comprehensive changelog following Keep a Changelog format
- **Recovery Timeout Configuration**: `SEARCH_PLUS_RECOVERY_TIMEOUT_MS` environment variable for 451 error handling
- **SSRF Protection**: Enhanced URL validation security in hooks

### Changed
- **Success Rate Claims**: Updated with specific metrics (95-98%, 85-90%, 100%, 90%, 80%) and testing context
- **Documentation Transparency**: Added controlled testing caveats for realistic expectations
- **Executive Summary**: Enhanced with concrete improvement metrics and baseline comparisons
- **Error Handling**: Standardized error handling in recovery strategies
- **API Key Handling**: Standardized to use null fallback pattern

### Fixed
- **Mermaid Flow Diagram**: Removed extra blank lines for cleaner rendering

## [2.4.0] - 2025-11-03

### Added
- **451 SecurityCompromiseError Handling**: Multi-strategy recovery for HTTP 451 errors
  - Alternative search sources with domain exclusion
  - Query reformulation to avoid blocked domains
  - Archive/cached content searches
  - Jina API key bypass for content extraction
- **Configurable 404 Enhancement**: Environment variable `SEARCH_PLUS_404_MODE`

### Changed
- **Documentation**: Updated across all files with 451 error handling details

## [2.3.0] - 2025-11-03

### Changed
- **Version Bump**: Updated to v2.3.0 for marketplace consistency

## [2.2.1] - 2025-11-02

### Fixed
- **Success Reporting**: Accurate success reporting and URL validation
- **Plugin Manifest**: Removed invalid 'capabilities' field

## [2.2.0] - 2025-11-01

### Added
- **Comprehensive Error Handling**: Achieves 97% success rate
- **Enhanced Agent**: Updated plugin agent with improved capabilities
- **A/B Testing Framework**: Dynamic baseline detection for automated testing

### Changed
- **SKILL.md**: Optimized with comprehensive A/B testing validation
- **Testing Framework**: Improved A/B test framework and plugin configuration

## [2.1.0] - 2025-10-26

### Added
- **Enhanced Content Extraction**: Tavily + Jina.ai fallback strategy
- **Self-Referential Testing**: Complete testing and skills optimization
- **Plugin Testing**: Hybrid feedback and performance validation

## [2.0.0] - 2025-10-24

### Added
- **Search Plus Skill**: Auto-discovery and three-tier invocation (Skill/Command/Agent)
- **Comprehensive Documentation**: Complete documentation suite and licensing framework
- **Enhanced Error Handling**: 422 schema validation support

### Changed
- **Plugin Architecture**: Complete restructure for marketplace integration
- **Core Functionality**: Enhanced search-plus plugin capabilities

### Fixed
- **Plugin Manifest**: Corrected plugin.json structure

## [1.0.0] - 2025-10-24

### Added
- **Initial Release**: Basic web search enhancement for Claude Code
- **Plugin Infrastructure**: Core plugin structure with marketplace integration
- **Comprehensive Testing**: Test suite with marketplace-level infrastructure
- **Performance Metrics**: Plugin validation docs and performance metrics
