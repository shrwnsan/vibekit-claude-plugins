---
name: meta-search
description: Extracts web content and performs reliable searches when standard tools fail due to access restrictions, rate limiting, or validation errors. Use when encountering 403/429/422 errors, blocked documentation sites, or silent search failures. Self-contained instruction-driven skill — works independently or via search-plus agent.
allowed-tools:
  - web_search
  - web_fetch
---

# Meta Search

Instruction-driven error recovery for web search and content extraction. When standard tools fail, this skill guides you through recovery strategies using your built-in `web_search` and `web_fetch` tools.

> When the search-plus plugin is installed, a PostToolUse hook provides automated recovery before these instructions are needed. This skill covers cases the hook doesn't catch and works standalone without the plugin.

## When to Use

**Use this skill when you encounter:**
- 403 Forbidden errors from documentation sites or APIs
- 429 Rate Limited responses during research
- 422 validation errors or "Did 0 searches..." responses
- Silent failures where search returns empty results or times out
- Need to extract content from blocked URLs

## Error Recovery Strategies

### 403 Forbidden
1. Retry with `web_fetch` using the URL directly — different tool may bypass the block
2. Search for the page title or key terms instead of fetching the URL
3. Try cache/archive URLs: `web_fetch` with `https://webcache.googleusercontent.com/search?q=cache:<URL>` or `https://web.archive.org/web/2/<URL>`
4. Search for alternative sources covering the same content

### 429 Rate Limited
1. Wait briefly, then retry the same request
2. Simplify the query — shorter queries are less likely to trigger limits
3. Switch approach: if searching, try fetching a known URL; if fetching, try searching for the content
4. Try alternative phrasing to avoid hitting the same rate-limited endpoint

### 422 Validation / "Did 0 searches..."
1. Remove special characters, quotes, and complex syntax from the query
2. Shorten the query to essential keywords only
3. Split compound queries into separate simpler searches
4. Remove `site:` operators or other search modifiers

### 451 SecurityCompromise
1. Search with domain exclusion: `"<query> -site:<blocked-domain>"`
2. Search for alternative sources: `"<query>" alternative OR mirror`
3. Try both approaches — one often succeeds when the other fails

### ECONNREFUSED / Timeout
1. Retry after a brief pause
2. Try `web_fetch` with a different URL for the same content
3. Search for cached or mirrored versions

### Empty Results
1. Broaden the query — remove restrictive terms
2. Try different phrasing or synonyms
3. Search for the topic generally, then fetch specific URLs from results

## Recovery Approach

When encountering an error:
1. **Identify the error type** from the response
2. **Apply the matching strategy** above, starting from step 1
3. **Stop on first success** — don't retry unnecessarily
4. **Report partial results** if full recovery fails, with what you found and what remains inaccessible

## Limitations

- Cannot bypass CAPTCHA or advanced bot protection
- Some paywalled content remains inaccessible regardless of strategy
- Cache/archive services may have stale content
- Recovery adds latency (2-3x longer than a direct successful request)
