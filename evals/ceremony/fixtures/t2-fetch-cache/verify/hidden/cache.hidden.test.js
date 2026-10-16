import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFetcher } from '../../src/fetcher.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function makeCountingTransport() {
  const calls = [];
  const transport = (url, cb) => {
    calls.push(url);
    process.nextTick(() => cb(null, `body-${calls.length}`));
  };
  return { transport, calls };
}

const get = (f, url) => new Promise((res) => f.get(url, (e, b) => res(e ?? b)));

test('second get within ttl is served from cache', async () => {
  const t = makeCountingTransport();
  const f = createFetcher(t.transport, { ttl: 5000 });
  const b1 = await get(f, '/a');
  const b2 = await get(f, '/a');
  assert.equal(t.calls.length, 1);
  assert.equal(b1, 'body-1');
  assert.equal(b2, 'body-1');
});

test('after ttl expires, transport runs again', async () => {
  const t = makeCountingTransport();
  const f = createFetcher(t.transport, { ttl: 5 });
  await get(f, '/a');
  await sleep(20);
  const b3 = await get(f, '/a');
  assert.equal(t.calls.length, 2);
  assert.equal(b3, 'body-2');
});

test('different urls are cached independently', async () => {
  const t = makeCountingTransport();
  const f = createFetcher(t.transport, { ttl: 5000 });
  await get(f, '/a');
  await get(f, '/b');
  await get(f, '/a');
  assert.equal(t.calls.length, 2);
});

test('errors are not cached', async () => {
  let n = 0;
  const transport = (url, cb) => {
    n++;
    process.nextTick(() => (n === 1 ? cb(new Error('flaky')) : cb(null, 'ok')));
  };
  const f = createFetcher(transport, { ttl: 5000 });
  const e1 = await new Promise((res) => f.get('/a', (e) => res(e)));
  const b2 = await get(f, '/a');
  assert.equal(e1.message, 'flaky');
  assert.equal(b2, 'ok');
  assert.equal(n, 2);
});

test('no-options call still works', async () => {
  const t = makeCountingTransport();
  const f = createFetcher(t.transport);
  const b = await get(f, '/a');
  assert.equal(b, 'body-1');
});
