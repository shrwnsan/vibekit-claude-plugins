# Research 008: Agent Skills Documentation Review and Best Practices Analysis

## Executive Summary

This document summarizes a comprehensive review of official Claude Code Agent Skills documentation and the open Agent Skills specification maintained by Anthropic. The research was conducted to evaluate and improve the skills in the Search Plus and Base plugins, resulting in two enhancement issues ([#35](https://github.com/shrwnsan/vibekit-claude-plugins/issues/35), [#36](https://github.com/shrwnsan/vibekit-claude-plugins/issues/36)).

**Key Finding**: Both skills demonstrate solid architecture with progressive disclosure, but have opportunities for improvement in description clarity, attribution model-agnosticism, and tool restriction specificity.

## Research Scope

### Official Documentation Reviewed

| Source | URL | Focus |
|--------|-----|-------|
| Claude Code Skills Docs | https://code.claude.com/docs/en/skills | Skill creation, structure, configuration |
| Best Practices Guide | https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices | Authoring guidelines, patterns, anti-patterns |
| Agent Skills Specification | https://github.com/agentskills/agentskills | Open standard, validation, technical spec |

### Skills Analyzed

| Plugin | Skill | Purpose |
|--------|-------|---------|
| search-plus | `meta-searching` | Web content extraction with error handling |
| base | `crafting-commits` | Git commit message generation with conventional commits |

## Key Findings: Agent Skills Best Practices

### 1. Core Principles

**Conciseness is Critical**
- Context window is a shared resource (system prompt, history, skills, user request)
- Only metadata (name + description) is pre-loaded at startup
- SKILL.md body loads when skill is triggered
- Recommendation: Keep SKILL.md under 500 lines for optimal performance

**Progressive Disclosure Pattern**
```
skill-name/
├── SKILL.md              # Core instructions (< 500 lines)
├── reference.md          # Detailed docs (loaded as needed)
├── examples.md           # Usage examples (loaded as needed)
└── scripts/
    └── helper.py         # Executed, not loaded (zero-context)
```

### 2. Frontmatter Requirements

**Required Fields:**
| Field | Constraints | Purpose |
|-------|-------------|---------|
| `name` | 1-64 chars, lowercase alphanumeric + hyphens only | Skill identifier |
| `description` | 1-1024 chars, non-empty | Discovery and trigger matching |

**Optional Fields:**
| Field | Purpose |
|-------|---------|
| `allowed-tools` | Restrict tool access without permission prompts |
| `model` | Force specific model when skill is active |
| `compatibility` | Environment requirements (Agent Skills spec) |
| `license` | License reference (Agent Skills spec) |

### 3. Description Writing Guidelines

**Critical Rule**: Always write in **third person**

- Good: "Processes Excel files and generates reports"
- Bad: "I can help you process Excel files"
- Bad: "You can use this to process Excel files"

The description is injected into the system prompt, and inconsistent point-of-view causes discovery problems.

**Effective Description Pattern:**
```
description: [What the skill does] + [When to use it]

Example: "Extracts text and tables from PDF files, fill forms, merge documents.
Use when working with PDF files or when the user mentions PDFs, forms, or document extraction."
```

### 4. Naming Conventions

**Recommended**: Gerund form (verb + -ing)
- `processing-pdfs`
- `analyzing-spreadsheets`
- `managing-databases`

**Acceptable**: Noun phrases or action-oriented
- `pdf-processing`
- `process-pdfs`

**Avoid**: Vague names, reserved words
- `helper`, `utils`, `tools`
- `anthropic-helper`, `claude-tools`

### 5. Degrees of Freedom

Match specificity to task fragility:

| Freedom Level | Use When | Example |
|---------------|----------|---------|
| **High** (text instructions) | Multiple valid approaches, context-dependent | Code review process |
| **Medium** (pseudocode with parameters) | Preferred pattern exists, some variation acceptable | Report generation templates |
| **Low** (specific scripts) | Fragile operations, consistency critical | Database migrations |

## Claude Code vs. Agent Skills Standard

### Key Differences

| Aspect | Claude Code | Agent Skills Standard |
|--------|-------------|----------------------|
| File naming | `skill.md` (lowercase) | `SKILL.md` (uppercase preferred) |
| Frontmatter fields | `name`, `description`, `allowed-tools`, `model` | `name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools` |
| Directory structure | Flexible, progressive disclosure | Explicit `scripts/`, `references/`, `assets/` directories |
| Validation | Built-in via Claude Code | `skills-ref` validation library |
| Naming constraints | Lowercase + hyphens, max 64 chars | Stricter: no consecutive hyphens, cannot start/end with hyphen |

### Shared Principles

Both specifications emphasize:
- Progressive disclosure for context efficiency
- Third-person descriptions for reliable discovery
- Gerund-form naming for clarity
- Executable scripts for zero-context operations

## Analysis: Current Skills

### meta-searching (Search Plus Plugin)

**Location:** `plugins/search-plus/skills/meta-searching/SKILL.md`

**Strengths:**
- Clear description with specific error codes (403/429/422)
- Appropriate use of `allowed-tools` for tool restrictions
- Well-organized sections with clear examples
- Good naming convention (gerund form)

**Issues Identified:**

| Issue | Severity | Description |
|-------|----------|-------------|
| Description contains implementation detail | Medium | Bold warning about agent delegation belongs in body, not description |
| Missing progressive disclosure | Medium | 72 lines in single file; examples and troubleshooting could be separate |
| No quick-start section | Low | Would benefit from immediate usage guidance |

**Current Description** (426 characters):
```
Extracts web content and performs reliable searches when standard tools fail due
to access restrictions, rate limiting, or validation errors. Use when encountering
403/429/422 errors, blocked documentation sites, or silent search failures.
**Direct tool execution often fails for these scenarios - search-plus agent
delegation provides the most reliable results.**
```

**Recommended Structure:**
```
meta-searching/
├── SKILL.md              # Core usage (< 50 lines)
├── examples.md           # Example scenarios
└── troubleshooting.md    # Error-specific handling
```

### crafting-commits (Base Plugin)

**Location:** `plugins/base/skills/crafting-commits/SKILL.md`

**Strengths:**
- Excellent progressive disclosure with reference files (validation.md, examples.md, patterns.md, troubleshooting.md)
- Well-structured utility scripts with clear documentation
- Freedom levels clearly defined (autonomous/validation/approval)
- Good naming convention (gerund form)
- SKILL.md at 52 lines (within acceptable range)

**Issues Identified:**

| Issue | Severity | Description |
|-------|----------|-------------|
| First-person description | High | "Automatically invoked when user requests" - should be third person |
| Model-specific attribution | High | All examples show "Co-Authored-By: GLM" - not model-agnostic |
| Overly permissive allowed-tools | Medium | `bash: *` allows arbitrary execution; should be `bash(git:*)` |
| Missing script usage examples | Medium | SKILL.md mentions scripts but doesn't show how to run them |

**Current Description:**
```
Automatically invoked when user requests git commit message creation, commit
drafting, or needs help with conventional commit formatting. Handles conventional
commit standards.
```

**Recommended Description:**
```
Generates git commit messages following conventional commit standards with
collaborative attribution. Use when user requests commit message creation,
drafting, or help with formatting.
```

## Recommendations

### High Priority

1. **crafting-commits**: Fix description to third person
   - Affects skill discovery reliability
   - Quick fix with high impact

2. **crafting-commits**: Update attribution examples to model-agnostic
   - Current GLM-specific examples not universally applicable
   - Should show Claude or multiple attribution formats

### Medium Priority

3. **meta-searching**: Implement progressive disclosure
   - Split 72-line file into SKILL.md + examples.md + troubleshooting.md
   - Improves context efficiency

4. **meta-searching**: Condense description, move implementation detail to body
   - Bold warning about agent delegation belongs in SKILL.md body
   - Description should focus on what + when

5. **crafting-commits**: Add script usage examples in SKILL.md
   - Current documentation mentions scripts but doesn't show execution
   - Users need clear examples of how to run validation scripts

6. **crafting-commits**: Tighten allowed-tools from wildcard to specific
   - Change from `bash` to `bash(git:*)`
   - Follows principle of least privilege

### Low Priority

7. **meta-searching**: Add quick-start section at top of SKILL.md
   - Helps agents and users understand primary usage pattern immediately

8. **crafting-commits**: Add compatibility field to frontmatter
   - Per Agent Skills spec: "Requires git 2.25.0+, bash shell"
   - Helps users understand prerequisites

9. **Both**: Validate with actual Claude instances
   - Test discovery patterns with real usage
   - Observe how Claude navigates and uses the skills

## Related Issues

The following GitHub issues track the implementation of these recommendations:

- [#35: enhancement(skills): improve meta-searching skill per Agent Skills best practices](https://github.com/shrwnsan/vibekit-claude-plugins/issues/35)
- [#36: enhancement(skills): improve crafting-commits skill per Agent Skills best practices](https://github.com/shrwnsan/vibekit-claude-plugins/issues/36)

## References

### Official Documentation
- [Agent Skills - Claude Code Docs](https://code.claude.com/docs/en/skills)
- [Skill Authoring Best Practices - Claude Platform Docs](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- [Agent Skills Specification - GitHub](https://github.com/agentskills/agentskills)

### Internal Documentation
- [PRD 002: Add Skills to Search Plus Plugin](./prd-002-add-skills-to-search-plus-plugin.md)
- [PRD 004: Self-Referential Testing and Skills Optimization](./prd-004-self-referential-testing-and-skills-optimization.md)
- [Retro 001: PRD Self-Referential Testing and Skills Optimization](./retro-001-prd-self-referential-testing-and-skills-optimization.md)

---

**Research Date:** 2025-12-29
**Researcher:** Claude Code (GLM 4.7)
**Status:** Complete
