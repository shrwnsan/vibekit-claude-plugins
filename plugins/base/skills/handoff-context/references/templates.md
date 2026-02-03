# Handoff Context Templates

Templates for generating context summaries based on handoff type and scenario.

> **Note:** `{{IF_CONDITION}}...{{END_IF}}` notation indicates optional sections that should only be included if the condition is met. The actual implementation uses conditional logic in bash, not a templating engine.

## Template Structure

All templates output YAML format with the following base structure:

```yaml
handoff:
  timestamp: "{{TIMESTAMP_ISO8601}}"
  thread_id: "{{THREAD_ID}}"
  continuation_action: "{{EXTRACTED_ACTION_OR_NULL}}"

session:
  id: "{{SESSION_ID}}"
  started: "{{SESSION_START}}"
  ended: "{{SESSION_END}}"
  duration_minutes: {{DURATION}}

metadata:
  confidence_score: {{CONFIDENCE_0.3_TO_0.95}}
  context_quality: "high|medium|low"
  missing_context: []

quick_start:
  project_types: ["javascript", "python"]
  primary_type: "javascript"
  package_manager: "npm|pnpm|yarn|bun"
  verification_command: "{{COMMAND}}"
  files_to_read_first: ["{{FILE_PATH}}"]
  context_priority: "{{FOCUS_AREA}}"
  estimated_time_minutes: {{ESTIMATE}}

learnings:
  - pattern: "{{LEARNED_PATTERN}}"
    evidence: "{{VALIDATION}}"
    confidence: 0.7
  - technique: "{{TECHNIQUE}}"
    context: "{{WHEN_TO_USE}}"
    confidence: 0.6

approaches:
  successful:
    - approach: "{{WHAT_WORKED}}"
      evidence: "{{EVIDENCE}}"
      files: []
  attempted_but_failed:
    - approach: "{{WHAT_FAILED}}"
      reason: "{{WHY}}"
      files: []
  not_attempted:
    - approach: "{{NOT_TRIED}}"
      reason: "{{WHY_DEFERRED}}"
      priority: "high|medium|low"

context:
  current_work: []
  git_state: {}
  conversation_summary: []
  next_steps: []
  preserved_context: []
```

## Template: Continuation Handoff

**Use when:** User specifies a continuation action ("Handoff and {action}")

```yaml
handoff:
  timestamp: "{{TIMESTAMP}}"
  thread_id: "{{THREAD_ID}}"
  continuation_action: "{{EXTRACTED_ACTION}}"

session:
  id: "{{SESSION_ID}}"
  started: "{{SESSION_START}}"
  ended: "{{TIMESTAMP}}"
  duration_minutes: {{DURATION}}

metadata:
  confidence_score: 0.85
  context_quality: "high"
  missing_context: []

quick_start:
  project_types: ["javascript"]
  primary_type: "javascript"
  package_manager: "npm"
  verification_command: "test"
  files_to_read_first:
    - "src/auth/session.ts (45-89)"
  context_priority: "Token expiry logic in session-manager.ts"
  estimated_time_minutes: 45

learnings:
  - pattern: "JWT tokens expire after 15 minutes"
    evidence: "Confirmed in auth config"
    confidence: 0.9

approaches:
  successful:
    - approach: "Using JWT for authentication"
      evidence: "Tests pass, security review approved"
      files: ["src/auth/tokens.ts"]
  attempted_but_failed: []
  not_attempted:
    - approach: "OAuth2 integration"
      reason: "Deferred to sprint 2"
      priority: "medium"

context:
  current_work:
    - task: "{{CURRENT_TASK_DESCRIPTION}}"
      status: "{{STATUS}}"
      files: {{AFFECTED_FILES}}
    - task: "{{NEXT_TASK_DESCRIPTION}}"
      status: "pending"
      files: []

  git_state:
    branch: "{{GIT_BRANCH}}"
    staged: {{STAGED_FILES}}
    unstaged: {{UNSTAGED_FILES}}
    untracked: {{UNTRACKED_FILES}}

  conversation_summary:
    - phase: "{{PHASE_1}}"
      outcome: "{{PHASE_1_OUTCOME}}"
    - phase: "{{PHASE_2}}"
      outcome: "{{PHASE_2_OUTCOME}}"

  next_steps:
    - action: "{{CONTINUATION_ACTION}}"
      context: "{{CONTEXT_FOR_CONTINUATION}}"

  preserved_context:
    - "{{KEY_DECISION_1}}"
    - "{{KEY_DECISION_2}}"
    - "{{IMPORTANT_DETAIL_1}}"
```

## Template: Context-Only Handoff

**Use when:** User wants to preserve context without specifying action

```yaml
handoff:
  timestamp: "{{TIMESTAMP}}"
  thread_id: "{{THREAD_ID}}"
  continuation_action: null

session:
  id: "{{SESSION_ID}}"
  started: "{{SESSION_START}}"
  ended: "{{TIMESTAMP}}"
  duration_minutes: {{DURATION}}

metadata:
  confidence_score: 0.75
  context_quality: "medium"
  missing_context:
    - "No continuation action specified"

quick_start:
  project_types: ["javascript"]
  primary_type: "javascript"
  package_manager: "npm"
  verification_command: null
  files_to_read_first: []
  context_priority: null
  estimated_time_minutes: null

learnings: []

approaches:
  successful: []
  attempted_but_failed: []
  not_attempted: []

context:
  current_work:
    - task: "{{CURRENT_TASK}}"
      status: "{{STATUS}}"
      files: {{AFFECTED_FILES}}

  git_state:
    branch: "{{GIT_BRANCH_OR_NULL}}"
    staged: {{STAGED_FILES}}
    unstaged: {{UNSTAGED_FILES}}
    untracked: {{UNTRACKED_FILES}}

  conversation_summary:
    - phase: "{{PHASE}}"
      outcome: "{{OUTCOME}}"

  next_steps: []

  preserved_context:
    - "{{KEY_POINT_1}}"
    - "{{KEY_POINT_2}}"
    - "{{KEY_POINT_3}}"
```

## Template: Debugging Handoff

**Use when:** Handoff occurs during active debugging

```yaml
handoff:
  timestamp: "{{TIMESTAMP}}"
  thread_id: "{{THREAD_ID}}"
  continuation_action: "{{ACTION_OR_NULL}}"

session:
  id: "{{SESSION_ID}}"
  started: "{{SESSION_START}}"
  ended: "{{TIMESTAMP}}"
  duration_minutes: {{DURATION}}

metadata:
  confidence_score: 0.70
  context_quality: "medium"
  missing_context: []

quick_start:
  project_types: ["javascript"]
  primary_type: "javascript"
  package_manager: "npm"
  verification_command: null
  files_to_read_first:
    - "src/utils/parser.ts (120-145)"
  context_priority: "Focus on error handling in parseJSON function"
  estimated_time_minutes: 30

learnings:
  - technique: "Add debug logging before error-prone operations"
    context: "Helped identify race condition in async handler"
    confidence: 0.8
  - pattern: "Always validate input before parsing"
    evidence: "3 crashes traced to null input"
    confidence: 0.9

approaches:
  successful:
    - approach: "Added input validation"
      evidence: "Crashes reduced from 12/hour to 0"
      files: ["src/utils/parser.ts"]
  attempted_but_failed:
    - approach: "Adding try-catch wrapper"
      reason: "Masked the real error, made debugging harder"
      files: ["src/utils/parser.ts (abandoned)"]
  not_attempted:
    - approach: "Rewrite parser with formal grammar"
      reason: "Too complex for current timeline"
      priority: "low"

context:
  current_work:
    - task: "{{DEBUGGING_TASK}}"
      status: "in_progress"
      files: {{AFFECTED_FILES}}

  git_state:
    branch: "{{GIT_BRANCH}}"
    staged: {{STAGED_FILES}}
    unstaged: {{UNSTAGED_FILES}}
    untracked: {{UNTRACKED_FILES}}

  conversation_summary:
    - phase: "error discovery"
      outcome: "{{ERROR_SUMMARY}}"
    - phase: "hypothesis formation"
      outcome: "{{HYPOTHESIS}}"
    - phase: "investigation"
      outcome: "{{INVESTIGATION_PROGRESS}}"

  next_steps:
    {{IF_CONTINUATION_ACTION}}
    - action: "{{CONTINUATION_ACTION}}"
      context: "{{DEBUGGING_CONTEXT}}"
    {{END_IF}}

  preserved_context:
    - "{{ERROR_MESSAGE}}"
    - "{{STACK_TRACE_SUMMARY}}"
    - "{{HYPOTHESIS}}"
    - "{{FIX_ATTEMPTS}}"
    - "{{NEXT_INVESTIGATION_STEP}}"
```

## Template: Planning Handoff

**Use when:** Handoff occurs after planning phase

```yaml
handoff:
  timestamp: "{{TIMESTAMP}}"
  thread_id: "{{THREAD_ID}}"
  continuation_action: "{{ACTION_OR_NULL}}"

session:
  id: "{{SESSION_ID}}"
  started: "{{SESSION_START}}"
  ended: "{{TIMESTAMP}}"
  duration_minutes: {{DURATION}}

metadata:
  confidence_score: 0.90
  context_quality: "high"
  missing_context: []

quick_start:
  project_types: ["javascript"]
  primary_type: "javascript"
  package_manager: "npm"
  verification_command: "build"
  files_to_read_first:
    - "docs/plan-implementation.md"
    - "src/api/index.ts"
  context_priority: "Start with authentication endpoints"
  estimated_time_minutes: 120

learnings:
  - pattern: "API design should precede implementation"
    evidence: "Reduced rework by 40% in this project"
    confidence: 0.8

approaches:
  successful:
    - approach: "Using OpenAPI spec for API design"
      evidence: "Clear contract for frontend team"
      files: ["docs/api-spec.yaml"]
  attempted_but_failed: []
  not_attempted:
    - approach: "GraphQL implementation"
      reason: "Team lacks GraphQL experience"
      priority: "low"

context:
  current_work:
    - task: "{{PLANNING_TASK}}"
      status: "completed"
      files: {{PLAN_FILES}}
    - task: "{{IMPLEMENTATION_TASK}}"
      status: "pending"
      files: []

  git_state:
    branch: "{{GIT_BRANCH}}"
    staged: {{STAGED_FILES}}
    unstaged: {{UNSTAGED_FILES}}
    untracked: {{UNTRACKED_FILES}}

  conversation_summary:
    - phase: "planning"
      outcome: "{{PLAN_SUMMARY}}"
    - phase: "design review"
      outcome: "{{DECISIONS_MADE}}"

  next_steps:
    {{IF_CONTINUATION_ACTION}}
    - action: "{{CONTINUATION_ACTION}}"
      context: "{{IMPLEMENTATION_CONTEXT}}"
    {{END_IF}}

  preserved_context:
    - "{{ARCHITECTURE_DECISION_1}}"
    - "{{ARCHITECTURE_DECISION_2}}"
    - "{{PHASE_SUMMARY}}"
    - "{{PLAN_FILE_LOCATION}}"
```

## Template: No Git Repository

**Use when:** Working directory is not a git repository

```yaml
handoff:
  timestamp: "{{TIMESTAMP}}"
  thread_id: "{{THREAD_ID}}"
  continuation_action: "{{ACTION_OR_NULL}}"

session:
  id: "{{SESSION_ID}}"
  started: "{{SESSION_START}}"
  ended: "{{TIMESTAMP}}"
  duration_minutes: {{DURATION}}

metadata:
  confidence_score: 0.45
  context_quality: "low"
  missing_context:
    - "Not a git repository - no file change tracking"

quick_start:
  project_types: ["unknown"]
  primary_type: "unknown"
  package_manager: "npm"
  verification_command: null
  files_to_read_first: []
  context_priority: null
  estimated_time_minutes: null

learnings: []

approaches:
  successful: []
  attempted_but_failed: []
  not_attempted: []

context:
  current_work:
    - task: "{{CURRENT_TASK}}"
      status: "{{STATUS}}"
      files: {{WORKING_FILES}}

  # git_state omitted - not a git repository

  conversation_summary:
    - phase: "{{PHASE}}"
      outcome: "{{OUTCOME}}"

  next_steps:
    {{IF_CONTINUATION_ACTION}}
    - action: "{{CONTINUATION_ACTION}}"
      context: "{{CONTEXT}}"
    {{END_IF}}

  preserved_context:
    - "{{KEY_POINT_1}}"
    - "{{KEY_POINT_2}}"
```

## Template: Minimal Context

**Use when:** Conversation is new or has minimal history

```yaml
handoff:
  timestamp: "{{TIMESTAMP}}"
  thread_id: "{{THREAD_ID}}"
  continuation_action: "{{ACTION_OR_NULL}}"

session:
  id: "{{SESSION_ID}}"
  started: "{{SESSION_START}}"
  ended: "{{TIMESTAMP}}"
  duration_minutes: {{DURATION}}

metadata:
  confidence_score: 0.40
  context_quality: "low"
  missing_context:
    - "Minimal conversation history"
    - "No active work recorded"

quick_start:
  project_types: ["javascript"]
  primary_type: "javascript"
  package_manager: "npm"
  verification_command: null
  files_to_read_first: []
  context_priority: null
  estimated_time_minutes: null

learnings: []

approaches:
  successful: []
  attempted_but_failed: []
  not_attempted: []

context:
  current_work: []

  git_state:
    branch: "{{GIT_BRANCH_OR_NULL}}"
    staged: []
    unstaged: []
    untracked: []

  conversation_summary:
    - phase: "initial"
      outcome: "{{CURRENT_MESSAGE_SUMMARY}}"

  next_steps:
    {{IF_CONTINUATION_ACTION}}
    - action: "{{CONTINUATION_ACTION}}"
      context: "{{CONTEXT}}"
    {{END_IF}}

  preserved_context:
    - "{{WORKING_DIRECTORY}}"
    - "{{ANY_VISIBLE_STATE}}"
```

## Template Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{{TIMESTAMP}}` | ISO 8601 timestamp | `"2025-01-25T14:32:00Z"` |
| `{{THREAD_ID}}` | Current thread identifier | `"msg_ABC123"` |
| `{{SESSION_ID}}` | Unique session identifier | `"20260203-143022-a7b3c"` |
| `{{SESSION_START}}` | Session start time | `"2025-01-25T14:00:00Z"` |
| `{{DURATION}}` | Session duration in minutes | `45` |
| `{{CONFIDENCE_0.3_TO_0.95}}` | Quality/confidence score | `0.85` |
| `{{CONTINUATION_ACTION}}` | Extracted action or `null` | `"build an admin panel"` |
| `{{GIT_BRANCH}}` | Current git branch | `"feature/user-auth"` |
| `{{STAGED_FILES}}` | List of staged files | `["src/api/auth.ts"]` |
| `{{UNSTAGED_FILES}}` | List of unstaged files | `["src/test.ts"]` |
| `{{UNTRACKED_FILES}}` | List of untracked files | `["newfile.ts"]` |
| `{{STATUS}}` | Task status | `"pending"`, `"in_progress"`, `"completed"` |
| `{{PHASE}}` | Conversation phase | `"planning"`, `"implementation"`, `"debugging"` |
| `{{LEARNED_PATTERN}}` | Discovered pattern | `"Always validate input first"` |
| `{{TECHNIQUE}}` | Debugging technique | `"Add logging before error"` |
| `{{EVIDENCE}}` | Validation evidence | `"3 bugs traced to this"` |
| `{{WHAT_WORKED}}` | Successful approach | `"Using JWT for auth"` |
| `{{WHAT_FAILED}}` | Failed approach | `"Redis for sessions"` |
| `{{NOT_TRIED}}` | Unattempted approach | `"OAuth2 flow"` |

### Confidence Scale

| Score | Level | Meaning |
|-------|-------|---------|
| 0.3 | Tentative | Suggested but not enforced |
| 0.5 | Moderate | Applied when relevant |
| 0.7 | Strong | Auto-approved for application |
| 0.9 | Near-certain | Core behavior, verified |

## Selecting the Right Template

1. **Continuation specified** → Use "Continuation Handoff" template
2. **Context preservation only** → Use "Context-Only Handoff" template
3. **During debugging** → Use "Debugging Handoff" template
4. **After planning** → Use "Planning Handoff" template
5. **No git repo** → Use "No Git Repository" template
6. **New/minimal conversation** → Use "Minimal Context" template

## Output Format

All templates produce YAML output. When displaying to user:

```text
🔄 Handoff context ready

[YAML output here]

Start a new thread and include the above context to continue.
Copy the YAML output or reference the key points in preserved_context.
```

---

*Note: Templates are guidelines for structure. Actual output should adapt to the specific context and available information.*
