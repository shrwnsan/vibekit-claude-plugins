import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleRequest } from '../../src/router.js';

test('default limit is 10', () => {
  const r = handleRequest('GET', '/items');
  assert.equal(r.status, 200);
  assert.equal(r.body.items.length, 10);
  assert.equal(r.body.items[0].id, 1);
  assert.equal(r.body.items[9].id, 10);
});

test('limit=3 returns first 3', () => {
  const r = handleRequest('GET', '/items', { limit: '3' });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.items.map((i) => i.id), [1, 2, 3]);
});

test('limit=100 capped by available items', () => {
  const r = handleRequest('GET', '/items', { limit: '100' });
  assert.equal(r.status, 200);
  assert.equal(r.body.items.length, 20);
});

test('invalid limits are 400', () => {
  for (const bad of ['0', '-1', '101', '2.5', 'abc', '']) {
    const r = handleRequest('GET', '/items', { limit: bad });
    assert.equal(r.status, 400, `limit=${JSON.stringify(bad)}`);
    assert.deepEqual(r.body, { error: 'invalid limit' });
  }
});

test('other routes unchanged', () => {
  assert.equal(handleRequest('GET', '/health').status, 200);
  assert.equal(handleRequest('GET', '/nope').status, 404);
});
