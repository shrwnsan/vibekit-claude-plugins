# Search Plus Architecture

Technical implementation details of the Search Plus plugin's architecture and error handling strategies.

> **Updated 2026-04-06** — Three-tier architecture with working hook and script orchestration. Previous versions documented aspirational flows that were never wired up.

## System Overview

Search Plus achieves reliable web search and content extraction through a **three-tier architecture**: an automated PostToolUse hook, a skill that orchestrates bundled Tavily/Jina scripts, and manual fallback strategies using built-in tools. The `search-plus` agent provides a structured operating procedure for complex multi-step research.

### Core Components

| Component | Path | Role |
|-----------|------|------|
| **meta-search skill** | `skills/meta-search/SKILL.md` | Orchestrates recovery — runs scripts, then manual fallback |
| **search CLI** | `skills/meta-search/scripts/search.mjs` | CLI wrapper for skill invocation (query/URL as args) |
| **hook entry** | `skills/meta-search/scripts/hook-entry.mjs` | CLI entry point for PostToolUse — reads stdin, detects errors |
| **search-plus agent** | `agents/search-plus.md` | Structured operating procedure for complex research |
| **hooks** | `hooks/hooks.json` | `PostToolUse` on `WebSearch\|WebFetch` — automated error recovery |
| **scripts** | `skills/meta-search/scripts/*.mjs` | Tavily/Jina integration, error handling, response transformation |

### Three-Tier Error Recovery

```mermaid
flowchart TD
    A[Claude uses web_search or web_fetch] --> B{Error in response?}
    B -->|No| C[Return results]
    B -->|Yes| D["Tier 1: PostToolUse hook fires<br/>hook-entry.mjs"]
    D --> E{Hook recovers?}
    E -->|Yes| F["additionalContext injected<br/>Claude receives recovered content"]
    E -->|No| G["Tier 2: Skill loaded<br/>SKILL.md → search.mjs"]
    G --> H{Script recovers?}
    H -->|Yes| I[Return script output]
    H -->|No| J["Tier 3: Manual strategies<br/>cache URLs, query reformulation"]
    J --> K[Return best available result]
```

> **Known limitation**: The PostToolUse hook only intercepts successful tool calls whose response contains an error (403, 429, etc.). Tool-level exceptions (`PostToolUseFailure`) — such as network timeouts before the tool returns — are not intercepted by the hook. The skill's manual strategies (Tier 3) cover those cases.

### Agent Operating Procedure

The `search-plus` agent follows a structured runbook:

1. **Interpret intent** — detect URL extraction vs open-ended research
2. **Choose path** — URL → extraction mode; no URL → research mode
3. **Primary attempt** — search/fetch using default tools
4. **Fallback gating** — trigger on HTTP ≥400, empty content, paywall/captcha
5. **Fallback sequence** — retry with backoff, switch service/provider
6. **Validate and dedupe** — require non-empty content, rank by relevance
7. **Summarize and cite** — produce concise answer with inline citations

## Service Strategy

The skill instructs Claude to use these services in priority order:

### Web Search Services

| Priority | Service | Notes |
|----------|---------|-------|
| 1 | Tavily API | Requires `SEARCH_PLUS_TAVILY_API_KEY` |
| 2 | Jina.ai Search API | Requires `SEARCH_PLUS_JINA_API_KEY` |

### URL Extraction Services

| Priority | Service | Notes |
|----------|---------|-------|
| 1 | Tavily Extract API | Requires API key |
| 2 | Jina.ai API | Requires `SEARCH_PLUS_JINA_API_KEY` |
| 3 | Jina.ai Public Reader | Free, 20 RPM |
| 4 | Cache services | Google Cache → Archive.org → Bing Cache → Yandex Turbo |

### GitHub Integration

When `SEARCH_PLUS_GITHUB_ENABLED=true` and `gh` CLI is installed, GitHub URLs are handled via native CLI access before falling back to web scraping.

## Error Handling Strategies

### Error Classification and Recovery

| Error Type | Detection | Recovery Strategy | Success Rate |
|------------|-----------|-------------------|--------------|
| **403 Forbidden** | HTTP 403 | Alternative extraction, header variation | ~80% |
| **422 Validation** | "Did 0 searches..." | Query reformulation, param simplification | ~100% |
| **429 Rate Limiting** | HTTP 429 | Exponential backoff, service rotation | ~90% |
| **451 Security** | HTTP 451 | Domain exclusion + alternative sources (parallel) | ~100% |
| **ECONNREFUSED** | Connection refused | Alternative endpoints, timeout adjustment | ~50% |
| **Silent Failures** | Empty results | Enhanced extraction, service switching | ~100% |

*Success rates measured in controlled testing. Real-world rates may vary.*

### 403/429 Recovery

1. Identify blocked domain/service
2. Retry with alternative extraction method
3. Apply exponential backoff (1s, 2s, 4s, 8s) with jitter
4. Rotate to different service provider
5. Try cache/archive services as last resort

### 422 Schema Validation Recovery

1. Detect "Did 0 searches..." response pattern
2. Remove special characters from query
3. Simplify request parameters
4. Try alternative API endpoint
5. Reattempt with reformulated query

### 451 SecurityCompromise Recovery

1. Exclude blocked domain from search: `"query -site:blocked.com"`
2. Search for alternative sources: `"query" alternative OR substitute`
3. Execute both strategies in parallel for speed

## Security Design

- **No query storage** beyond request processing
- **No tracking or analytics** integration
- **HTML sanitization** via `security-utils.mjs` (reference implementation in scripts)
- **URL validation** against SSRF patterns
- **Respects** robots.txt and website terms of service

## Configuration

See [CONFIGURATION.md](CONFIGURATION.md) for environment variables and setup.

Key variables:
- `SEARCH_PLUS_TAVILY_API_KEY` — Tavily API key (optional, enables primary service)
- `SEARCH_PLUS_JINA_API_KEY` — Jina.ai API key (optional, enables enhanced fallback)
- `SEARCH_PLUS_GITHUB_ENABLED` — Enable GitHub CLI integration (default: false)
- `SEARCH_PLUS_RECOVERY_TIMEOUT_MS` — Recovery timeout (default: 5000ms)

---

## Hook Runtime

The plugin registers a `PostToolUse` hook on `WebSearch|WebFetch` events. The hook runs `skills/meta-search/scripts/hook-entry.mjs`, a CLI entry point that:

1. Reads the PostToolUse JSON from stdin (`tool_name`, `tool_input`, `tool_response`)
2. Detects recoverable errors in the tool response (403, 429, 422, 451, ECONNREFUSED, empty results)
3. If an error is detected, delegates to `handleWebSearch()` for recovery via Tavily/Jina Search
4. Outputs `additionalContext` JSON to stdout so Claude receives the recovered content

If no error is detected or recovery fails, the hook exits silently (exit 0) and does not interfere.

### Three-tier architecture

| Tier | Trigger | Component | How it works |
|------|---------|-----------|--------------|
| **1. Hook** | Automatic on `PostToolUse` error | `hook-entry.mjs` → `handleWebSearch()` | Automated recovery — intercepts errors, injects `additionalContext`. Silent on success. |
| **2. Skill** | Claude auto-loads or user invokes `/search-plus:meta-search` | `SKILL.md` → `search.mjs` | Runs `node ${CLAUDE_SKILL_DIR}/scripts/search.mjs <query>`. Same Tavily/Jina pipeline as hook. |
| **3. Manual** | Skill Step 2 fallback | Built-in `web_search`/`web_fetch` | Cache URLs, query reformulation, domain exclusion — strategies Claude executes with its own tools. |

All three tiers use the same underlying scripts. The hook and skill both call `handleWebSearch()` — the difference is the trigger (automatic vs explicit) and the interface (stdin JSON vs CLI args).

**Known limitation**: The hook only covers `PostToolUse` (successful tool call with error in response). Tool-level exceptions (`PostToolUseFailure`) are not intercepted — the skill's manual strategies cover those cases.
