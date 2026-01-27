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
| `{{CONTINUATION_ACTION}}` | Extracted action or `null` | `"build an admin panel"` |
| `{{GIT_BRANCH}}` | Current git branch | `"feature/user-auth"` |
| `{{STAGED_FILES}}` | List of staged files | `["src/api/auth.ts"]` |
| `{{UNSTAGED_FILES}}` | List of unstaged files | `["src/test.ts"]` |
| `{{UNTRACKED_FILES}}` | List of untracked files | `["newfile.ts"]` |
| `{{STATUS}}` | Task status | `"pending"`, `"in_progress"`, `"completed"` |
| `{{PHASE}}` | Conversation phase | `"planning"`, `"implementation"`, `"debugging"` |

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
