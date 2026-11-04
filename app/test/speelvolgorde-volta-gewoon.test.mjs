import test from 'node:test';
import assert from 'node:assert/strict';
import { speelVolgorde } from '../src/model/maten.mjs';

test('een gewone maat na een volta wordt na de herhaling gespeeld', () => {
  const maten = [
    { herhaling: { begin: true } },
    { volta: { begin: true, nummers: [1] }, herhaling: { eind: true } },
    { volta: { begin: true, eind: true, nummers: [2] } },
    {},
    {},
    {},
  ];

  assert.deepEqual(speelVolgorde(maten), [0, 1, 0, 3, 4, 5]);
});
