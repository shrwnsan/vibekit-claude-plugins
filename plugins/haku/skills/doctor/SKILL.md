---
name: doctor
description: Use to health-check the user's haku memory directory — validate file layout, catch problems before they cost data. Triggers: "run haku doctor", "check my reflection files", "is my data okay", "back up my reflections", "I'm moving to a new machine". Validates ~/haku-work-reflections/ (or $HAKU_WORK_REFLECTIONS_HOME): registry integrity, orphaned files, layout drift, backup status, legacy bettersense-path migration. Read-only; proposes fixes, applies with approval.
---

# Doctor

Years of reflections, wins, and decision context live in one plaintext directory. This skill is the trust layer: it verifies the directory is healthy, catches drift early, confirms the install is intact, and makes sure a backup exists before it's needed.

**Read-only by default.** Run every check without modifying anything, present findings, then offer fixes one at a time. Never bulk-fix without approval. Never delete user content — quarantine (`.orphaned` suffix or move to `_attic/`) is the strongest action, and only with approval.

## Locate the data

Root is `$HAKU_WORK_REFLECTIONS_HOME` if set, else `~/haku-work-reflections/`. If it doesn't exist, that isn't an error — the user hasn't set up yet. Point to `start`. Don't create anything.

## The checks

Run all of them; report as a single table (✅ / ⚠️ / ❌ per check).

### 1. Registry integrity

`stakeholders.json` parses as JSON with `version` and a `stakeholders` array; every entry has `name`, `category`, slug; categories are `managing-up`/`managing-across`/`managing-down`/`teams`; no duplicate slugs. (Skip cleanly if the stakeholder pack isn't installed.) If corrupt: report the parse error and offer a rebuild by scanning category directories (frontmatter is authoritative), shown for approval; save the corrupt original as `stakeholders.json.bak` first.

### 2. Registry ↔ files consistency

Missing files (registry entry, no `.md`), orphaned files (`.md` with no registry entry — common after hand-editing), and category mismatches (frontmatter `category:` vs. directory). Offers: create a stub or remove the entry; re-register (preserves history) or quarantine; reconcile to the directory a due-scan would read.

### 3. Layout drift

Expected structure where content implies it: `profile.md`, `wins.md`, `strategy/`, `self/`, `pulses/<area>/` — absence is fine, *misplacement* is flagged (a pulse file at the root, a stakeholder file outside its category dir). Pulse files match the `pulse-YYYY-MM-DD.md` naming synthesis depends on; reflection dates are real (a `## 2026-13-40` heading breaks due-ness math).

### 4. Privacy posture

`.gitignore` exists in the root (created by `user-profile`); if missing, offer to write it (`*` + `!.gitignore`). Warn — don't block — if the root sits in a cloud-synced folder: legitimate as backup, but career-sensitive plaintext should be synced knowingly. Confirm the root `README.md` privacy note; offer to write it if missing.

### 5. Backup status

The check most likely to matter. Is the directory a git repo with a remote, and when did it last commit? If not: report size and age of the data ("214 entries across 9 files since 2026-01"), and offer a **snapshot** (`tar -czf ~/haku-backup-YYYY-MM-DD.tar.gz -C ~ haku-work-reflections`) or **versioning** (`git init` + first commit, noting any remote must be private — pushing sends the data to that host, the user's call). Flag a backup older than ~30 days of new entries.

### 6. Legacy bettersense paths

If `~/bettersense-work-reflections/` exists (the pre-rename data root), flag it: haku reads `$HAKU_WORK_REFLECTIONS_HOME` (default `~/haku-work-reflections/`), so old data is invisible to every skill until migrated. Offer, with approval: `mv ~/bettersense-work-reflections ~/haku-work-reflections` — or set `$HAKU_WORK_REFLECTIONS_HOME` to the existing path if the user prefers. Move, never copy-duplicate; if the new root already exists too, stop and ask rather than merge.

### 7. Plugin health (lean)

- **Core intact:** the 8 core skills and 5 gate agents are present in the install. A missing gate warns loudly — the decide → spec → evidence loop can't run without it.
- **Packs:** list detected packs (pack skills/agents present in the install). Flag a pack installed without its eval cases, or whose routing stopped being exercised.
- **Eval coverage:** if the plugin tree is reachable, run `node evals/routing/run-routing.mjs --dry-run` (plus `--pack <name>` per installed pack) and report failing labels. Note error categories with zero eval cases as blind spots.

## Output format

```
# haku doctor — YYYY-MM-DD

| Check | Status | Detail |
|---|---|---|
| Registry integrity | ✅ | 7 stakeholders, valid JSON |
| Registry ↔ files   | ⚠️ | 1 orphaned file: managing-down/alex-kim.md |
| Layout             | ✅ | |
| Privacy posture    | ✅ | .gitignore present; local-only path |
| Backup             | ❌ | No backup found; 214 entries at risk |
| Plugin health      | ✅ | core 8+5 intact; packs: people, evals |

## Proposed fixes (each needs your OK)
1. Re-register alex-kim.md (keeps all 12 entries)
2. Create tonight's snapshot: tar -czf ~/haku-backup-...
```

Then walk fixes one at a time. Suggest a cadence: *"Run me whenever something feels off, after hand-edits, or before a machine migration."*

## Anti-patterns

**Fixing silently** — every write is announced first; trust in this directory is the product. **Alarmism** — an empty directory or unused feature is not a warning; only flag what would lose data or break a skill. **Backup nagging beyond once** per run.

## Composition

`start` / `user-profile` — where to send a user with no data directory. `weekly` — a healthy directory is what makes the weekly ritual's scans trustworthy. Stakeholder lifecycle changes (archiving, renames) belong to the stakeholder pack's manage skill — don't guess at them here.
