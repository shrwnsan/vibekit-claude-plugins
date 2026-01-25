# Handoff Trigger Patterns

This document defines all trigger patterns that activate the handoff-context skill, along with how continuation actions are extracted.

## Pattern Categories

### 1. Continuation Handoff

User provides a specific action to continue after handoff.

| Pattern | Regex Capture | Continuation Action |
|---------|---------------|---------------------|
| "Handoff and {action}" | `(?i)handoff\s+and\s+(.+)$` | Everything after "and" |
| "Handoff to {action}" | `(?i)handoff\s+to\s+(.+)$` | Everything after "to" |
| "Handoff, {action}" | `(?i)handoff,\s*(.+)$` | Everything after comma |
| "Handoff {action}" | `(?i)handoff\s+(?!and|to)(.+)$` | Everything after "handoff" |

**Examples:**
- "Handoff and build an admin panel for this" → "build an admin panel for this"
- "Handoff to implement the plan" → "implement the plan"
- "Handoff and check if this issue exists elsewhere" → "check if this issue exists elsewhere"
- "Handoff, create tests for this" → "create tests for this"
- "Handoff review the PR" → "review the PR"

### 2. Context-Only Handoff

User wants to preserve context without specifying a continuation action.

| Pattern | Regex Match | Continuation Action |
|---------|-------------|---------------------|
| "Handoff this context" | `(?i)handoff\s+this\s+context` | `null` |
| "Handoff context" | `(?i)handoff\s+context$` | `null` |
| "Just handoff" | `(?i)just\s+handoff$` | `null` |

**Examples:**
- "Handoff this context" → `null`
- "Handoff context" → `null`
- "Just handoff" → `null`

### 3. Explicit Thread Continuation

User explicitly requests starting a new thread.

| Pattern | Regex Match | Continuation Action |
|---------|-------------|---------------------|
| "Start a new thread with this" | `(?i)start\s+a\s+new\s+thread\s+with\s+this` | `null` |
| "Start a new thread with {context}" | `(?i)start\s+a\s+new\s+thread\s+with\s+(.+)$` | Captured context |
| "Continue in a fresh thread" | `(?i)continue\s+in\s+a\s+fresh\s+thread` | `null` |
| "Continue in a new thread" | `(?i)continue\s+in\s+a\s+new\s+thread` | `null` |
| "New thread with this" | `(?i)new\s+thread\s+with\s+this` | `null` |

**Examples:**
- "Start a new thread with this" → `null`
- "Start a new thread with the auth context" → "the auth context"
- "Continue in a fresh thread" → `null`
- "Continue in a new thread" → `null`
- "New thread with this" → `null`

### 4. Implicit Handoff Signals

Phrases that suggest handoff without using the word directly.

| Pattern | Regex Match | Continuation Action |
|---------|-------------|---------------------|
| "Let's continue in a new thread" | `(?i)let'?s\s+continue\s+in\s+a\s+new\s+thread` | `null` |
| "Wrap this up and continue" | `(?i)wrap\s+this\s+up\s+and\s+continue` | `null` |
| "Finish here and continue" | `(?i)finish\s+here\s+and\s+continue` | `null` |

**Note:** These patterns are more conservative and may require confirmation.

## Detection Priority

When multiple patterns could match, use this priority order:

1. **Explicit continuation** (highest priority) - "Handoff and {action}"
2. **Targeted handoff** - "Handoff to {action}"
3. **Thread continuation** - "Start a new thread..."
4. **Context-only** - "Handoff this context"
5. **Implicit signals** (lowest priority) - May require confirmation

## Edge Cases

### Ambiguous Actions

If the extracted continuation action is unclear or generic:
- "Handoff and do stuff" → Ask for clarification
- "Handoff and continue" → Assume context-preservation, note ambiguity
- "Handoff and work on this" → Use current work as continuation context

### Multiple Triggers

If a message contains multiple handoff triggers:
- Process the first valid trigger
- Ignore subsequent triggers in the same message
- Warn user if multiple different actions are detected

### Partial Matches

- "Handoff" alone (no action, no context) → Context-preservation handoff
- "I think we should handoff" → Context-preservation (implicit)
- "Maybe handoff and..." → Ask for confirmation

## Pattern Matching Implementation

Pseudo-code for pattern matching:

```
function detect_handoff(user_message):
    # Check in priority order
    for pattern in patterns_by_priority:
        match = regex_match(pattern.regex, user_message)
        if match:
            action = extract_action(match, pattern)
            return {
                type: pattern.type,
                action: action,
                confidence: pattern.confidence
            }

    return null  # No handoff detected
```

## Extending Patterns

To add new trigger patterns:

1. Define the regex pattern
2. Specify how to extract continuation action (if any)
3. Assign a category (continuation, context-only, explicit, implicit)
4. Set priority relative to existing patterns
5. Add test examples

---

*Note: All patterns use case-insensitive matching (`(?i)` flag).*
