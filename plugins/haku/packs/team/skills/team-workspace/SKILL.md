---
name: team-workspace
description: Set up or work with a git-backed team workspace for co-owned artifacts — charters, strategy docs, decision records — separate from private reflections. Triggers: "share our team charter with the team", "set up a shared haku workspace", "put our strategy doc in the team repo", "how do teams use haku together". Establishes `$HAKU_TEAM_HOME`; enforces the privacy wall; drafts PRs but never pushes.
---

# Team Workspace

haku is personal by default — the memory holds candid notes about real people. But some artifacts are collaborative: a **team charter**, a **strategy doc**, **decision records**. This skill lets a team share *those* through git and PRs while the private layer stays private.

State this boundary plainly, every time it matters:

> **The privacy wall.** Your reflections on people (stakeholder files), self-reflections, wins, career retros, and commitments **never go in the team workspace.** Only artifacts a team co-owns — charters, strategy, decisions — are shareable, and only when you explicitly move them.

## What is shareable vs. never-shared

| Shareable (team workspace) | Never shared (stays in `~/haku-work-reflections/`, always local) |
|---|---|
| `team-charters/<team>.md` | stakeholder files (`managing-*`, `teams/`) |
| `strategy/<area>.md`, `strategy/tech-<area>.md` | `self/reflections.md`, `self/retros/` |
| decision records the user explicitly promotes to shared ADRs | `wins.md`, `commitments.md` |
| | `pulses/` (may contain sensitive metrics — local by default; share a redacted summary manually if needed) |

This table is a hard allowlist. If the user asks to share anything in the right-hand column, **refuse and explain** — offer the legitimate alternative (e.g. "the *charter* can be shared; your private notes on the team cannot").

## The team workspace location

`$HAKU_TEAM_HOME` (suggest `~/haku-team/`), a **separate git repository** from the personal reflections directory — its own remote and access control, managed by the team on their git host. The distinct repo is what makes accidental leakage structurally hard.

Setup (Mode: `init`):
1. Create the directory and `git init` it (or point at an existing clone of the team's repo).
2. Scaffold `team-charters/`, `strategy/`, `decisions/`, and a `README.md` explaining what belongs here — and what must never be committed here.
3. Confirm the remote is one the team controls. The skill does **not** create repos, set permissions, or manage sharing settings.

## Sharing an artifact (Mode: `share`)

1. **Confirm it's on the allowlist.** If not, stop.
2. **Scan for leakage before copying.** Check for private content: names from `stakeholders.json`, quotes that read like a private reflection, individual performance commentary. Flag and ask before proceeding.
3. **Copy (don't move)** into the team workspace, preserving the original locally. Put it on a **branch**, never main.
4. **Draft the commit and PR description** — what's being shared and why.
5. **Stop at the push.** Show the user the exact `git push` / `gh pr create` commands and let *them* run it. If they explicitly ask you to run the push, confirm destination and content once more first.

## Working with shared artifacts (Mode: `sync` / `use`)

- Shared charters and strategy docs are read by the same skills that read the local ones (`the-spec-writer`, `metrics-design`, `team-check-in`, etc.). Point them at the team copy when that's the source of truth; keep private drafts local until ready.
- Changes go through branch → review → merge. haku drafts; the team's PR process decides.
- Never auto-pull-and-overwrite a local copy with unmerged changes — surface the divergence.

## Anti-patterns

- **The convenience leak.** "Just put everything in one repo." No — the two-repo separation is the whole design.
- **Silent publishing.** The skill prepares; the user publishes. Always.
- **Sharing pulses raw.** Metrics can be sensitive; share a deliberately redacted summary, not the file.
- **Managing access for them.** Never touch repo permissions, collaborator lists, or sharing settings.

## Composition

- Shares the outputs of: `team-charter`, `strategy-doc`, `tech-strategy-writer`, `decision-log`
- Hard boundary against: `stakeholder-reflect`, `self-reflect`, `wins-log`, `career-retro`, `commitments` — never shared
- `doctor` validates the personal directory; this skill validates nothing personal crossed into the team one
- See the site's *Your data* page for the full privacy model
