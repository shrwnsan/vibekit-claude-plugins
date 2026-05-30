# Research 010: Algolia Fit Assessment for Search-Plus Plugin

## Executive Summary

**Verdict: No fit. Do not PRD.** Algolia is a "search YOUR data" platform. Search Plus is a "search THE WEB" tool. These solve fundamentally different problems with near-zero overlap. Adding Algolia would mean building and maintaining a custom index for zero gain in Search Plus's actual mission (reliable web search and URL extraction).

## Problem Statement

The Build and Grow plans on [algolia.com/pricing](https://www.algolia.com/pricing) offer generous free-tier inclusions (10K search requests/month, 1M records, AI features). This research evaluates whether any of these capabilities could add value to the Search Plus plugin's multi-service search and URL extraction architecture.

## Search Plus Context

Search Plus provides reliable web search via a sequential fallback chain of internet search APIs:

| Priority | Service | Function |
|----------|---------|----------|
| 1 | Tavily API | Web search + URL extraction |
| 2 | Brave Search API | Web search |
| 3 | Exa AI Search | Semantic/neural web search |
| 4 | Jina.ai Search API | Web search + URL extraction |
| — | Jina.ai Public Reader | URL extraction (free, 20 RPM) |
| — | Cache services | Google Cache, Archive.org, Bing, Yandex |

All services search **the open internet** or extract content from **arbitrary URLs**. The plugin is stateless — no data storage, no index management.

## What Algolia Actually Is

Algolia is a **Search-as-a-Service** platform — essentially "Elasticsearch-as-a-service" with better developer experience. You upload your own records (products, articles, documentation pages) into an Algolia index, then Algolia provides fast, typo-tolerant search over that curated dataset.

### Algolia IS:
- Search over YOUR pre-indexed data
- Site search / e-commerce search / documentation search
- A platform where YOU manage records, indices, and crawler configurations
- Optimized for sub-100ms search latency over structured, faceted data

### Algolia is NOT:
- A general web search API
- A content extraction service for arbitrary URLs
- A web crawler for the open internet
- A replacement for Tavily, Brave, Exa, or Jina

> **Key constraint**: The Build (free) plan is explicitly for **development and testing** — Algolia's own docs state it should not be used in production. Watermarks are shown on Build plan results.

## Plan Feature Decomposition

### Build Plan — "10K search requests/month"
- **What it means**: 10K queries against YOUR uploaded index, not the web.
- **Search Plus relevance**: None. We don't maintain an index.

### Build Plan — "1M records included"
- **What it means**: 1M items you can upload to search over.
- **Search Plus relevance**: None. Search Plus is stateless — no data storage.

### Build Plan — "AI Recommendations / AI Dynamic Re-ranking / AI Synonyms / Personalization"
- **What it means**: AI features that enhance search over YOUR data.
- **Search Plus relevance**: None. These operate on a pre-built index with user behavior data.

### Grow Plan — "Keyword Search + Browse"
- **What it means**: Full-text search and faceted browsing over YOUR records.
- **Search Plus relevance**: None. We need web search, not indexed data search.

### Grow Plan — "Query suggestions"
- **What it means**: Auto-complete from YOUR indexed content.
- **Search Plus relevance**: None. Claude generates its own queries.

### Grow Plan — "Rules: 10/index" + "Manual synonyms"
- **What it means**: Merchandising rules and synonym management for YOUR index.
- **Search Plus relevance**: Marginal. Our 422 recovery (query simplification) already works at 100% success rate with zero infrastructure.

### Grow Plan — "Data transformation"
- **What it means**: Transform YOUR records before indexing.
- **Search Plus relevance**: None.

### Grow Plan — "Analytics (30-day retention)"
- **What it means**: Analytics on searches over YOUR data.
- **Search Plus relevance**: None. Search Plus has no tracking or analytics by design.

### Build Plan — "10K crawls/month"
- **What it means**: Algolia's crawler can index up to 10K pages from YOUR configured sites.
- **Search Plus relevance**: Very low. Could theoretically crawl specific doc sites, but Jina.ai and Tavily already extract content from any URL on-demand with no pre-indexing overhead. At 10K crawls/month, you could barely keep a few small documentation sites indexed. Hard service limits also apply: 10KB max record size, ~1,000 facets/index, ~100 filters/query.

### Build Plan — "1 Generative Experience Guide included"
- **What it means**: Algolia's RAG-like feature that generates answers from YOUR indexed content.
- **Search Plus relevance**: None. Claude itself is the RAG engine — Search Plus just feeds it web content.

## Cost-Benefit Comparison

| Factor | Algolia | Current Stack (Tavily / Brave / Exa / Jina) |
|--------|---------|---------------------------------------------|
| Web search capability | ❌ None | ✅ All four services |
| URL content extraction | ❌ None | ✅ Tavily + Jina |
| Free tier (web search) | N/A (not applicable) | 1K+ searches/month each |
| Setup complexity | High (create index, configure crawler, manage records) | Low (paste API key) |
| Ongoing maintenance | Required (re-index, update records) | None (stateless) |
| Latency | ~50ms (over your index) | ~670–2331ms (web search) |
| Fits Search Plus mission | 0% | 100% |

## Explored Creative Angles

### Angle 1: Query public Algolia indices
Some sites expose their Algolia indices publicly (HN Search, npm package search). The Algolia JS client can query these with a public app ID + search-only API key.

- **Why it doesn't fit**: Extremely narrow — searching ONE site's index, not the web. These sites already have dedicated APIs (HN API, npm registry API) that are more direct and purpose-built.

### Angle 2: Algolia Crawler for curated doc search
Configure Algolia to crawl specific documentation sites, then use Algolia's fast search over that curated corpus instead of hitting the web each time.

- **Why it doesn't fit**: Jina.ai and Tavily already extract content from any URL on-demand with no pre-indexing. The crawler's 10K/month limit is too tight for even a few doc sites. Adds massive infrastructure overhead (index management, sync schedules, record updates) for a marginal latency improvement. Build plan caps at 10 indices and 1M records total — far too constrained for meaningful documentation coverage across even a handful of frameworks.

### Angle 3: AI Re-ranking on Search Plus results
Send Search Plus results to Algolia for AI-powered re-ranking.

- **Why it doesn't fit**: Adds network latency for an unnecessary middleware step. Search Plus already transforms and ranks results via `response-transformer.mjs`. Overkill for a Claude Code plugin.

### Angle 4: AI Synonyms for query reformulation
Use Algolia's synonym engine to improve 422 error recovery (query reformulation strategy).

- **Why it doesn't fit**: Requires building and maintaining a synonym dictionary in Algolia. Current approach (strip special chars, simplify query) achieves 100% success rate on 422 errors with zero infrastructure.

### Angle 5: Personal knowledge base
Users curate a personal index of frequently-searched docs and search it via Algolia instead of the web.

- **Why it doesn't fit here**: This would be an entirely separate plugin concept ("Claude Knowledge Base"), not a Search Plus enhancement. It has no relationship to Search Plus's core mission of web search error recovery.

## What Would Need to Be True

For Algolia to add value to Search Plus, ALL of these would need to hold:

1. Search Plus maintains a curated corpus of frequently-accessed content
2. Users pre-configure which sites to index
3. "Searching my indexed docs" provides clear value over "searching the web"
4. Index management overhead is justified by performance/reliability gains

**None of these conditions hold for Search Plus's current value proposition.**

## Conclusion

Algolia solves a completely different problem than Search Plus. The plugin exists specifically because Claude Code's web search fails and users need reliable access to the open internet. Algolia provides fast search over your own pre-indexed data — a valuable service, but orthogonal to everything Search Plus does.

**Recommendation**: Do not pursue a PRD. If a "personal knowledge base" plugin is ever desired, Algolia would be a strong candidate for that separate product — but it has no place in Search Plus.

## References

- [Algolia Pricing](https://www.algolia.com/pricing)
- [Search Plus Architecture](../../plugins/search-plus/docs/ARCHITECTURE.md)
- [Search Plus Configuration](../../plugins/search-plus/docs/CONFIGURATION.md)
- [Research 001: Tavily Competitor Analysis](research-001-tavily-competitor-analysis.md)
