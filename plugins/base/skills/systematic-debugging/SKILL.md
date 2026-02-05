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

# Systematic Debugging

A systematic approach to debugging that ensures you understand the root cause before attempting fixes. This reduces thrashing, prevents new bugs, and saves time.

## When to Use

**Use this skill when you encounter:**
- Error messages or stack traces in conversation
- Test failures being discussed
- "Not working", "bug", "broken", or "unexpected behavior" mentioned
- Questions like "why is this happening?" or "help me debug"
- User reports something failing after changes
- Performance problems or build failures

**This skill provides structure to prevent:**
- Random fixes without understanding root cause
- Multiple simultaneous changes that can't be isolated
- Skipping tests and manual verification
- Thrashing when 3+ fixes have failed

## Examples

### Test Failure
```
"This test is failing: AssertionError: Expected 200 but got 500"
"help me debug this failing test suite"
"Why is the user auth test suddenly broken?"
```

### Runtime Error
```
"I'm getting TypeError: Cannot read property 'x' of undefined"
"This worked yesterday but now throws an error"
"Something's broken after my refactor"
```

### Build/CI Issues
```
"The CI pipeline is failing randomly"
"Build works locally but fails in production"
"Getting intermittent failures in our deployment"
```

## Core Workflow

### 1. Capture Error Context

Gather information about the problem:
- Read error messages and stack traces completely
- Note line numbers, file paths, error codes
- Check logs for additional context
- Understand what the system is telling you

### 2. Identify Reproduction Steps

Can you trigger the issue reliably?
- What are the exact steps to reproduce?
- Does it happen every time or intermittently?
- What conditions trigger it?
- If not reproducible: gather more data, don't guess

### 3. Isolate Failure Location

Where exactly does the problem occur?
- Trace the data flow to find where it breaks
- Check recent changes that could cause this
- Use diagnostic logging for multi-component systems
- Identify the specific component or function failing

### 4. Implement Minimal Fix

Address the root cause, not the symptom:
- Form a clear hypothesis: "I think X is causing this because Y"
- Make the smallest possible change to test
- One variable at a time
- No "while I'm here" improvements

### 5. Verify Solution

Confirm it actually works:
- Does the fix resolve the issue?
- Are tests passing?
- No other tests broken?
- Can you still reproduce the problem?

---

## ⚠️ Stop Signs: Read Before Proceeding

**If you catch yourself thinking any of these, STOP and return to step 1:**

| Thought | What To Do Instead |
|---------|-------------------|
| "Quick fix for now, investigate later" | Investigate now. Quick fixes create new bugs. |
| "Just try changing X and see if it works" | Form a hypothesis first. Test one variable at a time. |
| "Add multiple changes, run tests" | One change at a time. Otherwise you can't isolate what worked. |
| "Skip the test, I'll manually verify" | Write the test. Untested fixes don't stick. |
| "It's probably X, let me fix that" | Verify X is the root cause before fixing. |
| "One more fix attempt" (after 2+ failures) | **Stop.** 3+ failed fixes usually means architectural problem. |

---

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

---

## For Multi-Component Systems

When debugging across layers (CI → build → deploy, API → service → database):

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

---

## Common Debugging Pitfalls

| Pitfall | Why It's Problematic | Better Approach |
|---------|---------------------|-----------------|
| Fixing without understanding | You treat symptoms, not causes | Always identify root cause first |
| Multiple changes at once | Can't isolate what worked | One variable at a time |
| Assuming without verifying | Wastes time on wrong fixes | Verify hypotheses with data |
| Skipping tests | Fixes don't stick | Write tests before fixing |
| Ignoring error messages | Solutions often in the error | Read errors completely |
| Rushing under pressure | Guarantees rework | Systematic is faster than thrashing |

---

## What Success Looks Like

✅ You understand exactly WHAT is broken and WHY
✅ You can reproduce the issue consistently
✅ Your fix addresses root cause, not symptom
✅ Tests pass and issue is resolved
✅ No new bugs introduced
✅ You've prevented similar issues

---

## Integration with Base Plugin

This skill works alongside other Base plugin capabilities:

- **crafting-commits**: Document debugging findings in commit messages
- **workflow-orchestrator**: Coordinate debugging workflows with quality gates
- **/commit**: Create commits that reference resolved issues

---

## Philosophy

**Systematic debugging is faster than random fixes.**

From real debugging sessions:
- Systematic approach: 15-30 minutes to fix
- Random fixes approach: 2-3 hours of thrashing
- First-time fix rate: 95% vs 40%
- New bugs introduced: Near zero vs common

**Core principle:** Understand before you fix.

## Limitations

- Requires reproducible issues for systematic investigation
- Intermittent/timing-dependent bugs may need additional monitoring strategies
- Environmental issues (external dependencies, network) may not have root causes in code
- Complex distributed systems may require specialized debugging tools beyond this scope
- Not a substitute for proper logging, observability, and monitoring infrastructure

---

*Rationale: This skill provides systematic debugging structure while remaining pragmatic. Use when helpful, adapt to the situation, skip when the issue is straightforward.*
