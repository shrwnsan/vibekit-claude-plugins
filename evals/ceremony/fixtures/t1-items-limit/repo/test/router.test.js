import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleRequest } from '../src/router.js';

test('health', () => {
  const r = handleRequest('GET', '/health');
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { ok: true });
});

test('items returns the full list', () => {
  const r = handleRequest('GET', '/items');
  assert.equal(r.status, 200);
  assert.equal(r.body.items.length, 20);
  assert.equal(r.body.items[0].name, 'item-01');
});

test('unknown path is 404', () => {
  const r = handleRequest('GET', '/nope');
  assert.equal(r.status, 404);
});
