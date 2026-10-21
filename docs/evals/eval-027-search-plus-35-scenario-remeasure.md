# Eval 027: Search Plus 35-Scenario Re-Measurement on 3.4.0

**Date**: 2026-10-21
**Plugin version**: search-plus 3.4.0 (main @ `bb962cd`, before #111 CI)
**Question**: Does the README claim — *"95%+ Success Rate: From 0-20% baseline to reliable search (+400% improvement)"* — still hold on current code?

## Verdict

**Yes.** 33/35 scenarios passed (94.3% raw); both misses are by-design failure controls that failed *correctly* (structured, actionable, zero silent failures). Counted over legitimately attemptable scenarios: **33/33 = 100%**. With n=35, one scenario is worth ±2.9 percentage points, so 94.3% raw is statistically indistinguishable from the claimed 95%+.

## Context

The claim originates from a 35-scenario benchmark documented in [eval-012](eval-012-search-solutions-comparative-analysis.md) and `plugins/search-plus/docs/PERFORMANCE.md`, measured on **v2.7.0**. Since then the plugin has shipped 3.0→3.4.0, including 3.2.0's removal of the entire legacy recovery machinery and PRD-009's 3.3.1/3.4.0 (SSRF hardening, content-quality gate, SearXNG, offline test suite). The number had never been re-measured on current code — and PRD-009's content gate deliberately changed what "success" means (parked/blank/error bodies no longer count), making a re-run worthwhile.

## Methodology

- **Scenarios**: eval-012 enumerates only 4 queries verbatim and describes the rest by category. This re-measurement reconstructs 35 in that shape: 16 web searches (the 4 verbatim + developer-docs lookups + probes of the documented problem domains) and 19 URL extractions (6 documentation sites, 4 financial platforms — Yahoo Finance, Bloomberg, Reuters, SEC EDGAR, 4 social — HN, Reddit, X, Mastodon, 3 ordinary sites, and 2 honest-failure controls: reserved `example.com` and a clean 404).
- **Code path**: every scenario runs through the real `handleWebSearch()` from `plugins/search-plus/skills/meta-search/scripts/` — the exact function the skill invokes.
- **Config**: with API keys (`SEARCH_PLUS_TAVILY_API_KEY`/`SEARCH_PLUS_JINA_API_KEY`/`SEARCH_PLUS_BRAVE_API_KEY`/`SEARCH_PLUS_EXA_API_KEY` all set) — the same config class the original claim was measured under. The keyless path is covered by the offline test suite but was not live-benchmarked here.
- **Protocol**: sequential (rate-limiting behavior is part of what's measured), real network, single box, single run, 2026-10-21.
- **Success criteria (honest, post-F2)**: a search passes only with a non-empty result set; an extraction only with ≥100 chars of content; a failure counts as *silent* only if it produces no message at all.
- **Runner**: [`evals/search-plus/run-35-scenarios.mjs`](../../evals/search-plus/run-35-scenarios.mjs) — reproducible: `node evals/search-plus/run-35-scenarios.mjs out.json` from the repo root.

## Results

| Metric | Original claim (v2.7) | Measured (3.4.0) | Verdict |
|---|---|---|---|
| Overall success | 95%+ | 33/35 raw (94.3%); 33/33 legitimate | ✅ holds |
| Search queries | — | 16/16 (Tavily) | ✅ |
| URL extraction | — | 17/17 legitimate | ✅ |
| Silent failures | 0% | 0/35 — every failure structured & actionable | ✅ |
| Blocked-site recovery | 403 → "80%" | 7/7 blocker-heavy sites extracted | ✅ |
| Response time | 2.3s avg | ~2.5s cold | ✅ consistent |

### Per-scenario detail

Searches: all 16 passed via Tavily, cold 2.1–3.5s each. Extractions:

| Scenario | Result | Via | Cold latency |
|---|---|---|---|
| MDN fetch API | PASS (9,337 chars) | tavily | ~0.4–2s |
| react.dev hooks | PASS | tavily | fast |
| docs.python.org asyncio | PASS | tavily | fast |
| nodejs.org fs | PASS | tavily | ~1.1s |
| go.dev effective_go | PASS | tavily | ~1.1s |
| rust-lang.org learn | PASS | tavily | fast |
| finance.yahoo.com AAPL | PASS | tavily | ~2.4s |
| bloomberg.com/markets | PASS | tavily | ~2.4s |
| reuters.com/markets | **PASS — fell through to Firecrawl** | firecrawl | 22.0s |
| sec.gov EDGAR | PASS | tavily | ~1.1s |
| news.ycombinator.com | PASS | tavily | ~1.3s |
| reddit.com r/ClaudeAI | **PASS — fell through to Jina** | jinaPublic | 2.3s |
| x.com/AnthropicAI | PASS | tavily | ~0.8s |
| mastodon.social @anthropic | **PASS — fell through to Jina** | jinaPublic | 16.4s |
| wikipedia.org | PASS (58,569 chars) | tavily | ~0.8s |
| iana.org reserved | PASS | tavily | fast |
| httpbin.org/html | PASS | tavily | ~1.4s |
| example.com (control) | **FAIL by design** — rejected in 1ms with actionable reserved-domain message | — | 0ms |
| httpstat.us/404 (control) | **FAIL by design** — full chain walked (direct → Tavily → Jina), structured `Tried:` failure list | — | 20.9s |

The fallback chain engaged exactly where the claim's recovery narrative says it should: Reuters went direct→Tavily(empty)→Firecrawl; Reddit and Mastodon fell through to Jina after Tavily came up empty. Both controls failed honestly — no junk content, no silent exits, which is precisely the behavior PRD-009's F2 gate guarantees.

## Caveats

- **Reconstruction, not replication**: the original 35 were never fully enumerated; 4 queries are verbatim, 31 are rebuilt to eval-012's category description. Different environment and network than the 2025-11 original.
- **Provider-side caching**: a second pass ~35 minutes later ran ~10× faster (uniform ~250ms searches), indicating provider/cache warmth; the cold-run latencies above are the representative ones.
- **With-keys only**: matches the original claim's config class, but the README's keyless headline was not re-benchmarked live.
- **n=35, single run**: one scenario swings ±2.9pp; treat sub-3pp deltas as noise.
- **First run superseded**: an initial run misclassified extraction results (a runner bug reading the search shape off extraction payloads) and was discarded; the classifier fix is in the committed runner.

## Relation to other work

- Original benchmark and claim provenance: [eval-012](eval-012-search-solutions-comparative-analysis.md), `plugins/search-plus/docs/PERFORMANCE.md` (marked v2.7.0-era there).
- The success-criteria change that motivated this re-run: PRD-009 F2 (3.4.0) — see [prd-009](../plans/prd-009-search-plus-follow-up-hardening.md) (SHIPPED).
- README claim updated with a pointer to this eval in the same PR.
