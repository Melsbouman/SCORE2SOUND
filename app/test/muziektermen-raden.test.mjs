import test from 'node:test';
import assert from 'node:assert/strict';

import { herstelMuziekterm } from '../src/model/muziektermen.mjs';

test('kiest alleen bij een duidelijke treffer een bestaande muziekterm', () => {
  assert.equal(herstelMuziekterm('.m0rend0'), 'morendo');
  assert.equal(herstelMuziekterm('poco apow'), 'poco a poco');
  assert.equal(herstelMuziekterm('rallentando'), 'rallentando');
  assert.equal(herstelMuziekterm('Marcato'), 'Marcato');
  assert.equal(herstelMuziekterm('xqzkt'), 'xqzkt');
});
