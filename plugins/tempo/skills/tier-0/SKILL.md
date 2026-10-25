---
name: tier-0
description: Tier-0 trivial-change rules (typo, copy tweak, one-line fix). Rarely needs loading — the tempo session routing table already defines tier 0; load only when unsure a change qualifies as trivial.
user-invocable: true
---

# Tier 0 — trivial change

1. Make the change. One file, minimal diff.
2. Verify with the project's own checks: run the tests, build, or the exact
   command that exercises it, and quote the passing output in one line.
3. Report done in one sentence. No plan note, no new files, no ceremony.

Qualifies: typo fixes, copy tweaks, constant changes, log-message fixes, obvious
one-line corrections.

Does not qualify — go back to `tempo:triage`: anything touching auth, public
API, build config, or more than one file; anything where the fix isn't obvious
before you start.

Verification failed twice? The task was not tier 0. Promote to tier 1 and follow
`tempo:tier-1` from there.
