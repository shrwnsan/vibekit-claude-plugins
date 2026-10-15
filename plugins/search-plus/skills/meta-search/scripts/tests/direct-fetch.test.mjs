// Unit tests for the direct-fetch transport module: the SSRF-guarded DNS
// lookup (both resolver contracts) and the size-capped body reader.
// DNS is stubbed through dns.promises.lookup; no network, no keys.
//   node --test tests/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import dnsDefault from 'node:dns';
import { PassThrough } from 'node:stream';

import * as df from '../direct-fetch.mjs';

const realLookup = dnsDefault.promises.lookup;
function stubLookup(answers) {
  let calls = 0;
  dnsDefault.promises.lookup = async () => answers[Math.min(calls++, answers.length - 1)];
  return () => { dnsDefault.promises.lookup = realLookup; };
}

test('readBodyWithCap rejects and destroys the stream past the cap', async () => {
  assert.equal(typeof df.readBodyWithCap, 'function', 'readBodyWithCap is not exported');
  const src = new PassThrough();
  src.on('error', () => {}); // post-destroy writes must not crash the test runner
  const read = df.readBodyWithCap(src, 16);
  src.write('a'.repeat(15));
  src.write('bbbb'); // crosses the cap
  await assert.rejects(read, /body exceeded 16 bytes/);
});

test('readBodyWithCap returns the concatenated body under the cap', async () => {
  assert.equal(typeof df.readBodyWithCap, 'function', 'readBodyWithCap is not exported');
  const src = new PassThrough();
  const read = df.readBodyWithCap(src, 100);
  src.write('hello ');
  src.end('world');
  assert.equal(await read, 'hello world');
});

test('ssrfGuardedLookup honors the all: true resolver contract (Node autoSelectFamily)', async () => {
  assert.equal(typeof df.ssrfGuardedLookup, 'function', 'ssrfGuardedLookup is not exported');
  const restore = stubLookup([{ address: '93.184.216.34', family: 4 }]);
  try {
    const addresses = await new Promise((resolve, reject) => {
      df.ssrfGuardedLookup('autoselect.test', { family: 0, all: true }, (err, value) => (err ? reject(err) : resolve(value)));
    });
    assert.deepEqual(addresses, [{ address: '93.184.216.34', family: 4 }],
      'all: true callers must receive an array of { address, family } records');
  } finally {
    restore();
  }
});

test('ssrfGuardedLookup rejects a private answer under the all: true contract', async () => {
  assert.equal(typeof df.ssrfGuardedLookup, 'function', 'ssrfGuardedLookup is not exported');
  const restore = stubLookup([{ address: '127.0.0.2', family: 4 }]);
  try {
    await assert.rejects(
      new Promise((resolve, reject) => {
        df.ssrfGuardedLookup('autoselect.test', { family: 0, all: true }, (err, value) => (err ? reject(err) : resolve(value)));
      }),
      /forbidden address 127\.0\.0\.2/
    );
  } finally {
    restore();
  }
});
