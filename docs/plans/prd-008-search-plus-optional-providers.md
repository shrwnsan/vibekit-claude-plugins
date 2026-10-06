# PRD: Search-Plus Optional Providers

<!-- Version: 0.1.0 | Status: DRAFT | Updated: 2026-10-06 -->

## Overview

Add opt-in search and extraction providers to the `meta-search` skill for users who want higher limits or self-hosted control than the keyless tier (Firecrawl keyless, Defuddle) provides. Every provider in this PRD is strictly optional: the skill must keep working end-to-end with zero API keys.

Originates from the `feat/meta-search-free-providers` work (meta-search end-to-end repair); the provider ideas below were identified during that effort and deferred to keep the repair review focused.

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
- **Note**: Document the `search:
    formats: [html, json]` settings.yml requirement in CONFIGURATION.md.

### 3. Direct fetch with `Accept: text/markdown` (extraction, no key at all)

- **What**: Before any third-party extraction service, try a plain `fetch(url, { headers: { Accept: 'text/markdown' } })`. Confirmed during the repair work to return markdown on Cloudflare-hosted docs.
- **Env var**: none — always-on first step.
- **Slot**: Head of the URL extraction chain, before Tavily/Jina/Firecrawl/Defuddle.
- **Why it's in this PRD**: it changes provider behavior (not just adds a service), so it merits review even though it's free. It also removes one third-party dependency for well-behaved sites, cutting latency to ~1 round trip.
- **Guard**: treat as success only when the response is 200 and the body is non-empty text (not an HTML error page); otherwise fall through silently.

## Success Metrics

- With no env vars set: all existing offline tests pass; behavior identical to the `feat/meta-search-free-providers` baseline.
- With a provider configured: that service is attempted first in its tier; on failure the chain still completes via fallbacks.
- Failure output still lists every service tried, including newly added ones.
- `claude plugin validate .` passes; docs (SKILL.md, README.md, CONFIGURATION.md, CHANGELOG) updated in the same change.

## Open Questions

1. Parallel free-tier limits and response shape (verify against current docs before implementing).
2. Should SearXNG also serve URL extraction via its instances, or search only?
3. Should the direct-markdown fetch respect a configurable timeout separate from the 20s extractor default?

## Related (out of scope here)

Recommended follow-ups from the same effort, tracked separately:
- Delete `handle-search-error.mjs` / `handle-rate-limit.mjs` (~1,000 lines, nearly unreachable; rate-limit path sleeps 60s + 120s).
- Stop blanket-rejecting Jina output in `validateMeaningfulContent` ("URL Source:" is metadata, not failure).
