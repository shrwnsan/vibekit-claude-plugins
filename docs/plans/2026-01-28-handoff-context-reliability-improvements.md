# Handoff Context Reliability Improvements

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve handoff-context skill documentation to emphasize slash command reliability and add failure scenario testing.

**Architecture:** Update SKILL.md with reliability table, wrong vs right examples, and stronger MUST language. Add eval-negative-cases.json for failure scenario validation.

**Tech Stack:** Markdown documentation, JSON evaluation files

**Reference:** See `docs/eval-020-handoff-context-invocation-methods.md` for detailed analysis and recommendations.

---

## Task 1: Add Reliability Comparison Section to SKILL.md

**Files:**
- Modify: `plugins/base/skills/handoff-context/SKILL.md:26-40`

**Step 1: Add reliability comparison table after Quick Start section**

Insert after line 39 (after the natural language note):

```markdown
## Invocation Method Reliability

| Method | Reliability | Output |
|--------|-------------|--------|
| `/handoff-context` | ✅ 100% | YAML file + structured display |
| "Let's handoff" | ⚠️ Variable | May produce text-only or .txt file |

**Recommendation:** Use `/handoff-context` for consistent cross-agent behavior.
```

**Step 2: Verify change renders correctly**

Run: `cat plugins/base/skills/handoff-context/SKILL.md | head -60`
Expected: Table appears after Quick Start section

**Step 3: Commit**

```bash
git add plugins/base/skills/handoff-context/SKILL.md
git commit -m "docs(handoff): add invocation method reliability comparison table"
```

---

## Task 2: Add Anti-Patterns Section to examples.md

**Files:**
- Modify: `plugins/base/skills/handoff-context/references/examples.md` (append after Pattern Recognition Summary)

**Step 1: Append anti-patterns section**

Add to the end of `references/examples.md`:

```markdown
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

See Examples 1-7 above for correct YAML structure and user display format.
```

**Step 2: Verify section was added**

Run: `grep -A 5 "Anti-Patterns" plugins/base/skills/handoff-context/references/examples.md`
Expected: Section header and first anti-pattern visible

**Step 3: Commit**

```bash
git add plugins/base/skills/handoff-context/references/examples.md
git commit -m "docs(handoff): add anti-patterns section to examples.md"
```

---

## Task 3: Strengthen MUST Language in Workflow Section

**Files:**
- Modify: `plugins/base/skills/handoff-context/SKILL.md:41-61`

**Step 1: Replace "you must" with explicit MUST requirements**

Change lines 41-60 from current wording to:

```markdown
## Workflow Requirements

**When this skill is triggered, you MUST follow these steps exactly:**

1. **Execute the script first** (REQUIRED - do not skip):
```bash
bash $(find ~/.claude/plugins -name "capture-context.sh" 2>/dev/null | head -1)
```

2. **Capture the HANDOFF_FILE path** from script output (format: `HANDOFF_FILE=/tmp/...`)

3. **Read that file** and populate conversation context:
   - Current work (tasks, status, affected files)
   - Conversation summary (phases, outcomes, decisions)
   - Next steps (continuation action context)
   - Preserved context (key details to remember)

4. **Overwrite the same file** with complete context

5. **Display summary** to user with file path

⚠️ **CRITICAL REQUIREMENTS:**
- ✅ MUST create .yaml file (not .txt)
- ✅ MUST use YAML format in file (not Markdown)
- ✅ MUST execute script (not bypass with manual commands)
- ✅ MUST display file path with continuation instruction
```

**Step 2: Verify MUST language is present**

Run: `grep -c "MUST" plugins/base/skills/handoff-context/SKILL.md`
Expected: At least 5 occurrences

**Step 3: Commit**

```bash
git add plugins/base/skills/handoff-context/SKILL.md
git commit -m "docs(handoff): strengthen MUST language in workflow requirements"
```

---

## Task 4: Add Success Criteria Checklist

**Files:**
- Modify: `plugins/base/skills/handoff-context/SKILL.md` (insert after workflow section)

**Step 1: Add verification checklist**

Insert after the workflow requirements:

```markdown
## Success Criteria

Before completing handoff, verify:

- [ ] Script was executed (find + bash, not manual commands)
- [ ] File has .yaml extension (not .txt)
- [ ] File contains valid YAML structure (not Markdown with ##)
- [ ] File path is shown to user
- [ ] Continuation instruction includes exact file path
- [ ] Human-readable summary displayed alongside file

**If any criteria fails:** Re-invoke with `/handoff-context` slash command.
```

**Step 2: Verify checklist exists**

Run: `grep -A 10 "Success Criteria" plugins/base/skills/handoff-context/SKILL.md`
Expected: Checklist with 6 items visible

**Step 3: Commit**

```bash
git add plugins/base/skills/handoff-context/SKILL.md
git commit -m "docs(handoff): add success criteria checklist"
```

---

## Task 5: Create Negative Test Cases Evaluation File

**Files:**
- Create: `plugins/base/skills/handoff-context/assets/eval-negative-cases.json`

**Step 1: Create the evaluation file**

```json
{
  "test_name": "Negative Test Cases - Handoff Context",
  "description": "Failure scenarios that should be detected and remediated",
  "failure_scenarios": [
    {
      "scenario": "text_only_display",
      "description": "Agent displays summary but creates no file",
      "trigger": "Natural language 'Let's handoff' without skill loading",
      "detection": "Check for file existence in /tmp/handoff-*",
      "expected_behavior": "YAML file should be created",
      "remediation": "Re-invoke with /handoff-context slash command",
      "severity": "critical"
    },
    {
      "scenario": "wrong_file_extension",
      "description": "Agent creates .txt instead of .yaml",
      "trigger": "Agent improvises file creation without following script",
      "detection": "Check file extension matches .yaml",
      "expected_behavior": "File must have .yaml extension",
      "remediation": "Delete .txt file, re-invoke skill",
      "severity": "high"
    },
    {
      "scenario": "markdown_in_yaml_file",
      "description": "File contains ## headings instead of YAML structure",
      "trigger": "Agent uses Markdown formatting in handoff file",
      "detection": "Parse YAML, validate structure has handoff: and context: keys",
      "expected_behavior": "Valid YAML with proper keys",
      "remediation": "Overwrite with correct YAML format",
      "severity": "high"
    },
    {
      "scenario": "script_bypassed",
      "description": "No bash script execution in tool calls",
      "trigger": "Agent skips capture-context.sh and creates file manually",
      "detection": "Check for capture-context.sh execution in tool calls",
      "expected_behavior": "Script must be executed first",
      "remediation": "Explicitly request script execution",
      "severity": "medium"
    },
    {
      "scenario": "missing_file_path_display",
      "description": "File created but path not shown to user",
      "trigger": "Agent writes file but omits path from output",
      "detection": "Check output contains '/tmp/handoff-' path",
      "expected_behavior": "File path must be displayed",
      "remediation": "Display file path with continuation instruction",
      "severity": "medium"
    },
    {
      "scenario": "missing_continuation_instruction",
      "description": "File path shown but no 'Continue from' instruction",
      "trigger": "Agent shows path but omits usage instructions",
      "detection": "Check output contains 'Continue from' or similar",
      "expected_behavior": "Must include continuation instruction",
      "remediation": "Add 'To continue: Continue from [path]' instruction",
      "severity": "low"
    }
  ],
  "validation_commands": [
    {
      "check": "file_exists",
      "command": "ls /tmp/handoff-*/handoff-*.yaml 2>/dev/null | head -1"
    },
    {
      "check": "yaml_valid",
      "command": "python3 -c \"import yaml; yaml.safe_load(open('FILE'))\" 2>&1"
    },
    {
      "check": "has_required_keys",
      "command": "grep -E '^(handoff|context):' FILE"
    }
  ]
}
```

**Step 2: Validate JSON syntax**

Run: `python3 -m json.tool plugins/base/skills/handoff-context/assets/eval-negative-cases.json > /dev/null && echo "Valid JSON"`
Expected: "Valid JSON"

**Step 3: Commit**

```bash
git add plugins/base/skills/handoff-context/assets/eval-negative-cases.json
git commit -m "test(handoff): add negative test cases for failure scenario validation"
```

---

## Task 6: Update SKILL.md Evaluations Section

**Files:**
- Modify: `plugins/base/skills/handoff-context/SKILL.md:114-122`

**Step 1: Add reference to negative cases evaluation**

Update the Evaluations section:

```markdown
## Evaluations

Test files for validating skill behavior:
- [assets/eval-continuation.json](assets/eval-continuation.json)
- [assets/eval-context-preservation.json](assets/eval-context-preservation.json)
- [assets/eval-targeted-handoff.json](assets/eval-targeted-handoff.json)
- [assets/eval-non-git-repo.json](assets/eval-non-git-repo.json)
- [assets/eval-negative-cases.json](assets/eval-negative-cases.json) - Failure scenario detection

Run evaluations to verify pattern detection, YAML generation, and failure handling.
```

**Step 2: Verify link is correct**

Run: `ls plugins/base/skills/handoff-context/assets/eval-negative-cases.json`
Expected: File exists

**Step 3: Commit**

```bash
git add plugins/base/skills/handoff-context/SKILL.md
git commit -m "docs(handoff): add eval-negative-cases.json to evaluations section"
```

---

## Task 7: Final Review and Squash Commit (Optional)

**Files:**
- Review: `plugins/base/skills/handoff-context/SKILL.md`
- Review: `plugins/base/skills/handoff-context/assets/eval-negative-cases.json`

**Step 1: Review all changes**

Run: `git diff HEAD~6 -- plugins/base/skills/handoff-context/`
Expected: All 6 commits visible in diff

**Step 2: Run validation**

```bash
# Check SKILL.md structure
grep -E "^##" plugins/base/skills/handoff-context/SKILL.md

# Validate all JSON files
for f in plugins/base/skills/handoff-context/assets/*.json; do
  python3 -m json.tool "$f" > /dev/null && echo "✓ $f" || echo "✗ $f"
done
```
Expected: All sections present, all JSON valid

**Step 3: Optional squash commit**

```bash
# If squashing is preferred:
git reset --soft HEAD~6
git commit -m "docs(handoff): improve reliability documentation and add failure tests

- Add invocation method reliability comparison table
- Add wrong vs right output examples
- Strengthen MUST language in workflow requirements
- Add success criteria checklist
- Add eval-negative-cases.json for failure scenario validation
- Update evaluations section with new test file

Addresses findings from eval-020-handoff-context-invocation-methods analysis."
```

---

## Summary

| Task | Description | File | Commit |
|------|-------------|------|--------|
| 1 | Add reliability comparison table | SKILL.md | `docs(handoff): add invocation method reliability comparison table` |
| 2 | Add anti-patterns section | references/examples.md | `docs(handoff): add anti-patterns section to examples.md` |
| 3 | Strengthen MUST language | SKILL.md | `docs(handoff): strengthen MUST language in workflow requirements` |
| 4 | Add success criteria checklist | SKILL.md | `docs(handoff): add success criteria checklist` |
| 5 | Create eval-negative-cases.json | assets/ | `test(handoff): add negative test cases for failure scenario validation` |
| 6 | Update evaluations section | SKILL.md | `docs(handoff): add eval-negative-cases.json to evaluations section` |
| 7 | Final review (optional squash) | All | Combined commit if preferred |

**Total estimated time:** 20-30 minutes
