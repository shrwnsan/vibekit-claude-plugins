# PRD: Extract Meta-Search into a Standalone Portable Skill

<!-- Version: 0.3.0 | Status: DRAFT | Updated: 2026-04-05 -->

## Overview

Extract the `meta-search` skill from the `search-plus` plugin into a self-contained, portable skill. When installed alongside `search-plus`, both should compose cleanly without duplication or conflict. When installed alone, `meta-search` should provide full error-recovery functionality independently.

## Goals

- Make `meta-search` fully portable — installable and functional without the `search-plus` plugin.
- Keep the skill self-contained within the search-plus plugin directory.
- Maintain full compatibility when both `meta-search` and `search-plus` are installed together.
- Deprecate the `/search-plus` command in favor of skill-based invocation per [Claude Code skills docs](https://code.claude.com/docs/en/skills).

## Non-Goals

- Creating a separate plugin for meta-search (it stays inside `plugins/search-plus/skills/`).
- Building a shared library between plugins.
- Refactoring the existing `search-plus` agent or adding new search providers.

## Problem Statement

The `meta-search` skill lives at `plugins/search-plus/skills/meta-searching/SKILL.md` with several issues:

1. **Naming**: Skill directory is `meta-searching` but referenced as `meta-search` — inconsistent.
2. **Dependency illusion**: ARCHITECTURE.md documents a hook-driven script runtime, but the scripts have no CLI entry point and are never executed (see Discovery below).
3. **Command redundancy**: `commands/search-plus.md` is a thin wrapper that delegates to the agent — commands and skills are now unified per Claude Code.
4. **Portable claim**: SKILL.md disclaims that "search-plus agent delegation provides the most reliable results" — contradicting portability.

## Key Outcomes and Success Metrics

- **Portability**: `meta-search` skill works as self-contained instructions regardless of plugin context.
- **Composition**: `search-plus` agent loads `meta-search` skill when both are present.
- **Accuracy**: Documentation reflects actual runtime behavior (instruction-driven, not script-driven).
- **Deprecation**: `/search-plus` command deprecated; functionality absorbed by skill.

## Discovery: Scripts Are Dead Code (v0.2)

> **Added in v0.2** — Critical finding that reshapes the entire PRD scope.

During implementation analysis, we traced the actual data flow and found:

### What the architecture document claims

ARCHITECTURE.md describes a hook-driven system where `PostToolUse` intercepts `WebSearch|WebFetch`, runs `handle-web-search.mjs`, which orchestrates fallback across Tavily/Jina/cache services via script-to-script imports.

### What actually happens

```
Hook fires → node handle-web-search.mjs → exits silently (no CLI entry point)
                                               ↓
Agent reads SKILL.md → Claude reasons through instructions → uses built-in tools
                                               ↓
Error recovery works — but it's Claude's reasoning, not the scripts
```

**Evidence**:
- `handle-web-search.mjs` only exports `handleWebSearch()` — no `process.stdin`, `process.argv`, or top-level code
- None of the 13 scripts in `scripts/` have a CLI entry point
- The hook command `node handle-web-search.mjs` runs Node, which imports modules, finds nothing to execute, and exits
- The actual error recovery success rates (403 ~80%, 429 ~90%, 422 ~100%) come from Claude following SKILL.md instructions with its built-in tools

### Impact on this PRD

| Original assumption | Reality |
|---|---|
| Bundle scripts into the skill | Scripts are dead code (~6,383 lines across 13 files) — no need to bundle |
| Create standalone hooks for the skill | Hooks are inert — script has no entry point |
| Env var fallback chain (META_SEARCH_* → SEARCH_PLUS_*) | Irrelevant if scripts aren't executed |
| Hook deduplication strategy (Phase 2-3) | No hook execution to deduplicate |

### Options forward

1. **Wire up a CLI entry point** — Add stdin/stdout handling to `handle-web-search.mjs` so the hook actually works. This is a separate effort with its own complexity.
2. **Remove scripts and hook, keep instruction-only skill** — Slim the skill to `SKILL.md` only. Accept that error recovery is Claude's reasoning, not scripted runtime.
3. **Hybrid** — Keep scripts as reference material inside the skill (Claude can read them for context), but acknowledge they're documentation, not executable code.

**Recommendation**: Option 2 for this PRD. Option 1 can be a separate effort if hook-driven execution is desired later.

## User Stories

- As a developer, I want the meta-search skill to be self-contained with clear instructions, so Claude can reliably recover from search failures.
- As a search-plus user, I want the skill and agent to compose cleanly with no redundancy.
- As a plugin author, I want accurate documentation that reflects how the system actually works.

## Scope

### In Scope

- Rename `skills/meta-searching/` → `skills/meta-search/`.
- Update `SKILL.md` with portable description (remove delegation disclaimer).
- Update `agents/search-plus.md` skill reference: `meta-searching` → `meta-search`.
- Deprecate `commands/search-plus.md`.
- Update `hooks/hooks.json` to reflect actual behavior.
- Correct ARCHITECTURE.md to match reality.
- Update env var references in any remaining active scripts.

### Out of Scope

- Creating a separate plugin for meta-search.
- Adding CLI entry points to scripts (separate effort).
- Refactoring scripts into a shared library.
- Modifying the search-plus agent's operating procedure.

## Proposed Structure

```
plugins/search-plus/
├── .claude-plugin/
│   └── plugin.json
├── agents/
│   └── search-plus.md              # skills: meta-search
├── commands/
│   └── search-plus.md              # DEPRECATED — to be removed
├── docs/
│   ├── ARCHITECTURE.md             # TODO: correct to reflect actual runtime
│   └── ...
├── hooks/
│   └── hooks.json                  # TODO: reassess (currently inert)
├── scripts/                        # TODO: reassess (currently dead code)
│   └── ...
├── skills/
│   └── meta-search/                # Self-contained skill
│       └── SKILL.md                # Core value — instruction-driven
├── CHANGELOG.md
└── README.md
```

### Composition with search-plus agent

| Concern | Behavior |
|---------|----------|
| **Skill resolution** | Agent references `skills: meta-search`. Claude resolves by name within the plugin. |
| **Hooks** | `PostToolUse` on `WebSearch\|WebFetch` fires but script exits silently. No functional impact. |
| **Environment vars** | `SEARCH_PLUS_*` / `TAVILY_*` — read by scripts if they were ever wired up. Currently unused. |
| **Command** | `/search-plus` deprecated. Skill invocation replaces it. |

## Functional Requirements

### 1. Skill Rename

Rename `skills/meta-searching/` → `skills/meta-search/`. Update SKILL.md frontmatter:

```yaml
---
name: meta-search
description: Extracts web content and performs reliable searches when standard tools fail due to access restrictions, rate limiting, or validation errors. Self-contained instruction-driven skill — works independently or via search-plus agent.
allowed-tools:
  - web_search
  - web_fetch
---
```

### 2. Agent Reference Update

`agents/search-plus.md` line 5: `skills: meta-searching` → `skills: meta-search`.

### 3. Command Deprecation

Deprecate `commands/search-plus.md`. Per [Claude Code docs](https://code.claude.com/docs/en/skills):

> Custom commands have been merged into skills. A file at `.claude/commands/deploy.md` and a skill at `.claude/skills/deploy/SKILL.md` both create `/deploy` and work the same way.

The `/search-plus` slash command is replaced by skill-based invocation. The command file should be marked deprecated and removed in a future version.

### 4. SKILL.md Content

The skill should describe itself as fully self-contained. Remove any disclaimer about requiring search-plus delegation. Include clear instructions for error recovery scenarios that Claude can reason through.

### 5. Documentation Corrections

- **ARCHITECTURE.md**: Update to reflect instruction-driven architecture, not script-driven. Mark hook/mermaid flows as aspirational or remove them.
- **CONFIGURATION.md**: Update env var docs if scripts remain for reference.

## Non-Functional Requirements

- **Performance**: No change — skill is instruction text, no runtime overhead.
- **Security**: No change — no new attack surface.
- **Size**: Net reduction — remove dead scripts if Option 2 chosen.
- **Maintenance**: Simpler — fewer files to maintain.

## Acceptance Criteria

- [ ] **AC1**: `meta-search` skill renamed from `meta-searching`, SKILL.md updated with portable description.
- [ ] **AC2**: `search-plus` agent references `skills: meta-search`.
- [ ] **AC3**: `commands/search-plus.md` deprecated.
- [ ] **AC4**: ARCHITECTURE.md corrected to reflect actual runtime (instruction-driven).
- [ ] **AC5**: Hook behavior documented accurately (inert — no CLI entry point in scripts).
- [ ] **AC6**: README and CHANGELOG updated.

## Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Breaking `/search-plus` for existing users** | Medium | Deprecate first, remove in future version. Skill invocation provides same functionality. |
| **ARCHITECTURE.md corrections may confuse contributors** | Low | Add clear v0.3 changelog noting what changed and why. |
| **Scripts removal may break unknown consumers** | Low | Audit for any references before removing. Keep in git history. |

## Open Questions

- Should we keep `scripts/` as reference material for Claude to read, or remove entirely?
- Should the hook be removed or left as-is (inert but harmless)?
- Should we pursue Option 1 (wire up CLI entry point) as a follow-up effort?

## Implementation Phases

### Phase 1: Rename and Update (current)
- Rename `skills/meta-searching/` → `skills/meta-search/`.
- Update SKILL.md with portable description.
- Update agent skill reference.
- Deprecate command.

### Phase 2: Documentation Cleanup
- Correct ARCHITECTURE.md.
- Update CONFIGURATION.md and README.md.
- Add CHANGELOG entry.

### Phase 3: Script Assessment (deferred)
- Decide: remove scripts, keep as reference, or wire up CLI entry point.
- Clean up or update hooks accordingly.

---

## Changelog

### v0.3.0 (2026-04-05)

Review pass — factual corrections and versioning formalization.

**Corrections**:
- Fixed dead code line count: ~4,399 → ~6,383 lines across 13 scripts (verified via `wc -l`).
- Removed inaccurate "7 dependencies" claim for `handle-web-search.mjs` — it has 5 direct imports (`content-extractor`, `handle-search-error`, `github-service`, `response-transformer`, `security-utils`).
- ARCHITECTURE.md line 358 still references version `2.9.0` in plugin manifest example; actual plugin.json is at `2.10.1`.
- ARCHITECTURE.md documents hook execution flow (lines 350-376) as if scripts run — confirms discovery from v0.2.

**Structural**:
- Added semver-style version header (`<!-- Version: X.Y.Z -->`) to document frontmatter for tracking.
- Formalized changelog with semver (v0.1 → v0.1.0, v0.2 → v0.2.0, v0.3.0).
- Updated risk mitigation references from v0.2 to v0.3.

**No scope changes** — v0.2 analysis remains accurate; this version corrects data points only.

### v0.2.0 (2026-04-05)

Critical scope revision based on data flow analysis.

**Findings**:
- Scripts (`handle-web-search.mjs` + dependencies, ~6,383 lines across 13 files) have no CLI entry point — they export functions but never read stdin/argv. The hook fires `node handle-web-search.mjs` which exits silently.
- Actual error recovery works through Claude reading SKILL.md instructions and reasoning with built-in tools, not through scripted runtime.
- ARCHITECTURE.md documents an aspirational system that doesn't match reality.
- Commands are merged into skills per Claude Code docs — `commands/search-plus.md` is redundant.

**Changes**:
- Removed scope for separate plugin — skill stays inside `plugins/search-plus/`.
- Removed script bundling, hook deduplication, env var fallback chain (scripts aren't executed).
- Added Discovery section documenting dead code finding.
- Added command deprecation requirement.
- Restructured phases to reflect actual work needed.
- Updated proposed structure and acceptance criteria.

### v0.1.0 (2026-04-02)

Initial draft. Assumed scripts were active runtime with hook-driven execution. Proposed separate plugin with bundled scripts and hook deduplication strategy.

---

**Status**: DRAFT (v0.3.0)
**Created**: 2026-04-02
**Last Updated**: 2026-04-05
**Issue Type**: Architecture and Portability
**Impact**: Enables standalone distribution of meta-search error recovery
