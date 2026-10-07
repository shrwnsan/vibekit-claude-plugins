# Changelog

All notable changes to the search-plus plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.1.0] - 2026-10-07

### Fixed
- **Keyless URL extraction was broken**: spoofed Chrome 91 headers made `r.jina.ai` return a Cloudflare 403 challenge; extraction no longer sends browser headers to API services
- **Hook output was never applied**: progress logs went to stdout, so Claude Code could not parse the hook JSON. Stdout now carries only the JSON (logs go to stderr with `SEARCH_PLUS_DEBUG=1`)
- **Hook false positives**: recovery fired on successful pages that mentioned "403"/"429"/"empty". Detection now uses the tool's status code and result structure
- **Failures reported as success**: failed URL extraction exited 0 and printed ~50 KB of failure JSON. It now exits 1 and lists each service tried
- Wayback Machine fallback never ran (`cacheURL.substring is not a function`)
- Tavily requests left a 15s timer running after completion (`clearTimeout` on a promise)

### Added
- `PostToolUseFailure` hook for WebSearch/WebFetch: tool errors (e.g. a WebFetch 403) are now recovered, not only successful-but-empty results
- **Firecrawl** search and scrape: keyless by default, optional `SEARCH_PLUS_FIRECRAWL_API_KEY`. Restores web search with no API keys
- **Defuddle** (`defuddle.md`) keyless URL→markdown extraction fallback
- 25s internal deadline in the hook so it exits cleanly before the 30s hook timeout
- `SEARCH_PLUS_DEBUG=1` for progress logs

### Changed
- Script output is compact markdown (title, source, content / numbered results) instead of raw JSON. Hook context is capped below Claude Code's 10,000-character limit
- The per-call service health check is now opt-in; it spent a Tavily credit and Jina tokens on every extraction
- `allowed-tools` in SKILL.md uses Claude Code tool names (`WebSearch`, `WebFetch`)

### Removed
- Dead fallbacks: Google Cache and Bing Cache (both shut down), Yandex Turbo, "double/triple" Jina redirects, a malformed "textise" URL, and Tavily retries that only changed the User-Agent sent to the Tavily API

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

[3.1.0]: https://github.com/shrwnsan/vibekit-claude-plugins/compare/v3.0.1...v3.1.0
[3.0.1]: https://github.com/shrwnsan/vibekit-claude-plugins/compare/v3.0.0...v3.0.1
[3.0.0]: https://github.com/shrwnsan/vibekit-claude-plugins/compare/v2.11.0...v3.0.0
[2.11.0]: https://github.com/shrwnsan/vibekit-claude-plugins/compare/v2.10.1...v2.11.0
[2.10.1]: https://github.com/shrwnsan/vibekit-claude-plugins/releases/tag/v2.10.1
