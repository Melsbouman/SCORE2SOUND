import test from 'node:test';
import assert from 'node:assert/strict';
import { speelVolgorde } from '../src/model/maten.mjs';

test('een eerste volta zonder tweede volta speelt de volgende maat gewoon', () => {
  const maten = [
    { herhaling: { begin: true } },
    { volta: { begin: true, eind: true, nummers: [1] }, herhaling: { eind: true } },
    {},
  ];

  assert.deepEqual(speelVolgorde(maten), [0, 1, 0, 2]);
});

test('een tweede volta zonder voorafgaande eerste volta wordt overgeslagen', () => {
  const maten = [
    { herhaling: { begin: true } },
    { herhaling: { eind: true } },
    { volta: { begin: true, eind: true, nummers: [2] } },
    {},
  ];

  assert.deepEqual(speelVolgorde(maten), [0, 1, 0, 1, 3]);
});
