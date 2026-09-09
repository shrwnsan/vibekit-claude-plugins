#!/usr/bin/env node
// ship-review — pre-merge predicates P1–P4 (LEAN-PLAN §4, §8 D2).
//
// Pure code assertions: no LLM, no eval-score comparison — judgment lives in
// CI jobs behind the gate contracts (plugin/gates/*/gate.md), not here.
//
//   node scripts/ship-review.mjs --base origin/main   # PR / merge gate
//   node scripts/ship-review.mjs --staged             # pre-commit (staged diff)
//
// Flags:
//   --base <ref>            diff range <ref>...HEAD
//   --staged                diff of staged changes (git diff --cached)
//   --decision-pattern <re> repo's decision-ID pattern (default: ADR + decisions/)
//   --decision-doc <path>   extra spec doc for P3 (repeatable) — for repos whose
//                           decision log is a file, not a directory (haku: docs/LEAN-PLAN.md)
//   --require-decision      P1 applies even without a decisions/ directory
//   --strict                a skipped predicate is a failure, not a pass
//
// Exit codes: 0 = pass (or all predicates skipped), 1 = one or more findings.
//
// Applicability: each predicate self-skips when its subject doesn't exist
// (no decisions dir, no evals/, no flag tokens) so the same script is safe
// as a local hook in repos that haven't adopted the convention. In CI on
// this repo, pass --strict --require-decision to make skips loud.

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name) => {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : undefined;
};

const base = value("--base");
const staged = flag("--staged");
const requireDecision = flag("--require-decision");
const strict = flag("--strict");
const decisionPatternSrc =
  value("--decision-pattern") ?? "ADR-[0-9]{3,4}|decisions/[0-9]{3,4}";

let decisionPattern;
try {
  decisionPattern = new RegExp(decisionPatternSrc);
} catch {
  console.error(`ship-review: --decision-pattern is not a valid regex: ${decisionPatternSrc}`);
  process.exit(1);
}

const decisionDocs = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--decision-doc") {
    const path = args[++i];
    if (!path) {
      console.error("ship-review: --decision-doc requires a path");
      process.exit(1);
    }
    decisionDocs.push(path);
  }
}

function git(...cmdArgs) {
  return execFileSync("git", cmdArgs, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

function changedFiles() {
  return staged
    ? git("diff", "--cached", "--name-only").split("\n").filter(Boolean)
    : git("diff", "--name-only", `${base}...HEAD`).split("\n").filter(Boolean);
}

function addedLines() {
  const patch = staged
    ? git("diff", "--cached", "--unified=0")
    : git("diff", "--unified=0", `${base}...HEAD`);
  return patch
    .split("\n")
    .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
    .map((line) => line.slice(1));
}

// P1 — the changeset cites a decision-log entry.
function p1(files) {
  const decisionDirs = ["decisions", "docs/decisions"].filter((d) => existsSync(d));
  if (!requireDecision && decisionDirs.length === 0) {
    return { status: "skip", note: "no decisions/ directory (pass --require-decision to enforce)" };
  }
  const hits = addedLines().filter((line) => decisionPattern.test(line));
  if (hits.length === 0) {
    return { status: "fail", note: "changeset cites no decision — added lines must reference a decision-log entry" };
  }
  return { status: "pass", note: `${hits.length} added line(s) cite a decision` };
}

// P2 — routing surface changed ⇒ evals changed with it.
function p2(files) {
  if (!existsSync("evals")) {
    return { status: "skip", note: "no evals/ directory" };
  }
  const surface = files.filter((f) =>
    /^plugin\/skills\/[^/]+\/SKILL\.md$/.test(f) ||
    /^plugin\/agents\/[^/]+\.md$/.test(f) ||
    /^plugin\/packs\/[^/]+\/(skills\/[^/]+\/SKILL\.md|agents\/[^/]+\.md)$/.test(f),
  );
  if (surface.length === 0) return { status: "pass", note: "routing surface untouched" };
  const evalTouched = files.some((f) => f.startsWith("evals/"));
  if (!evalTouched) {
    return {
      status: "fail",
      note: `routing surface changed without eval update: ${surface.join(", ")}`,
    };
  }
  return { status: "pass", note: "routing surface + evals changed together" };
}

// P3 — FLAG:/SHADOW: tokens must be declared in the referenced spec doc.
// (?<!\/) so prose mentions of the convention itself ("FLAG:/SHADOW:") don't
// register as tokens.
function p3(files) {
  const tokenRe = /(?<!\/)\b(FLAG|SHADOW):\s*([A-Za-z0-9_.-]+)/;
  const tokened = addedLines().filter((line) => tokenRe.test(line));
  if (tokened.length === 0) return { status: "pass", note: "no flag/shadow tokens" };

  const decisionDirs = ["decisions", "docs/decisions"].filter((d) => existsSync(d));
  const specTexts = [];
  for (const path of decisionDocs) {
    if (existsSync(path)) {
      specTexts.push({ name: path, text: readFileSync(path, "utf8") });
    }
  }
  for (const dir of decisionDirs) {
    for (const entry of readdirSync(dir)) {
      if (entry.endsWith(".md")) {
        specTexts.push({ name: `${dir}/${entry}`, text: readFileSync(join(dir, entry), "utf8") });
      }
    }
  }
  const undeclared = tokened.filter((line) => {
    const token = line.match(tokenRe)?.[2];
    return !specTexts.some((doc) => token && doc.text.includes(token));
  });
  if (undeclared.length > 0) {
    return {
      status: "fail",
      note: `behavior behind a flag not declared in any decision doc: ${undeclared.map((l) => l.match(tokenRe)?.[2]).join(", ")}`,
    };
  }
  return { status: "pass", note: `${tokened.length} token(s) declared in decision docs` };
}

// P4 — routing dry-run gate (existing).
function p4() {
  const runner = "evals/routing/run-routing.mjs";
  if (!existsSync(runner)) return { status: "skip", note: "no routing runner" };
  const res = spawnSync("node", [runner, "--dry-run"], { encoding: "utf8" });
  if (res.status !== 0) {
    return { status: "fail", note: `dry-run gate failed:\n${(res.stdout || "") + (res.stderr || "")}` };
  }
  return { status: "pass", note: "dry-run green" };
}

if (!staged && !base) {
  console.error("ship-review: pass --base <ref> or --staged");
  process.exit(1);
}

const files = changedFiles();
const results = [
  ["P1 decision reference", p1(files)],
  ["P2 eval parity", p2(files)],
  ["P3 flag/shadow tokens", p3(files)],
  ["P4 dry-run gate", p4()],
];

let failed = false;
for (const [name, r] of results) {
  const mark = r.status === "pass" ? "PASS" : r.status === "skip" ? "SKIP" : "FAIL";
  if (r.status === "fail") failed = true;
  if (r.status === "skip" && strict) failed = true;
  console.error(`  ${mark}  ${name} — ${r.note}`);
}

const label = staged ? "staged changes" : `${base}...HEAD`;
if (failed) {
  console.error(`\nship-review: BLOCKED (${label})`);
  process.exit(1);
}
console.error(`\nship-review: OK (${label}${strict ? ", strict" : ""})`);
