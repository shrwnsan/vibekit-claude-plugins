import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFetcher } from '../src/fetcher.js';

test('get returns the transport body', async () => {
  const f = createFetcher((url, cb) => cb(null, `body:${url}`));
  const body = await new Promise((res) => f.get('/x', (e, b) => res(e ?? b)));
  assert.equal(body, 'body:/x');
});

test('transport errors propagate', async () => {
  const f = createFetcher((url, cb) => cb(new Error('boom')));
  const err = await new Promise((res) => f.get('/x', (e) => res(e)));
  assert.equal(err.message, 'boom');
});
