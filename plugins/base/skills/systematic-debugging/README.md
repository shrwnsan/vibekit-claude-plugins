# Systematic Debugging Skill

A systematic approach to debugging that ensures you understand the root cause before attempting fixes. Reduces thrashing, prevents new bugs, and saves time.

## Quick Start

**Recommended: Use the slash command**
```bash
/systematic-debugging
```

**Or the skill activates automatically when:**
- Error messages or stack traces appear in conversation
- Test failures are being discussed
- "Not working", "bug", "broken", or "unexpected behavior" is mentioned
- Questions like "why is this happening?" or "help me debug"

The skill provides a structured 5-step debugging workflow that prevents common anti-patterns.

## Features

### 5-Step Systematic Workflow

1. **Capture Error Context**
   - Read error messages and stack traces completely
   - Note line numbers, file paths, error codes
   - Check logs for additional context
   - Understand what the system is telling you

2. **Identify Reproduction Steps**
   - What are the exact steps to reproduce?
   - Does it happen every time or intermittently?
   - What conditions trigger it?
   - If not reproducible: gather more data, don't guess

3. **Isolate Failure Location**
   - Trace the data flow to find where it breaks
   - Check recent changes that could cause this
   - Use diagnostic logging for multi-component systems
   - Identify the specific component or function failing

4. **Implement Minimal Fix**
   - Address the root cause, not the symptom
   - Form a clear hypothesis: "I think X is causing this because Y"
   - Make the smallest possible change to test
   - One variable at a time—no "while I'm here" improvements

5. **Verify Solution**
   - Does the fix resolve the issue?
   - Are tests passing?
   - No other tests broken?
   - Can you still reproduce the problem?

### Guardrails Against Common Pitfalls

Stop signs—when you catch yourself thinking these, STOP and return to step 1:

| Thought | What To Do Instead |
|---------|-------------------|
| "Quick fix for now, investigate later" | Investigate now. Quick fixes create new bugs. |
| "Just try changing X and see if it works" | Form a hypothesis first. Test one variable at a time. |
| "Add multiple changes, run tests" | One change at a time. Otherwise you can't isolate what worked. |
| "Skip the test, I'll manually verify" | Write the test. Untested fixes don't stick. |
| "It's probably X, let me fix that" | Verify X is the root cause before fixing. |
| "One more fix attempt" (after 2+ failures) | **Stop.** 3+ failed fixes usually means architectural problem. |

### Dynamic Context Injection

Pre-loads debugging context for faster root cause analysis:
- Recent git commits (what changed recently?)
- Recent test failure logs (what's been failing?)
- Recent build output (build-level issues)

### Multi-Component System Support

For debugging across layers (CI → build → deploy, API → service → database):

**Add diagnostic logging at each boundary before fixing:**

```bash
# At each component boundary:
# - Log what data enters the component
# - Log what data exits the component
# - Verify environment/config propagation
# - Check state at each layer

# Run once to identify WHERE it breaks
# THEN analyze evidence to identify failing component
# THEN investigate that specific component
```

**Example (multi-layer system):**
```bash
# Layer 1: Workflow
echo "=== Secrets available in workflow: ==="
echo "IDENTITY: ${IDENTITY:+SET}${IDENTITY:-UNSET}"

# Layer 2: Build script
echo "=== Env vars in build script: ==="
env | grep IDENTITY || echo "IDENTITY not in environment"

# Layer 3: Signing script
echo "=== Keychain state: ==="
security list-keychains
security find-identity -v

# This reveals: Which layer fails
```

## Usage Examples

### Test Failure
```bash
# Automatic activation
"This test is failing: AssertionError: Expected 200 but got 500"

# Skill provides systematic approach to:
# 1. Read the complete error message
# 2. Identify reproduction steps
# 3. Isolate where the assertion fails
# 4. Form hypothesis about root cause
# 5. Implement minimal fix
# 6. Verify test passes
```

### Runtime Error
```bash
# Automatic activation
"I'm getting TypeError: Cannot read property 'x' of undefined"

# Skill guides you to:
# 1. Capture stack trace completely
# 2. Reproduce the error consistently
# 3. Trace data flow to find null reference
# 4. Identify where 'x' should be set
# 5. Add proper null check or initialization
# 6. Verify error is resolved
```

### Build/CI Issues
```bash
# Automatic activation
"The CI pipeline is failing randomly"

# Skill helps you:
# 1. Capture CI logs completely
# 2. Identify patterns in failures
# 3. Isolate failing stage
# 4. Check for race conditions or resource issues
# 5. Implement targeted fix
# 6. Verify CI passes consistently
```

## When You've Tried 3+ Fixes

**Pattern indicating deeper problem:**
- Each fix reveals a new issue elsewhere
- Fixes require massive refactoring to implement
- You're fixing symptoms, not root cause
- Each "solution" creates new problems

**Stop and question fundamentals:**
- Is this approach fundamentally sound?
- Should we refactor architecture instead?
- Are we "sticking with it through sheer inertia"?
- **Discuss with user before attempting Fix #4**

This is not a failed hypothesis—this is likely a wrong architecture.

## What Success Looks Like

✅ You understand exactly WHAT is broken and WHY
✅ You can reproduce the issue consistently
✅ Your fix addresses root cause, not symptom
✅ Tests pass and issue is resolved
✅ No new bugs introduced
✅ You've prevented similar issues

## Integration

Works seamlessly with other Base plugin capabilities:
- **workflow-orchestrator**: Coordinates debugging workflows with quality gates
- **crafting-commits**: Documents debugging findings in commit messages
- **handoff-context**: Preserves error context during debugging

## Philosophy

**Systematic debugging is faster than random fixes.**

From real debugging sessions:
- Systematic approach: 15-30 minutes to fix
- Random fixes approach: 2-3 hours of thrashing
- First-time fix rate: 95% vs 40%
- New bugs introduced: Near zero vs common

**Core principle:** Understand before you fix.

## Documentation

- [SKILL.md](SKILL.md) - Complete workflow and implementation details

## Limitations

- Requires reproducible issues for systematic investigation
- Intermittent/timing-dependent bugs may need additional monitoring strategies
- Environmental issues (external dependencies, network) may not have root causes in code
- Complex distributed systems may require specialized debugging tools beyond this scope
- Not a substitute for proper logging, observability, and monitoring infrastructure

## License

Apache 2.0
