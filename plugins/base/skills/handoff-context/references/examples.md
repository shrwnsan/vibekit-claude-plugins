# Handoff Context Examples

Concrete input/output examples for common handoff scenarios.

## Example 1: Continuation Handoff

**User says:** "Handoff and build an admin panel"

**Extracted:**
- Handoff type: continuation
- Continuation action: "build an admin panel"

**YAML output:**
```yaml
handoff:
  continuation_action: "build an admin panel"
context:
  current_work:
    - task: "Implement user authentication"
      status: "completed"
      files: ["auth.ts", "login.tsx"]
```

## Example 2: Context Preservation

**User says:** "Handoff this context"

**Extracted:**
- Handoff type: context-preservation
- Continuation action: null

**YAML output:**
```yaml
handoff:
  continuation_action: null
context:
  conversation_summary:
    - phase: "debugging"
      outcome: "Fixed timeout issue, need to audit other services"
  preserved_context:
    - "Timeout was caused by connection pool exhaustion"
    - "Retry logic added but monitoring needed"
```

## Example 3: Targeted Handoff

**User says:** "Handoff to code-reviewer for security check"

**Extracted:**
- Handoff type: targeted
- Continuation action: "code-reviewer for security check"

**YAML output:**
```yaml
handoff:
  continuation_action: "code-reviewer for security check"
context:
  current_work:
    - task: "Implement password reset flow"
      status: "completed"
      files: ["reset.ts", "templates.ts"]
  preserved_context:
    - "Time-based tokens expire after 1 hour"
    - "Rate limiting: 3 requests per hour"
```

## Example 4: Fresh Thread for Next Phase

**User says:** "Continue in a fresh thread"

**Extracted:**
- Handoff type: explicit-continuation
- Continuation action: null (implicit "continue work")

**YAML output:**
```yaml
handoff:
  continuation_action: null
context:
  current_work:
    - task: "Complete API integration"
      status: "in_progress"
      files: ["api.ts", "types.ts"]
  next_steps:
    - action: "Continue API integration"
      context: "Pending: error handling, tests, documentation"
```

## Pattern Recognition Summary

| Input Pattern | Handoff Type | Action |
|---------------|--------------|--------|
| "Handoff and {action}" | continuation | Extract {action} |
| "Handoff to {target}" | targeted | Extract {target} |
| "Handoff this context" | context-preservation | null |
| "Continue in fresh thread" | explicit-continuation | null |

*See [examples-detailed.md](examples-detailed.md) for detailed scenarios with full context and complete YAML output.*

---

## Anti-Patterns (Wrong Output)

These outputs indicate the skill did not execute correctly. If you see these, re-invoke with `/handoff-context`.

### ❌ Text-only display (no file created)

**Output:**
```
Handoff Summary

Session Overview: We worked on authentication...
Key Work Completed: Implemented login flow...
Next Steps: Continue with admin panel...
```

**Problem:** No file created, not machine-readable, breaks agent-to-agent handoff.

### ❌ .txt file with Markdown content

**Command executed:**
```bash
cat > /tmp/handoff-20260128.txt << 'EOF'
# Context Handoff
## Recent Work
- Completed authentication
## Next Steps
- Build admin panel
EOF
```

**Problems:**
- Wrong extension (`.txt` instead of `.yaml`)
- Wrong format (Markdown `##` headings instead of YAML structure)
- Script was bypassed

### ❌ YAML file without continuation instruction

**Output:**
```
Context saved to /tmp/handoff-XXX/handoff-20260128.yaml
```

**Problem:** Missing "To continue: Continue from [path]" instruction for next agent.

### ✅ Correct output for comparison

See Examples 1-4 above for correct YAML structure and user display format.
