#!/usr/bin/env node
// hook-entry.mjs — CLI entry point for PostToolUse hook
// Reads JSON from stdin, detects search/fetch errors, runs recovery,
// and outputs additionalContext for Claude.

import { handleWebSearch } from './handle-web-search.mjs';

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

// Detect whether the tool response indicates a recoverable error
function detectError(input) {
  const { tool_response, tool_name } = input;
  if (!tool_response) return null;

  const text = typeof tool_response === 'string'
    ? tool_response
    : JSON.stringify(tool_response);

  // HTTP status errors
  const statusMatch = text.match(/\b(403|422|429|451)\b/);
  if (statusMatch) return { code: parseInt(statusMatch[1]), text };

  // Connection errors
  if (/ECONNREFUSED|ETIMEDOUT/i.test(text)) return { code: 0, text };

  // Silent failures ("Did 0 searches")
  if (/did 0 searches/i.test(text)) return { code: 422, text };

  // Empty results
  if (tool_name === 'WebSearch' && /\[\s*\]|no results|empty/i.test(text)) {
    return { code: 0, text };
  }

  return null;
}

// Extract query/URL from the tool input
function extractQuery(input) {
  const { tool_input, tool_name } = input;
  if (!tool_input) return null;

  if (tool_name === 'WebFetch' || tool_name === 'web_fetch') {
    return tool_input.url || tool_input.URL || null;
  }

  return tool_input.query || tool_input.search_query || tool_input.q || null;
}

async function main() {
  const input = await readStdin();

  const error = detectError(input);
  if (!error) {
    // No error detected — exit silently, let Claude proceed
    process.exit(0);
  }

  const query = extractQuery(input);
  if (!query) {
    process.exit(0);
  }

  try {
    const result = await handleWebSearch({ query, maxRetries: 2, timeout: 8000 });

    if (result.success && result.data) {
      const context = [
        `[search-plus recovery] Original ${input.tool_name} failed (${error.code || 'error'}). Recovery succeeded via ${result.service || 'fallback'}.`,
        typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2)
      ].join('\n\n');

      console.log(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext: context
        }
      }));
    }
  } catch {
    // Recovery failed — exit silently, don't block Claude
  }

  process.exit(0);
}

main().catch(() => process.exit(0));
