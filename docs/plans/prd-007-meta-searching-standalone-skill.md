# PRD: Extract Meta-Searching into a Standalone Portable Skill

## Overview

Extract the `meta-search` skill from the `search-plus` plugin into a self-contained, portable skill that bundles its own runtime (scripts, hooks, manifest). When installed alongside `search-plus`, both should compose cleanly without duplication or conflict. When installed alone, `meta-search` should provide full error-recovery functionality independently.

## Goals

- Make `meta-search` fully portable — installable and functional without the `search-plus` plugin.
- Bundle the minimum runtime (scripts, hooks) directly inside the skill directory so it carries its own implementation.
- Maintain full compatibility when both `meta-search` and `search-plus` are installed together.
- Preserve the existing agent (`search-plus`) and command (`/search-plus`) behavior unchanged.

## Non-Goals

- Replacing or refactoring the `search-plus` plugin's own hook infrastructure.
- Adding new search providers or error-handling capabilities.
- Changing the `search-plus` agent's `skills: meta-search` reference.
- Building a shared library between plugins (keep it simple — duplicate if needed).

## Problem Statement

The `meta-search` skill lives at `plugins/search-plus/skills/meta-search/SKILL.md` and depends entirely on the parent plugin's infrastructure:

1. **Hooks** (`hooks/hooks.json`) — The `PostToolUse` hook intercepts `WebSearch|WebFetch` calls and runs `handle-web-search.mjs`.
2. **Scripts** (`scripts/*.mjs`) — ~6,400 lines of Node.js implementing Tavily/Jina extraction, rate-limit handling, error recovery, response transformation, and security sanitization.
3. **Environment variables** — `SEARCH_PLUS_TAVILY_API_KEY`, `SEARCH_PLUS_JINAAI_API_KEY`, etc.
4. **Plugin manifest** — Only the `search-plus` plugin is registered; `meta-search` has no independent identity.

Without the parent plugin, the skill is just instructional text — Claude gets told to "use Tavily Extract API with Jina.ai fallback" but has no mechanism to execute it.

## Key Outcomes and Success Metrics

- **Portability**: Installing `meta-search` without `search-plus` provides full error-recovery functionality (403/429/422/ECONNREFUSED).
- **Composition**: Installing both plugins produces no hook conflicts, no duplicate processing, and no regressions.
- **Parity**: Error recovery rates remain unchanged (403 ~80%, 429 ~90%, 422 ~100%, connections ~50%).
- **Independence**: `meta-search` has its own `.claude-plugin/plugin.json` manifest.

## User Stories

- As a developer, I want to install just the error-recovery skill without the full search-plus plugin, so I get resilient web research in a lighter package.
- As a search-plus user, I want both plugins to coexist without conflicts when I have them both installed.
- As a plugin author, I want to understand how `meta-search` composes with `search-plus` so I can model my own plugins.

## Scope

### In Scope

- Create a new standalone plugin directory for `meta-search`.
- Bundle the required scripts into the skill's own directory.
- Create a standalone hook configuration for the meta-search plugin.
- Create a standalone plugin manifest.
- Define composition rules for when both plugins are installed.
- Documentation and migration guidance.

### Out of Scope

- Refactoring scripts into a shared `lib/` package between plugins.
- Modifying the existing `search-plus` agent or command.
- Adding new functionality beyond what `meta-search` already provides.

## Analysis: Script Dependency Graph

The meta-search skill's actual runtime depends on these scripts (via the `handle-web-search.mjs` entry point):

```
handle-web-search.mjs (575 lines) — entry point
├── content-extractor.mjs (1,705 lines) — Tavily/Jina/cache services
├── handle-search-error.mjs (886 lines) — error routing and recovery
│   ├── content-extractor.mjs (shared)
│   └── handle-rate-limit.mjs (116 lines) — retry/backoff logic
├── github-service.mjs (380 lines) — GitHub CLI integration
├── response-transformer.mjs (321 lines) — normalize to standard format
│   └── search-response.mjs (326 lines) — shared response types
└── security-utils.mjs (93 lines) — HTML/URL sanitization

Total runtime: ~4,402 lines (6 core files)
```

Scripts **not needed** by meta-search:
- `architecture-improvements.mjs` (371 lines) — monitoring/telemetry
- `production-improvements.mjs` (541 lines) — streaming/persistence
- `missing-features.mjs` (473 lines) — planned features, not active
- `optimized-transforms.mjs` (209 lines) — unused optimizations
- `response-validator.mjs` (387 lines) — validation utilities not in critical path

## Proposed Structure

### Standalone Meta-Searching Plugin

```
plugins/meta-search/
├── .claude-plugin/
│   └── plugin.json                    # Standalone manifest
├── hooks/
│   └── hooks.json                     # PostToolUse hook for WebSearch|WebFetch
├── scripts/
│   ├── handle-web-search.mjs          # Entry point (copied from search-plus)
│   ├── content-extractor.mjs          # Tavily/Jina/cache extraction
│   ├── handle-search-error.mjs        # Error routing
│   ├── handle-rate-limit.mjs          # Retry/backoff
│   ├── github-service.mjs             # GitHub CLI (optional)
│   ├── response-transformer.mjs       # Response normalization
│   ├── search-response.mjs            # Shared response types
│   └── security-utils.mjs             # Sanitization
├── skills/
│   └── meta-search/
│       └── SKILL.md                   # Updated skill definition
└── README.md
```

### Composition with search-plus

When both plugins are installed:

| Concern | Behavior |
|---------|----------|
| **Hooks** | Both register `PostToolUse` on `WebSearch\|WebFetch`. Claude Code runs hooks per-plugin. The hook in each plugin points to its own `handle-web-search.mjs`. |
| **Scripts** | Each plugin has its own copy under its own directory. No shared state. |
| **Environment vars** | Both read the same `SEARCH_PLUS_*` / `TAVILY_*` / `JINAAI_*` env vars. No conflict. |
| **Agent** | `search-plus` agent still references `skills: meta-search`. When meta-search is a separate plugin, the skill is resolved by name across all installed plugins. |
| **Command** | `/search-plus` remains in the `search-plus` plugin, unaffected. |
| **Duplication** | If both hooks fire on the same `WebSearch` call, both would attempt recovery. **This needs a deduplication strategy** (see risks). |

## Functional Requirements

### 1. Standalone Plugin Manifest

```json
{
  "name": "meta-search",
  "description": "Portable error-recovery skill for web search and content extraction. Handles 403/429/422/ECONNREFUSED with multi-service fallback (Tavily, Jina.ai, cache services). Works standalone or alongside search-plus.",
  "version": "1.0.0",
  "author": {
    "name": "shrwnsan"
  }
}
```

### 2. Hook Configuration

The standalone plugin's `hooks/hooks.json` mirrors the search-plus hook but points to its own scripts:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "WebSearch|WebFetch",
        "hooks": [{
          "type": "command",
          "command": "node ${CLAUDE_PLUGIN_ROOT}/scripts/handle-web-search.mjs",
          "timeout": 30
        }]
      }
    ]
  }
}
```

### 3. Script Bundling

Copy the 7 core scripts (see dependency graph above) into `plugins/meta-search/scripts/`. Update internal import paths to use relative `./` references (they already do — no changes needed).

The only change: update `handle-web-search.mjs` line 9 to namespace env vars for meta-search:

```js
// Current (search-plus namespaced):
const TAVILY_API_KEY = process.env.SEARCH_PLUS_TAVILY_API_KEY || process.env.TAVILY_API_KEY || null;

// Updated (meta-search reads its own vars first, falls back to search-plus vars):
const TAVILY_API_KEY = process.env.META_SEARCH_TAVILY_API_KEY
  || process.env.SEARCH_PLUS_TAVILY_API_KEY
  || process.env.TAVILY_API_KEY
  || null;
```

### 4. Skill Definition Update

Update `SKILL.md` to remove the disclaimer about requiring search-plus delegation. The skill should describe itself as fully self-contained:

```yaml
---
name: meta-search
description: Extracts web content and performs reliable searches when standard tools fail due to access restrictions, rate limiting, or validation errors. Use when encountering 403/429/422 errors, blocked documentation sites, or silent search failures. Fully portable — works standalone or alongside search-plus.
allowed-tools:
  - web_search
  - web_fetch
---
```

### 5. Composition: Hook Deduplication

**Problem**: When both plugins are installed, both `PostToolUse` hooks fire on `WebSearch|WebFetch`, causing duplicate recovery attempts.

**Options**:

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A. Guard file | Each hook writes a `.meta-search.lock` to `/tmp`; second hook checks and skips if lock exists | Simple, no cross-plugin coordination needed | Stale locks, race conditions |
| B. Env var flag | search-plus hook checks `META_SEARCH_DELEGATED=1`; if set, skips its own recovery | Clean, no filesystem state | Requires modifying search-plus plugin |
| C. Remove from search-plus | Remove the PostToolUse hook from search-plus entirely; let meta-search own it | No duplication possible | Breaking change for search-plus-only users |
| **D. Default-off in search-plus** | search-plus hook checks if meta-search plugin is installed; if so, defers | No duplication, no breaking change | Requires discovery mechanism between plugins |

**Recommendation**: **Option C** (remove hook from search-plus) as a phased approach:
- Phase 1: Both plugins ship with hooks. Document that running both causes double-processing (acceptable short-term).
- Phase 2: Add a `META_SEARCH_DELEGATED` guard to search-plus's hook. Meta-searching sets this env var in its hook output. search-plus checks it and skips.
- Phase 3 (future): When meta-search is stable, remove the hook from search-plus and make meta-search a peer dependency.

### 6. Agent and Command Impact

| Component | Impact | Details |
|-----------|--------|---------|
| `search-plus` agent | **None** | Agent references `skills: meta-search` by name. Claude resolves skill names across all installed plugins. |
| `/search-plus` command | **None** | Command delegates to the `search-plus` agent. The agent loads the meta-search skill from whichever plugin provides it. |
| `meta-search` skill | **Enhanced** | Now has its own runtime. Works whether called via search-plus agent or invoked directly by Claude. |

The agent and command require **zero changes**. The skill resolution layer handles cross-plugin skill lookup.

## Non-Functional Requirements

- **Performance**: Script execution should be identical — same files, same logic, same env vars.
- **Security**: No new attack surface. Same sanitization (`security-utils.mjs`) applies.
- **Size**: ~4,400 lines of scripts duplicated. Acceptable for portability; avoids shared-library complexity.
- **Maintenance**: Bug fixes to core scripts must be applied to both plugins. Document this in CONTRIBUTING.

## Acceptance Criteria

- [ ] **AC1**: Installing `meta-search` without `search-plus` provides working error recovery (403/429/422/ECONNREFUSED) via its own hooks and scripts.
- [ ] **AC2**: Installing both plugins produces no errors or conflicts during initialization.
- [ ] **AC3**: `search-plus` agent still loads `meta-search` skill when both are installed.
- [ ] **AC4**: `/search-plus` command behavior is unchanged.
- [ ] **AC5**: Error recovery rates match current baselines (403 ~80%, 429 ~90%, 422 ~100%).
- [ ] **AC6**: Hook deduplication strategy is implemented (at minimum Phase 1 documented, Phase 2 guard added).
- [ ] **AC7**: Environment variables are read with proper fallback chain (meta-search → search-plus → generic).
- [ ] **AC8**: README and CHANGELOG updated for both plugins.

## Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Script duplication drift** — fixes applied to one plugin but not the other | Medium | Add a `scripts/sync-check.mjs` that compares script hashes between plugins; run in CI |
| **Double hook execution** — both plugins process the same WebSearch failure | Medium | Phase 2 guard via env var; Phase 3 remove hook from search-plus |
| **Plugin load order** — which hook runs first is undefined | Low | Guard mechanism is order-independent |
| **User confusion** — two plugins that seem to do similar things | Low | Clear README differentiation: search-plus = full search experience; meta-search = error recovery only |

## Open Questions

- Should meta-search version its scripts independently, or track search-plus version parity?
- Is there a Claude Code plugin API for detecting whether another plugin is installed (to implement Option D)?
- Should we consider a `depends` or `recommends` field in `plugin.json` for optional peer dependencies?

## Implementation Phases

### Phase 1: Scaffold and Bundle (1-2 days)
- Create `plugins/meta-search/` directory structure.
- Copy 7 core scripts from `search-plus/scripts/`.
- Create standalone `plugin.json` and `hooks/hooks.json`.
- Update `SKILL.md` with portable description.
- Update env var fallback chain in `handle-web-search.mjs`.

### Phase 2: Composition Guard (1 day)
- Add `META_SEARCH_DELEGATED` guard to search-plus's `handle-web-search.mjs`.
- Meta-searching's hook sets the flag after processing.
- search-plus's hook checks the flag and skips if already handled.

### Phase 3: Validation (1-2 days)
- Test meta-search standalone (no search-plus installed).
- Test both plugins installed together.
- Verify agent skill resolution works across plugins.
- Verify `/search-plus` command is unaffected.
- Run error recovery test suite against standalone meta-search.

### Phase 4: Documentation and Release (1 day)
- README for meta-search plugin.
- Update search-plus README to note meta-search as an optional companion.
- CHANGELOG entries for both plugins.
- Migration guide for existing users.

---

**Status**: DRAFT
**Created**: 2026-04-02
**Issue Type**: Architecture and Portability
**Impact**: Enables standalone distribution of meta-search error recovery
