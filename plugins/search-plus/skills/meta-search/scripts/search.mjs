#!/usr/bin/env node
// search.mjs — CLI wrapper for skill invocation
// Usage: node search.mjs <query-or-url>
// Outputs recovered content to stdout, errors to stderr.

import { handleWebSearch } from './handle-web-search.mjs';

const query = process.argv.slice(2).join(' ').trim();

if (!query) {
  console.error('Usage: node search.mjs <query-or-url>');
  process.exit(1);
}

try {
  const result = await handleWebSearch({ query, maxRetries: 2, timeout: 10000 });

  if (result.success && result.data) {
    const output = typeof result.data === 'string'
      ? result.data
      : JSON.stringify(result.data, null, 2);
    console.log(output);
  } else {
    console.error(result.message || 'Recovery failed');
    process.exit(1);
  }
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
