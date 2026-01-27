# Handoff Context Examples

Real-world examples of handoff scenarios and their generated context summaries.

## Example 1: Feature Implementation Handoff

**User message:** "Handoff and build an admin panel for this"

**Context:** Just completed implementing user authentication API with OAuth2. Ready to move to admin UI but want a fresh thread.

**Generated handoff summary:**

```yaml
handoff:
  timestamp: "2025-01-25T14:32:00Z"
  thread_id: "msg_ABC123"
  continuation_action: "build an admin panel for this"

context:
  current_work:
    - task: "Implement user authentication API"
      status: "completed"
      files: ["src/api/auth.ts", "src/middleware/auth.ts", "src/types/user.ts"]
    - task: "Build admin panel UI"
      status: "pending"
      files: []

  git_state:
    branch: "feature/user-auth"
    staged: ["src/api/auth.ts", "src/middleware/auth.ts", "src/types/user.ts"]
    unstaged: []
    untracked: []

  conversation_summary:
    - phase: "planning"
      outcome: "Auth API spec defined with OAuth2 flow and session management"
    - phase: "implementation"
      outcome: "Core authentication endpoints completed: login, logout, session validation"

  next_steps:
    - action: "build an admin panel for this"
      context: "Create admin interface for managing user authentication sessions"

  preserved_context:
    - "Using OAuth2 with Google provider"
    - "Session storage in Redis with 24-hour TTL"
    - "Admin panel should list users and manage sessions"
    - "Authentication tokens are JWT with RS256 signing"
```

---

## Example 2: Bug Fix Handoff with Auditing

**User message:** "Handoff and check if this issue exists elsewhere"

**Context:** Just fixed a race condition in payment processing caused by missing mutex. Want to audit similar patterns in the codebase.

**Generated handoff summary:**

```yaml
handoff:
  timestamp: "2025-01-25T14:35:00Z"
  thread_id: "msg_DEF456"
  continuation_action: "check if this issue exists elsewhere"

context:
  current_work:
    - task: "Fix race condition in payment processing"
      status: "completed"
      files: ["src/services/payment.ts"]
    - task: "Audit similar patterns in codebase"
      status: "pending"
      files: []

  git_state:
    branch: "fix/payment-race-condition"
    staged: ["src/services/payment.ts"]
    unstaged: []
    untracked: []

  conversation_summary:
    - phase: "debugging"
      outcome: "Race condition identified: missing mutex in payment.lock() method"
    - phase: "implementation"
      outcome: "Added mutex protection using async-mutex library"

  next_steps:
    - action: "check if this issue exists elsewhere"
      context: "Search for similar .lock() patterns without mutex protection in the codebase"

  preserved_context:
    - "Race condition occurred when concurrent payment requests accessed shared state"
    - "Pattern to look for: methods with 'lock' in name that don't use mutex"
    - "Files to audit: src/services/*.ts for similar locking patterns"
    - "Fix pattern: wrap critical sections with Mutex.acquire() / release()"
```

---

## Example 3: Context-Only Handoff

**User message:** "Start a new thread with this context"

**Context:** In the middle of planning a microservices migration. Discussion is getting long, want to continue planning in a fresh thread with all context preserved.

**Generated handoff summary:**

```yaml
handoff:
  timestamp: "2025-01-25T14:40:00Z"
  thread_id: "msg_GHI789"
  continuation_action: null

context:
  current_work:
    - task: "Architecture planning for microservices migration"
      status: "in_progress"
      files: ["docs/architecture/migration-plan.md"]

  git_state:
    branch: "docs/microservices-planning"
    staged: []
    unstaged: ["docs/architecture/migration-plan.md"]
    untracked: []

  conversation_summary:
    - phase: "exploration"
      outcome: "Evaluated monolith pain points and migration drivers"
    - phase: "planning"
      outcome: "Service boundaries identified, migration order being discussed"

  next_steps: []

  preserved_context:
    - "Migrating in 3 phases: auth service, payments service, notifications service"
    - "Database sharding strategy deferred to phase 2"
    - "Need to decide on service mesh (Istio vs Linkerd) before implementation"
    - "API Gateway choice narrowed to Kong vs AWS API Gateway"
    - "Current monolith: ~50k LOC, 15 endpoints, 3 databases"
    - "Team concern: operational complexity of managing multiple services"
```

---

## Example 4: Planning to Implementation Handoff

**User message:** "Handoff to implement the plan"

**Context:** Just finished creating a detailed implementation plan for adding WebSocket support. Ready to move to implementation phase in a new thread.

**Generated handoff summary:**

```yaml
handoff:
  timestamp: "2025-01-25T14:45:00Z"
  thread_id: "msg_JKL012"
  continuation_action: "implement the plan"

context:
  current_work:
    - task: "Create WebSocket implementation plan"
      status: "completed"
      files: ["docs/plans/websocket-support.md"]
    - task: "Implement WebSocket server"
      status: "pending"
      files: []

  git_state:
    branch: "feature/websocket-support"
    staged: ["docs/plans/websocket-support.md"]
    unstaged: []
    untracked: []

  conversation_summary:
    - phase: "planning"
      outcome: "Detailed implementation plan created with 5 phases"
    - phase: "design review"
      outcome: "Architecture validated: using Socket.IO with Redis adapter"

  next_steps:
    - action: "implement the plan"
      context: "Follow the 5-phase plan in docs/plans/websocket-support.md"

  preserved_context:
    - "Using Socket.IO v4 with Redis adapter for horizontal scaling"
    - "Phase 1: Basic WebSocket server with connection management"
    - "Phase 2: Event handlers for real-time notifications"
    - "Phase 3: Authentication middleware for WebSocket connections"
    - "Phase 4: Redis pub/sub for multi-server support"
    - "Phase 5: Load testing and optimization"
    - "Current implementation uses Express.js on port 3000"
    - "WebSocket endpoint will be /ws, separate from HTTP API"
```

---

## Example 5: Handoff During Debugging

**User message:** "Handoff and continue debugging the test failures"

**Context:** Mid-debugging session with multiple test failures. Thread is long, want to continue in fresh thread with full error context.

**Generated handoff summary:**

```yaml
handoff:
  timestamp: "2025-01-25T14:50:00Z"
  thread_id: "msg_MNO345"
  continuation_action: "continue debugging the test failures"

context:
  current_work:
    - task: "Debug test failures in payment module"
      status: "in_progress"
      files: ["src/services/payment.test.ts", "src/services/payment.ts"]
    - task: "Fix async race condition"
      status: "pending"
      files: []

  git_state:
    branch: "fix/payment-test-failures"
    staged: []
    unstaged: ["src/services/payment.test.ts"]
    untracked: []

  conversation_summary:
    - phase: "error discovery"
      outcome: "3 test failures: test_payment_timeout, test_refund_processing, test_concurrent_payments"
    - phase: "hypothesis formation"
      outcome: "Suspect async race condition in payment processing"
    - phase: "investigation"
      outcome: "Identified missing await in processRefund() function"

  next_steps:
    - action: "continue debugging the test failures"
      context: "Continue investigating the 3 test failures, starting with the missing await"

  preserved_context:
    - "Error message: 'Timeout waiting for refund to complete'"
    - "Test passes when run individually but fails in suite"
    - "Hypothesis: Missing await causes test to proceed before refund completes"
    - "Fix attempted: Added await to processRefund() - 1 test still failing"
    - "Next: investigate test_concurrent_payments failure"
    - "Two failures down, one to go"
```

---

## Example 6: Handoff with Uncommitted Changes

**User message:** "Handoff, I'll commit these later"

**Context:** Have both staged and unstaged changes. Want to preserve exact git state for resuming work later.

**Generated handoff summary:**

```yaml
handoff:
  timestamp: "2025-01-25T14:55:00Z"
  thread_id: "msg_PQR678"
  continuation_action: null

context:
  current_work:
    - task: "Refactor user service for better separation of concerns"
      status: "in_progress"
      files: ["src/services/user.ts", "src/repositories/user.ts"]
    - task: "Add unit tests for refactored code"
      status: "pending"
      files: ["src/services/user.test.ts"]

  git_state:
    branch: "refactor/user-service"
    staged:
      - "src/services/user.ts"
      - "src/repositories/user.ts"
    unstaged:
      - "src/services/user.test.ts"
    untracked: []

  conversation_summary:
    - phase: "implementation"
      outcome: "User service refactored, repository layer extracted"

  next_steps: []

  preserved_context:
    - "Refactoring follows repository pattern for data access"
    - "Staged files are ready to commit, test file still in progress"
    - "User decided to commit later after completing tests"
    - "No breaking changes to public API"
```

---

## Example 7: No Git Repository Handoff

**User message:** "Handoff and continue the research"

**Context:** Working in a directory without git (maybe a temporary research folder). Git state should be omitted.

**Generated handoff summary:**

```yaml
handoff:
  timestamp: "2025-01-25T15:00:00Z"
  thread_id: "msg_STU901"
  continuation_action: "continue the research"

context:
  current_work:
    - task: "Research WebSocket libraries for Node.js"
      status: "in_progress"
      files: ["research/websocket-comparison.md"]
    - task: "Evaluate performance benchmarks"
      status: "pending"
      files: []

  conversation_summary:
    - phase: "research"
      outcome: "Compared Socket.IO, ws, and SockJS libraries"

  next_steps:
    - action: "continue the research"
      context: "Continue evaluating WebSocket libraries and performance benchmarks"

  preserved_context:
    - "Socket.IO: Most feature-rich, larger bundle size"
    - "ws: Minimal, fastest, but lacks fallbacks and reconnection"
    - "SockJS: Good fallback support, but less actively maintained"
    - "Current recommendation leaning toward Socket.IO for our use case"
```

---

*Note: Thread IDs in these examples are fictional for illustration purposes.*
