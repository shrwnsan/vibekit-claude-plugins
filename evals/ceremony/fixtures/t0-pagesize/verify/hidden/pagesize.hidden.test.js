import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PAGE_SIZE, DEFAULT_SORT } from '../../src/config.js';

test('page size is 50 now', () => {
  assert.equal(PAGE_SIZE, 50);
});

test('other defaults untouched', () => {
  assert.equal(DEFAULT_SORT, 'newest');
});
