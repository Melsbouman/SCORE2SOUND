import test from 'node:test';
import assert from 'node:assert/strict';
import { maatLengte } from '../src/model/duur.mjs';

test('maatLengte berekent verschillende maatsoorten in tikken', () => {
  assert.equal(maatLengte({ teller: 4, noemer: 4 }), 1920);
  assert.equal(maatLengte({ teller: 3, noemer: 4 }), 1440);
  assert.equal(maatLengte({ teller: 6, noemer: 8 }), 1440);
  assert.equal(maatLengte({ teller: 2, noemer: 2 }), 1920);
  assert.equal(maatLengte({ teller: 12, noemer: 8 }), 2880);
  assert.equal(maatLengte({ teller: 5, noemer: 4 }), 2400);
  assert.equal(maatLengte({ teller: 3, noemer: 8 }), 720);
});
