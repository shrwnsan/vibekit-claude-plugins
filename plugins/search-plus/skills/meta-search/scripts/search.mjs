#!/usr/bin/env node
// search.mjs — CLI wrapper for skill invocation
// Usage: node search.mjs <query-or-url>
// Outputs recovered content as markdown to stdout; failure reasons to stderr.
// Set SEARCH_PLUS_DEBUG=1 to see progress logs on stderr.

// Library modules log progress via console.log/warn. Stdout is reserved for the result,
// so silence (or redirect to stderr) before importing them.
const sink = process.env.SEARCH_PLUS_DEBUG === '1' ? console.error.bind(console) : () => {};
console.log = console.info = console.warn = console.error = sink;
const { handleWebSearch, formatResult } = await import('./handle-web-search.mjs');

const query = process.argv.slice(2).join(' ').trim();

if (!query) {
  process.stderr.write('Usage: node search.mjs <query-or-url>\n');
  process.exit(1);
}

try {
  const result = await handleWebSearch({ query, maxRetries: 2, timeout: 10000 });

  if (result.success && result.data) {
    process.stdout.write(formatResult(result) + '\n');
    process.exit(0);
  }
  process.stderr.write((result.message || 'Recovery failed') + '\n');
  process.exit(1);
} catch (err) {
  process.stderr.write(err.message + '\n');
  process.exit(1);
}
