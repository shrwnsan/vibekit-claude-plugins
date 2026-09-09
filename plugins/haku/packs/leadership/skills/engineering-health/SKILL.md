---
name: engineering-health
description: Use when an EM wants to assess engineering systems and processes—not team morale (that's team-diagnosis): measurement, developer experience, onboarding friction, and platform investment. Trigger phrases include "is my team actually productive", "I want to understand developer experience on my team", "how do I measure engineering productivity", "I need to justify platform team investment", "our onboarding is too slow".
---

# Engineering Health

`team-diagnosis` reads the people/culture layer; this skill reads the **engineering systems layer**—tooling, processes, infrastructure.

## The core principle: constellation, not solo metrics

Grabbing what's easy to count—PRs, commits, lines of code—is a mistake: any single activity metric misleads. Senior engineers often have low PR output by design, so optimizing for PR count punishes leverage work. People optimize for whatever is measured—damaging if it's the wrong thing.

Use a **constellation**: at least three signal categories together.

---

## The SPACE diagnostic

Get at least three of these five:

**S — Satisfaction**: Ask directly about tool friction and impossible processes—answers surface problems dashboards miss, especially at handoffs.

**P — Performance (outcomes)**: Build stability, deployment success, security outcomes, incident rate. What the system produces, not how busy it is.

**A — Activity**: PRs, commits, deployments. Useful in context; senior-heavy teams have lower counts doing equivalent work.

**C — Communication and collaboration**: Meeting load, API reliability, PR review time, whether information reaches who needs it.

**E — Efficiency and flow**: Build time, review wait, pipeline duration, environment provisioning. DORA's four metrics (deployment frequency, lead time, change failure rate, time to restore) are a validated instance for commit-to-production.

---

## Onboarding time as a leading indicator

Time to first meaningful commit is a reliable signal of system navigability. A long ramp is a systems problem, not a people problem.

**What good looks like:** A trivial-but-real PR (fix a title, add a test) in the first two weeks—Microsoft research found early PRs raise yearly productivity 30–50%, because the developer traverses the system end-to-end.

**The internal transfer test:** If moving teams internally takes as long as starting fresh, tooling/docs/context aren't portable. Investigate.

**What slow onboarding surfaces:**
- Docs that can't be found or live in tribal knowledge
- Manual, undocumented dev-environment setup
- Access provisioning bottlenecked on approval chains
- No "day one task" forcing full-system traversal

---

## Developer experience friction

Friction lives at system boundaries—handoffs that look automated but aren't—and dashboards miss it.

**How to surface it:** Ask directly: *"What's the most annoying thing about getting work done right now?"* A developer's lived experience is data ("honor their reality").

**Common patterns:**
- Access approval bottlenecks
- Systems needing manual coordination at every handoff
- Tooling fast for reporting but slow for developers
- Context-switching from broken systems, not choice

---

## Operational readiness testing

Knowing a system handles load differs from knowing the team can operate it under load.

**Game day simulation:** Run a synthetic peak-load event but withhold dashboards from on-call teams—they respond only to alerts, logs, and observed behavior. Can the team respond when they can't see the full picture?

Typically surfaces:
- Runbooks nobody has exercised under pressure
- Protocols dependent on a dashboard that isn't always available
- Gaps in alerting
- On-call load concentrated on one or two tribal-knowledge people

Run before major launches, not after.

---

## Metric instrumentation traps

**The most common trap: measuring from the wrong start point.** Response time should start when the request enters the queue, not the processing function—queue wait is invisible to handler-based measurement. Ask: *"Where does the clock start? Does that match where the user starts waiting?"*

Also check:
- Are timeouts included in the latency distribution, or silently dropped?
- Are failed requests counted in the success-rate denominator?
- Does sampling happen before or after filtering?

---

## Making the case for platform investment

**Use data and story together.** Numbers alone are abstract; stories alone get dismissed. For data: estimate time lost per person per week. For story: describe a developer's day, or a new hire's week two.

**Acknowledge the tipping point.** You're asking for the highest-leverage bottleneck only, and will stop when it's good enough—pre-empts "bottomless problem" objections.

**Frame in trade-offs, not requests.** "Here's what we can deliver with and without this investment." Repurposing engineers is often more credible than headcount.

---

## Composition with other skills

- **`team-diagnosis`** — run first for people/culture; this goes deeper technically
- **`metrics-design`** — this skill picks SPACE categories; metrics-design handles the measurement tree
- **`strategy-doc`** — anchor the platform-investment case in business outcomes
- **`impact-audit`** — low-leverage work may be upstream goal misalignment

## Anti-patterns to flag

- **Measuring only activity.** Always pair with one satisfaction and one outcome signal.
- **Same benchmark for all roles.** Seniors/staff/principals have lower raw counts; context is everything.
- **Asking for data without asking people.** The most valuable friction is invisible to dashboards.
- **Treating slow onboarding as a people problem.** Multiple slow hires means the system is the variable.
- **Asking for unlimited investment.** Know what "good enough" looks like and say it.
- **Confusing load testing with operational readiness.** Load tests validate infrastructure; game days validate the team.
- **Trusting metrics without verifying instrumentation.** Always ask where the clock starts.
