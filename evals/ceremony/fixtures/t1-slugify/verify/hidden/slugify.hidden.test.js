import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify } from '../../src/utils.js';

test('spec examples', () => {
  assert.equal(slugify('  Hello,  World!  '), 'hello-world');
  assert.equal(slugify('Ápple & Bánana'), 'pple-bnana');
  assert.equal(slugify('a - b'), 'a-b');
});

test('edges', () => {
  assert.equal(slugify(''), '');
  assert.equal(slugify('!!!'), '');
  assert.equal(slugify('already-slugged-42'), 'already-slugged-42');
  assert.equal(slugify('Multiple   Spaces\tTab'), 'multiple-spaces-tab');
  assert.equal(slugify('---edge---'), 'edge');
  assert.equal(slugify('Trailing---hyphens---'), 'trailing-hyphens');
  assert.equal(slugify('MiXeD Case 123'), 'mixed-case-123');
});
