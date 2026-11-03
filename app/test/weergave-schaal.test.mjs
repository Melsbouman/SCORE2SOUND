import assert from 'node:assert/strict';
import test from 'node:test';
import { vasteSchaal } from '../public/js/weergave.js';

test('vasteSchaal schaalt de notatie op basis van de paginabreedte', () => {
  assert.equal(vasteSchaal(1200, 1), 57);
  assert.equal(vasteSchaal(2100, 1), 100);
  assert.equal(vasteSchaal(4000, 1), 140);
  assert.equal(vasteSchaal(300, 0.6), 35);
});
