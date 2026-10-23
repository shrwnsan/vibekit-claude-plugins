# Eval 028: Tavily vs TinyFish Search — Which Goes First?

**Date**: 2026-10-23
**Plugin version**: search-plus 3.4.0 + TinyFish provider (PR #113)
**Question**: With both `SEARCH_PLUS_TAVILY_API_KEY` and `SEARCH_PLUS_TINYFISH_API_KEY` set, which search provider should `performHybridSearch()` try first?

## Verdict

**TinyFish first, Tavily second.** TinyFish ranked the official source first on **23/29** scored queries, against **3–5/29** for Tavily, and the gap was identical across two runs. TinyFish never failed (80/80 calls). Tavily failed 6/30 in the first run (cause not captured, not reproduced in 50 later calls), and its slow responses are worse: cold p90 5.9 s and max 8.3 s, against TinyFish's 3.6 s and 4.6 s. The 8.3 s exceeds the hook's 8 s per-provider timeout. TinyFish is also free within a daily allowance, while Tavily is 1,000 credits/month.

What Tavily keeps: it is the only provider that returns a synthesized `answer` (30/30), and its snippets are about 8× longer (≈1,170 vs ≈150 chars). Both stay available because Tavily remains the next provider whenever TinyFish fails or is unconfigured.

## Methodology

- **Queries**: 30. The 16 eval-027 search scenarios, plus 14 added for intents the hook sees in practice: recent releases (Node LTS, TypeScript 5.9, Python 3.14), pasted error messages, package/repo lookups, and infra docs.
- **Code path**: each query runs through the real `performHybridSearch()` once per provider, with only that provider's key set (fresh module instance per provider). A result that fell through to keyless Firecrawl counts as a provider failure.
- **Settings**: `maxResults: 5` (plugin default), 10 s per-provider timeout (the `search.mjs` default; the hook uses 8 s), sequential, real network.
- **Authority metric**: for each query, the expected authoritative domains (MDN, docs.python.org, kubernetes.io, sec.gov, …) were fixed in the runner **before the first run**. The metric is the rank of the first result on one of those domains. One query with no single authority ("financial data APIs free tier comparison") is unscored, so n = 29.
- **Reference overlap**: Brave and Exa run the same query, and each provider is scored by how many of its 5 URLs appear in the Brave ∪ Exa set. This is a consensus signal, not ground truth.
- **Manual read**: every top-5 list from run 1 was read side by side for relevance.
- **Runs**: run 1 (cold), run 2 (~3 min later, warm: Tavily answered in ~265 ms, so its latency is not representative), plus a cold latency/reliability probe on 20 fresh queries, calling the plugin's `tavily.search()` and the TinyFish request directly.
- **Runner**: [`evals/search-plus/compare-search-tavily-tinyfish.mjs`](../../evals/search-plus/compare-search-tavily-tinyfish.mjs). Run from the repo root: `node evals/search-plus/compare-search-tavily-tinyfish.mjs out.json`. It needs both keys; Brave and Exa keys are optional.

## Results

| Metric | Tavily | TinyFish |
|---|---|---|
| Official source at rank 1 (n=29) | 3 (run 1) / 5 (run 2) | **23 / 23** |
| Official source in top 3 | 10 / 12 | **25 / 25** |
| Official source in top 5 | 14 / 17 | **26 / 26** |
| Mean overlap with Brave ∪ Exa (of 5) | 2.0 / 2.03 | **2.4 / 2.4** |
| Succeeded, 30-query runs | 24/30 / 30/30 | **30/30 / 30/30** |
| Succeeded, cold probe (20 fresh queries) | 20/20 | 20/20 |
| Cold latency median / p90 / max (probe) | 2.55 s / 5.85 s / 8.30 s | 2.61 s / 3.63 s / 4.57 s |
| Synthesized answer | **30/30** | 0 (not offered) |
| Mean snippet length | **≈1,170 chars** | ≈150 chars |
| Cost | 1,000 credits/month | Free within daily allowance |

### Authority rank per query (run 1 / run 2; "–" = no official domain in top 5)

| Query | Tavily | TinyFish |
|---|---|---|
| Claude Code plugin development best practices | – / – | 1 / 1 |
| JavaScript async await documentation examples | 4 / 4 | 1 / 1 |
| React Vue Angular Next.js Vite default development ports 2025 | – / – | – / – |
| PostgreSQL MySQL MongoDB Redis default ports development 2025 | – / – | – / – |
| Node.js child_process spawn security best practices | fail / – | 3 / 3 |
| kubernetes pod restart policy documentation | **2 / 2** | – / – |
| Python asyncio gather tutorial examples | – / – | 2 / 2 |
| git rebase vs merge workflow comparison | – / – | 1 / 1 |
| rust ownership borrowing explained documentation | – / – | 1 / 1 |
| MDN fetch API error handling guide | fail / 1 | 1 / 1 |
| docker compose networking default ports documentation | 2 / 2 | 1 / 1 |
| reddit claude code plugin recommendations | 1 / 1 | 1 / 1 |
| SEC EDGAR company search API documentation | fail / 5 | 1 / 1 |
| site reliability engineering error budget examples | 4 / 4 | 1 / 1 |
| TLS 1.3 handshake explanation documentation | – / – | 1 / 1 |
| latest Node.js LTS release | 4 / 4 | 1 / 1 |
| TypeScript 5.9 release notes | 2 / 2 | 1 / 1 |
| Python 3.14 what's new | – / – | 1 / 1 |
| TypeError: Cannot read properties of undefined (reading 'map') react | 3 / 3 | 1 / 1 |
| ERR_REQUIRE_ESM node fix | fail / 1 | 1 / 1 |
| zod npm package | 3 / 3 | 1 / 1 |
| ripgrep github | 1 / 1 | 1 / 1 |
| postgres jsonb index gin vs btree | fail / – | 5 / 5 |
| nginx reverse proxy websocket configuration | – / – | 1 / 1 |
| github actions cache node_modules | 1 / 1 | 1 / 1 |
| claude code hooks PostToolUse | 3 / 3 | 1 / 1 |
| AWS S3 presigned URL expiration limit | 2 / 2 | 1 / 1 |
| CSS container queries browser support | fail / – | 1 / 1 |
| OpenTelemetry collector configuration exporters | 4 / 4 | 1 / 1 |

### Manual read

The metric matches a side-by-side read. TinyFish leads with the page a developer would open: `docs.python.org/3/whatsnew/3.14.html`, `nginx.org/en/docs/http/websocket.html`, `caniuse.com/css-container-queries`, `code.claude.com/docs/en/plugins/overview`. Tavily tends to lead with blog and aggregator coverage of the same topic. Its weakest result was "Claude Code plugin development best practices", which returned `claude.com/download`, Claude Academy, and Wikipedia.

TinyFish had one clear loss. For "kubernetes pod restart policy documentation" it returned LinkedIn and Facebook posts and missed `kubernetes.io`, which Tavily ranked 2nd. Low-quality social results (a Facebook page at rank 5 for the MDN query) appeared occasionally. Where neither provider had an official source (framework and database default ports), the two lists were nearly identical (4/5 URLs shared).

## Caveats

- **Authority is a proxy.** It rewards official docs. For "tutorial" or "comparison" intents, a good third-party article can be just as useful, and the reference-overlap metric (2.4 vs 2.0) shows a smaller gap than the authority metric.
- **Tavily's run-1 failures are unexplained.** At the time, the plugin swallowed Tavily's error message. That is fixed in this PR (Tavily now logs `❌ Tavily failed: <message>`, like the other providers) and the runner records it. The 6 failures took ~10 s before falling through, consistent with timeouts or server errors, but neither was reproduced in 50 later calls. Treat this as a reliability signal, not a rate.
- **What TinyFish-first gives up**: the `Answer:` line and long snippets on queries TinyFish answers. For an agent that follows links, the ranking matters more than the summary. If the answer line turns out to matter, the follow-up is to request it from Tavily separately, not to reorder.
- **Single box, single day, n = 29–30.** One query moves rank-1 counts by ~3.4 pp. The 23 vs 3–5 gap is far outside that, but small differences such as the overlap numbers are not.
- **Live API shapes**: TinyFish's real responses matched the documented shape the provider was written against: `results[].{title,url,snippet,date}`, no count parameter, so results are trimmed to `maxResults`.
