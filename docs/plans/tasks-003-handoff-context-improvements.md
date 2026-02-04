# Tasks: Handoff Context Improvements

**Reference**: eval-021-handoff-context-improvements-from-everything-claude-code.md
**Created**: 2026-02-03
**Estimated Duration**: 3-4 days
**Difficulty**: Junior to Intermediate

## Overview

Implementation tasks for enhancing the handoff-context skill based on eval-021 analysis of everything-claude-code patterns. Tasks are organized by priority and designed for parallel execution by junior developers.

## Current State

The handoff-context skill currently provides:
- Basic YAML template (timestamp, thread_id, continuation_action, git_state, conversation_summary, current_work, next_steps, preserved_context)
- Simple `capture-context.sh` script
- No quality metrics or validation

## Target State

Enhanced skill with:
- Confidence/completeness scoring
- Session tracking (ID, duration)
- Learnings/debugging section
- Quick start section with package manager detection
- What worked vs what didn't tracking
- (Future) Hook integration and cross-session continuity

---

## Phase 1: Core Improvements (P1 Features)

**Estimated Duration**: 1-1.5 days
**Parallel Execution**: Tasks 1.1, 1.2, 1.3 can be worked independently

### Task 1.1: Add Confidence/Completeness Scoring

**Estimated Time**: 2-3 hours
**Files to Modify**:
- `plugins/base/skills/handoff-context/scripts/capture-context.sh`
- `plugins/base/skills/handoff-context/references/templates.md`
- `plugins/base/skills/handoff-context/SKILL.md`

**Subtasks**:

#### 1.1.1: Add scoring function to capture-context.sh
- [ ] Create `calculate_confidence_score()` function
- [ ] Implement rule-based scoring logic:
  ```
  Base score: 0.5
  +0.1 if git_state present and non-empty
  +0.1 if conversation_summary has 1+ items
  +0.1 if current_work has 1+ items
  +0.1 if next_steps has 1+ items
  +0.1 if continuation_action is not null
  Cap: 0.3 minimum, 0.95 maximum
  ```
- [ ] Output score in YAML under `metadata.confidence_score`

#### 1.1.2: Add missing context detection
- [ ] Create `detect_missing_context()` function
- [ ] Check for empty critical sections
- [ ] Output warnings in YAML under `metadata.missing_context[]`

#### 1.1.3: Update YAML template structure
- [ ] Add `metadata` section to template in capture-context.sh
- [ ] Include: `confidence_score`, `context_quality` (high/medium/low), `missing_context[]`

#### 1.1.4: Update templates.md documentation
- [ ] Add metadata section to all template examples
- [ ] Document confidence scoring rules
- [ ] Add examples of missing_context output

#### 1.1.5: Update SKILL.md
- [ ] Document confidence scoring in "What Gets Captured" section
- [ ] Add quality thresholds guidance (≥0.8 is good, <0.5 needs attention)

**Acceptance Criteria**:
- [ ] Handoff files include `metadata.confidence_score` (0.3-0.95 range)
- [ ] Empty sections trigger `missing_context` warnings
- [ ] Scoring logic is documented and testable
- [ ] No regression in existing functionality

**Test Command**:
```bash
bash plugins/base/skills/handoff-context/scripts/capture-context.sh
# Verify: metadata section present with confidence_score
```

---

### Task 1.2: Add Enhanced Session Tracking

**Estimated Time**: 1.5-2 hours
**Files to Modify**:
- `plugins/base/skills/handoff-context/scripts/capture-context.sh`
- `plugins/base/skills/handoff-context/references/templates.md`

**Subtasks**:

#### 1.2.1: Generate unique session ID
- [ ] Create `generate_session_id()` function
- [ ] Use format: `YYYYMMDD-HHMMSS-XXXXX` (timestamp + 5-char random)
- [ ] Example: `20260203-143022-a7b3c`

#### 1.2.2: Add session tracking to YAML output
- [ ] Add `session` section to template:
  ```yaml
  session:
    id: "20260203-143022-a7b3c"
    started: null  # To be filled by agent
    ended: "2026-02-03T14:30:22Z"
    duration_minutes: null  # To be calculated by agent
  ```
- [ ] Auto-populate `ended` timestamp from script
- [ ] Leave `started` and `duration_minutes` for agent to fill

#### 1.2.3: Update templates.md
- [ ] Add session section to all template examples
- [ ] Document session ID format and usage

**Acceptance Criteria**:
- [ ] Each handoff has unique session ID
- [ ] Session section present in YAML output
- [ ] ID format is consistent and sortable

**Test Command**:
```bash
# Run twice, verify different session IDs
bash plugins/base/skills/handoff-context/scripts/capture-context.sh
bash plugins/base/skills/handoff-context/scripts/capture-context.sh
```

---

### Task 1.3: Add Learnings/Debugging Section

**Estimated Time**: 1.5-2 hours
**Files to Modify**:
- `plugins/base/skills/handoff-context/scripts/capture-context.sh`
- `plugins/base/skills/handoff-context/references/templates.md`
- `plugins/base/skills/handoff-context/SKILL.md`

**Subtasks**:

#### 1.3.1: Add learnings section to YAML template
- [ ] Add `learnings` array to template:
  ```yaml
  learnings:
    - pattern: "Description of learned pattern"
      evidence: "How this was validated"
      confidence: 0.7  # 0.3-0.9 scale
    - technique: "Debugging technique that worked"
      context: "When to use this technique"
      confidence: 0.6
  ```

#### 1.3.2: Update SKILL.md workflow
- [ ] Add learnings to "What you need to add" section
- [ ] Provide guidance on what makes a good learning:
  - Patterns that repeated 2+ times
  - Debugging techniques that solved problems
  - Approaches that prevented issues

#### 1.3.3: Update templates.md
- [ ] Add learnings section to Debugging Handoff template
- [ ] Add learnings section to Planning Handoff template
- [ ] Document confidence scale (0.3=tentative, 0.5=moderate, 0.7=strong, 0.9=near-certain)

#### 1.3.4: Create examples in examples.md
- [ ] Add 2-3 realistic learnings examples
- [ ] Show both `pattern` and `technique` types

**Acceptance Criteria**:
- [ ] Learnings section present in YAML template
- [ ] Documentation explains what to capture and confidence levels
- [ ] Examples demonstrate realistic learnings

---

## Phase 2: Validation & Usability (P2 Features)

**Estimated Duration**: 1-1.5 days
**Parallel Execution**: Tasks 2.1, 2.2, 2.3 can be worked independently

### Task 2.1: Add Quick Start Section with Package Manager Detection

**Estimated Time**: 2-3 hours
**Files to Modify**:
- `plugins/base/skills/handoff-context/scripts/capture-context.sh`
- `plugins/base/skills/handoff-context/references/templates.md`
- `plugins/base/skills/handoff-context/SKILL.md`

**Subtasks**:

#### 2.1.1: Implement package manager detection
- [ ] Create `detect_package_manager()` function in capture-context.sh:
  ```bash
  detect_package_manager() {
    # Priority 1: Environment variable
    if [ -n "${PACKAGE_MANAGER:-}" ]; then
      echo "$PACKAGE_MANAGER"
      return
    fi
    
    # Priority 2: Lock file detection
    if [ -f "bun.lockb" ]; then
      echo "bun"
    elif [ -f "pnpm-lock.yaml" ]; then
      echo "pnpm"
    elif [ -f "yarn.lock" ]; then
      echo "yarn"
    elif [ -f "package-lock.json" ]; then
      echo "npm"
    # Priority 3: Check what's installed
    elif command -v bun >/dev/null 2>&1; then
      echo "bun"
    elif command -v pnpm >/dev/null 2>&1; then
      echo "pnpm"
    elif command -v yarn >/dev/null 2>&1; then
      echo "yarn"
    else
      echo "npm"  # Fallback
    fi
  }
  ```

#### 2.1.2: Add quick_start section to YAML template
- [ ] Add to template:
  ```yaml
  quick_start:
    project_types: ["javascript"]  # Auto-detected, array for monorepos
    primary_type: "javascript"  # Main type based on cwd context
    package_manager: "bun"  # Detected (JS/TS only)
    verification_command: "test"  # Without PM prefix, agent fills
    files_to_read_first: []  # Agent fills: ["src/auth/session.ts (45-89)"]
    context_priority: null  # Agent fills: "Focus on token expiry logic"
    estimated_time_minutes: null  # Agent fills
  ```

#### 2.1.3: Auto-detect project type
- [ ] Detect if JS/TS project (package.json exists)
- [ ] Detect if Python project (pyproject.toml, requirements.txt)
- [ ] Detect if Go project (go.mod)
- [ ] Detect if Rust project (Cargo.toml)
- [ ] **Handle monorepos/mixed projects**: Use array for multiple types
  ```yaml
  quick_start:
    project_types: ["javascript", "python"]  # Array supports monorepos
    primary_type: "javascript"  # First detected or most relevant
  ```
- [ ] Detection priority for `primary_type`: Based on working directory context (e.g., if in `backend/`, Python takes priority even if root has package.json)

#### 2.1.4: Update documentation
- [ ] Add quick_start section to templates.md
- [ ] Document package manager detection priority
- [ ] Update SKILL.md with new capabilities

**Acceptance Criteria**:
- [ ] Package manager auto-detected correctly for JS/TS projects
- [ ] Project type detected for common ecosystems
- [ ] Quick start section provides actionable info for continuation

**Test Commands**:
```bash
# In a bun project
cd /path/to/bun-project && bash /path/to/capture-context.sh
# Verify: quick_start.package_manager = "bun"

# In a npm project  
cd /path/to/npm-project && bash /path/to/capture-context.sh
# Verify: quick_start.package_manager = "npm"
```

---

### Task 2.2: Add "What Worked vs What Didn't" Section

**Estimated Time**: 1.5-2 hours
**Files to Modify**:
- `plugins/base/skills/handoff-context/scripts/capture-context.sh`
- `plugins/base/skills/handoff-context/references/templates.md`
- `plugins/base/skills/handoff-context/SKILL.md`

**Subtasks**:

#### 2.2.1: Add approaches section to YAML template
- [ ] Add to template:
  ```yaml
  approaches:
    successful:
      - approach: "Description of what worked"
        evidence: "How we know it worked"
        files: []  # Related files
    
    attempted_but_failed:
      - approach: "What was tried"
        reason: "Why it didn't work"
        files: []  # Files that were affected
    
    not_attempted:
      - approach: "Alternative not yet tried"
        reason: "Why it was deferred"
        priority: "high|medium|low"
  ```

#### 2.2.2: Update SKILL.md workflow
- [ ] Add approaches to "What you need to add" section
- [ ] Explain when to populate each category
- [ ] Emphasize importance of documenting failures

#### 2.2.3: Update templates.md
- [ ] Add approaches section to Debugging Handoff template
- [ ] Add approaches section to Planning Handoff template
- [ ] Provide realistic examples for each category

**Acceptance Criteria**:
- [ ] Approaches section present in YAML template
- [ ] Three categories clearly defined (successful, failed, not attempted)
- [ ] Documentation explains value of tracking failures

---

### Task 2.3: Add Iterative Context Validation

**Estimated Time**: 2-3 hours
**Files to Modify**:
- `plugins/base/skills/handoff-context/scripts/capture-context.sh`
- `plugins/base/skills/handoff-context/scripts/validate-context.sh` (new file)
- `plugins/base/skills/handoff-context/SKILL.md`

**Subtasks**:

#### 2.3.1: Create validate-context.sh script
- [ ] Create new script that takes a handoff file as input
- [ ] Check for required sections:
  - `handoff.timestamp` - present and valid ISO8601
  - `context.current_work` - has at least 1 item
  - `context.conversation_summary` - has at least 1 item
  - `context.next_steps` OR `handoff.continuation_action` - at least one populated
- [ ] Output validation results:
  ```
  ✅ timestamp: valid
  ✅ current_work: 2 items
  ⚠️ conversation_summary: empty
  ✅ next_steps: 1 item
  
  Quality Score: 0.75
  Recommendation: Add conversation summary for better context
  ```

#### 2.3.2: Integrate validation into workflow
- [ ] Update SKILL.md to include optional validation step
- [ ] Add to Success Criteria checklist

#### 2.3.3: Add quality recommendations
- [ ] Map quality scores to recommendations:
  - <0.5: "Critical gaps - add more context before handoff"
  - 0.5-0.7: "Acceptable - consider adding [missing sections]"
  - 0.7-0.9: "Good quality handoff"
  - >0.9: "Comprehensive handoff ready"

**Acceptance Criteria**:
- [ ] Validation script runs and produces clear output
- [ ] Quality score calculated correctly
- [ ] Recommendations are actionable

**Test Command**:
```bash
bash plugins/base/skills/handoff-context/scripts/validate-context.sh /tmp/handoff-xxx/handoff-xxx.yaml
```

---

## Limitations & Trade-offs

This section documents known limitations and design trade-offs in the handoff-context implementation.

### Package Manager Detection

**Limitation**: The detected package manager may not be available in the recipient's environment.

**Trade-off**:
- **Pro**: Helps same-environment continuation by providing accurate PM-specific commands
- **Con**: Less useful if recipient doesn't have the same PM installed
- **Mitigation**: Users can override via `PACKAGE_MANAGER` environment variable if needed

**Example**:
```yaml
# Source environment has bun installed
quick_start:
  package_manager: "bun"  # Detected from bun.lockb
  verification_command: "bun test"

# Recipient environment only has npm
# The verification_command "bun test" won't work
# User would need to manually adjust or override detection
```

**Decision**: Package manager detection provides value for same-environment continuation (most common case) while documenting the limitation for cross-environment scenarios.

### Cross-Tool Compatibility

**Limitation**: Phase 3 hooks only work in Claude Code, not other AI CLI tools.

**Trade-off**:
- **Pro**: Hooks provide proactive suggestions when available
- **Con**: Hook-based features are Claude Code-specific
- **Mitigation**: Handoff files work universally across tools (file-based continuity)

**Supported Tools** (for file-based handoff):
- Claude Code
- Cursor
- Windsurf
- Gemini CLI
- Qwen Code
- Any AI tool that can read files

### Manual Trigger Required

**Limitation**: Without Phase 3 hooks, users must manually trigger handoff via:
- `/handoff-context` slash command (most reliable)
- Natural language "handoff" phrases (variable reliability)

**Trade-off**:
- **Pro**: Universal compatibility - no platform-specific features required
- **Con**: Requires user decision-making about when to handoff
- **Mitigation**: Phase 3 hooks can add proactive suggestions when available

### Temp File Persistence

**Limitation**: Handoff files stored in `/tmp/` may be cleared on system reboot.

**Trade-off**:
- **Pro**: `/tmp/` is standard, OS-managed, no cleanup code needed
- **Con**: Files lost after reboot
- **Mitigation**: Users can copy important handoffs to persistent storage if needed

### Config File Priority

**Limitation**: Multiple config locations may cause confusion about which config is active.

**Trade-off**:
- **Pro**: Flexible configuration for different use cases (cross-tool, user-specific, project-local)
- **Con**: Complexity in understanding which config takes precedence
- **Mitigation**: Config metadata in handoff output shows which config was used

---

## Phase 3: Advanced Features (P3 - Future)

**Status**: Deferred pending platform verification

**Deferral Reasoning**:
1. **Hook Platform Dependency**: Eval-021 patterns come from `everything-claude-code` targeting Claude Code CLI. Warp Agent Mode hook support (PreToolUse, PreCompact, SessionStart, etc.) is unverified.
2. **Dependencies**: Tasks 3.1 and 3.2 depend on hook infrastructure that may not exist in current platform.
3. **Priority**: P1 (confidence scoring, session tracking, learnings) and P2 (quick start, validation) deliver immediate value without platform dependencies.
4. **Current State**: As of 2026-02-04, Claude Code supports hooks in both `settings.json` (JSON) and SKILL.md frontmatter (YAML), but Warp Agent Mode support is unverified.

**New Finding (2026-02-04)**: Hooks can be defined in SKILL.md frontmatter using YAML syntax:

```yaml
---
name: handoff-context
description: Detects natural language handoff requests...
hooks:
  PreToolUse:
    - matcher: "Edit|Write"
      hooks:
        - type: command
          command: "./plugins/base/skills/handoff-context/scripts/suggest-handoff.sh"
---
```

**Benefits of SKILL.md frontmatter hooks**:
- No `settings.json` modification required by users
- Hooks travel with the skill/plugin
- Cleaner installation experience
- Component-scoped lifecycle (only active when skill is loaded)

**Limitations**:
- Only works in Claude Code (not universal across AI tools)
- Warp Agent Mode support unknown
- Other AI CLI tools (Cursor, Windsurf, etc.) may have different hook mechanisms

**Next Steps for P3**:
- Verify if Warp Agent Mode supports hooks in SKILL.md frontmatter
- If hooks unavailable, explore alternatives (e.g., manual triggers via slash commands)
- Re-evaluate priority after P1/P2 validation shows user demand
- Consider hybrid approach: hooks in Claude Code + manual triggers for other tools

### Task 3.1: PreToolUse Hook for Handoff Suggestion (Deferred)

**Estimated Time**: 3-4 hours
**Status**: Requires hook availability verification in Warp Agent Mode

**Purpose**: Proactively suggest handoff at logical boundaries instead of requiring manual user decision.

**Mental Model**: The PreToolUse hook is for **proactive suggestion**, not forcing continuation. Users can:
- Ignore the suggestion and continue working
- Dismiss the reminder
- Act on it when ready
- Start fresh without handoff if preferred

**Subtasks** (for future implementation):
- [ ] Verify hooks available in target platform (Claude Code / Warp Agent Mode)
- [ ] Add `hooks` section to SKILL.md frontmatter
- [ ] Create `suggest-handoff.sh` script
- [ ] Implement threshold detection mechanism (TBD: session-based counter vs other approach)
- [ ] Suggest handoff at thresholds (50, 100, 150 calls)
- [ ] Detect logical boundaries (after commit, after test pass)
- [ ] Display suggestion to stderr (non-blocking)
- [ ] Allow user to disable via config (`suggestion.enable: false`)

### Task 3.2: Cross-Session Continuity (Deferred)

**Estimated Time**: 2-3 hours
**Status**: Depends on Task 3.1 and hook availability

**Purpose**: Help users discover relevant previous handoffs when starting a new session.

**Mental Model**: This is about **discovery assistance**, not automatic continuation. Users:
- May not want/need session continuity (can start fresh anytime)
- May switch between different AI tools/agents
- Should have the option to load previous context if relevant

**Subtasks** (for future implementation):
- [ ] Detect previous handoff files in /tmp/handoff-*
- [ ] Assess relevance based on git branch, timestamp, files touched
- [ ] Add `previous_handoffs` section to handoff metadata
- [ ] Display suggestion at session start (via SessionStart hook if available)
- [ ] Allow users to opt-out via config (`cross_session.enable: false`)

**Example flow**:
```
[Session Start] Found relevant handoff from 2 hours ago on same branch:
/tmp/handoff-XXX/handoff-YYYYMMDD-HHMMSS.yaml

Key points from previous session:
- JWT tokens expire after 15 minutes
- Using JWT for authentication (tests passing)
- Next: Add rate limiting

Load this context? (y/n/Skip to start fresh)
```

### Task 3.3: Alternative Format Support - Markdown (Deferred)

**Estimated Time**: 2-3 hours
**Status**: Nice-to-have, not critical

**Subtasks** (for future implementation):
- [ ] Add `--format=yaml|markdown` flag to capture-context.sh
- [ ] Create markdown template
- [ ] Update SKILL.md with format option

---

## Integration Tasks

### Task 4.1: Update All Template Examples

**Estimated Time**: 1 hour
**Files to Modify**:
- `plugins/base/skills/handoff-context/references/templates.md`
- `plugins/base/skills/handoff-context/references/examples.md`
- `plugins/base/skills/handoff-context/references/examples-detailed.md`

**Subtasks**:
- [ ] Update all 6 templates in templates.md with new sections
- [ ] Update examples.md with realistic examples of new features
- [ ] Ensure consistency across all documentation

### Task 4.2: Create Evaluation Tests

**Estimated Time**: 1.5 hours
**Files to Create**:
- `plugins/base/skills/handoff-context/assets/eval-enhanced-features.json`

**Subtasks**:
- [ ] Create test cases for confidence scoring
- [ ] Create test cases for session tracking
- [ ] Create test cases for package manager detection
- [ ] Create test cases for validation script

### Task 4.3: Update README

**Estimated Time**: 30 minutes
**Files to Modify**:
- `plugins/base/skills/handoff-context/README.md`

**Subtasks**:
- [ ] Document new features in README
- [ ] Update feature list
- [ ] Add changelog entry for this enhancement

---

## Implementation Guidelines

### Code Quality Standards
- **One Feature Per PR**: Each task (1.1, 1.2, etc.) should be a separate PR
- **Backward Compatible**: New sections should be optional, existing handoffs should still work
- **Test After Changes**: Run capture-context.sh after each modification
- **Clear Commit Messages**: Use format `feat(handoff-context): add confidence scoring`

### Testing Requirements
- **Script Testing**: Verify bash scripts work on macOS and Linux
- **YAML Validation**: Ensure output is valid YAML (use `yq` or online validator)
- **Documentation Review**: Check all docs are consistent after changes

### Success Criteria (Overall)
- [ ] All P1 tasks completed and merged
- [ ] All P2 tasks completed and merged
- [ ] No regression in existing functionality
- [ ] Documentation updated for all new features
- [ ] At least 2 evaluation test cases per new feature

---

## Deliverables Checklist

### Phase 1 Deliverables
- [ ] Enhanced `capture-context.sh` with confidence scoring
- [ ] Enhanced `capture-context.sh` with session tracking
- [ ] Updated YAML template with learnings section
- [ ] Updated templates.md with all new sections
- [ ] Updated SKILL.md with new feature documentation

### Phase 2 Deliverables
- [ ] Package manager detection in `capture-context.sh`
- [ ] Quick start section in YAML template
- [ ] Approaches (what worked/didn't) section
- [ ] New `validate-context.sh` script
- [ ] Updated examples with realistic scenarios

### Documentation Deliverables
- [ ] Updated README.md
- [ ] New evaluation test file
- [ ] Consistent templates across all reference docs

---

## Estimated Timeline Summary

| Phase | Tasks | Duration | Parallelizable |
|-------|-------|----------|----------------|
| Phase 1 | 1.1, 1.2, 1.3 | 1-1.5 days | Yes (3 devs) |
| Phase 2 | 2.1, 2.2, 2.3 | 1-1.5 days | Yes (3 devs) |
| Integration | 4.1, 4.2, 4.3 | 0.5 day | Partially |
| **Total** | 9 tasks | **3-4 days** | - |

**With parallel execution**: 1.5-2 days possible with 3 developers

---

**Next Action**: Assign tasks to developers, prioritize Phase 1 completion before Phase 2.
