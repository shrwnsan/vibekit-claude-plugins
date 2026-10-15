import { test } from 'node:test';
import assert from 'node:assert/strict';
import { capitalize, trimLines } from '../src/utils.js';

test('capitalize', () => {
  assert.equal(capitalize('hello'), 'Hello');
});

test('trimLines', () => {
  assert.equal(trimLines('  a\n b '), 'a\nb');
});
