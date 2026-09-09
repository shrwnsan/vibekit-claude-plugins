---
name: stakeholder-manage
description: Use when changing a registered stakeholder — list, edit role/background, re-categorize, rename, archive, or delete. Triggers include "list my stakeholders", "show all my reports", "Jill is my manager now", "move Jill to managing-up", "Draymond left the company", "archive [name]", "Jill changed her name to [...]", "update [name]'s role", "delete [name] — registered by mistake". Distinct from `stakeholder-register` (add).
---

# Stakeholder Manage

Stakeholder lifecycle. `stakeholder-register` handles *add*; this handles everything after.

Data lives at `~/haku-work-reflections/` (configurable via `$HAKU_WORK_REFLECTIONS_HOME`): `stakeholders.json` (active + archived), `<category>/<slug>.md` under `managing-up/`, `managing-across/`, `managing-down/`, `teams/`, and `archive/<category>/<slug>.md` (created on first archive).

## Sub-modes (route by intent)

| Trigger phrasing | Mode |
|---|---|
| *"list my stakeholders"*, *"who's in managing-across"* | **list** |
| *"update X's role to Y"*, *"change X's cadence"* | **edit** |
| *"X is my manager now"*, *"X became a peer"* | **re-categorize** |
| *"X changed her name to Y"*, *"X goes by Y now"* | **rename** |
| *"X left the company"*, *"X moved to a different org"* | **archive** |
| *"delete X — registered by mistake"*, *"remove X permanently"* | **delete** |

Ambiguous phrasing (*"remove Jill"* — archive or delete?) → **ask**. Default toward archive: reversible; delete isn't.

## Mode: list

Read `stakeholders.json`; show active stakeholders grouped by category, with last-reflection dates.

```
Active stakeholders (8)

Managing up (1):
  • John Adams — VP Product, my skip-level    last reflected: 2026-04-22 (10 days ago)

Archived (3 — say "show archived" to list)
```

Flag 14+ day reflection gaps with ⚠ — surface, don't moralize. "Show archived" lists `archived` date and reason.

## Mode: edit

In-place changes; no file move. Editable: `role` and `cadence_overrides` (frontmatter), `## Background`. (Name and category have their own modes.)

Flow: confirm stakeholder → show current value → show proposed value → wait for confirmation → write. Append an audit log line; update the registry if mirrored there (`role`).

## Mode: re-categorize

For reorgs, role changes, relationship shifts — the most consequential operation.

Flow:
1. Confirm stakeholder + new category.
2. Tell the user what will happen (file moves folder, history preserved, question pool shifts, audit note). Capture a one-sentence reason.
3. Move the file; update frontmatter `category`; update `stakeholders.json`; append audit entry.

**Critical:** preserve all history — the entries are *more* useful in the new relationship. Slug stays the same.

## Mode: rename

Flow: confirm new name → decide slug (default re-slugify; ask if they prefer the old slug) → show what changes (filename, frontmatter `name`, frontmatter `slug`, registry entry) → confirm → apply → audit entry (*"Renamed Jill Smith to Jill Brown. Reason: marriage."*). Keeping the old slug is fine for stability.

## Mode: archive

## Mode: archive

Triggered when someone leaves the company or stops being an active stakeholder.

Flow:
1. Confirm archive vs delete: archive preserves file and history but active skills stop surfacing them; delete removes everything permanently.
2. Capture a one-sentence reason ("Left for [new company]").
3. Move `<category>/<slug>.md` → `archive/<original-category>/<slug>.md`.
4. Update `stakeholders.json`: move the entry to `archived[]` with `archived` date + `reason`.
5. Append audit entry: *"2026-05-02 — Archived. Reason: left for Stripe."*

Unarchive: reverse, add an audit line.

## Mode: delete

Friction-y by design; most requests should be archive.

Flow:
1. Recommend archive first (file path, entry count, no undo).
2. If confirmed, ask the reason (mistake / privacy / etc.).
3. **Two-step confirmation** — type the stakeholder's name.
4. Remove file and registry entry entirely.

Post-delete: no audit trail; note `last_delete: {date, slug, reason}` in the registry's top-level audit field.

## The audit log section

Each file carries `## Audit log` between `## Background` and `# Reflections`, created on the first audit event. Only relationship/identity changes get log lines:

```markdown
## Audit log
- 2026-05-02 — Re-categorized from managing-across to managing-up. Reason: reorg, John became my skip-level.
```

Entries are append-only; `# Reflections` is untouched by management operations.

## Registry shape (`stakeholders.json`)

```json
{
  "version": 1,
  "stakeholders": [
    { "slug": "john-adams", "name": "John Adams", "category": "managing-up",
      "role": "VP Product, my skip-level", "registered": "2024-09-01" }
  ],
  "archived": [
    { "slug": "draymond-young", "name": "Draymond Young", "category": "managing-down",
      "registered": "2024-03-15", "archived": "2026-05-02", "reason": "Left for Stripe" }
  ]
}
```

`archived[]` is optional.

## Operating principles

- **Confirm before writing.** Every operation shows the change and waits for a yes.
- **Default toward reversibility.** Archive over delete; keep slug over change slug.
- **Preserve history aggressively.** Re-categorize never starts over; archive never deletes.
- **One operation per invocation.** Combined changes run sequentially.
- **Surface neglect, don't moralize.**
- **Detect drift.** If `stakeholders.json` lists Jill but `managing-across/jill-smith.md` doesn't exist (or vice versa), surface and offer repair.

## Anti-patterns to flag

- **Re-categorize as "delete and re-add."** The history is the asset.
- **Bulk re-categorization on a reorg.** Each move needs its own reason.
- **Archive when the relationship got rocky.** Maybe the harder reflection is the point.
- **Delete to "clean up."**

## Composition with other skills

- **`stakeholder-register`** owns add; it can point here for lifecycle changes.
- **`stakeholder-due` / `stakeholder-reflect` / `stakeholder-synthesize`** read active state — new categories apply automatically; archived people stop surfacing (unless synthesizing over `archive/`).
- **`feedback-frameworks`** — on a hard departure, offer a final feedback draft.
- **`decision-log`** — lifecycle decisions can be logged as ADRs.
