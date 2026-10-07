#!/usr/bin/env node
// hook-entry.mjs — entry point for PostToolUse / PostToolUseFailure hooks on WebSearch|WebFetch
// Reads hook JSON from stdin, detects failed or empty results, runs recovery,
// and prints ONLY a hookSpecificOutput JSON object to stdout (anything else breaks parsing).

import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Library modules log via console.*; keep stdout clean for the hook JSON.
const sink = process.env.SEARCH_PLUS_DEBUG === '1' ? console.error.bind(console) : () => {};
console.log = console.info = console.warn = console.error = sink;
const { handleWebSearch, formatResult } = await import('./handle-web-search.mjs');

// Claude Code caps additionalContext at 10,000 characters
const MAX_CONTEXT_CHARS = 9500;
// Stay under the 30s hook timeout in hooks.json so we exit cleanly instead of being killed
const DEADLINE_MS = 25000;

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => {
      try { resolve(JSON.parse(data)); }
      catch (e) { reject(new Error(`Failed to parse stdin JSON: ${e.message}`)); }
    });
    process.stdin.on('error', reject);
  });
}

// Returns a short failure label, or null when the tool result looks fine.
// Only inspects structured fields, never page content: a successful page that
// mentions "429" or "empty" must not trigger recovery.
function detectFailure(input) {
  if (input.hook_event_name === 'PostToolUseFailure') {
    if (input.is_interrupt) return null;
    const status = String(input.error || '').match(/\b(403|404|422|429|451|5\d\d)\b/);
    return status ? status[1] : 'error';
  }

  const { tool_response: response, tool_name: tool } = input;
  if (!response) return null;

  if (tool === 'WebFetch') {
    return typeof response === 'object' && Number(response.code) >= 400 ? String(response.code) : null;
  }

  if (tool === 'WebSearch') {
    const text = typeof response === 'string' ? response : JSON.stringify(response);
    if (/did 0 searches/i.test(text)) return 'did 0 searches';
    // Search results carry links; a response with none is an empty result set
    if (typeof response === 'object' && !/https?:\/\//.test(text)) return 'empty results';
  }

  return null;
}

function extractQuery({ tool_input: toolInput, tool_name: tool }) {
  if (!toolInput) return null;
  if (tool === 'WebFetch') return toolInput.url || null;
  return toolInput.query || null;
}

export { detectFailure, extractQuery };

async function main() {
  const input = await readStdin();
  const failure = detectFailure(input);
  const query = failure && extractQuery(input);
  if (!query) return;

  const result = await handleWebSearch({ query, maxRetries: 2, timeout: 8000 });
  if (!result.success || !result.data) return;

  let context = [
    `[search-plus recovery] ${input.tool_name} failed (${failure}). Recovered via ${result.data.service || result.service || 'fallback'}:`,
    formatResult(result)
  ].join('\n\n');
  if (context.length > MAX_CONTEXT_CHARS) {
    context = context.slice(0, MAX_CONTEXT_CHARS) +
      `\n\n[truncated — run the meta-search skill script for the full content]`;
  }

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: input.hook_event_name || 'PostToolUse',
      additionalContext: context
    }
  }));
}

// Run the hook loop only when executed directly; tests import the pure helpers.
// Compare realpaths: Node resolves symlinks for import.meta.url but not argv[1],
// and plugin roots can be symlinked (local marketplaces, /tmp → /private/tmp).
function isMainModule() {
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isMainModule()) {
  // Never block Claude: exit 0 on success, failure, or deadline
  setTimeout(() => process.exit(0), DEADLINE_MS).unref();
  main().catch(() => {}).finally(() => process.exit(0));
}
