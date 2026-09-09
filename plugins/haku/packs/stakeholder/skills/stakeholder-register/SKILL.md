---
name: stakeholder-register
description: Use when the user wants to register a new stakeholder for ongoing reflection — manager, peer, direct report, or team. Triggers include "add a new stakeholder", "register Jill in managing-across", "I just got a new manager", "I'm now leading the X team", "let me set up reflection for [name]". Creates a persistent file at `~/haku-work-reflections/<category>/<slug>.md` used by `stakeholder-reflect`, `stakeholder-due`, and `stakeholder-synthesize`.
---

# Stakeholder Register

Register a stakeholder so the user can reflect on them over time. This skill is the entry point for the stakeholder-reflection bundle (`stakeholder-register`, `stakeholder-reflect`, `stakeholder-due`, `stakeholder-synthesize`).

## Data location

All stakeholder data lives at `$HAKU_WORK_REFLECTIONS_HOME` (default: `~/haku-work-reflections/`), **outside the public repo**.

```
~/haku-work-reflections/
├── stakeholders.json        # registry: who exists in which category
├── managing-up/<slug>.md
├── managing-across/<slug>.md
├── managing-down/<slug>.md
├── teams/<slug>.md
└── self/reflections.md      # owned by the self-reflect skill
```

## On first run

If `~/haku-work-reflections/` does not exist, create it silently — the full privacy ceremony belongs to `user-profile`, which is designed to run first. If for some reason `user-profile` wasn't run, issue a short notice before proceeding:
   > I'm creating `~/haku-work-reflections/` to store your stakeholder files. This directory stays on your local machine only. Set `$HAKU_WORK_REFLECTIONS_HOME` if you'd prefer a different location.

Whether or not the root existed already:

1. Create the category subdirectories if missing (`managing-up`, `managing-across`, `managing-down`, `teams`).
2. Initialize `stakeholders.json` as `{"version": 1, "stakeholders": []}` if it doesn't exist.
3. Ensure a `.gitignore` exists at the root containing `*`, and a `README.md` that says:
   > Private. Contains candid reflections about real people. Do not commit, share, or back up to public locations. Encrypt the parent disk if you can.

## Exit signals

If the user says "stop", "exit", "I'm done", "skip this", "pause", or similar — stop immediately. If a name and category were already captured, offer to save a minimal stub so they can continue later. Don't push for more answers.

In the opening message, add one short sentence: *"You can say 'stop' at any time and we'll save what we have."*

## The register flow

When invoked, walk the user through:

1. **Name.** Full name as the user thinks of them.
2. **Category.** One of: `managing-up`, `managing-across`, `managing-down`, `teams`. (For `self`, use the `self-reflect` skill — it's a separate flow.)
3. **Role.** One sentence. "VP Product, my skip-level." "iOS team lead, peer." "Senior eng on my team, joined Sep 2024." For teams: "Client delivery team, 6 people, primary contact Sarah."
4. **Anything worth capturing up front?** Optional. Communication style, known sensitivities, the broader relationship context, recent history. Keep it short — this is just seed context, not a full dossier. The reflection sessions will fill in the rest over time.
5. **Cadence preference.** Optional. Default frequencies are baked into each question (weekly/biweekly/monthly/quarterly/biyearly). If the user wants to override the default cadence for a stakeholder (e.g. weekly check-ins on a struggling report), capture that as a `cadence_overrides` block.

## File format

Slug the name: lowercase, hyphenated, no special chars. "John Adams" → `john-adams.md`. If a slug collision exists, append a number: `john-adams-2.md`.

```markdown
---
name: John Adams
slug: john-adams
category: managing-up
role: VP Product, my skip-level
since: 2026-05-01
cadence_overrides: {}
---

## Background

(Whatever the user offered in step 4. Plain prose. No headings inside.)

---

# Reflections

<!-- The stakeholder-reflect skill appends per-question entries below this line. -->
```

## Update the registry

Append to `~/haku-work-reflections/stakeholders.json`:

```json
{
  "version": 1,
  "stakeholders": [
    {
      "slug": "john-adams",
      "name": "John Adams",
      "category": "managing-up",
      "role": "VP Product, my skip-level",
      "registered": "2026-05-01"
    }
  ]
}
```

## Operating principles

- **Don't over-collect at register time.** The registration form is a doorway, not an interview. Three questions, maybe four. The depth comes from the reflection sessions, not the intake.
- **Confirm before writing.** Always show the user the file path and frontmatter you're about to create, and wait for a yes.
- **Suggest the next step.** When done, tell the user how to start reflecting: *"Try `let me reflect on John` or run `stakeholder-due` to see what's on your plate. To list, edit, re-categorize, or archive stakeholders later, just describe what you want — the `stakeholder-manage` skill handles the lifecycle."*
- **Privacy is non-negotiable.** Re-warn if you notice the user's `$HAKU_WORK_REFLECTIONS_HOME` is inside a git repo that isn't already gitignoring it.

## Anti-patterns to flag

- **User wants to register 10 stakeholders in one go.** Fine, but do them one at a time and confirm each. Bulk imports are how typos and miscategorizations sneak in.
- **User puts a peer in `managing-down` because they have informal influence.** Push back gently — the categories drive which questions get asked. Influence belongs in the role description; structural reporting drives the category.
- **User wants to register themselves.** Redirect to `self-reflect` — different file, different question set.
- **User wants to register an external stakeholder (a customer, a vendor).** The current question library is internal-org-shaped. Tell them they can still register, but acknowledge the reflection questions will fit imperfectly.
