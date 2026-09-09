---
name: team-style-inventory
description: Use when a team wants to understand their collective working style preferences — communication, decisions, conflict, meetings, information sharing. Triggers: "team work style assessment", "how does our team prefer to work together", "team style inventory", "understand our team dynamics", "communication preferences survey". From Moussa's "how you talk to each other" insight; produces a Team Style Profile and norm adjustments.
---

# Team Style Inventory

Help a team surface, discuss, and align on collective **working style preferences** — how they communicate, decide, handle conflict, structure work. Named for Moussa's 3X3 insight that *"how you talk to each other"* is essential.

**Problem:** teams assume everyone shares a style; sync vs. async communicators collide: *"Why doesn't Alice just Slack me?" / "Why does Bob schedule a meeting for everything?"*

**Solution:** make preferences explicit, discuss trade-offs, adjust norms. Output: a **Team Style Profile** — a shared reference for how the team operates and where variation is accommodated.

## When to apply

Trigger when: a new team is forming; friction reported (*"Our meetings are terrible"*); new members from different cultures; communication frustration (meeting overload, Slack anxiety); hidden style conflict suspected; before `team-charter` to ground the norms conversation.

Skip when: a well-functioning documented norm set exists; the team is in crisis; the user wants a generic personality test (this is *team* style, not MBTI).

## The inventory categories

Five style dimensions. For each, the team discusses:
1. **What do we naturally prefer?** (gathered privately first)
2. **What have we implicitly agreed?** (de facto norms)
3. **What do we want to codify?** (explicit norms)

### 1. Communication style
Sync vs. async; response-time expectations; written vs. verbal; channel selection; meeting pre-work.

### 2. Decision-making style
Consensus (slow, high buy-in) vs. consultative vs. directive (fast, low buy-in); escalation threshold; how disagreements resolve; decision documentation.

### 3. Conflict style
Comfort with disagreement; idea-focused vs. person-focused; public vs. private pushback; resolution mechanism (who declares closure?).

### 4. Meeting style
Necessity bar (async possible?); timeboxed vs. free-flowing; participation; attendance; camera policy; facilitation.

### 5. Work styles
Focus-time protection; core hours / weekend silence; workload visibility; learning mode.

## The inventory process (60–90 min session)

### Phase 1: Individual preferences (15 min, async or silent)
Each member privately answers per dimension: *"My natural preference is..."*

Example:
```
Communication: prefer async written (Slack/docs), 24h for non-urgent.
Decisions: consultative — give me context, then I'm okay if you decide.
Work style: need 2–3 hour focus blocks; "office hours" for interruptions.
```

### Phase 2: Team current state (20 min)
Round-robin: "What is our actual current style, not what we wish?" "What's working?" "What's painful?" Record under each dimension.

### Phase 3: Desired team style (20 min)
For each dimension where current ≠ ideal: *"What should our team norm be?"*
Rules: agree on a *default*, not consensus — individuals can opt out with notice; accommodate variation ("we default to async, but anyone can request a quick sync"); document exceptions ("Bob prefers calls for complex topics").

Result: **Team Style Statement** — a 1–2 sentence norm per dimension. Example:
- Communication: *"Async Slack default, 24h response. Urgent = ASAP, 2h. Real-time → 15-min sync."*

### Phase 4: Action items (10 min)
"What will we change tomorrow?" Usually 1–2 concrete changes: update channel descriptions, change meeting templates, set focus-time blocks.

## Output: Team Style Profile

`~/haku-work-reflections/team-charters/<team-slug>-style.md` (or appended to the charter)

```markdown
# [Team] — Working Style Profile

## Individual preferences (summary)
- Alice: async written, consultative decisions, comfortable with idea conflict
- Bob: synchronous calls, consensus decisions, conflict-averse

## Agreed team norms
### Communication
Async Slack default (24h). Urgent = ASAP (2h). Complex = 15-min call.

### Decisions
DLI consults on scope changes > 2 weeks; decides alone on tactics. Logged in #decisions.

### Conflict
Debate ideas in meetings; personal feedback 1:1 only.

### Meetings
Agenda 24h in advance; decisions recorded; timeboxed to 50 min.

### Work style
Focus blocks 10–12 and 2–4 meeting-free; daily async status updates.

## Exceptions & accommodations
- Bob takes calls for complex topics; Carol works EST, others PST — async primary

## Review cadence
Review during team check-ins.
```

## Operating principles

- **Preference ≠ capacity** — team norms may override individual preference.
- **Name mismatches** — "Alice says conflict is fine but visibly shuts down."
- **Keep it behavioral** — "we're collaborative" means what, in meetings and docs?
- **Make exceptions explicit** — healthy, not hypocrisy.
- **Revisit regularly** — style drifts with composition; check during `team-check-in`.
- **Psychological safety prerequisite** — if people can't safely name preferences, use `psychological-safety` first.

## Composition with other skills

- **`team-charter`** — this is the detailed input for the Norms section
- **`team-check-in`** — the profile is the baseline; "are our agreed norms still working?"
- **`psychological-safety`** — prerequisite if candor is lacking
- **`read-the-room`** — after the session, read subtext ("Alice agreed but seemed unhappy")
- **`coaching-mode`** — if the lead must coach someone whose style clashes with norms

## Anti-patterns to flag

- **Confusing style with competence** — "conflict-averse" doesn't mean "weak."
- **Imposing majority preference** — minority styles need accommodation, not suppression.
- **One-time exercise** — revisit quarterly or after personnel changes.
- **Ignoring hybrid/remote complexity** — remote teams need *more* explicit norms.
- **Treating as personality test** — these are team agreements, not fixed traits.
- **No exceptions** — rigid norms create resentment.
