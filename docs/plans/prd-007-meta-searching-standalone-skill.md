# PRD: Extract Meta-Search into a Standalone Portable Skill

<!-- Version: 0.4.0 | Status: IMPLEMENTED | Updated: 2026-04-06 -->

## Overview

Extract the `meta-search` skill from the `search-plus` plugin into a self-contained, portable skill with bundled scripts. The skill orchestrates multi-service error recovery (Tavily, Jina.ai, free services) via three tiers: automated hook, skill-driven script execution, and manual fallback strategies.

## Goals

- Make `meta-search` fully portable — self-contained skill directory with bundled scripts per the [Agent Skills](https://agentskills.io/specification) open standard.
- Three-tier error recovery: hook (automatic), skill (orchestrated scripts), manual (built-in tools).
- Maintain full compatibility when `meta-search` and `search-plus` are installed together.
- Remove the `/search-plus` command in favor of skill-based invocation per [Claude Code skills docs](https://code.claude.com/docs/en/skills).

## Non-Goals

- Creating a separate plugin for meta-search (it stays inside `plugins/search-plus/skills/`).
- Building a shared library between plugins.
- Refactoring the existing `search-plus` agent or adding new search providers.

## Problem Statement

The `meta-search` skill lived at `plugins/search-plus/skills/meta-searching/SKILL.md` with several issues:

1. **Naming**: Skill directory was `meta-searching` but referenced as `meta-search` — inconsistent.
2. **Dead scripts**: 13 scripts (~6,383 lines) at `plugins/search-plus/scripts/` had no CLI entry points — the `PostToolUse` hook fired `node handle-web-search.mjs` which exited silently.
3. **Command redundancy**: `commands/search-plus.md` was a thin wrapper — commands and skills are unified per Claude Code.
4. **Portability claim**: SKILL.md disclaimed that "search-plus agent delegation provides the most reliable results" — contradicting standalone use.
5. **SKILL.md was marketing copy**: Claimed capabilities ("Combines Tavily with Jina.ai fallback") without actionable instructions for Claude to follow.

## Key Outcomes and Success Metrics

- **Portability**: `meta-search` skill directory contains SKILL.md + scripts — fully self-contained per Agent Skills spec.
- **Three-tier recovery**: Hook handles errors automatically, skill orchestrates bundled scripts, manual strategies cover edge cases.
- **Composition**: `search-plus` agent loads `meta-search` skill via `skills: meta-search`.
- **Parity**: Test results unchanged — 32/35 pass, same scenarios as baseline.
- **Accuracy**: ARCHITECTURE.md and SKILL.md reflect actual runtime behavior.

## Discovery: Scripts Are Dead Code (v0.2)

> **Added in v0.2** — Critical finding that reshaped the entire PRD scope.

During implementation analysis, we traced the actual data flow and found:

- `handle-web-search.mjs` only exports `handleWebSearch()` — no `process.stdin`, `process.argv`, or top-level code.
- None of the 13 scripts in `scripts/` had a CLI entry point.
- The hook command `node handle-web-search.mjs` ran Node, which imported modules, found nothing to execute, and exited silently.
- Error recovery worked through Claude reading SKILL.md instructions and reasoning with built-in tools.

### Resolution (v0.4)

Instead of the originally recommended Option 2 (remove scripts, keep instruction-only), we implemented a hybrid that wires up the scripts:

- **`hook-entry.mjs`** — CLI entry point for `PostToolUse` hook. Reads stdin JSON, detects errors, delegates to `handleWebSearch()`, outputs `additionalContext`.
- **`search.mjs`** — CLI wrapper for skill invocation. Takes query/URL as args, outputs recovered content.
- **Scripts moved** from `plugins/search-plus/scripts/` into `skills/meta-search/scripts/` per Agent Skills spec.
- **5 dead scripts removed** (~1,986 lines): `architecture-improvements`, `missing-features`, `optimized-transforms`, `production-improvements`, `response-validator`.

## User Stories

- As a developer, I want the meta-search skill to recover from search failures automatically via the hook, and manually via `/search-plus:meta-search` when needed.
- As a search-plus user, I want the skill and agent to compose cleanly with no redundancy.
- As a plugin author, I want accurate documentation that reflects the three-tier architecture.

## Implemented Structure

```
plugins/search-plus/
├── .claude-plugin/
│   └── plugin.json                 # v2.11.0
├── agents/
│   └── search-plus.md              # skills: meta-search
├── docs/
│   ├── ARCHITECTURE.md             # Updated — three-tier, hook runtime
│   ├── CONFIGURATION.md
│   ├── PERFORMANCE.md
│   └── STANDARD_RESPONSE_FORMAT.md
├── hooks/
│   └── hooks.json                  # PostToolUse → skills/meta-search/scripts/hook-entry.mjs
├── skills/
│   └── meta-search/                # Self-contained skill (Agent Skills spec)
│       ├── SKILL.md                # Orchestrates scripts, then manual fallback
│       └── scripts/
│           ├── search.mjs          # CLI wrapper for skill invocation
│           ├── hook-entry.mjs      # CLI entry point for PostToolUse hook
│           ├── handle-web-search.mjs
│           ├── content-extractor.mjs
│           ├── handle-search-error.mjs
│           ├── handle-rate-limit.mjs
│           ├── github-service.mjs
│           ├── response-transformer.mjs
│           ├── search-response.mjs
│           └── security-utils.mjs
├── CHANGELOG.md
└── README.md
```

### Three-tier architecture

| Tier | Trigger | Component | How it works |
|------|---------|-----------|--------------|
| **Hook** | Automatic on `PostToolUse` error | `hook-entry.mjs` | Reads stdin JSON, detects 403/429/422/451/ECONNREFUSED/empty, runs `handleWebSearch()`, injects `additionalContext` |
| **Skill** | Claude auto-loads or user invokes `/search-plus:meta-search` | `SKILL.md` → `search.mjs` | Runs `node ${CLAUDE_SKILL_DIR}/scripts/search.mjs <query>`, falls back to manual strategies |
| **Manual** | Skill Step 2 | Built-in `web_search`/`web_fetch` | Error-specific strategies (cache URLs, query reformulation, domain exclusion) |

## Acceptance Criteria

- [x] **AC1**: `meta-search` skill renamed from `meta-searching`, SKILL.md updated with portable description.
- [x] **AC2**: `search-plus` agent references `skills: meta-search`.
- [x] **AC3**: `commands/search-plus.md` removed.
- [x] **AC4**: ARCHITECTURE.md corrected to reflect three-tier runtime.
- [x] **AC5**: Hook wired up with CLI entry point (`hook-entry.mjs`), tested with real PostToolUse JSON.
- [x] **AC6**: Scripts moved into skill directory per Agent Skills spec.
- [x] **AC7**: `search.mjs` CLI wrapper tested — Tavily recovery verified.
- [x] **AC8**: SKILL.md follows best practices: third-person description (182 chars), `Bash(node *)` in `allowed-tools`, orchestrates bundled scripts.
- [x] **AC9**: Test parity — 32/35 pass, matching baseline.
- [x] **AC10**: README, CHANGELOG updated. Version bumped to 2.11.0.
- [ ] **AC11**: ARCHITECTURE.md updated to reflect three-tier model (pending).
- [ ] **AC12**: CHANGELOG complete with all v2.11.0 changes (pending).
- [ ] **AC13**: `marketplace.json` version synced to 2.11.0 (pending approval).

## Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Breaking `/search-plus` for existing users** | Medium | Command removed; same functionality via skill auto-invocation or `/search-plus:meta-search`. Migration notes in CHANGELOG. |
| **Hook + skill double-processing** | Low | Hook fires on `PostToolUse` (post-execution); skill fires on Claude's decision. Different triggers — no conflict. |
| **Scripts depend on external APIs** | Low | Free services (SearXNG, DuckDuckGo, Startpage) work without API keys. Tavily/Jina are optional enhancements. |
| **`PostToolUseFailure` not covered** | Low | Hook only covers `PostToolUse` (successful tool call with error in response). Tool-level exceptions not intercepted. Document as known limitation. |

## Open Questions (Resolved)

| Question | Resolution |
|----------|------------|
| Keep `scripts/` as reference or remove? | Moved 9 core scripts into skill; removed 5 dead scripts. |
| Remove hook or leave as-is? | Wired up with `hook-entry.mjs` — now functional. |
| Pursue Option 1 (CLI entry point)? | Yes — implemented as `hook-entry.mjs` + `search.mjs`. |

## Implementation Phases

### Phase 1: Rename and Update ✅
- Renamed `skills/meta-searching/` → `skills/meta-search/`.
- Updated agent skill reference.
- Removed `commands/search-plus.md`.

### Phase 2: Wire Up Scripts ✅
- Added `hook-entry.mjs` CLI entry point for PostToolUse hook.
- Added `search.mjs` CLI wrapper for skill invocation.
- Moved 9 core scripts into `skills/meta-search/scripts/`.
- Removed 5 dead scripts (~1,986 lines).
- Updated `hooks.json` to point to skill-local scripts.

### Phase 3: Documentation ✅ (partial)
- Rewrote ARCHITECTURE.md — three-tier, hook runtime documented.
- Rewrote SKILL.md — orchestrates scripts, best-practice compliant.
- Updated README — removed `/search-plus` command references.
- Added CHANGELOG v2.11.0 entry.
- Updated test import paths.

### Phase 4: Pre-Push Cleanup (pending)
- Sync `marketplace.json` version.
- Complete ARCHITECTURE.md with three-tier model.
- Complete CHANGELOG with all v2.11.0 changes.
- Fix stale `/search-plus` references in CONFIGURATION.md.
- Remove broken `search-plus-standardization-test.mjs`.
- Clean git history (squash superseded commits).

---

## Changelog

### v0.4.0 (2026-04-06)

Implementation complete — exceeded original scope.

**Outcome**:
- Implemented three-tier architecture (hook + skill + manual) instead of originally recommended Option 2 (instruction-only).
- Wired up dead scripts with CLI entry points: `hook-entry.mjs` (PostToolUse stdin/stdout) and `search.mjs` (CLI args).
- Moved 9 core scripts into `skills/meta-search/scripts/` per Agent Skills spec. Removed 5 dead scripts (~1,986 lines).
- SKILL.md rewritten to orchestrate bundled scripts, then fall back to manual strategies. Best-practice compliant (third-person, 182 chars, under 250 truncation limit).
- Test parity confirmed: 32/35 pass, matching pre-change baseline.

**Open questions resolved**:
- Scripts: moved into skill (not removed or kept as reference).
- Hook: wired up (not removed or left inert).
- Option 1: implemented as part of this PRD (not deferred).

### v0.3.0 (2026-04-05)

Review pass — factual corrections and versioning formalization.

**Corrections**:
- Fixed dead code line count: ~4,399 → ~6,383 lines across 13 scripts (verified via `wc -l`).
- Removed inaccurate "7 dependencies" claim — actual: 5 direct imports.
- ARCHITECTURE.md version drift noted (2.9.0 vs 2.10.1 in plugin.json).

**Structural**:
- Added semver version header to document frontmatter.
- Formalized changelog with semver.

### v0.2.0 (2026-04-05)

Critical scope revision based on data flow analysis.

**Findings**:
- Scripts (~6,383 lines across 13 files) have no CLI entry point — hook fires silently.
- Error recovery works through Claude reading SKILL.md, not through scripted runtime.
- ARCHITECTURE.md documented an aspirational system.
- Commands merged into skills per Claude Code docs.

### v0.1.0 (2026-04-02)

Initial draft. Assumed scripts were active runtime with hook-driven execution. Proposed separate plugin with bundled scripts and hook deduplication strategy.

---

**Status**: IMPLEMENTED (v0.4.0)
**Created**: 2026-04-02
**Last Updated**: 2026-04-06
**Issue Type**: Architecture and Portability
**Impact**: Three-tier error recovery — standalone meta-search skill with bundled Tavily/Jina scripts
