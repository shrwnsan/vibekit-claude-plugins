---
description: Review app architecture: components, data flows, risks, and prioritized improvements
argument-hint: [optional focus, e.g. "backend" | "frontend" | "auth" | "performance"]
---

Goal: Build a deep, end-to-end understanding of this app and its architecture, then produce an actionable architecture review.

Context constraints
- Use only what you see in the code and what I explicitly tell you; if unclear, ask instead of guessing.
- Prefer architecture/runtime/data-flow insights over nitpicks.
- Keep the response under ~700 words unless I ask for a deeper dive.

1. Analysis focus
- Identify major components, responsibilities, and dependencies.
- Map key data flows for core user journeys or background jobs.
- Note risks/smells (security, performance, reliability, DX).

2. Deliverables
- 5–10 bullet high-level architecture summary.
- Step-by-step primary flow(s).
- Top improvement opportunities (prioritized) with 1-line rationale each.

3. Visual diagrams (optional, post-analysis)
After delivering the initial review, ask: "Would you like me to generate state machine diagrams for the key components? This helps verify complete path coverage and reveals edge cases."

If yes, create diagrams in TWO formats:

**Terminal format** (compact ASCII, for immediate viewing):
- Section headers for grouping (Main Flow, Error Handling, Concurrent Operations)
- State labels in brackets: ①[StateName]
- Clear entry/exit markers: START, EXIT
- Explicit loop markers: "→ back to ①" or "→ retry"
- Box-drawing for hierarchies: ├─, │, └─
- Keep compact and readable in terminal width

**Markdown format** (for file output with rendering):
- Mermaid diagram syntax: ```mermaid ... ```
- Use stateDiagram-v2 for state machines
- Use flowchart TD for data flows and process flows
- Include descriptive labels and proper transitions
- Full documentation with diagram descriptions

After generating terminal format, ask: "Should I write this to a file as Markdown with Mermaid diagrams? (Recommended for GitHub/IDE rendering)"

4. Guardrails
- Do not invent services/APIs/infra not present; mark unknown and ask.
- No speculative metrics; keep it qualitative unless concrete data exists.
- Don't paste large code blocks unless asked.
- **File exclusion**: NEVER read system files (.DS_Store, Thumbs.db, desktop.ini, *.swp, *~, etc.) or editor configs (.idea/, .vscode/, *.sublime-*)
- **Security exclusion**: NEVER read or display contents of secrets files (.env, .env.*, *.key, *.pem, credentials.json, .aws/credentials, etc.)
- **Sensitive data**: If you encounter API keys, tokens, or secrets in code, report their presence generically without exposing values

5. End pattern
- End with a section titled “Next, I recommend we…” and list 2–3 concrete next steps.

Optional focus: $ARGUMENTS
