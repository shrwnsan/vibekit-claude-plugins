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
  timestamp: "2026-02-04T14:30:22Z"
  thread_id: "manual-1738685422"
  continuation_action: "build an admin panel"

session:
  id: "20260204-143022-a3f7c"
  started: "2026-02-04T14:15:00Z"
  ended: "2026-02-04T14:30:22Z"
  duration_minutes: 15

metadata:
  confidence_score: 0.85
  context_quality: "high"
  missing_context: []
  config:
    source: "builtin"
    format: "yaml"

quick_start:
  project_types: ["javascript"]
  primary_type: "javascript"
  package_manager: "pnpm"
  verification_command: "test"
  files_to_read_first: ["src/auth/session.ts (45-89)"]
  context_priority: "Focus on token expiry logic"
  estimated_time_minutes: 30

git_state:
  branch: "feature/auth"
  staged: ["src/auth/session.ts"]
  unstaged: ["src/auth/utils.ts"]
  untracked: []

learnings:
  - pattern: "Token refresh requires 30s buffer"
    evidence: "Tested with expiry timestamps"
    confidence: 0.9

approaches:
  successful:
    - approach: "JWT with refresh token pattern"
      evidence: "Passes all integration tests"
      files: ["src/auth/session.ts"]
  attempted_but_failed:
    - approach: "LocalStorage only"
      reason: "Lost on page refresh"
      files: ["src/auth/storage.ts"]
  not_attempted:
    - approach: "Cookie-based auth"
      reason: "Out of scope for MVP"
      priority: "low"

context:
  current_work:
    - task: "Implement user authentication"
      status: "completed"
      files: ["auth.ts", "login.tsx"]
  conversation_summary:
    - phase: "implementation"
      outcome: "Authentication flow completed with JWT"
  next_steps:
    - action: "build an admin panel"
      context: "Create admin interface for managing users"
  preserved_context:
    - "Using OAuth2 with Google provider"
    - "Session storage in Redis with 24-hour TTL"
```

## Example 2: Context Preservation

**User says:** "Handoff this context"

**Extracted:**
- Handoff type: context-preservation
- Continuation action: null

**YAML output:**
```yaml
handoff:
  timestamp: "2026-02-04T14:35:00Z"
  thread_id: "manual-1738685700"
  continuation_action: null

session:
  id: "20260204-143500-b2e8d"
  started: "2026-02-04T14:00:00Z"
  ended: "2026-02-04T14:35:00Z"
  duration_minutes: 35

metadata:
  confidence_score: 0.75
  context_quality: "medium"
  missing_context: ["No explicit next steps defined"]
  config:
    source: "~/.claude/handoff-context-config.yml"
    format: "yaml"

quick_start:
  project_types: ["python"]
  primary_type: "python"
  package_manager: "uv"
  verification_command: "pytest"
  files_to_read_first: ["src/payment/processor.py"]
  context_priority: "Focus on connection pooling"
  estimated_time_minutes: 45

git_state:
  branch: "fix/timeout-issue"
  staged: ["src/payment/processor.py"]
  unstaged: []
  untracked: []

learnings:
  - pattern: "Connection pool exhaustion causes timeouts"
    evidence: "Observed under load, fixed by increasing pool size"
    confidence: 0.95

approaches:
  successful:
    - approach: "Increase connection pool size"
      evidence: "Timeouts resolved under load testing"
      files: ["src/payment/processor.py"]
  attempted_but_failed:
    - approach: "Add retry logic without pool increase"
      reason: "Retries just delayed the inevitable timeout"
      files: ["src/payment/processor.py"]
  not_attempted:
    - approach: "Migrate to async connection pool"
      reason: "Larger refactoring, defer to next sprint"
      priority: "medium"

context:
  current_work:
    - task: "Debug and fix timeout issue"
      status: "completed"
      files: ["src/payment/processor.py"]
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
  timestamp: "2026-02-04T14:40:00Z"
  thread_id: "manual-1738686000"
  continuation_action: "code-reviewer for security check"

session:
  id: "20260204-144000-c1a9f"
  started: "2026-02-04T14:20:00Z"
  ended: "2026-02-04T14:40:00Z"
  duration_minutes: 20

metadata:
  confidence_score: 0.90
  context_quality: "high"
  missing_context: []
  config:
    source: "builtin"
    format: "yaml"

quick_start:
  project_types: ["javascript"]
  primary_type: "javascript"
  package_manager: "npm"
  verification_command: "test"
  files_to_read_first: ["src/auth/reset.ts", "src/auth/templates.ts"]
  context_priority: "Focus on token security and rate limiting"
  estimated_time_minutes: 15

git_state:
  branch: "feature/password-reset"
  staged: ["src/auth/reset.ts", "src/auth/templates.ts"]
  unstaged: []
  untracked: []

learnings:
  - pattern: "Time-based tokens need secure random generation"
    evidence: "Used crypto.randomBytes() for token generation"
    confidence: 0.95
  - technique: "Rate limiting prevents abuse"
    context: "Applied 3 requests per hour limit per email"
    confidence: 0.90

approaches:
  successful:
    - approach: "Time-based tokens with secure random generation"
      evidence: "Tokens are cryptographically secure and expire"
      files: ["src/auth/reset.ts"]
  attempted_but_failed: []
  not_attempted:
    - approach: "Add CAPTCHA to reset form"
      reason: "Defer to phase 2, rate limiting should be sufficient"
      priority: "low"

context:
  current_work:
    - task: "Implement password reset flow"
      status: "completed"
      files: ["reset.ts", "templates.ts"]
  conversation_summary:
    - phase: "implementation"
      outcome: "Password reset flow completed with security best practices"
  next_steps:
    - action: "code-reviewer for security check"
      context: "Review token generation, rate limiting, and email template security"
  preserved_context:
    - "Time-based tokens expire after 1 hour"
    - "Rate limiting: 3 requests per hour"
    - "Tokens stored hashed in database"
```

## Example 4: Fresh Thread for Next Phase

**User says:** "Continue in a fresh thread"

**Extracted:**
- Handoff type: explicit-continuation
- Continuation action: null (implicit "continue work")

**YAML output:**
```yaml
handoff:
  timestamp: "2026-02-04T14:45:00Z"
  thread_id: "manual-1738686300"
  continuation_action: null

session:
  id: "20260204-144500-d3b7e"
  started: "2026-02-04T14:00:00Z"
  ended: "2026-02-04T14:45:00Z"
  duration_minutes: 45

metadata:
  confidence_score: 0.70
  context_quality: "medium"
  missing_context: ["Error handling not yet implemented", "Tests not written"]
  config:
    source: "~/.config/agents/handoff-context-config.yml"
    format: "yaml"

quick_start:
  project_types: ["javascript", "typescript"]
  primary_type: "typescript"
  package_manager: "yarn"
  verification_command: "build"
  files_to_read_first: ["src/api/api.ts", "src/api/types.ts"]
  context_priority: "Complete error handling, add tests, document API"
  estimated_time_minutes: 60

git_state:
  branch: "feature/api-integration"
  staged: ["src/api/api.ts", "src/api/types.ts"]
  unstaged: []
  untracked: []

learnings:
  - pattern: "TypeScript strict mode catches type errors early"
    evidence: "Caught several type mismatches during implementation"
    confidence: 0.85

approaches:
  successful:
    - approach: "Use TypeScript for type safety"
      evidence: "Type system prevents runtime errors"
      files: ["src/api/types.ts"]
  attempted_but_failed:
    - approach: "Use any type for complex responses"
      reason: "Lost type safety, reverted to proper types"
      files: ["src/api/types.ts"]
  not_attempted:
    - approach: "Add request validation middleware"
      reason: "Defer to phase 2, focus on basic integration first"
      priority: "medium"

context:
  current_work:
    - task: "Complete API integration"
      status: "in_progress"
      files: ["api.ts", "types.ts"]
  conversation_summary:
    - phase: "implementation"
      outcome: "Basic API endpoints implemented, error handling pending"
  next_steps:
    - action: "Continue API integration"
      context: "Pending: error handling, tests, documentation"
  preserved_context:
    - "API base URL: https://api.example.com/v1"
    - "Authentication: Bearer token in Authorization header"
    - "Rate limit: 100 requests per minute"
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
