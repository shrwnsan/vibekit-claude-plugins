# Search-Plus Sandbox DNS Resolution Failure: Root Cause Investigation

**Date:** 2026-04-12
**Eval ID:** eval-026
**Focus:** Meta-search plugin failure diagnosis, Claude Code sandbox network internals, and remediation

## Executive Summary

The `/search-plus:meta-search` skill was failing with "All search services failed" on every invocation. Initial assumptions pointed to dead SearXNG instances and missing API keys. Deep investigation revealed the actual root cause: **Claude Code's macOS `sandbox-exec` implementation blocks all raw DNS (UDP 53) for child processes**, and Node.js `fetch()` does not use the injected `HTTP_PROXY` environment variables by default. Only `curl` (which respects proxy env vars) can reach external domains through the sandbox's in-process proxy.

### Key Findings

| Finding | Severity | Status |
|---------|----------|--------|
| Sandbox blocks Node.js DNS resolution entirely | Critical | Confirmed |
| Node.js fetch() ignores HTTP_PROXY env vars | Critical | Confirmed |
| All 4 hardcoded SearXNG instances are dead | High | Confirmed |
| DuckDuckGo/Startpage blocked by sandbox (pre-fix) | Medium | Fixed (reverted) |
| Promise.any catch swallows all error diagnostics | Low | Open |
| Error recovery strategies depend solely on Tavily | Low | Open |
| Code-reviewer Finding #1 (setTimeout bug) was a false alarm | Info | Corrected |

---

## Timeline

### Phase 1: Initial Failure

User invoked `/meta-search` with query "Pi agent extensions backup dotfiles git repo manage custom extensions". Output:

```
Tavily failed, trying free services...
SearXNG instance https://search.brave.works failed: fetch failed
SearXNG instance https://searx.be failed: fetch failed
SearXNG instance https://searx.tiekoetter.com failed: fetch failed
SearXNG instance https://search.snopyta.org failed: fetch failed
Error: All search services failed.
```

WebSearch tool also rate-limited (429, resets 2026-04-19).

### Phase 2: Code Review

Invoked code-reviewer agent. Initial report identified 6 findings including a "critical" `setTimeout` bug in `content-extractor.mjs`. This was later **corrected** -- the `setTimeout` is imported from `timers/promises`, which has signature `(delay, value)`, not `(callback, delay)`. The usage `setTimeout(timeoutMs, null)` is correct.

### Phase 3: Domain Allowlist

Added 6 domains to `~/.claude/settings.json` `sandbox.network.allowedDomains`:
- `html.duckduckgo.com`, `www.startpage.com`
- `search.brave.works`, `searx.be`, `searx.tiekoetter.com`, `search.snopyta.org`

After restart, meta-search still failed with identical errors. This confirmed the domain allowlist was not the issue.

### Phase 4: Sandbox DNS Investigation

Systematic testing revealed the true architecture:

```
# Inside sandbox (Bash tool)
curl https://api.tavily.com        -> 200 OK (works)
node -e "fetch('...tavily')"       -> ENOTFOUND
node dns.resolve('api.tavily.com') -> ECONNREFUSED
nslookup api.tavily.com            -> bind: Operation not permitted

# Outside sandbox (direct terminal)
curl https://api.tavily.com        -> 200 OK
node -e "fetch('...tavily')"       -> 200 OK
node dns.resolve('api.tavily.com') -> resolves
```

### Phase 5: Binary Analysis (code-reviewer)

The code-reviewer agent performed decompilation analysis of the Claude Code binary (`/opt/homebrew/Caskroom/claude-code@latest/2.1.101/claude`) and found the exact mechanism.

---

## Root Cause: Claude Code Sandbox Network Architecture

### How It Works

Claude Code uses macOS `sandbox-exec` (Seatbelt framework) to sandbox Bash tool commands. The network restriction is implemented as a **proxy-based architecture**:

1. Claude Code starts an in-process HTTP proxy + SOCKS5 proxy
2. It injects `HTTP_PROXY`/`HTTPS_PROXY` env vars into sandboxed processes
3. The `sandbox-exec` profile **blocks all direct network** (including raw DNS/UDP 53)
4. The only way out is through the proxy, which does DNS resolution on the unsandboxed side

### Why curl Works

`curl` respects `HTTP_PROXY`/`HTTPS_PROXY` environment variables by default. When it connects through the proxy, the proxy (running in the unsandboxed Claude Code process) performs DNS resolution and establishes the actual connection. The `allowedDomains` config controls which domains the proxy permits.

### Why Node.js Doesn't

- **`node fetch()`** (undici): Does NOT use `HTTP_PROXY`/`HTTPS_PROXY` by default in Node.js. Proxy support requires `--experimental-global-agent` flag, `global-agent` package, or undici proxy dispatcher configuration.
- **`node dns.resolve()`**: Uses raw DNS (UDP port 53), which is blocked at the Seatbelt level. Cannot route through HTTP proxy.
- **`nslookup`/`dig`**: Same as above -- raw DNS blocked by Seatbelt.

### Why Hooks Also Fail

PostToolUse hooks run as child processes through the same `sandbox-exec` path. Unless the hook command is listed in `excludedCommands`, it inherits the same network restrictions.

### Why allowedDomains Changes Didn't Help

The `allowedDomains` config only controls the in-process HTTP/SOCKS proxy allowlist. Since Node.js `fetch()` doesn't use the proxy, the allowlist is irrelevant for Node.js processes.

### Environment Variables Injected by Sandbox

```
HTTP_PROXY=http://localhost:<httpProxyPort>
HTTPS_PROXY=http://localhost:<httpProxyPort>
http_proxy=http://localhost:<httpProxyPort>
https_proxy=http://localhost:<httpProxyPort>
ALL_PROXY=socks5h://localhost:<socksProxyPort>
all_proxy=socks5h://localhost:<socksProxyPort>
NO_PROXY=localhost,127.0.0.1,::1,*.local,.local,169.254.0.0/16,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16
```

---

## SearXNG Instance Health

Tested 40+ known public SearXNG instances. Results:

| Instance | HTTP Status | Actual Result |
|----------|-------------|---------------|
| `search.brave.works` | 000 | Dead (connection refused) |
| `searx.be` | 403 | Blocking all requests |
| `searx.tiekoetter.com` | 429 | Rate limited |
| `search.snopyta.org` | 000 | Dead (connection refused) |
| `search.sapti.me` | 000 | Dead |
| `searxng.ch` | 000 | Dead |
| `search.mdosch.de` | 429 | Rate limited |
| `searxng.site` | 429 | Rate limited |
| `search.ononoki.org` | 429 | Rate limited |
| `searx.work` | 200 | JS fingerprint challenge (no JSON) |
| `search.projectsegfau.lt` | 200 | "Service has been deprecated" |
| 30+ others | 000/429/403 | Dead, rate-limited, or blocking |

**Conclusion**: The public SearXNG ecosystem is effectively dead for programmatic access. Community-run instances are either offline, rate-limiting all traffic, or behind JavaScript challenges.

---

## Code-Reviewer Finding Corrections

### Finding #1: setTimeout Bug -- FALSE ALARM

The code-reviewer initially flagged `setTimeout(timeoutMs, null).then(...)` as a critical bug, claiming the arguments were swapped. This was incorrect because:

```javascript
// content-extractor.mjs line 2
import { setTimeout } from 'timers/promises';
```

The `timers/promises` version of `setTimeout` has signature `(delay, value)` -- NOT `(callback, delay)` like the global `setTimeout`. So `setTimeout(timeoutMs, null)` correctly means "wait `timeoutMs` then resolve with `null`". The `.then()` call is valid since it returns a Promise.

The only minor issue: `clearTimeout(timeoutId)` on a Promise is a no-op (harmless -- the Promise just GCs naturally).

### Finding #5 (Valid): Error Diagnostics Swallowed

The `Promise.any` catch block in `handle-web-search.mjs` line 160-162 discards all `AggregateError` individual failure reasons:

```javascript
catch (aggregateError) {
  throw new Error('All search services failed. Try again or configure Tavily API key.');
  // aggregateError.errors is completely discarded
}
```

### Finding #6 (Valid): Recovery Strategies Tavily-Only

`handle-search-error.mjs` recovery strategies all call `tavily.search()`. When Tavily is unavailable, the error handler is useless.

---

## Recommendations

### Immediate Fix: Add `node` to `excludedCommands`

```json
"excludedCommands": ["docker", "gh", "node"]
```

**Rationale:**
- One-line fix, immediately unblocks both skill and hook paths
- Node.js bypasses `sandbox-exec` entirely, uses system DNS directly
- The search-plus plugin is self-authored code in `~/.claude/plugins/cache/` -- not untrusted input
- Minimal security trade-off: no filesystem isolation for Node scripts, but no untrusted code execution

**Trade-offs:**
- `node` scripts run without any filesystem or network restrictions
- Does not fix the underlying architectural issue for other Node.js-based tools

### Alternative: Rewrite Scripts to Use `curl`

Replace all `fetch()` calls in `content-extractor.mjs` and `handle-web-search.mjs` with `child_process` calls to `curl`.

**Pros:** Stays sandboxed, respects `allowedDomains`, proper security model.
**Cons:** Major rewrite of 1600+ line file, complex abort/timeout logic, JSON parsing from shell output, fragile error handling.

**Verdict:** Not recommended. The effort-to-benefit ratio is poor given Option A exists.

### Future: Replace Dead SearXNG Instances

The 4 hardcoded instances in `handle-web-search.mjs` lines 170-175 should be replaced or removed. Options:
1. **Dynamic instance discovery** from `https://searx.space/data/instances.json`
2. **Remove SearXNG entirely** and rely on Tavily + DuckDuckGo + Startpage
3. **Self-hosted SearXNG** instance for reliable access

### Future: Improve Error Diagnostics

Preserve `AggregateError` details in the `Promise.any` catch block:

```javascript
catch (aggregateError) {
  const reasons = aggregateError.errors.map(e => e.message).join('; ');
  throw new Error(`All search services failed: ${reasons}`);
}
```

### Future: Non-Tavily Recovery Strategies

Add recovery strategies in `handle-search-error.mjs` that don't depend solely on Tavily (e.g., DuckDuckGo HTML fallback, Jina extraction fallback).

---

## Environment Details

| Property | Value |
|----------|-------|
| Platform | macOS Darwin 25.3.0 |
| Claude Code | 2.1.101 (homebrew cask) |
| Sandbox | enabled, `autoAllowBashIfSandboxed: true` |
| Plugin | search-plus v2.11.0 |
| Node.js | (system, respects `timers/promises` API) |
| WebSearch rate limit | 429, resets 2026-04-19 01:02:30 |

## Investigation Tools Used

| Agent | Role |
|-------|------|
| code-reviewer | Binary decompilation, sandbox mechanism analysis, SearXNG health testing |
| claude-code-guide | Claude Code docs, sandbox architecture, settings schema |
| Manual testing | curl, node, nslookup, dscacheutil across sandbox/unsandboxed contexts |
