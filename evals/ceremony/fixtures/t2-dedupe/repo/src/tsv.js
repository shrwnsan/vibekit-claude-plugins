// TSV: plain tab-delimited rows, no quoting mechanism.
export function parseTsv(text) {
  return text
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => line.split('\t'));
}

export function serializeTsv(rows) {
  return rows.map((r) => r.map(String).join('\t')).join('\n');
}
