# meta-search

Recovers web content when Claude Code's built-in search fails. Part of the [search-plus](../../README.md) plugin.

## Environment variables

| Variable | Required | Service | Free tier |
|----------|----------|---------|-----------|
| `SEARCH_PLUS_TAVILY_API_KEY` | No | Tavily extraction API | 1,000 searches/month |
| `SEARCH_PLUS_BRAVE_API_KEY` | No | Brave Search API | $5 free credits/month |
| `SEARCH_PLUS_EXA_API_KEY` | No | Exa AI Search | 1,000 searches/month |
| `SEARCH_PLUS_JINA_API_KEY` | No | Jina.ai reader API | 10M free tokens |

Without API keys, web search will fail. URL extraction still works via Jina.ai Public Reader (20 RPM, no key). Sign up for free API keys at tavily.com (1,000/month) or jina.ai (10M tokens).

## Sandbox configuration

When Claude Code's sandbox is enabled, add the extraction service domains to `allowedDomains`:

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

For best results with sandbox enabled, configure API keys for Tavily and/or Jina.ai.

## Files

| File | Purpose |
|------|---------|
| `SKILL.md` | Skill instructions loaded by Claude Code |
| `scripts/search.mjs` | Main recovery script |
| `scripts/content-extractor.mjs` | URL content extraction logic |
| `scripts/handle-search-error.mjs` | Search error recovery handler |
| `scripts/handle-web-search.mjs` | Web search orchestration |
| `scripts/handle-rate-limit.mjs` | Rate limit handling |
| `scripts/hook-entry.mjs` | PostToolUse hook entry point |
| `scripts/response-transformer.mjs` | Response format transformation |
| `scripts/search-response.mjs` | Response formatting |
| `scripts/security-utils.mjs` | Security utilities |
| `scripts/github-service.mjs` | GitHub CLI integration |
