# Eval-021: Handoff Context Improvements from everything-claude-code

**Date:** 2026-01-30  
**Status:** Analysis Complete  
**Source:** [affaan-m/everything-claude-code](https://github.com/affaan-m/everything-claude-code)  
**Related:** eval-020-handoff-context-invocation-methods.md, prd-006-base-plugin.md

## Executive Summary

Analysis of the everything-claude-code repository (35.3k stars, Anthropic hackathon winner) reveals several patterns and techniques that could significantly enhance the handoff-context skill. Key findings focus on: confidence scoring, session persistence hooks, strategic context management, iterative refinement, and structured handoff formats.

**Key Distinction from eval-020:** While eval-020 focused on *invocation reliability* (slash command vs natural language triggers), this evaluation focuses on *output quality* and *feature enhancements* for the handoff file content itself.

**Platform Note:** Patterns from everything-claude-code target Claude Code CLI. Adaptations may be needed for Warp Agent Mode, particularly around hook availability and session tracking.

## Repository Context

**Author:** Affaan Mustafa (@affaan-m)  
**Credentials:** Anthropic x Forum Ventures hackathon winner  
**Usage:** 10+ months intensive daily use building production products  
**Content:** Production-ready agents, skills, hooks, commands, rules, MCP configs  

## Key Findings

### 1. Continuous Learning v2 - Instinct-Based Architecture

**Location:** `skills/continuous-learning-v2/`

**Architecture:**
- **Observation Hooks:** PreToolUse/PostToolUse fire 100% reliably (vs skills at 50-80%)
- **Confidence Scoring:** 0.3-0.9 weighted scores that evolve over time
- **Atomic Instincts:** Small, single-purpose learned behaviors with evidence tracking
- **Background Agent:** Uses Haiku model for cost-efficient pattern analysis

**Confidence Scoring Model:**
```yaml
0.3: Tentative (suggested but not enforced)
0.5: Moderate (applied when relevant)
0.7: Strong (auto-approved for application)
0.9: Near-certain (core behavior)
```

**Confidence Evolution:**
- **Increases:** Pattern repeatedly observed, user doesn't correct, similar instincts agree
- **Decreases:** User explicitly corrects, pattern not observed for extended periods, contradicting evidence

**Relevance to handoff-context:**
- Add confidence/completeness scoring to handoff files
- Track quality metrics for captured context
- Indicate reliability of continuation action extraction
- Flag potential gaps in captured state

### 2. Session Persistence Hooks

**Location:** `scripts/hooks/session-start.js`, `scripts/hooks/session-end.js`

**Features:**
- **SessionStart Hook:** Automatically loads previous context on new session
- **SessionEnd Hook:** Persists learnings and session state with timestamps
- **Session ID Tracking:** Unique IDs in filenames (`YYYY-MM-DD-shortid-session.tmp`)
- **Structured Templates:** Sections for Current State, Completed, In Progress, Notes

**Template Structure:**
```markdown
# Session: YYYY-MM-DD
**Date:** YYYY-MM-DD
**Started:** HH:MM
**Last Updated:** HH:MM

## Current State
[Session context]

### Completed
- [x] Items

### In Progress
- [ ] Items

### Notes for Next Session
- Context items

### Context to Load
[relevant files]
```

**Example from repository:**
File: `examples/sessions/2026-01-17-debugging-memory.tmp`
- Root cause analysis section
- The fix (with code examples)
- Debugging technique worth saving
- Notes for next session
- Context to load (specific files)

**Relevance to handoff-context:**
- Add session ID tracking to handoff files
- Include structured sections similar to their template
- Add "debugging techniques worth saving" section
- Improve "notes for next session" clarity

### 3. Strategic Context Compaction

**Location:** `skills/strategic-compact/`

**Features:**
- **Tool Call Tracking:** Counts invocations to suggest compaction at logical boundaries
- **Threshold Detection:** Configurable threshold (default: 50 calls)
- **Periodic Reminders:** Every 25 calls after threshold
- **Manual Control:** User decides when to compact vs arbitrary auto-compaction

**Best Practices:**
1. Compact after planning (once plan finalized)
2. Compact after debugging (clear error-resolution context)
3. Don't compact mid-implementation (preserve context)
4. Read the suggestion, user decides if/when

**Hook Implementation:**
```json
{
  "PreToolUse": [{
    "matcher": "tool == \"Edit\" || tool == \"Write\"",
    "hooks": [{
      "type": "command",
      "command": "~/.claude/skills/strategic-compact/suggest-compact.sh"
    }]
  }]
}
```

**Relevance to handoff-context:**
- Add session metrics (tool call count, conversation length)
- Help users decide when to handoff based on activity thresholds
- Suggest handoff at logical boundaries (after planning, after debugging)
- Track "compaction readiness" as a handoff trigger

### 4. Iterative Retrieval Pattern

**Location:** `skills/iterative-retrieval/`

**Purpose:** Solves the "context problem" in multi-agent workflows where subagents don't know what context they need until they start working

**4-Phase Loop:**
```
DISPATCH → EVALUATE → REFINE → LOOP
(max 3 cycles)
```

**Phase Details:**

1. **DISPATCH:** Initial broad query to gather candidate files
2. **EVALUATE:** Assess retrieved content for relevance (0-1 scale)
   - High (0.8-1.0): Directly implements target functionality
   - Medium (0.5-0.7): Contains related patterns or types
   - Low (0.2-0.4): Tangentially related
   - None (0-0.2): Not relevant, exclude

3. **REFINE:** Update search criteria based on evaluation
   - Add new patterns from high-relevance files
   - Add terminology found in codebase
   - Exclude confirmed irrelevant paths
   - Target specific gaps

4. **LOOP:** Repeat with refined criteria (bounded to 3 cycles)

**Exit Criteria:**
- 3+ high-relevance files (≥0.7) AND no critical gaps
- OR max 3 cycles reached

**Relevance to handoff-context:**
- Evaluate completeness of captured context before writing
- Iteratively refine what gets included
- Score relevance of files in git state
- Identify and flag missing context explicitly

### 5. Agent Handoff Format

**Location:** `commands/orchestrate.md`

**Structured Handoff Between Agents:**
```markdown
## HANDOFF: [previous-agent] -> [next-agent]

### Context
[Summary of what was done]

### Findings
[Key discoveries or decisions]

### Files Modified
[List of files touched]

### Open Questions
[Unresolved items for next agent]

### Recommendations
[Suggested next steps]
```

**Workflow Types:**
- **feature:** planner → tdd-guide → code-reviewer → security-reviewer
- **bugfix:** explorer → tdd-guide → code-reviewer
- **refactor:** architect → code-reviewer → tdd-guide
- **security:** security-reviewer → code-reviewer → architect

**Final Report Format:**
```
ORCHESTRATION REPORT
- Summary
- Agent Outputs
- Files Changed
- Test Results
- Security Status
- Recommendation (SHIP / NEEDS WORK / BLOCKED)
```

**Relevance to handoff-context:**
- Cleaner, more actionable format than current YAML
- Add "Open Questions" section explicitly
- Include "Recommendations" for continuation
- Consider structured vs unstructured format options

### 6. Memory Persistence Hooks

**Location:** `hooks/memory-persistence/` (referenced in longform guide)

**Hook Types Used:**
- **PreCompact Hook:** Before context compaction, save important state
- **Stop Hook (Session End):** On session end, persist learnings
- **SessionStart Hook:** On new session, load previous context automatically

**Philosophy from Longform Guide:**
> "For sharing memory across sessions, a skill or command that summarizes and checks in on progress then saves to a `.tmp` file in your `.claude` folder and appends to it until the end of your session is the best bet."

**Session Files Should Contain:**
- What approaches worked (verifiably with evidence)
- Which approaches were attempted but did not work
- Which approaches have not been attempted and what's left to do

**Relevance to handoff-context:**
- Add explicit "what worked" vs "what didn't work" sections
- Include evidence for successful approaches
- Track unattempted approaches as "next steps"
- Consider PreCompact hook integration for handoff suggestion

### 7. Dynamic System Prompt Injection

**Location:** Longform guide section on "Advanced: Dynamic System Prompt Injection"

**Pattern:**
```bash
# Daily development
alias claude-dev='claude --system-prompt "$(cat ~/.claude/contexts/dev.md)"'

# PR review mode
alias claude-review='claude --system-prompt "$(cat ~/.claude/contexts/review.md)"'

# Research/exploration mode
alias claude-research='claude --system-prompt "$(cat ~/.claude/contexts/research.md)"'
```

**Context Files:**
- `contexts/dev.md` - Development mode context
- `contexts/review.md` - Code review mode context
- `contexts/research.md` - Research/exploration mode context

**Relevance to handoff-context:**
- Handoff files could specify recommended context mode for continuation
- Include "context mode" metadata in handoff
- Suggest which contexts to load for the new thread

## Current State Baseline

For context, the current handoff-context skill produces YAML with these sections:

```yaml
# Current structure (simplified)
handoff:
  timestamp: "..."
  working_directory: "..."
  continuation_action: "..."  # or null
git_state:
  branch: "..."
  staged_files: []
  unstaged_files: []
  untracked_files: []
conversation_summary:
  phases: []
  outcomes: []
  key_decisions: []
current_work:
  tasks: []
next_steps: []
preserved_context: {}
```

**What's working well:**
- Git state capture via script
- YAML structure for machine readability
- Basic conversation summary sections

**What's missing (addressed in this eval):**
- Quality/completeness metrics
- Session tracking (ID, duration)
- Learnings/debugging insights
- Quick start guidance for continuation
- Approach tracking (what worked/didn't)

## Recommendations for Implementation

### Priority 1: High Impact, Low Effort

#### 1.1 Add Confidence/Completeness Scoring
```yaml
metadata:
  confidence_score: 0.85  # How complete is this handoff?
  context_quality: "high" # high/medium/low
  tool_calls_count: 47    # Session activity metric
  missing_context:
    - "Integration test results not captured"
    - "Database migration status unclear"
```

**Implementation:**
- Add scoring function to evaluate captured context
- Check for critical gaps (git state, conversation summary, next steps)
- Flag missing sections explicitly
- Include tool call count from session

**Confidence Calculation (Practical):**
```
Base score: 0.5
+0.1 if git_state present and non-empty
+0.1 if conversation_summary.phases has 1+ items
+0.1 if current_work.tasks has 1+ items  
+0.1 if next_steps has 1+ items
+0.1 if continuation_action is not null
-0.1 for each critical section that is empty
Cap: 0.3 minimum, 0.95 maximum
```

**Note:** This is rule-based scoring, not semantic analysis. The agent filling in the context is responsible for quality; this score indicates structural completeness.

#### 1.2 Enhanced Session Tracking
```yaml
session:
  id: "abc123-def456"  # Unique session ID
  thread_url: null     # If platform supports it
  started: "2026-01-30T10:00:00Z"
  ended: "2026-01-30T12:30:00Z"
  duration_minutes: 150
```

**Implementation:**
- Generate unique session ID (shortid or timestamp-based)
- Track session start/end times
- Calculate duration
- Reserve field for thread URL (future platform feature)

#### 1.3 Add Learnings/Debugging Section
```yaml
learnings:
  - pattern: "Always run linter before committing"
    evidence: "3 commits had to be amended for linting issues"
    confidence: 0.8
  - technique: "Use git worktree for parallel feature work"
    context: "Prevented context switching overhead"
    confidence: 0.6
```

**Implementation:**
- Prompt agent to extract notable patterns during session
- Track debugging techniques that proved effective
- Include evidence/context for each learning
- Add confidence score (0.3-0.9 scale)

### Priority 2: Medium Impact, Medium Effort

#### 2.1 Iterative Context Refinement
```bash
# Add validation step before writing final handoff
evaluate_handoff_quality() {
  local handoff_file=$1
  
  # Check for critical gaps
  check_git_state_present
  check_conversation_summary_present
  check_next_steps_present
  
  # Score relevance of included files
  score_file_relevance
  
  # Suggest additional context to capture
  identify_missing_context
  
  # Return quality score
  echo "quality_score=0.85"
}
```

**Implementation:**
- Add quality check function to capture-context.sh
- Evaluate each required section
- Score file relevance in git state
- Suggest additional context if gaps found
- Allow 2-3 refinement iterations

#### 2.2 Quick Start Section for Receiving Agent
```yaml
quick_start:
  package_manager: "bun"  # Detected: bun, npm, pnpm, yarn
  command: "test && lint"  # Stored without PM prefix
  full_command: "bun test && bun run lint"  # Expanded for display
  files_to_read_first:
    - "src/auth/session.ts (focus on lines 45-89)"
    - "tests/auth.test.ts"
  context_priority: "Token expiry logic in session-manager.ts"
  estimated_continuation_time: "30-60 minutes"
```

**Implementation:**
- Extract verification command from current work
- Identify 2-3 most critical files
- Specify exact line ranges if possible
- Prioritize what to focus on first
- Estimate time to continue task
- **Detect package manager** with fallback chain

**Package Manager Detection (inspired by everything-claude-code):**

Add to `capture-context.sh`:
```bash
detect_package_manager() {
  # Priority 1: Environment variable
  if [ -n "$PACKAGE_MANAGER" ]; then
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

PM=$(detect_package_manager)
```

**Rationale:**
- Ensures commands work in continuation thread regardless of which PM is available
- Follows established pattern from everything-claude-code (`scripts/lib/package-manager.js`)
- Graceful fallback prevents "command not found" errors
- Detection order: ENV var → lock file → installed binary → npm fallback

#### 2.3 What Worked vs What Didn't
```yaml
approaches:
  successful:
    - approach: "Using JWT refresh tokens"
      evidence: "Tests pass, security review approved"
      files: ["src/auth/tokens.ts", "src/auth/session.ts"]
  
  attempted_but_failed:
    - approach: "Using Redis for session storage"
      reason: "Performance bottleneck at scale"
      files: ["src/cache/redis-session.ts (abandoned)"]
  
  not_attempted:
    - approach: "Implementing OAuth2 flow"
      reason: "Deferred to future iteration"
      priority: "medium"
```

**Implementation:**
- Track successful approaches with evidence
- Document failed attempts and reasons
- List unattempted approaches with priority
- Include relevant files for each approach

### Priority 3: Lower Impact, Higher Effort

#### 3.1 PreToolUse Hook for Handoff Suggestion
```json
{
  "PreToolUse": [{
    "matcher": "tool == \"Edit\" || tool == \"Write\"",
    "hooks": [{
      "type": "command",
      "command": "~/.claude/plugins/base/skills/handoff-context/scripts/suggest-handoff.sh"
    }]
  }]
}
```

**Implementation:**
- Create suggest-handoff.sh script
- Track tool call count in temp file
- Suggest handoff at thresholds (50, 100, 150 calls)
- Detect logical boundaries (after commit, after test pass)
- Provide user-friendly suggestion message

#### 3.2 Cross-Session Continuity
```yaml
previous_handoffs:
  - file: "/tmp/handoff-20260129-143022.yaml"
    relevance: "high"
    reason: "Same feature, previous phase"
    sections_to_review:
      - "approaches.successful"
      - "learnings"
```

**Implementation:**
- Detect previous handoff files in /tmp/handoff-*
- Assess relevance based on git branch, files, continuation_action
- Allow linking to prior handoffs
- Specify which sections are most relevant

#### 3.3 Alternative Format Support (Markdown)
Inspired by orchestrate.md handoff format:

```markdown
# HANDOFF: 2026-01-30 12:30

## Context
[Summary of session]

## Current Work
- [x] Implemented authentication
- [ ] Add rate limiting

## Findings
- JWT expiry was set too short (5min → 15min)
- Session storage needs optimization

## Files Modified
- src/auth/session.ts
- src/auth/tokens.ts
- tests/auth.test.ts

## Open Questions
- Should we implement refresh token rotation?
- Redis vs in-memory for session cache?

## Recommendations
Continue with rate limiting implementation, refer to throttle patterns in codebase
```

**Implementation:**
- Add format flag to SKILL.md: `--format=yaml|markdown`
- Create markdown template
- Maintain YAML as default for machine readability
- Allow user preference configuration

## Comparison: Current vs Proposed

| Aspect | Current | Proposed Enhancement |
|--------|---------|---------------------|
| Quality Metrics | None | Confidence score (0-1), missing context flags |
| Session Tracking | Timestamp only | Session ID, duration, start/end times |
| Learnings | Implicit in conversation | Explicit learnings section with evidence |
| Context Validation | None | Iterative refinement with quality scoring |
| Continuation Help | Basic instruction | Quick start section with priority files |
| Success Tracking | None | What worked vs what didn't sections |
| Hook Integration | None | PreToolUse hook for strategic suggestions |
| Cross-Session | None | Link to previous handoffs |
| Format | YAML only | YAML + optional Markdown |

## Success Metrics

### Quantitative
- **Confidence Score:** Handoffs should achieve ≥0.8 average confidence
- **Missing Context Rate:** <10% of handoffs should have critical gaps
- **Continuation Time:** Reduce time to resume in new thread by 30%
- **Quality Score:** ≥0.85 average quality score on handoff validation

### Qualitative
- **Completeness:** New thread agent can continue without additional context requests
- **Clarity:** Continuation action is unambiguous
- **Usefulness:** Learnings section captures valuable patterns
- **Efficiency:** Quick start section accelerates ramp-up time

## Implementation Phases

### Phase 1: Core Improvements (Week 1)
- Add confidence/completeness scoring
- Enhanced session tracking (ID, duration)
- Learnings/debugging section
- Update SKILL.md with new template

### Phase 2: Validation & Refinement (Week 2)
- Iterative context refinement
- Quick start section
- What worked vs what didn't
- Quality validation before writing

### Phase 3: Advanced Features (Week 3)
- PreToolUse hook for suggestions
- Cross-session continuity
- Alternative format support (Markdown)
- Hook integration documentation

## Risks & Mitigations

### Risk 1: Increased Complexity
**Mitigation:** Keep default behavior simple, make advanced features opt-in

### Risk 2: Over-Engineering
**Mitigation:** Start with Priority 1 items only, validate usefulness before P2/P3

### Risk 3: Token Cost Increase
**Mitigation:** Use iterative refinement sparingly (max 2-3 iterations), keep templates concise

### Risk 4: Breaking Changes
**Mitigation:** Maintain backward compatibility with current YAML format, add new fields as optional

### Risk 5: Platform Differences
**Mitigation:** everything-claude-code targets Claude Code CLI; verify features work in Warp Agent Mode before implementing. Hook-based features (P3) may not be portable.

## Open Questions

1. Should confidence scoring be visible in the handoff file or just used for validation?
2. What threshold should trigger "missing context" warnings (confidence <0.5 or <0.7)?
3. Should the PreToolUse hook be enabled by default or require manual setup?
4. How should we handle handoffs in non-git repositories (confidence score impact)?
5. Should we archive old handoff files automatically (after N days)?
6. What's the minimum viable improvement that delivers value without over-engineering?
7. Are hooks available in Warp Agent Mode, or only in Claude Code CLI?

## Related Work

- **eval-020:** Handoff context invocation methods (slash command vs natural language)
- **prd-006:** Base plugin architecture and skill structure
- **everything-claude-code:** Source repository for patterns analyzed here

## References

1. [everything-claude-code GitHub](https://github.com/affaan-m/everything-claude-code)
2. [The Shorthand Guide](https://x.com/affaanmustafa/status/2012378465664745795)
3. [The Longform Guide](https://x.com/affaanmustafa/status/2014040193557471352)
4. [Continuous Learning v2](https://github.com/affaan-m/everything-claude-code/tree/main/skills/continuous-learning-v2)
5. [Strategic Compact](https://github.com/affaan-m/everything-claude-code/tree/main/skills/strategic-compact)
6. [Iterative Retrieval](https://github.com/affaan-m/everything-claude-code/tree/main/skills/iterative-retrieval)

## Next Steps

1. Review this evaluation with maintainers
2. Prioritize which improvements to implement first
3. Create PRD or tasks document for selected improvements
4. Implement Priority 1 features
5. Test with real handoff scenarios
6. Gather feedback and iterate

---

**Evaluation Date:** 2026-01-30  
**Evaluator:** AI Analysis  
**Status:** Ready for Review  
**Next Action:** Create tasks-XXX document for implementation
