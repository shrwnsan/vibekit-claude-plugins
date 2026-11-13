---
description: Reflex gate health, metrics, outcome labels, and version drift
argument-hint: "[--since DAYS|all]"
---

Run the reflex status reader and present its report.

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/reflex-status.mjs" $ARGUMENTS
```

The output is paste-safe by construction: counts, generic pattern labels,
providers, timings, and `~`-abbreviated paths only — never command text,
reasons, or snippets. Keep it that way when you summarize: do not open the
verdict log yourself to add examples, and do not quote `command` or
`reason` fields from it.

Present the report in this order:

1. Anything actionable, verbatim from the output: kill switch ON, a
   provider disabled by failstate (with cooldown), `PERMS WIDE`, or a
   `running gate: … DRIFT` line (hooks pin at session start — say the
   plugin needs an update plus a fresh session).
2. The windowed metrics block: decision counts, ask rate, fast-path/model
   split, latency percentiles, top patterns.
3. Outcome labels and the ask override rate. A high override rate on asks
   means ask patterns over-fit and train habituation — point at
   `evals/reflex/correlate-outcomes.mjs` (repo-side) for labeling, and at
   the Thresholds section of the README for tuning. No outcome lines means
   the correlator has not been run on this log; say so plainly.
