import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, serializeCsv } from '../../src/csv.js';
import { parseTsv, serializeTsv } from '../../src/tsv.js';

test('csv: quoted embedded newline', () => {
  assert.deepEqual(parseCsv('"line1\nline2",z'), [['line1\nline2', 'z']]);
});

test('csv: round trip preserves tricky rows', () => {
  const rows = [['a,b', 'plain'], ['say "hi"', 'x,y'], ['multi\nline', 'last']];
  assert.deepEqual(parseCsv(serializeCsv(rows)), rows);
});

test('csv: trailing newline and empty input', () => {
  assert.deepEqual(parseCsv('a,b\n'), [['a', 'b']]);
  assert.deepEqual(parseCsv(''), []);
});

test('csv: empty fields', () => {
  assert.deepEqual(parseCsv('a,,c'), [['a', '', 'c']]);
});

test('tsv: round trip and edges', () => {
  const rows = [['a', 'b'], ['c', 'd']];
  assert.deepEqual(parseTsv(serializeTsv(rows)), rows);
  assert.deepEqual(parseTsv(''), []);
  assert.deepEqual(parseTsv('a\tb\n'), [['a', 'b']]);
});
