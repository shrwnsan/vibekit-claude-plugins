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
If yes, create ASCII/text-based diagrams showing:
- Component interaction states and transitions
- Request/response lifecycles
- Error handling paths
- Concurrent operation flows

Use these diagram formats:
- **Tree structures**: Box-drawing characters (├─, │, └─) for hierarchies
- **State transitions**: Numbered states with labeled arrows (e.g., "① → ②: validate")
- **Loops/cycles**: Explicit "→ back to ①" or "→ retry" markers
- **Parallel flows**: Separate branches showing concurrent operations

Keep diagrams compact and readable in terminal output.

4. Guardrails
- Do not invent services/APIs/infra not present; mark unknown and ask.
- No speculative metrics; keep it qualitative unless concrete data exists.
- Don't paste large code blocks unless asked.
- **Security exclusion**: NEVER read or display contents of secrets files (.env, .env.*, *.key, *.pem, credentials.json, .aws/credentials, etc.)
- **Sensitive data**: If you encounter API keys, tokens, or secrets in code, report their presence generically without exposing values

5. End pattern
- End with a section titled “Next, I recommend we…” and list 2–3 concrete next steps.

Optional focus: $ARGUMENTS
