# Skill Frontmatter Improvements - Strategic Evaluation
## Claude Code 2026 Frontmatter Capabilities Analysis

---

## Overview

**Evaluation Type**: Skill Frontmatter Enhancement Analysis
**Target**: VibeKit Base Plugin Skills
**Analysis Date**: February 5, 2026
**Status**: RECOMMENDATIONS READY
**Priority**: High - Alignment with VibeKit Outcome-Oriented Mission

---

## Executive Summary

Claude Code's 2026 updates introduced powerful new skill frontmatter capabilities that VibeKit has not yet adopted. This evaluation analyzes current skill frontmatter usage against available capabilities and provides specific recommendations for improvement.

**Key Finding**: VibeKit skills use basic frontmatter (`name`, `description`, `allowed-tools`) but miss several 2026 features that could significantly enhance user experience and workflow reliability.

**Impact**: Implementing recommended improvements will:
- Improve skill invocation reliability
- Enable parallel development workflows
- Reduce context noise in conversations
- Provide dynamic runtime context injection
- Align with outcome-oriented mission goals

---

## Available Frontmatter Options (2026)

| Option | Type | Description | VibeKit Status | Priority |
|--------|------|-------------|----------------|----------|
| `name` | string | Skill identifier | ✅ Implemented | N/A |
| `description` | string | What the skill does | ✅ Implemented | N/A |
| `context` | string | `fork` for sub-agent isolation | ❌ Not implemented | 🔴 High |
| `disable-model-invocation` | boolean | Prevent auto-activation | ❌ Not implemented | 🔴 High |
| `user-invocable` | boolean | Enable `/skill-name` command | ❌ Not implemented | 🔴 High |
| `allowed-tools` | list | Restrict tool access | ⚠️ Partial | 🟡 Medium |
| `model` | string | Model for sub-agents | ⚠️ Agent-only | 🟢 Low |
| `!` syntax | inline | Dynamic context injection | ❌ Not implemented | 🔴 High |

---

## Current State Analysis

### Existing Skills and Frontmatter Usage

#### 1. handoff-context

**Current Frontmatter:**
```yaml
---
name: handoff-context
description: Detects natural language handoff requests...
allowed-tools:
  - bash(git:*)
  - bash(mktemp:-d)
  - bash(mkdir:-p /tmp/handoff-*)
  # ... (extensive tool list)
---
```

**Assessment:**
- ✅ Comprehensive `allowed-tools` restriction
- ✅ Clear description with trigger phrases
- ❌ Missing `user-invocable: true` for reliable slash command
- ❌ Missing `disable-model-invocation: true` to prevent accidental activation

---

#### 2. systematic-debugging

**Current Frontmatter:**
```yaml
---
name: systematic-debugging
description: Systematic debugging approach for errors...
allowed-tools:
  - bash(*)
---
```

**Assessment:**
- ✅ Broad tool access appropriate for debugging
- ✅ Clear description of use cases
- ❌ Missing `user-invocable: true` for explicit invocation
- ❌ No dynamic context injection (error state, logs)
- ❌ Could benefit from `!` syntax for runtime context

---

#### 3. crafting-commits

**Current Frontmatter:**
```yaml
---
name: crafting-commits
description: Generates git commit messages...
allowed-tools:
  - bash(git:*)
---
```

**Assessment:**
- ✅ Appropriate tool restriction to git-only
- ✅ Clear description
- ❌ Missing `user-invocable: true`
- ❌ No dynamic git context injection
- ❌ Could use `!` syntax for git history/style consistency

---

#### 4. meta-searching (search-plus)

**Current Frontmatter:**
```yaml
---
name: meta-searching
description: Extracts web content and performs reliable searches...
allowed-tools:
  - web_search
  - web_fetch
---
```

**Assessment:**
- ✅ Appropriate tool scope
- ✅ Auto-invocable behavior is correct (error recovery)
- ⚠️ Current state is appropriate - no changes needed

---

## Recommended Improvements

### Priority Matrix

| Priority | Skill | Impact | Effort | Ratio |
|----------|-------|--------|--------|-------|
| 🔴 High | handoff-context | Critical reliability | Low | 10:1 |
| 🔴 High | systematic-debugging | Better UX | Low | 8:1 |
| 🟡 Medium | crafting-commits | Improved workflow | Low | 6:1 |
| 🟢 Low | workflow-fork (new) | New capability | Medium | 4:1 |

---

### 1. handoff-context - HIGH PRIORITY

**Recommended Frontmatter:**
```yaml
---
name: handoff-context
description: Detects natural language handoff requests and generates structured context summaries for seamless thread continuation. Use when user says "handoff", "new thread", "continue in fresh thread", or similar phrases.
user-invocable: true
disable-model-invocation: true
allowed-tools:
  - bash(git:*)
  - bash(mktemp:-d)
  - bash(mkdir:-p /tmp/handoff-*)
  - bash(ls:-la /tmp/handoff-*)
  - bash(chmod:700)
  - bash(touch:*)
  - bash(rm:-f)
  - bash(date:*)
  - bash(tr '\n' ' ')
  - bash(sed 's/ $//')
  - bash(cat /tmp/handoff-*)
  - bash(echo:*)
  - bash(write to /tmp/handoff-*)
  - Read(/tmp/handoff-*)
  - Write(/tmp/handoff-*)
---
```

**Rationale:**
- `user-invocable: true` - Enables reliable `/handoff-context` slash command
- `disable-model-invocation: true` - Prevents accidental activation during normal conversation
- Maintains existing comprehensive `allowed-tools` for security

**Expected Outcome:**
- 100% reliable invocation via `/handoff-context`
- Eliminates variable natural language trigger issues
- Reduces false-positive activations

---

### 2. systematic-debugging - HIGH PRIORITY

**Recommended Frontmatter:**
```yaml
---
name: systematic-debugging
description: Systematic debugging approach for errors, test failures, and unexpected behavior. Use when encountering bugs, test failures, errors, or when debugging is needed. Prevents common anti-patterns like random fixes, skipping root cause analysis, and thrashing.
user-invocable: true
allowed-tools:
  - bash(*)
  - Read
  - Grep
  - Glob
  - Bash

# Dynamic context injection
Current error state:
!`git log --oneline -5 2>/dev/null || echo "No git history"`

Recent test failures:
!`find . -name "*.log" -mtime -1 2>/dev/null | head -5 || echo "No recent logs"`

Recent build output:
!`find . -name "build*.log" -o -name "webpack*.log" 2>/dev/null | head -3 || echo "No build logs"`
---
```

**Rationale:**
- `user-invocable: true` - Enables explicit `/systematic-debugging` invocation
- Maintains `bash(*)` for full debugging access
- Adds `!` syntax for dynamic context (git history, logs, build output)
- Provides immediate context when debugging starts

**Expected Outcome:**
- Faster debugging with pre-loaded error context
- Explicit invocation for complex debugging scenarios
- Reduced context gathering time

---

### 3. crafting-commits - MEDIUM PRIORITY

**Recommended Frontmatter:**
```yaml
---
name: crafting-commits
description: Generates git commit messages following conventional commit standards with collaborative attribution. Use when user requests commit message creation, drafting, or help with formatting.
user-invocable: true
allowed-tools:
  - bash(git:*)
  - Read

# Dynamic context injection
Current git status:
!`git status --porcelain 2>/dev/null || echo "No git repo"`

Recent commits for style consistency:
!`git log --oneline -5 2>/dev/null || echo "No git history"`

Branch information:
!`git branch --show-current 2>/dev/null || echo "Not in git repo"`
---
```

**Rationale:**
- `user-invocable: true` - Enables `/crafting-commits` slash command
- Adds `!` syntax for dynamic git context
- Maintains git-only tool scope for safety
- Provides commit history for style consistency

**Expected Outcome:**
- Faster commit message generation with pre-loaded context
- Consistent commit message style matching project history
- Explicit invocation for commit drafting

---

### 4. workflow-fork - NEW FEATURE (LOW PRIORITY)

**Recommended Addition:**
```yaml
---
name: workflow-fork
description: Runs long-running workflows in isolated context for parallel development. Use for background quality checks, documentation generation, or large-scale refactoring.
context: fork
user-invocable: true
allowed-tools:
  - bash(*)
  - Read
  - Write
  - Grep
  - Glob
  - Task
  - Bash
model: inherit
---
```

**Rationale:**
- Uses `context: fork` (2026 feature) for isolated execution
- Perfect for long-running workflows
- Aligns with workflow-orchestrator's parallel workflow support
- Enables true background operation

**Expected Outcome:**
- Long-running tasks don't clutter main conversation
- Parallel development workflows become feasible
- Better resource utilization

---

## Dynamic Context Injection Patterns

### What is `!` Syntax?

The `!` command syntax allows skills to inject dynamic runtime context by executing shell commands during skill loading.

### Common Patterns

#### Project Structure Awareness
```yaml
---
Project architecture:
!`find src -type d -maxdepth 2 2>/dev/null | head -20`
---
```

#### Environment Detection
```yaml
---
Node.js version: !`node --version 2>/dev/null || echo "Not installed"`
Python version: !`python --version 2>/dev/null || echo "Not installed"`
Go version: !`go version 2>/dev/null || echo "Not installed"`
---
```

#### Dependencies Status
```yaml
---
Outdated packages: !`npm outdated 2>/dev/null || echo "None or N/A"`
Security vulnerabilities: !`npm audit --json 2>/dev/null | jq '.vulnerabilities | length' || echo "0"`
---
```

#### Git Context
```yaml
---
Current branch: !`git branch --show-current 2>/dev/null || echo "Not in git"`
Recent commits: !`git log --oneline -5 2>/dev/null || echo "No history"`
Uncommitted changes: !`git status --porcelain 2>/dev/null | wc -l | xargs || echo "0"`
---
```

---

## Tool Restriction Patterns

### Read-Only Review Skills
```yaml
---
allowed-tools:
  - Read
  - Grep
  - Glob
---
```

### Git-Only Skills (Safest)
```yaml
---
allowed-tools:
  - bash(git:*)
  - bash(git status)
  - bash(git diff)
  - bash(git log)
  - bash(git show)
---
```

### Full Development Access
```yaml
---
allowed-tools:
  - bash(*)
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Bash
---
```

### Web Research Skills
```yaml
---
allowed-tools:
  - web_search
  - web_fetch
  - Read
---
```

---

## Integration with Workflow-Orchestrator

The workflow-orchestrator agent currently references skills in its frontmatter:

```yaml
---
name: workflow-orchestrator
description: Coordinates development workflows...
skills: crafting-commits, systematic-debugging, handoff-context
---
```

### Post-Implementation Benefits

1. **Explicit Skill Invocation**: Orchestrator can reliably invoke skills via slash commands
2. **Context-Aware Workflows**: Dynamic context injection provides pre-populated state
3. **Parallel Execution**: `context: fork` enables true background workflows
4. **Reduced Context Noise**: `disable-model-invocation` keeps conversations focused

---

## Alignment with VibeKit Mission

### Outcome-Oriented Design Principles

| Principle | How Frontmatter Improvements Help |
|-----------|-----------------------------------|
| **Predictability** | `user-invocable` ensures skills work when explicitly called |
| **Reliability** | `disable-model-invocation` prevents false-positive activations |
| **Efficiency** | `!` syntax provides pre-loaded context, reducing setup time |
| **Scalability** | `context: fork` enables parallel workflows |
| **Clarity** | Explicit tool restrictions make skill boundaries clear |

---

## Implementation Roadmap

### Phase 1: Critical Reliability (Week 1)
- [ ] Update `handoff-context` with `user-invocable` + `disable-model-invocation`
- [ ] Update `systematic-debugging` with `user-invocable`
- [ ] Test slash command invocation reliability
- [ ] Document invocation methods in skill READMEs

### Phase 2: Context Enhancement (Week 2)
- [ ] Add `!` syntax to `systematic-debugging` for error/logs context
- [ ] Add `!` syntax to `crafting-commits` for git history
- [ ] Test dynamic context injection
- [ ] Validate context loading performance

### Phase 3: New Capability (Week 3-4)
- [ ] Create `workflow-fork` skill with `context: fork`
- [ ] Integrate with workflow-orchestrator
- [ ] Test parallel workflow execution
- [ ] Document parallel workflow patterns

---

## Risk Assessment

### Low Risk
- Adding `user-invocable: true` - Pure additive change
- Adding `disable-model-invocation: true` - Reduces unwanted behavior
- Adding `!` syntax - Non-breaking if commands fail

### Medium Risk
- Modifying `allowed-tools` - May break existing workflows
- Dynamic context injection - Performance impact on skill loading

### Mitigation Strategies
1. Test all changes in development environment first
2. Add feature flags for dynamic context injection
3. Provide rollback path for frontmatter changes
4. Monitor skill invocation success rates

---

## Success Metrics

### Quantitative
- Skill slash command success rate: Target 100%
- False-positive activation rate: Target <5%
- Context load time: Target <2 seconds
- User-reported skill issues: Target 0

### Qualitative
- User satisfaction with skill reliability
- Ease of skill invocation
- Clarity of skill boundaries
- Effectiveness of dynamic context

---

## Related Documentation

### Internal VibeKit
- [Base Plugin PRD](../prd-006-base-plugin.md) - Overall plugin architecture
- [Workflow Orchestrator Evaluation](./eval-015-base-workflow-orchestrator.md) - Agent integration
- [Handoff Context Improvements](./eval-021-handoff-context-improvements-from-everything-claude-code.md) - Related skill work

### External Claude Code
- [Official Skills Documentation](https://code.claude.com/docs/en/skills) - Authoritative frontmatter reference
- [Mastering Claude Code Skills](https://augmnt.sh/blog/mastering-claude-code-skills) - Dynamic context injection
- [Claude Skills Deep-Dive](https://medium.com/data-science-collective/claude-skills-a-technical-deep-dive-into-context-injection-architecture-ee6bf30cf514) - Architecture patterns

---

## Conclusion

VibeKit's Base plugin skills have a solid foundation but are missing several 2026 Claude Code frontmatter capabilities that could significantly improve user experience and workflow reliability.

**Key Takeaways:**
1. Three skills (handoff-context, systematic-debugging, crafting-commits) need `user-invocable: true`
2. Two skills (handoff-context) need `disable-model-invocation: true` for reliability
3. Dynamic context injection (`!` syntax) can provide pre-loaded runtime context
4. New `workflow-fork` skill with `context: fork` enables true parallel workflows
5. All improvements align with VibeKit's outcome-oriented mission

**Recommendation**: Proceed with Phase 1 implementation (Critical Reliability) immediately, as it offers the highest effort-to-impact ratio and addresses user-reported reliability issues.

---

*Evaluation Version: 1.0*
*Analysis Date: February 5, 2026*
*Status: RECOMMENDATIONS READY FOR IMPLEMENTATION*
*Next Review: After Phase 1 completion*
