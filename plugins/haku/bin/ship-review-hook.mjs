#!/usr/bin/env node
// PreToolUse wrapper for ship-review (LEAN-PLAN §4: local hook on git commit).
//
// Wired via plugin/hooks/hooks.json. Reads the Claude Code hook payload from
// stdin; acts only when the tool call is a `git commit`. In repos without the
// haku conventions, every predicate self-skips and the commit proceeds —
// the hook is only load-bearing where the decisions/evals surface exists.
//
// Exit 2 blocks the commit; the findings go back to the agent on stderr.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

let payload = "";
process.stdin.setEncoding("utf8");
for await (const chunk of process.stdin) payload += chunk;

let command = "";
try {
  command = JSON.parse(payload)?.tool_input?.command ?? "";
} catch {
  process.exit(0);
}

if (!/\bgit\s+commit\b/.test(command)) process.exit(0);
if (!existsSync("evals") && !existsSync("decisions") && !existsSync("docs/decisions")) {
  process.exit(0);
}

const here = new URL(".", import.meta.url).pathname;
const res = spawnSync("node", [`${here}ship-review.mjs`, "--staged"], {
  stdio: ["ignore", "ignore", "inherit"],
});
if (res.error) {
  // Local hook fails open on infrastructure failure — CI is the enforced gate.
  console.error(`ship-review-hook: could not run ship-review (${res.error.code ?? res.error}); commit proceeding`);
  process.exit(0);
}
process.exit(res.status === 0 ? 0 : 2);
