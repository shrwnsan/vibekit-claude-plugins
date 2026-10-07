---
name: meta-search
description: Recovers web content when searches fail with 403, 429, 422 errors, blocked sites, or empty results. Runs a bundled multi-provider script (works without API keys), then falls back to manual strategies.
allowed-tools:
  - Bash(node *)
  - WebSearch
  - WebFetch
---

# Meta Search

Recover web content when standard tools fail. Orchestrates multi-service search and extraction via a bundled script, with manual fallback strategies.

## Recovery workflow

### Step 1: Run the recovery script

```bash
node "${CLAUDE_SKILL_DIR}/scripts/search.mjs" "<query-or-url>"
```

- **Query** → Tavily → Brave → Exa → Jina Search (each only if its key is set) → Firecrawl (keyless). Prints a markdown list of results.
- **URL** → Direct markdown fetch (asks the origin for `Accept: text/markdown`; only used when it actually serves markdown) → Tavily Extract (if key) → Jina Reader → Firecrawl → Defuddle → Wayback Machine snapshot. Prints the page as markdown.

Exit code 0: use the stdout directly. Non-zero: stderr lists each service tried and why it failed; proceed to Step 2.

### Step 2: Manual recovery with built-in tools

Apply the strategy matching the error type:

**403 Forbidden**
1. Retry with `web_fetch` using the URL directly
2. Search for the page title or key terms instead
3. Try the archived copy: `https://web.archive.org/web/2/<URL>`

**429 Rate Limited**
1. Wait briefly, then retry
2. Simplify the query to essential keywords
3. Switch approach: if searching, try fetching a known URL instead

**422 Validation / "Did 0 searches..."**
1. Remove special characters and quotes from the query
2. Shorten to essential keywords only
3. Split compound queries into separate searches

**451 / blocked domain**
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
        "api.jina.ai",
        "api.firecrawl.dev",
        "defuddle.md",
        "archive.org"
      ]
    }
  }
}
```

Without these, all extraction services will fail with `fetch failed` and the script will fall through to Step 2 (manual recovery).

Keyless services (Jina Reader, Firecrawl, Defuddle, Wayback) are included in the list above.

## Limitations

- Cannot bypass CAPTCHA or advanced bot protection
- Some paywalled content remains inaccessible
- Cache/archive services may have stale content
- Without API keys, web search depends on Firecrawl's keyless tier (rate-limited per IP); set any provider key for reliability
