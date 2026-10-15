#!/usr/bin/env node
// collect.mjs — parse a claude -p --output-format stream-json session log into
// a metrics object. Shared by run-eval.mjs and usable standalone:
//   node collect.mjs <session.jsonl>
//   node collect.mjs --summary   (aggregate test-results/ceremony-*.json)

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RESULTS = path.join(HERE, '..', '..', 'test-results');

const EDIT_TOOLS = new Set(['Edit', 'Write', 'NotebookEdit']);

export function parseSession(logText) {
  const m = {
    tokens: { input: 0, output: 0, cache_creation: 0, cache_read: 0, total: 0 },
    turns: 0,
    tool_calls: 0,
    tokens_to_first_edit: null,
    cache_fields_reported: false,
    result_subtype: null,
    result_is_error: null,
    num_turns_reported: null,
    cost_usd: null,
    last_assistant_text: null,
  };
  let running = 0;

  const lines = logText.split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    let ev;
    try {
      ev = JSON.parse(line);
    } catch {
      continue; // tolerate truncated trailing lines from killed sessions
    }

    if (ev.type === 'assistant' && ev.message) {
      m.turns++;
      const u = ev.message.usage || {};
      const step =
        (u.input_tokens || 0) +
        (u.output_tokens || 0) +
        (u.cache_creation_input_tokens || 0) +
        (u.cache_read_input_tokens || 0);
      running += step;
      if (u.cache_creation_input_tokens || u.cache_read_input_tokens) {
        m.cache_fields_reported = true;
      }
      const content = ev.message.content || [];
      for (const block of content) {
        if (block.type === 'tool_use') {
          m.tool_calls++;
          if (m.tokens_to_first_edit === null && EDIT_TOOLS.has(block.name)) {
            m.tokens_to_first_edit = running;
          }
        }
        if (block.type === 'text' && block.text) {
          m.last_assistant_text = block.text;
        }
      }
    }

    if (ev.type === 'result') {
      m.result_subtype = ev.subtype ?? null;
      m.result_is_error = ev.is_error ?? null;
      m.num_turns_reported = ev.num_turns ?? null;
      m.cost_usd = ev.total_cost_usd ?? ev.cost_usd ?? null;
      // Prefer the runner's own session totals when the result event carries them.
      const u = ev.usage;
      if (u && (u.input_tokens || u.output_tokens || u.cache_read_input_tokens)) {
        m.tokens = {
          input: u.input_tokens || 0,
          output: u.output_tokens || 0,
          cache_creation: u.cache_creation_input_tokens || 0,
          cache_read: u.cache_read_input_tokens || 0,
        };
        m.tokens.total = m.tokens.input + m.tokens.output;
        if (u.cache_creation_input_tokens || u.cache_read_input_tokens) {
          m.cache_fields_reported = true;
        }
      }
    }
  }

  if (m.tokens.total === 0) {
    m.tokens.total =
      m.tokens.input + m.tokens.output + m.tokens.cache_creation + m.tokens.cache_read;
  }
  const denom =
    m.tokens.input + m.tokens.cache_creation + m.tokens.cache_read;
  m.cache_hit_ratio = denom > 0 ? m.tokens.cache_read / denom : null;
  if (m.last_assistant_text && m.last_assistant_text.length > 500) {
    m.last_assistant_text = m.last_assistant_text.slice(0, 500);
  }
  return m;
}

function median(xs) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function summary() {
  let files = [];
  try {
    files = readdirSync(RESULTS).filter((f) => /^ceremony-.*\.json$/.test(f));
  } catch {
    console.log('no test-results directory yet');
    return;
  }
  if (!files.length) {
    console.log('no ceremony-*.json results yet');
    return;
  }
  const rows = files.map((f) => JSON.parse(readFileSync(path.join(RESULTS, f), 'utf8')));
  const groups = new Map();
  for (const r of rows) {
    const key = `${r.condition}|tier ${r.tier ?? 'probe'}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  const out = [];
  for (const [key, rs] of [...groups.entries()].sort()) {
    const ok = rs.filter((r) => r.verify?.passed === true).length;
    const done = rs.filter((r) => r.completed).length;
    out.push({
      group: key,
      n: rs.length,
      tokens_total_med: median(rs.map((r) => r.metrics.tokens.total)),
      to_first_edit_med: median(rs.map((r) => r.metrics.tokens_to_first_edit ?? Infinity).filter(Number.isFinite)),
      cache_hit_med: median(rs.map((r) => r.metrics.cache_hit_ratio).filter((v) => v !== null)),
      turns_med: median(rs.map((r) => r.metrics.turns)),
      wall_s_med: Math.round(median(rs.map((r) => r.wall_ms)) / 100) / 10,
      verified: `${ok}/${rs.length}`,
      completed: `${done}/${rs.length}`,
    });
  }
  console.table(out);
}

const isEntry =
  import.meta.url ===
  (() => {
    try {
      return pathToFileURL(process.argv[1]).href;
    } catch {
      return null;
    }
  })();

if (isEntry) {
  if (process.argv[2] === '--summary') {
    summary();
  } else if (process.argv[2]) {
    console.log(JSON.stringify(parseSession(readFileSync(process.argv[2], 'utf8')), null, 2));
  }
}
