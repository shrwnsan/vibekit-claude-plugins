import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, serializeCsv } from '../src/csv.js';
import { parseTsv, serializeTsv } from '../src/tsv.js';

test('csv basics', () => {
  assert.deepEqual(parseCsv('a,b\nc,d'), [['a', 'b'], ['c', 'd']]);
});

test('csv quoted field with comma', () => {
  assert.deepEqual(parseCsv('"a,b",c'), [['a,b', 'c']]);
});

test('csv escaped quote', () => {
  assert.deepEqual(parseCsv('"say ""hi""",x'), [['say "hi"', 'x']]);
});

test('csv serialize quotes when needed', () => {
  assert.equal(serializeCsv([['a,b', 'c']]), '"a,b",c');
});

test('tsv basics', () => {
  assert.deepEqual(parseTsv('a\tb\nc\td'), [['a', 'b'], ['c', 'd']]);
  assert.equal(serializeTsv([['a', 'b'], ['c', 'd']]), 'a\tb\nc\td');
});
