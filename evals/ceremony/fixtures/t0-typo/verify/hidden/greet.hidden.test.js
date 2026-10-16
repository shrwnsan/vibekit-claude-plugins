import { test } from 'node:test';
import assert from 'node:assert/strict';
import { greet } from '../../src/greet.js';

test('greeting is spelled correctly', () => {
  assert.equal(greet('Ada'), 'Hello, Ada!');
  assert.equal(greet('Grace'), 'Hello, Grace!');
});
