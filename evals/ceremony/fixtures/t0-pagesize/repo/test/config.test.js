import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PAGE_SIZE, DEFAULT_SORT } from '../src/config.js';

test('defaults', () => {
  assert.equal(PAGE_SIZE, 20);
  assert.equal(DEFAULT_SORT, 'newest');
});
