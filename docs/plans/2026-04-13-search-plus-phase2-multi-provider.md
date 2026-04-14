# Search Plus Phase 2: Add Brave Search & Exa Providers

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Brave Search API and Exa AI as search providers in the `performHybridSearch()` fallback chain: Tavily → Brave → Exa → Jina Search (sequential).

**Architecture:** Currently `performHybridSearch()` tries Tavily → Jina Search sequentially. Add `tryBraveSearch()` and `tryExaSearch()` between them. Each service gets its own env var, transformer, and scoring bonus. Sequential execution (not parallel) to avoid wasting API credits on services not needed.

**Tech Stack:** Node.js (ESM), vanilla `fetch`, Brave Search API (`api.search.brave.com`), Exa AI API (`api.exa.ai`)

**Research context:**
- Brave Search: Independent 30B+ page index, $5 free credits/month (recurring, ~1,000 queries). Auth via `X-Subscription-Token` header. Endpoint: `GET https://api.search.brave.com/res/v1/web/search?q=...`. Response: `{ web: { results: [{ title, url, description }] } }`. 669ms avg latency — fastest in benchmarks. Highest agent score (14.89) in 2026 evals.
- Exa AI: Neural/semantic search, 1,000 free requests/month. Auth via `x-api-key` header. Endpoint: `POST https://api.exa.ai/search`. Request body: `{ query, contents: { text: true } }`. Response: `{ results: [{ title, url, text, publishedDate }] }`. ~1.2s latency. Best for technical docs.

**Priority order rationale:**
1. **Tavily** (existing): Best overall RAG integration, recurring 1,000/month free, ~860ms.
2. **Brave** (new): Largest independent index, recurring $5/month free credits, fastest latency.
3. **Exa** (new): Semantic search fills gaps keyword search misses, 1,000 free/month.
4. **Jina Search** (existing): 10M tokens one-time (not recurring), smallest index, last resort.

---

### Task 1: Add env vars for Brave and Exa

**Files:**
- Modify: `plugins/search-plus/skills/meta-search/scripts/handle-web-search.mjs:8-18`

- [ ] **Step 1: Add BRAVE_API_KEY and EXA_API_KEY constants**

After line 10 (`const JINA_API_KEY = ...`), add:

```javascript
const BRAVE_API_KEY = process.env.SEARCH_PLUS_BRAVE_API_KEY || process.env.BRAVE_API_KEY || null;
const EXA_API_KEY = process.env.SEARCH_PLUS_EXA_API_KEY || process.env.EXA_API_KEY || null;
```

- [ ] **Step 2: Add deprecation warnings**

After the existing Jina deprecation warning block, add:

```javascript
if (!process.env.SEARCH_PLUS_BRAVE_API_KEY && process.env.BRAVE_API_KEY) {
  console.warn('⚠️  BRAVE_API_KEY is deprecated. Please update to SEARCH_PLUS_BRAVE_API_KEY');
}
if (!process.env.SEARCH_PLUS_EXA_API_KEY && process.env.EXA_API_KEY) {
  console.warn('⚠️  EXA_API_KEY is deprecated. Please update to SEARCH_PLUS_EXA_API_KEY');
}
```

---

### Task 2: Add tryBraveSearch() function

**Files:**
- Modify: `plugins/search-plus/skills/meta-search/scripts/handle-web-search.mjs` (add after `tryJinaSearch`)

- [ ] **Step 1: Add tryBraveSearch() function**

Add after the `tryJinaSearch` function (currently ends ~line 467):

```javascript
/**
 * Attempts web search using Brave Search API
 * Requires SEARCH_PLUS_BRAVE_API_KEY
 */
async function tryBraveSearch(params, timeoutMs = 10000) {
  if (!BRAVE_API_KEY) {
    throw new Error('Brave API key not configured');
  }

  const query = encodeURIComponent(params.query);
  const maxResults = Math.min(params.maxResults || 5, 20);

  const startTime = Date.now();
  const searchUrl = `https://api.search.brave.com/res/v1/web/search?q=${query}&count=${maxResults}`;

  const response = await fetch(searchUrl, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': BRAVE_API_KEY,
    },
    signal: AbortSignal.timeout(timeoutMs)
  });

  if (!response.ok) {
    throw new Error(`Brave Search error: ${response.status}`);
  }

  const data = await response.json();

  // Brave returns { web: { results: [{ title, url, description, extra_snippets }] } }
  const webResults = data.web?.results || [];
  const results = webResults.slice(0, maxResults).map(item => ({
    title: item.title || '',
    url: item.url || '',
    content: item.description || '',
    score: 1.0
  }));

  if (results.length === 0) {
    throw new Error('No results found from Brave Search');
  }

  const responseTime = Date.now() - startTime;
  const standardResponse = { results, answer: null };
  const standardizedResult = transformToStandard('brave', standardResponse, params.query, responseTime);

  return { data: standardizedResult, service: 'brave' };
}
```

---

### Task 3: Add tryExaSearch() function

**Files:**
- Modify: `plugins/search-plus/skills/meta-search/scripts/handle-web-search.mjs` (add after `tryBraveSearch`)

- [ ] **Step 1: Add tryExaSearch() function**

```javascript
/**
 * Attempts web search using Exa AI Search API
 * Requires SEARCH_PLUS_EXA_API_KEY
 */
async function tryExaSearch(params, timeoutMs = 10000) {
  if (!EXA_API_KEY) {
    throw new Error('Exa API key not configured');
  }

  const maxResults = params.maxResults || 5;

  const startTime = Date.now();

  const response = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': EXA_API_KEY,
    },
    body: JSON.stringify({
      query: params.query,
      numResults: maxResults,
      contents: {
        text: { maxCharacters: 1000 }
      }
    }),
    signal: AbortSignal.timeout(timeoutMs)
  });

  if (!response.ok) {
    throw new Error(`Exa Search error: ${response.status}`);
  }

  const data = await response.json();

  // Exa returns { results: [{ title, url, text, publishedDate, author }] }
  const results = (data.results || []).slice(0, maxResults).map(item => ({
    title: item.title || '',
    url: item.url || '',
    content: item.text || item.summary || '',
    score: 1.0,
    published_date: item.publishedDate || null
  }));

  if (results.length === 0) {
    throw new Error('No results found from Exa Search');
  }

  const responseTime = Date.now() - startTime;
  const standardResponse = { results, answer: null };
  const standardizedResult = transformToStandard('exa', standardResponse, params.query, responseTime);

  return { data: standardizedResult, service: 'exa' };
}
```

---

### Task 4: Update performHybridSearch() fallback chain

**Files:**
- Modify: `plugins/search-plus/skills/meta-search/scripts/handle-web-search.mjs:125-165`

- [ ] **Step 1: Replace performHybridSearch with 4-service chain**

Replace the entire `performHybridSearch` function with:

```javascript
/**
 * Hybrid web search with intelligent service selection
 * Sequential: Tavily → Brave → Exa → Jina Search
 */
async function performHybridSearch(params, timeoutMs = 10000) {
  // Phase 1: Try Tavily API (premium, best RAG integration)
  if (TAVILY_API_KEY) {
    try {
      console.log('🚀 Trying Tavily API...');
      const startTime = Date.now();
      const rawResult = await tavily.search(params, timeoutMs);
      const responseTime = Date.now() - startTime;

      const standardizedResult = transformToStandard('tavily', rawResult, params.query, responseTime);
      return { data: standardizedResult, service: 'tavily' };
    } catch (error) {
      console.log('🔄 Tavily failed, trying Brave Search...');
    }
  }

  // Phase 2: Try Brave Search API (independent index, fastest)
  if (BRAVE_API_KEY) {
    try {
      console.log('🦁 Trying Brave Search...');
      const result = await tryBraveSearch(params, timeoutMs);
      console.log('✅ Success with Brave Search');
      return result;
    } catch (error) {
      console.log(`❌ Brave Search failed: ${error.message}`);
    }
  }

  // Phase 3: Try Exa AI (semantic/neural search)
  if (EXA_API_KEY) {
    try {
      console.log('🔬 Trying Exa Search...');
      const result = await tryExaSearch(params, timeoutMs);
      console.log('✅ Success with Exa Search');
      return result;
    } catch (error) {
      console.log(`❌ Exa Search failed: ${error.message}`);
    }
  }

  // Phase 4: Try Jina Search API (last resort)
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
    '  • SEARCH_PLUS_BRAVE_API_KEY ($5 free credits/month at brave.com/search/api)\n' +
    '  • SEARCH_PLUS_EXA_API_KEY (1000 free searches/month at exa.ai)\n' +
    '  • SEARCH_PLUS_JINA_API_KEY (10M free tokens at jina.ai)\n' +
    'See: https://github.com/shrwnsan/vibekit-claude-plugins/tree/main/plugins/search-plus#setup-options'
  );
}
```

---

### Task 5: Add transformers for Brave and Exa

**Files:**
- Modify: `plugins/search-plus/skills/meta-search/scripts/response-transformer.mjs`

- [ ] **Step 1: Add braveTransformer**

After the `jinaSearchTransformer` definition (ends ~line 308) and before the `createErrorResponse` function, add:

```javascript
/**
 * Brave Search Transformer
 * Transforms Brave Search API responses to standard format
 */
const braveTransformer = {
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
      published_date: normalizeDate(item.published_date),
      source: 'brave',
      relevance_score: calculateRelevanceScore({
        title: item.title,
        content: item.content || item.description,
        query,
        position: index,
        totalResults: response.results.length,
        service: 'brave'
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
          endpoint: 'api.search.brave.com',
          has_results: results.length > 0
        }
      }
    };
  }
};
```

- [ ] **Step 2: Add exaTransformer**

After the `braveTransformer`, add:

```javascript
/**
 * Exa AI Search Transformer
 * Transforms Exa AI search responses to standard format
 */
const exaTransformer = {
  validate: (response) => {
    return response &&
           typeof response === 'object' &&
           Array.isArray(response.results);
  },

  transform: (response, query) => {
    const results = response.results.map((item, index) => ({
      title: item.title || '',
      url: item.url || '',
      content: item.content || item.text || '',
      score: normalizeScore(item.score || (1.0 - index * 0.1), index, response.results.length),
      published_date: normalizeDate(item.published_date || item.publishedDate),
      source: 'exa',
      relevance_score: calculateRelevanceScore({
        title: item.title,
        content: item.content || item.text,
        query,
        position: index,
        totalResults: response.results.length,
        service: 'exa'
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
          endpoint: 'api.exa.ai',
          has_results: results.length > 0
        }
      }
    };
  }
};
```

- [ ] **Step 3: Register both transformers**

Add alongside the other registrations (~line 341):

```javascript
registerServiceTransformer('brave', braveTransformer);
registerServiceTransformer('exa', exaTransformer);
```

---

### Task 6: Add service scoring bonuses

**Files:**
- Modify: `plugins/search-plus/skills/meta-search/scripts/search-response.mjs`

- [ ] **Step 1: Update both serviceBonus maps**

In both `serviceBonus` maps (in `calculateRelevanceScore` and `calculateBatchRelevanceScores`), add Brave and Exa:

```javascript
const serviceBonus = {
  'tavily': 0.1,
  'brave': 0.09,
  'exa': 0.08,
  'jina-search': 0.07,
  'searxng': 0.05,
  'duckduckgo-html': 0.03,
  'startpage-html': 0.03
};
```

Note: Jina Search drops from 0.08 to 0.07 to make room for Brave (0.09) and Exa (0.08) in the hierarchy. This reflects the benchmark results where Brave > Exa > Jina in quality.

---

### Task 7: Update docs — README.md

**Files:**
- Modify: `plugins/search-plus/README.md`

- [ ] **Step 1: Update "Intelligent Fallback" section (~line 43-48)**

Change the fallback list to:

```markdown
### ⚡ Intelligent Fallback
Automatically tries multiple services until one works:
- **Primary**: Tavily API (if configured)
- **Fallback 1**: Brave Search API (if configured)
- **Fallback 2**: Exa AI Search (if configured)
- **Fallback 3**: Jina.ai Search API (if configured)
- **GitHub Integration**: Native GitHub CLI access for repository content (when enabled)
- **Result**: You get answers instead of errors
```

- [ ] **Step 2: Add Brave and Exa env vars to setup section (~line 89-92)**

Add the new env vars:

```bash
export SEARCH_PLUS_BRAVE_API_KEY=your_brave_key_here
export SEARCH_PLUS_EXA_API_KEY=your_exa_key_here
```

- [ ] **Step 3: Update free tier details (~line 99-101)**

```markdown
- Tavily: 1,000 searches/month free (recurring)
- Brave Search: $5 free credits/month (~1,000 queries, recurring)
- Exa AI: 1,000 searches/month free (recurring)
- Jina.ai Search: 10M free tokens (~1,000 searches, one-time)
- Jina.ai Public Reader: 20 RPM URL extraction only (no key)
```

- [ ] **Step 4: Update sandbox allowedDomains note (~line 105)**

Add `api.search.brave.com` and `api.exa.ai` to the sandbox domains list.

---

### Task 8: Update docs — ARCHITECTURE.md

**Files:**
- Modify: `plugins/search-plus/docs/ARCHITECTURE.md`

- [ ] **Step 1: Update Web Search Services table (~lines 58-62)**

```markdown
| Priority | Service | Notes |
|----------|---------|-------|
| 1 | Tavily API | Requires `SEARCH_PLUS_TAVILY_API_KEY` |
| 2 | Brave Search API | Requires `SEARCH_PLUS_BRAVE_API_KEY` |
| 3 | Exa AI Search | Requires `SEARCH_PLUS_EXA_API_KEY` |
| 4 | Jina.ai Search API | Requires `SEARCH_PLUS_JINA_API_KEY` |
```

- [ ] **Step 2: Update Configuration section (~line 126-130)**

Add:
```markdown
- `SEARCH_PLUS_BRAVE_API_KEY` — Brave Search API key (optional, $5 free credits/month)
- `SEARCH_PLUS_EXA_API_KEY` — Exa AI API key (optional, 1,000 free searches/month)
```

---

### Task 9: Update docs — STANDARD_RESPONSE_FORMAT.md

**Files:**
- Modify: `plugins/search-plus/docs/STANDARD_RESPONSE_FORMAT.md`

- [ ] **Step 1: Update service reliability bonuses (~lines 126-133)**

```markdown
- Tavily: +0.10
- Brave Search: +0.09
- Exa: +0.08
- Jina Search: +0.07
- SearXNG: +0.05 (historical, non-functional)
- DuckDuckGo: +0.03 (historical, non-functional)
- Startpage: +0.03 (historical, non-functional)
```

- [ ] **Step 2: Add Brave and Exa ServiceInfo structures (~line 57-78)**

Add after the Tavily ServiceInfo:

```javascript
// Brave Search
{
  endpoint: string,       // 'api.search.brave.com'
  has_results: boolean
}

// Exa AI
{
  endpoint: string,       // 'api.exa.ai'
  has_results: boolean
}
```

---

### Task 10: Update sandbox domain lists

**Files:**
- Modify: `plugins/search-plus/skills/meta-search/SKILL.md`
- Modify: `plugins/search-plus/skills/meta-search/README.md`

- [ ] **Step 1: Add Brave and Exa domains to allowedDomains in both files**

```jsonc
"allowedDomains": [
  "api.tavily.com",
  "api.search.brave.com",
  "api.exa.ai",
  "s.jina.ai",
  "r.jina.ai",
  "api.jina.ai"
]
```

- [ ] **Step 2: Update meta-search/README.md env var table**

Add rows:

```markdown
| `SEARCH_PLUS_BRAVE_API_KEY` | No | Brave Search API | $5 free credits/month |
| `SEARCH_PLUS_EXA_API_KEY` | No | Exa AI Search | 1,000 searches/month |
```

---

### Task 11: Update PERFORMANCE.md

**Files:**
- Modify: `plugins/search-plus/docs/PERFORMANCE.md`

- [ ] **Step 1: Update service configuration and fallback chain references**

Update the "Hybrid Architecture Performance" section to reflect the 4-service chain:

```markdown
**With API Keys** (Optimal Path):
1. Try Tavily first (~860ms avg)
2. Try Brave Search if Tavily fails (~670ms avg)
3. Try Exa if Brave fails (~1.2s avg)
4. Try Jina Search as last resort (~1.5s avg)
5. Overall: 95%+ success with any one key configured
```

Update the service table to include Brave and Exa with their performance characteristics.
