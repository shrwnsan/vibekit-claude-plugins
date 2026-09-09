---
name: tech-strategy-writer
description: Use when a senior IC (staff/principal, architect, tech lead) writes a technical strategy or direction doc. Trigger phrases include "write a tech strategy for [domain]", "I need a technical direction doc", "our platform needs a north star doc", "help me write the tech vision for [area]". Distinct from strategy-doc (product/business peer) and the-rfc-reviewer (one proposal). Saves to strategy/tech-<area>.md.
---

# Tech Strategy Writer

A tech strategy is the document that lets twenty engineers make consistent decisions without asking you. It's also, not incidentally, the highest-leverage staff+ promotion artifact there is: direction-setting made legible. This skill interviews the user for the judgment they already have and structures it into a doc that survives contact with skeptics.

A strategy is not a roadmap (dates), not an RFC (one decision), and not a vision statement (adjectives). It is: **diagnosis → direction → first moves → what we're explicitly not doing.**

## Before drafting

- Read `~/haku-work-reflections/profile.md` (role, org context) and any `strategy/<area>.md` product strategy — a tech strategy that doesn't connect to the product strategy will read as a hobby. If a product strategy exists, mirror its vocabulary and cite the tracks it serves.
- Ask for whatever exists: past RFCs, architecture reviews, incident history, the migration graveyard. The diagnosis section is built from evidence the user already has.

## Interview, then draft

Work through five questions conversationally (don't send a questionnaire):

1. **Diagnosis.** What is true about the current system that everyone feels but nobody has written down? Push past symptoms ("deploys are slow") to structure ("every service shares one database, so every schema change is a cross-team negotiation"). The diagnosis is the part people will quote.
2. **The kernel of the direction.** In one sentence, what changes? ("We stop treating the pipeline as one system and split it along the batch/streaming seam.") If the user has three directions, they have zero — force the pick, park the others for the not-doing section.
3. **Why now.** What breaks, costs, or compounds if the org does nothing for two more years? Real numbers where they exist (incident counts, cycle time, spend).
4. **First moves.** The 2–4 concrete efforts that make the direction real in the next 6–12 months — each with a done-state and a natural owner-shape (team, not name). A strategy with no first move is a poster.
5. **Not doing.** The explicit anti-scope: attractive things this strategy deliberately declines, with one honest sentence each on why. This section does more to earn engineer trust than any other.

## Output format

```markdown
# Tech Strategy: [Domain] — [date]
owner: [user] · status: draft | socialized | adopted · review-by: [date ~6mo out]

## Diagnosis        — what's true today, with evidence
## Direction        — the kernel, one paragraph max
## Why now          — the cost of nothing
## First moves      — 2–4 efforts, done-states, owner-shapes
## Not doing        — declined options + why
## Risks            — top 2–3, with the early-warning signal for each
## How we'll know   — 3–5 observable indicators the direction is working
```

Target length: two pages. A strategy nobody finishes reading sets no direction. Save to `~/haku-work-reflections/strategy/tech-<area-slug>.md`.

## Pressure-test before socializing

Run these checks on the draft and push back where it fails:

- **The reversibility test:** could a reasonable senior engineer argue the opposite direction? If not, the "strategy" is a platitude ("we will improve reliability") — sharpen until it has a real alternative it beat.
- **The absent-author test:** could a mid-level engineer use this doc to decide a design question without asking the user? Pick a live design question and try it.
- **The diagnosis/direction seam:** does the direction actually follow from the diagnosis, or are they two documents stapled together?
- **The graveyard check:** if a previous migration in this domain died, does the doc say why this one won't die the same way? Everyone reading it is silently asking.

Then point to the socialization path: this doc wants pre-wiring with the skeptical principal and the affected leads *before* wide publication — `influence-without-authority` owns that motion, and `the-rfc-reviewer` gives it a cold read first.

## Anti-patterns

- **The stealth roadmap.** Quarter-by-quarter deliverables dressed as strategy. Dates belong to teams; the strategy owns direction.
- **The technology shopping list.** "Adopt Kafka, Kubernetes, and Rust" is not a direction; the problems those choices solve might be.
- **Consensus soup.** A strategy edited until nobody objects is a strategy that decides nothing. Objections belong in "not doing," addressed — not dissolved.
- **Write-only strategy.** Set the `review-by` date at save time; a strategy that's never revisited is just a well-formatted opinion from a previous era.

## Composition

- `strategy-doc` — the product-side peer; cross-reference rather than duplicate
- `the-rfc-reviewer` — cold review of the draft before it goes wide
- `influence-without-authority` — the socialization campaign
- `decision-log` — log the adoption decision (and its conditions) when leadership signs off
- `wins-log` — an adopted strategy is a career-defining win; capture it with evidence
