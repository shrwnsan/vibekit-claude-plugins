# Search Plus Phase 1: Fix Dead Services & Docs/Code Alignment

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace 3 dead web search services (SearXNG, DuckDuckGo, Startpage) with Jina Search API (`s.jina.ai`), fix env var inconsistency, and align docs with reality.

**Architecture:** The `performHybridSearch()` Phase 2 currently runs 3 dead services via `Promise.any()`. Replace with a single `tryJinaSearch()` call using `s.jina.ai` (requires API key). Fix env var naming from `SEARCH_PLUS_JINAAI_API_KEY` to `SEARCH_PLUS_JINA_API_KEY` to match `content-extractor.mjs` and all docs. Update docs to honestly state that free web search without API keys no longer exists.

**Tech Stack:** Node.js (ESM), vanilla `fetch`, Jina.ai Search API (`s.jina.ai`)

**Research context:** SearXNG public instances return 403/429/timeout. DuckDuckGo HTML returns CAPTCHA ("Select all squares containing a duck"). Startpage returns JS-only shell with 0 parseable results. All verified April 2026. See thread T-019d82b7-5736-7011-b7bf-546e23043e41 for full research.

---

### Task 1: Fix env var split-brain in handle-web-search.mjs

**Files:**
- Modify: `plugins/search-plus/skills/meta-search/scripts/handle-web-search.mjs:9-18`

- [ ] **Step 1: Change JINAAI_API_KEY to JINA_API_KEY**

In `handle-web-search.mjs`, change lines 9-18 from:

```javascript
const JINAAI_API_KEY = process.env.SEARCH_PLUS_JINAAI_API_KEY || process.env.JINAAI_API_KEY || null;
```

to:

```javascript
const JINA_API_KEY = process.env.SEARCH_PLUS_JINA_API_KEY || process.env.SEARCH_PLUS_JINAAI_API_KEY || process.env.JINA_API_KEY || process.env.JINAAI_API_KEY || null;
```

And update the deprecation warning block (lines 16-18) to:

```javascript
if (!process.env.SEARCH_PLUS_JINA_API_KEY && (process.env.JINA_API_KEY || process.env.JINAAI_API_KEY || process.env.SEARCH_PLUS_JINAAI_API_KEY)) {
  console.warn('⚠️  JINA/JINAAI API key variable names are deprecated. Please update to SEARCH_PLUS_JINA_API_KEY');
}
```

Note: the variable was previously `JINAAI_API_KEY` but was never used anywhere in `performHybridSearch` — it was only declared. Now it will be used by the new `tryJinaSearch()`.

- [ ] **Step 2: Commit**

```bash
git add plugins/search-plus/skills/meta-search/scripts/handle-web-search.mjs
git commit -m "fix(search-plus): normalize Jina env var to SEARCH_PLUS_JINA_API_KEY"
```

---

### Task 2: Add Jina Search function and replace dead Phase 2

**Files:**
- Modify: `plugins/search-plus/skills/meta-search/scripts/handle-web-search.mjs:125-163`
- Modify: `plugins/search-plus/skills/meta-search/scripts/response-transformer.mjs` (add transformer)
- Modify: `plugins/search-plus/skills/meta-search/scripts/search-response.mjs:226-253` (add service bonus)

- [ ] **Step 1: Add jina-search transformer to response-transformer.mjs**

After the `startpageTransformer` definition (~line 262) and before the `createErrorResponse` function, add:

```javascript
/**
 * Jina Search Transformer
 * Transforms Jina.ai s.jina.ai search responses to standard format
 */
const jinaSearchTransformer = {
  validate: (response) => {
    return response &&
           typeof response === 'object' &&
           Array.isArray(response.results);
  },

  transform: (response, query) => {
    const results = response.results.map((item, index) => ({
      title: item.title || '',
      url: item.url || '',
      content: item.content || item.description || '',
      score: normalizeScore(item.score || (1.0 - index * 0.1), index, response.results.length),
      published_date: normalizeDate(item.published_date || item.publishedDate),
      source: 'jina-search',
      relevance_score: calculateRelevanceScore({
        title: item.title,
        content: item.content || item.description,
        query,
        position: index,
        totalResults: response.results.length,
        service: 'jina-search'
      })
    }));

    return {
      results,
      answer: null,
      query,
      success_rate: 1.0,
      metadata: {
        total_results: results.length,
        query_processed_at: new Date().toISOString(),
        service_info: {
          endpoint: 's.jina.ai',
          has_results: results.length > 0
        }
      }
    };
  }
};
```

Register it alongside the others (~line 294):

```javascript
registerServiceTransformer('jina-search', jinaSearchTransformer);
```

- [ ] **Step 2: Add jina-search service bonus to search-response.mjs**

In both `serviceBonus` maps (lines 226-231 and 247-252), add `'jina-search': 0.08`:

```javascript
const serviceBonus = {
  'tavily': 0.1,
  'jina-search': 0.08,
  'searxng': 0.05,
  'duckduckgo-html': 0.03,
  'startpage-html': 0.03
};
```

- [ ] **Step 3: Add tryJinaSearch() function to handle-web-search.mjs**

Add after the `tryStartpageHTML` function (~line 415), before `generateRandomHeaders()`:

```javascript
/**
 * Attempts web search using Jina.ai Search API (s.jina.ai)
 * Requires SEARCH_PLUS_JINA_API_KEY
 */
async function tryJinaSearch(params, timeoutMs = 10000) {
  if (!JINA_API_KEY) {
    throw new Error('Jina API key not configured');
  }

  const query = encodeURIComponent(params.query);
  const maxResults = params.maxResults || 5;

  const startTime = Date.now();
  const searchUrl = `https://s.jina.ai/${query}`;

  const response = await fetch(searchUrl, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${JINA_API_KEY}`,
      'X-Retain-Images': 'none',
    },
    signal: AbortSignal.timeout(timeoutMs)
  });

  if (!response.ok) {
    throw new Error(`Jina Search error: ${response.status}`);
  }

  const data = await response.json();

  // Jina returns { data: [{ title, url, content, description }] }
  const results = (data.data || []).slice(0, maxResults).map(item => ({
    title: item.title || '',
    url: item.url || '',
    content: item.content || item.description || '',
    score: 1.0
  }));

  if (results.length === 0) {
    throw new Error('No results found from Jina Search');
  }

  const responseTime = Date.now() - startTime;
  const standardResponse = { results, answer: null };
  const standardizedResult = transformToStandard('jina-search', standardResponse, params.query, responseTime);

  return { data: standardizedResult, service: 'jina-search' };
}
```

- [ ] **Step 4: Replace performHybridSearch Phase 2**

Replace lines 125-163 of `handle-web-search.mjs` with:

```javascript
/**
 * Hybrid web search with intelligent service selection
 * Sequential: Tavily (with key) → Jina Search (with key)
 */
async function performHybridSearch(params, timeoutMs = 10000) {
  // Phase 1: Try Tavily API (premium service)
  if (TAVILY_API_KEY) {
    try {
      console.log('🚀 Trying Tavily API...');
      const startTime = Date.now();
      const rawResult = await tavily.search(params, timeoutMs);
      const responseTime = Date.now() - startTime;

      // Transform to standard format
      const standardizedResult = transformToStandard('tavily', rawResult, params.query, responseTime);

      return { data: standardizedResult, service: 'tavily' };
    } catch (error) {
      console.log('🔄 Tavily failed, trying Jina Search...');
    }
  }

  // Phase 2: Try Jina Search API (requires API key)
  if (JINA_API_KEY) {
    try {
      console.log('🔍 Trying Jina Search (s.jina.ai)...');
      const result = await tryJinaSearch(params, timeoutMs);
      console.log('✅ Success with Jina Search');
      return result;
    } catch (error) {
      console.log(`❌ Jina Search failed: ${error.message}`);
    }
  }

  throw new Error(
    'All search services failed. Configure at least one API key:\n' +
    '  • SEARCH_PLUS_TAVILY_API_KEY (recommended, 1000 free searches/month at tavily.com)\n' +
    '  • SEARCH_PLUS_JINA_API_KEY (10M free tokens at jina.ai)\n' +
    'See: https://github.com/shrwnsan/vibekit-claude-plugins/tree/main/plugins/search-plus#setup-options'
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add plugins/search-plus/skills/meta-search/scripts/handle-web-search.mjs
git add plugins/search-plus/skills/meta-search/scripts/response-transformer.mjs
git add plugins/search-plus/skills/meta-search/scripts/search-response.mjs
git commit -m "fix(search-plus): replace dead free services with Jina Search API

SearXNG public instances return 403/429/timeout. DuckDuckGo HTML
returns CAPTCHA. Startpage returns JS-only shell with 0 parseable
results. Replace Promise.any([dead, dead, dead]) with tryJinaSearch()
using s.jina.ai (requires API key).

Fallback chain is now: Tavily (with key) → Jina Search (with key).
Dead service functions retained for historical compatibility.

BREAKING: Free web search without API keys no longer works.
Free URL extraction via r.jina.ai (20 RPM) is unaffected."
```

---

### Task 3: Update README.md

**Files:**
- Modify: `plugins/search-plus/README.md`

- [ ] **Step 1: Fix "Intelligent Fallback" section (~line 45)**

Change the fallback list from:
```
- **Fallback**: Jina.ai Reader (public or API key)
```
to:
```
- **Fallback**: Jina.ai Search API (with API key)
```

- [ ] **Step 2: Fix "Option 1: Free Usage" section (~line 82)**

Change from:
```
### Option 1: Free Usage (Recommended for Start)
Works immediately without any configuration using Jina.ai Public Reader (20 RPM, no API key required).
```
to:
```
### Option 1: Quick Start (Free API Keys)
Web search requires at least one API key. Both services offer generous free tiers:
- **Tavily**: Sign up at [tavily.com](https://tavily.com) → 1,000 free searches/month (recurring)
- **Jina.ai**: Sign up at [jina.ai](https://jina.ai) → 10M free tokens (~1,000 searches)

URL extraction works without any API key via Jina.ai Public Reader (20 RPM).
```

- [ ] **Step 3: Fix free tier details (~line 95-97)**

Change from:
```
- Jina.ai Public Reader: 20 requests/minute free (no key)
- Jina.ai API: up to 500 requests/minute free (with key)
```
to:
```
- Jina.ai Public Reader: 20 RPM URL extraction only (no key)
- Jina.ai Search: up to 100 RPM web search (with free API key)
```

- [ ] **Step 4: Commit**

```bash
git add plugins/search-plus/README.md
git commit -m "docs(search-plus): update README for Jina Search fallback and honest free tier"
```

---

### Task 4: Update ARCHITECTURE.md

**Files:**
- Modify: `plugins/search-plus/docs/ARCHITECTURE.md:56-62`

- [ ] **Step 1: Fix Web Search Services table**

Change from:
```
| 1 | Tavily API | Requires `SEARCH_PLUS_TAVILY_API_KEY` |
| 2 | Jina.ai Public Reader | Free, 20 RPM, no API key |
```
to:
```
| 1 | Tavily API | Requires `SEARCH_PLUS_TAVILY_API_KEY` |
| 2 | Jina.ai Search API | Requires `SEARCH_PLUS_JINA_API_KEY` |
```

- [ ] **Step 2: Update hook runtime description (~line 139)**

Change `Tavily/Jina/free services` to `Tavily/Jina Search`.

- [ ] **Step 3: Commit**

```bash
git add plugins/search-plus/docs/ARCHITECTURE.md
git commit -m "docs(search-plus): update ARCHITECTURE.md for Jina Search fallback"
```

---

### Task 5: Update PERFORMANCE.md

**Files:**
- Modify: `plugins/search-plus/docs/PERFORMANCE.md`

- [ ] **Step 1: Fix free tier success rate claims**

Find all instances of `85%` free tier success rate and replace with honest language:

- "Success rate: 85%" → "Requires API key (Tavily or Jina)"
- "Zero API Key Dependency" → "Requires at least one API key (free tiers available)"
- Remove/update "Smart Fallback" description referencing Jina.ai Public Reader for search
- Update "Without API Keys (Free Tier)" sections to state that web search requires an API key

Key sections to fix:
- Lines ~23-30 (v2.7.0+ Architecture Enhancements)
- Lines ~70-75 (Without API Keys free tier)
- Lines ~103 (Configuration matrix)
- Lines ~134-135 (Without API Keys hybrid path)
- Lines ~253 (Performance targets)

- [ ] **Step 2: Commit**

```bash
git add plugins/search-plus/docs/PERFORMANCE.md
git commit -m "docs(search-plus): remove fictional 85% free success rate from PERFORMANCE.md"
```

---

### Task 6: Update SKILL.md and meta-search/README.md

**Files:**
- Modify: `plugins/search-plus/skills/meta-search/SKILL.md:84,92`
- Modify: `plugins/search-plus/skills/meta-search/README.md:13,33`

- [ ] **Step 1: Fix SKILL.md stale limitation (line 92)**

Change from:
```
- Free fallback services may not work with sandbox enabled (dynamic domains)
```
to:
```
- Web search requires at least one API key (SEARCH_PLUS_TAVILY_API_KEY or SEARCH_PLUS_JINA_API_KEY)
```

- [ ] **Step 2: Fix meta-search/README.md "without API keys" line (line 13)**

Change from:
```
Without API keys, the script falls back to Jina.ai Public Reader (20 RPM, no key required).
```
to:
```
Without API keys, web search will fail. URL extraction still works via Jina.ai Public Reader (20 RPM, no key). Sign up for free API keys at tavily.com (1,000/month) or jina.ai (10M tokens).
```

- [ ] **Step 3: Commit**

```bash
git add plugins/search-plus/skills/meta-search/SKILL.md
git add plugins/search-plus/skills/meta-search/README.md
git commit -m "docs(search-plus): fix SKILL.md and meta-search README for API key requirement"
```

---

### Task 7: Update STANDARD_RESPONSE_FORMAT.md

**Files:**
- Modify: `plugins/search-plus/docs/STANDARD_RESPONSE_FORMAT.md:126-129`

- [ ] **Step 1: Add jina-search to service reliability bonuses**

Change from:
```
- Tavily: +0.10
- SearXNG: +0.05
- DuckDuckGo: +0.03
- Startpage: +0.03
```
to:
```
- Tavily: +0.10
- Jina Search: +0.08
- SearXNG: +0.05 (historical, non-functional)
- DuckDuckGo: +0.03 (historical, non-functional)
- Startpage: +0.03 (historical, non-functional)
```

- [ ] **Step 2: Commit**

```bash
git add plugins/search-plus/docs/STANDARD_RESPONSE_FORMAT.md
git commit -m "docs(search-plus): add Jina Search to response format service bonuses"
```
