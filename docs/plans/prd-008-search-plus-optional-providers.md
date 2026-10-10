# PRD: Search-Plus Optional Providers

<!-- Version: 0.3.0 | Status: READY | Updated: 2026-10-10 -->

## Overview

Add opt-in search and extraction providers to the `meta-search` skill for users who want higher limits or self-hosted control than the keyless tier (Firecrawl keyless, Defuddle) provides. Every provider in this PRD is strictly optional: the skill must keep working end-to-end with zero API keys.

Originates from the `feat/meta-search-free-providers` work (meta-search end-to-end repair, merged to `main` as `c0d1ed0`); the provider ideas below were identified during that effort and deferred to keep the repair review focused.

## Goals

- Zero-key operation remains the default and stays fully functional.
- Each provider activates only when its environment variable is set — no new required config, no behavior change for existing users.
- Providers slot into the existing sequential fallback chains (search: Tavily → Brave → Exa → Jina → Firecrawl; URL extraction: Tavily → Jina → Firecrawl → Defuddle → Wayback) at the tier their key/URL earns.
- Follow the established patterns: `SEARCH_PLUS_*` namespacing, per-service transformer in `response-transformer.mjs`, timeouts on every fetch, honest failure messages listing every service tried.

## Non-Goals

- Replacing or reordering the existing keyless tier.
- Key-management UX beyond environment variables (no config files, no OAuth).
- Provider-side caching or result deduplication across services.

## Problem Statement

The keyless tier restores zero-cost operation but shares public rate limits: Firecrawl keyless is rate-limited per IP, and Defuddle is a free community service. Users running many extractions (agents, CI, shared hosts) hit those limits. Optional keyed/self-hosted providers raise the ceiling without taxing users who don't need it.

## Candidate Providers

### 1. Parallel Web Search

- **What**: Parallel's Web Search API (parallel.ai) — reported ~5,000 free searches/month. Verify current limits at integration time.
- **Env var**: `SEARCH_PLUS_PARALLEL_API_KEY`
- **Slot**: After Brave/Exa (keyed tier), before Jina — keyed search outranks keyless Firecrawl.
- **Work**: `tryParallelSearch()` in `handle-web-search.mjs` + `parallelTransformer` in `response-transformer.mjs` registered as `'parallel'`.

### 2. SearXNG (self-hosted meta-search)

- **What**: User-hosted SearXNG instance; aggregates Google/Bing/DDG without per-provider keys. Best fit for privacy-sensitive and air-gapped-ish setups.
- **Env var**: `SEARCH_PLUS_SEARXNG_URL` (e.g. `http://searx.local:8080`) — presence enables; optional `SEARCH_PLUS_SEARXNG_API_KEY` if the instance requires auth.
- **Slot**: First search service when configured — a self-hosted instance is the user's declared preferred infrastructure, and it costs nothing per query.
- **Work**: `trySearxngSearch()` calling `{SEARXNG_URL}/search?q=…&format=json` (instance must have `format=json` enabled); transformer registered as `'searxng'`.
- **Scope**: search only — SearXNG returns result lists, not page content, so it does not join the extraction chain (resolves former open question 2).
- **Note**: Document in CONFIGURATION.md that the instance's `settings.yml` must enable JSON output (`search: formats: [html, json]`).

### 3. Direct fetch with `Accept: text/markdown` (extraction, no key at all)

*(Implemented 2026-10-08 — PR #99, shipped as the extraction chain head exactly as specified below.)*

- **What**: Before any third-party extraction service, try a plain `fetch(url, { headers: { Accept: 'text/markdown' } })`. Confirmed during the repair work to return markdown on Cloudflare-hosted docs.
- **Env var**: none — always-on first step.
- **Slot**: Head of the URL extraction chain, before Tavily/Jina/Firecrawl/Defuddle.
- **Why it's in this PRD**: it changes provider behavior (not just adds a service), so it merits review even though it's free. It also removes one third-party dependency for well-behaved sites, cutting latency to ~1 round trip.
- **Guard**: treat as success only when the response is 200 **and** `Content-Type` is `text/markdown` with a non-empty body. Most sites ignore the `Accept` header and return a normal 200 HTML page, so status alone is not a signal; otherwise fall through silently.
- **Precondition**: runs after `validateAndNormalizeURL`/SSRF validation like every provider. **Gap found post-ship:** that validation covers only the initial URL. Redirects are followed without re-validation, and the private-address blocklist is incomplete. Fix tracked as PRD-009 F1 (3.3.1).
- **Timeout**: reuse the existing per-fetch `AbortSignal.timeout` pattern; no separate configuration knob (resolves former open question 3).

## Success Metrics

- With no env vars set: all existing offline tests pass; behavior identical to the merged baseline (`main` at `c0d1ed0`). The 17-test offline suite (`plugins/search-plus/skills/meta-search/scripts/tests/`) is the regression net.
- With a provider configured: that service is attempted first in its tier; on failure the chain still completes via fallbacks.
- Failure output still lists every service tried, including newly added ones.
- `claude plugin validate .` passes; docs (SKILL.md, README.md, CONFIGURATION.md, CHANGELOG) updated in the same change.

## Open Questions

1. Parallel free-tier limits and response shape (verify against current docs before implementing).

*(Former questions 2 and 3 are resolved in the candidate sections above.)*

## Follow-Up

The post-3.3.0 review, its sequencing for SearXNG and Parallel, and the decision to defer a provider-registry refactor are in [PRD-009: Search-Plus Follow-Up Hardening](prd-009-search-plus-follow-up-hardening.md).

## Related (out of scope here)

Recommended follow-ups, tracked separately:

Provider and validation quality *(resolved 2026-10-08 by the legacy-recovery removal PR)*:
- ✅ Deleted `handle-search-error.mjs` / `handle-rate-limit.mjs` (~1,000 lines): proven unreachable — the only error reaching their dispatcher was the fixed all-failed message, against which every branch was inert.
- ✅ Jina output no longer blanket-rejected in `validateMeaningfulContent` (frontmatter keys were metadata, not failure).
- ✅ `validateMeaningfulContent` false signals fixed: parked-domain spam patterns added, Wayback banner chrome exempted for wayback-sourced sources (covered by tests). *Note:* validation is still metadata-only, so parked pages still exit 0 without falling through; tracked as PRD-009 F2.
- ✅ Jina removed from the Wayback snapshot extractors: Defuddle is the only viable extractor there (r.jina.ai blocked for web.archive.org until 2035).

Bugs and nits *(resolved 2026-10-08 across PRs #98 and #99)*:
- ✅ Cleared the `Promise.race` timeout timers in `github-service.mjs` (`clearTimeout` in the existing fetch `finally` blocks of both fetchers).
- ✅ `findWaybackSnapshot` now distinguishes an archive.org availability-API outage from a genuinely missing snapshot in its log output (no retry, return value unchanged).
- ✅ The `example.com` gate still rejects reserved test domains pre-network, but now says so ("reserved test domain ... Provide a real URL") instead of the generic suspicious-domain wording.
- ✅ The extraction log label now derives from `PRIMARY_EXTRACTION_SERVICE` instead of the hardcoded "Using Tavily first..." (required once the direct markdown fetch became the chain head).

Documentation *(resolved 2026-10-08 on the docs-ledger-debts branch)*:
- ✅ Rewrote `agents/search-plus.md` Outputs to the actual CLI interface (compact markdown + exit code, service named in the header line, stderr failure summary with the `Tried:` provider list); dropped the unproduced `length_tokens`/`content_type` schema.
- ✅ Documented the opt-in service health check (`content-extractor.mjs:1075-1105`) in `docs/CONFIGURATION.md`: programmatic-only via `performHealthCheck: true`, spends a Tavily credit plus Jina tokens per run.
