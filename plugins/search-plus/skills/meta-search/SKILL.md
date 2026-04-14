---
name: meta-search
description: Recovers web content when searches fail with 403, 429, 422 errors, blocked sites, or empty results. Runs bundled Tavily/Jina extraction scripts, then falls back to manual strategies.
allowed-tools:
  - Bash(node *)
  - web_search
  - web_fetch
---

# Meta Search

Recover web content when standard tools fail. Orchestrates multi-service extraction via bundled scripts (Tavily, Jina.ai, free services), with manual fallback strategies.

## Recovery workflow

### Step 1: Run the recovery script

```bash
node "${CLAUDE_SKILL_DIR}/scripts/search.mjs" <query-or-url> 2>/dev/null
```

The script tries Tavily API → Jina.ai API → Jina.ai Public Reader with automatic error handling, retries, and service rotation. Output is the recovered content.

If the script succeeds, use the output directly. If it fails (no API keys, network issues, or all services down), proceed to Step 2.

### Step 2: Manual recovery with built-in tools

Apply the strategy matching the error type:

**403 Forbidden**
1. Retry with `web_fetch` using the URL directly
2. Search for the page title or key terms instead
3. Try cache URLs: `https://webcache.googleusercontent.com/search?q=cache:<URL>` or `https://web.archive.org/web/2/<URL>`

**429 Rate Limited**
1. Wait briefly, then retry
2. Simplify the query to essential keywords
3. Switch approach: if searching, try fetching a known URL instead

**422 Validation / "Did 0 searches..."**
1. Remove special characters and quotes from the query
2. Shorten to essential keywords only
3. Split compound queries into separate searches

**451 SecurityCompromise**
1. Search with domain exclusion: `"<query> -site:<blocked-domain>"`
2. Search for alternatives: `"<query>" alternative OR mirror`

**ECONNREFUSED / Timeout**
1. Retry after a brief pause
2. Try `web_fetch` with a different URL for the same content

**Empty Results**
1. Broaden the query — remove restrictive terms
2. Try different phrasing or synonyms

### Step 3: Report results

- On success: return the recovered content
- On partial success: return what was found, note what remains inaccessible
- On failure: report which strategies were tried and why they failed

## Sandbox compatibility

The extraction script makes outbound requests to external services. If Claude Code's sandbox is enabled, these domains must be in the `allowedDomains` list:

```jsonc
// ~/.claude/settings.json
{
  "sandbox": {
    "network": {
      "allowedDomains": [
        "api.tavily.com",
        "api.search.brave.com",
        "api.exa.ai",
        "s.jina.ai",
        "r.jina.ai",
        "api.jina.ai"
      ]
    }
  }
}
```

Without these, all extraction services will fail with `fetch failed` and the script will fall through to Step 2 (manual recovery).

Free fallback services (Jina.ai Public Reader) use `r.jina.ai` which is already in the allowedDomains list above.

## Limitations

- Cannot bypass CAPTCHA or advanced bot protection
- Some paywalled content remains inaccessible
- Cache/archive services may have stale content
- PostToolUse hook does not intercept tool-level exceptions (PostToolUseFailure)
- Web search requires at least one API key (SEARCH_PLUS_TAVILY_API_KEY or SEARCH_PLUS_JINA_API_KEY)
