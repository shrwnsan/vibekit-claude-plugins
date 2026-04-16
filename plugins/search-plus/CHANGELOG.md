# Changelog

All notable changes to the search-plus plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.1] - 2026-04-16

### Fixed
- Error recovery now uses all 4 providers (`performHybridSearch`) instead of Tavily-only `contentExtractor.tavily.search()` — 12 call sites fixed across `handle-search-error.mjs` and `handle-rate-limit.mjs`

### Removed
- ~250 lines of dead code: `trySearXNGSearch()`, `tryDuckDuckGoHTML()`, `tryStartpageHTML()` functions, dead transformers, and dead service bonus entries
- Unused `security-utils.mjs` import

### Changed
- Updated `STANDARD_RESPONSE_FORMAT.md` to document current providers only
- Updated README sandbox guidance with root cause and `excludedCommands` workaround

## [3.0.0] - 2026-04-14

### Added
- **Brave Search API** provider — independent 30B+ page index, fastest latency (~670ms avg), `SEARCH_PLUS_BRAVE_API_KEY`
- **Exa AI Search** provider — neural/semantic search for technical docs (~1.2s avg), `SEARCH_PLUS_EXA_API_KEY`
- **Jina Search API** provider (`s.jina.ai`) — replaces dead free services, `SEARCH_PLUS_JINA_API_KEY`
- 4-service sequential fallback chain: Tavily → Brave → Exa → Jina Search
- Response transformers for all new providers (brave, exa, jina-search)
- Service reliability bonuses for relevance scoring: Brave +0.09, Exa +0.08, Jina Search +0.07
- Environment variable deprecation warnings for old naming conventions
- Sandbox compatibility documentation

### Changed
- `performHybridSearch()` replaced dead `Promise.any([SearXNG, DuckDuckGo, Startpage])` with sequential 4-service chain
- Env var naming standardized to `SEARCH_PLUS_` prefix (old names still work with deprecation warnings)
- Jina env var canonical name changed from `SEARCH_PLUS_JINAAI_API_KEY` to `SEARCH_PLUS_JINA_API_KEY`
- Plugin description updated to reflect multi-service architecture

### Removed
- **BREAKING**: Free keyless web search path — was dead anyway (100% failure rate since early 2026)
  - SearXNG public instances: all return 403/429/timeout or are offline
  - DuckDuckGo HTML: returns CAPTCHA on all requests
  - Startpage HTML: returns JS-only shell with 0 parseable results

### Not Affected
- URL extraction via Jina Reader (`r.jina.ai`) — still works without API key at 20 RPM
- GitHub content extraction via `gh` CLI — unchanged

## [2.11.0] - 2026-04-12

### Added
- Sandbox compatibility notes in SKILL.md
- PostToolUseFailure limitation documentation

## [2.10.1] - 2026-04-11

_Previous versions were not tracked in a CHANGELOG._

[3.0.1]: https://github.com/shrwnsan/vibekit-claude-plugins/compare/v3.0.0...v3.0.1
[3.0.0]: https://github.com/shrwnsan/vibekit-claude-plugins/compare/v2.11.0...v3.0.0
[2.11.0]: https://github.com/shrwnsan/vibekit-claude-plugins/compare/v2.10.1...v2.11.0
[2.10.1]: https://github.com/shrwnsan/vibekit-claude-plugins/releases/tag/v2.10.1
