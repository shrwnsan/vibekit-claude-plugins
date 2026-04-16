# Search Plus Phase 3: Sandbox DNS Fix

**Goal:** Make Node.js `fetch()` work inside Claude Code's macOS sandbox by routing requests through the sandbox's HTTP proxy.

**Status:** Research complete. Ready for implementation.

**Research context:** See `docs/evals/eval-026-search-plus-sandbox-dns-investigation.md` for full root cause analysis.

---

## Problem

Claude Code's macOS `sandbox-exec` blocks raw DNS (UDP 53) for child processes. It starts an in-process HTTP/SOCKS proxy and injects `HTTP_PROXY`/`HTTPS_PROXY` env vars. However, Node.js `fetch()` (undici) does NOT respect these env vars on Node 18-23. All 4 search providers fail for sandbox users.

`curl` works because it respects proxy env vars by default.

## Root Cause

Node.js's built-in `fetch()` uses an internal copy of `undici` that does not read `HTTP_PROXY`/`HTTPS_PROXY` by default. There are two paths to fix this:

### Option A: `NODE_USE_ENV_PROXY=1` (Node 24+ or Node 22.22+)

Node.js added `NODE_USE_ENV_PROXY` support via PR nodejs/node#57165:
- **Node 24.0.0**: Initial implementation (fetch only)
- **Node 22.22.1**: Backported (but requires undici 7.x patches; tests show failures on 22.18.1-pre)
- **Node 22.17.1** (current system version): **NOT SUPPORTED** — tested and confirmed fetch ignores `NODE_USE_ENV_PROXY` entirely

**Verdict:** Not viable for current system Node version. Users would need to upgrade to Node 22.22+ or 24+.

### Option B: Install `undici` as dependency + `setGlobalDispatcher(new EnvHttpProxyAgent())`

Install `undici@6.x` and call `setGlobalDispatcher(new EnvHttpProxyAgent())` before any `fetch()` calls. This makes Node.js `fetch()` route through the proxy.

**Pros:**
- Works on Node 22+ (current system version)
- Stays sandboxed, respects `allowedDomains`
- Proper security model maintained
- Minimal code change (~10 lines across 2 entry points)

**Cons:**
- Adds first npm dependency to the plugin (currently zero-dep)
- Requires `package.json` + `npm install` step
- Changes install story for users
- `undici` is NOT importable from Node 22's built-in copy (confirmed: `ERR_MODULE_NOT_FOUND`)

**Verdict:** Best option if sandbox security is required. Main cost is install friction.

### Option C: Add `node` to `excludedCommands` (docs-only fix)

```json
"excludedCommands": ["docker", "gh", "node"]
```

**Pros:** One-line config change, no code changes needed.
**Cons:** Bypasses ALL sandbox restrictions for Node scripts, including filesystem isolation.

**Verdict:** Simplest operational fix. Appropriate for self-authored plugin code. Document as recommended workaround.

## Recommended Approach

### Short term: Document Option C as workaround

Add to README.md and SKILL.md: Users experiencing sandbox DNS failures should add `node` to `excludedCommands` in Claude Code settings.

### Medium term: Implement Option A via Node version guidance

When Node 22.22+ is widely adopted, document `NODE_USE_ENV_PROXY=1` as the recommended fix. This is zero-dependency and zero-code-change.

### Long term: Consider Option B if zero-dep can't solve it

Only if the user base needs sandbox-safe proxy routing on older Node versions.

## Why NOT Option B now

The plugin currently has **zero npm dependencies**. It's installed by pointing Claude Code at the GitHub repo — no `npm install` step needed. Adding `undici` would:

1. Require a `package.json` in the skill directory
2. Require users to run `npm install` after plugin install
3. Break the "just point and use" install model
4. Add dependency management overhead

Given that Option C (excludedCommands) works immediately and the security trade-off is acceptable for self-authored plugin code, the install friction of Option B is not justified.

## Implementation Plan (Option C — documentation)

### Task 1: Update README.md with sandbox troubleshooting

Add a "Sandbox Compatibility" section documenting:
- The root cause (Node.js fetch ignores HTTP_PROXY)
- The workaround (add `node` to `excludedCommands`)
- Future fix path (upgrade to Node 22.22+ and use `NODE_USE_ENV_PROXY`)

### Task 2: Update CHANGELOG.md

Add entry under `[3.0.0]` noting the sandbox compatibility documentation.

---

## Environment tested

| Property | Value |
|----------|-------|
| Node.js | v22.17.1 |
| undici (bundled) | 6.21.2 |
| `import 'undici'` | ERR_MODULE_NOT_FOUND |
| `NODE_USE_ENV_PROXY=1` | Ignored (fetch goes direct) |
| Platform | macOS Darwin 26.3.1 arm64 |
