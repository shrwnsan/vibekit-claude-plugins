---
name: start
description: Use when the user is new to haku and doesn't know where to begin, or wants a tour of what's available. Triggers: "where do I start", "how do I use this", "what can you do", "what should I run first", "I just installed this", "what is haku". Entry point for new users; branches into first-time setup or direct routing.
---

# Start

Orient the user and guide them through first-time setup. Keep this fast — the goal is to get them doing real work, not to explain every feature.

## Opening

Greet the user with a short plain-English explanation of what haku is, then ask one branching question.

> *haku is a set of skills and agents for technical leaders — AI PMs, engineering managers, TPMs, and senior ICs. It runs a decide → spec → evidence loop: capturing decisions, pressure-testing specs, and checking what actually shipped.*
>
> *Are you just getting started and want to set things up, or are you looking for help with something specific right now?*

Don't list every skill upfront. One question, two paths.

## Path A: First-time setup

If the user is new or wants to set up:

### Step 1: Profile

> *The first thing worth doing is setting up your profile — a short "who you are" file that most skills read automatically, so you don't re-explain your role every session.*
>
> *About 5 minutes. Say "yes" and I'll hand you to the profile skill — or 'stop' at any time.*

If they agree, invoke `user-profile`. Wait for it to complete (or for the user to exit early) before continuing.

### Step 2: Your starter kit

Hand them a **starter kit**: five things for their role, with explicit permission to ignore everything else.

Frame it like this (adapting to their actual role):

> *haku has a compact core, and you only need five things to start. For your role, these are the five — ignore the rest for now; the right skill will surface on its own when a situation matches.*

| Role (from profile) | Starter kit |
|---|---|
| **AI Product Manager** | `the-reducer` (paste any "should we add AI?" ask into it) · `the-spec-writer` · `decision-log` · `wins-log` · `weekly` |
| **Engineering Manager** | `capture` · `decision-log` · `wins-log` · `the-rfc-reviewer` · `weekly` |
| **TPM / Program Manager** | `capture` · `decision-log` · `the-spec-writer` · `wins-log` · `weekly` |
| **Senior IC** | `wins-log` · `the-spec-writer` · `the-rfc-reviewer` · `decision-log` · `weekly` |

If the role straddles two personas, blend the pairs. If a pack is installed, swap in its most relevant item (e.g. people pack → `one-on-one-prep`; comms → `the-status-crafter`; engineering-ops → `the-program-manager`). If the role matches none, build the kit from what the profile says they actually spend time on.

Every kit ends with `weekly` — tell them why in one line: *"`weekly` is the 15-minute Friday ritual that keeps the rest of this compounding. It's the one habit worth forming."*

### Step 3: First decision captured

> *Last setup step — think of a recent decision (something you shipped, cut, or said no to) and log it. You'll have a live example of how the decision log compounds.*

If they agree, invoke `decision-log`. Optional — don't push if they decline.

### Step 4: Launch

Once setup is done (even partially), close with two concrete things to try, **drawn from their starter kit**:

> *You're set up. Two things to try this week:*
>
> *1. [First kit skill applied to something they mentioned — e.g. "Paste that feature request and I'll run it past the-reducer."]*
> *2. Book a 15-minute block Friday and run `/haku:weekly` — that's the whole maintenance habit.*
>
> *Or just describe what you're working on and I'll route you to the right skill.*

## Path B: Looking for something specific

If the user already knows what they want:

Ask them what they're working on. Don't give a full skill list — route based on their answer. Common entry points:

| What they say | Route to |
|---|---|
| Writing a spec, PRD, one-pager | `the-spec-writer` |
| Logging something I shipped | `wins-log` |
| Thinking through a decision | `decision-log` |
| Compressing a vague ask | `the-reducer` |
| Reviewing a design doc or RFC | `the-rfc-reviewer` |
| Running my weekly review | `weekly` |
| Attacking my spec before build | `the-red-teamer` |
| Feedback, 1:1s, coaching | people pack (`one-on-one-prep`, `feedback-frameworks`, `coaching-mode`) |
| Stakeholder reflections | stakeholder pack (`stakeholder-reflect`) |
| Team health or postmortems | team / engineering-ops packs |

If the route lands in an uninstalled pack, say so and point at `scripts/install.sh --pack <name>`. If nothing matches: *"Describe what you're trying to do and I'll find the right skill — or browse the full list with `/haku:` and tab-complete."*

## Operating principles

- **One thing at a time.** Route the user to one skill and let it do its job.
- **Don't pitch.** Skip phrases like "powerful", "comprehensive", "seamlessly". Just describe what things actually do.
- **Skip setup if they're not ready.** Profile and decision-capture are optional — if the user declines or seems impatient, move directly to Path B.
- **End with a next action, not a summary.** Close every response with something the user can immediately type or try.
