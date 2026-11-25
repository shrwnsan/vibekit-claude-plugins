---
description: Review the ask layer's evidence and prune over-fitted pattern classes with explicit consent
allowed-tools: Bash(node *), AskUserQuestion, Read, Write, Edit
---

# Reflex Tune

Review how reflex's ask layer is actually performing and — only with explicit
consent — apply pruning decisions to the user config file
(`~/.claude/reflex-config.json`, relocatable via `REFLEX_CONFIG`).
Nothing changes without the user picking an action.

## Steps

1. Run the stats script and read its JSON:

   ```bash
   node "$CLAUDE_PLUGIN_ROOT/scripts/reflex-tune.mjs" --json
   ```

   - `status: "log-off"` → tell the user logging is off (`REFLEX_LOG=off`),
     so there is nothing to tune on, and stop.
   - `status: "no-log"` → tell the user no verdict log exists yet and stop.
   - Empty `perClass` → report "no asks in window" and stop.

2. Present the table compactly: per class — asks, distinct sessions, labeled
   count, override rate (note it is conditional on labels), approval latency
   (note "unavailable" means the correlator has not stamped resultTs yet),
   token cost. Then the `candidates` — each with its reasons. Explain in one
   sentence what a candidate means: this ask pattern almost never changes the
   outcome and/or gets approved faster than a human could read it.

3. If there are candidates, ask via AskUserQuestion which to act on — for
   each candidate offer: **Disable class** (write it into `disabledClasses`
   in the config file), **Keep** (no change), **Show more detail first**
   (re-present the full reasons and counts). Make clear that disabling is a
   deliberate loosening: a disabled secrets class can let its commands fall
   through to the read-only allow (e.g. plain `cat .env`).

4. On a disable decision: read the config file if it exists (create it if
   not — `{"version":1,"disabledClasses":[...]}`), add the class label
   **exactly** as the stats script printed it (labels are matched by exact
   string), and write the file. Preserve any existing keys.

5. Record the decision for the audit trail:

   ```bash
   node "$CLAUDE_PLUGIN_ROOT/scripts/reflex-tune.mjs" --record '{"action":"disable-class","class":"<label>","reasons":"<summary>"}'
   ```

6. Verify and close: suggest running `/reflex:status` to confirm the config
   line now shows the disabled class, and note the change takes effect on
   the next gated command (the gate reads the config per invocation).

Keep the whole flow short — the evidence table, the ask, the edit, the
audit line. If the user says "no" to everything, record nothing and stop.
