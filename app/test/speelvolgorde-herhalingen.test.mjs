import test from 'node:test';
import assert from 'node:assert/strict';
import { speelVolgorde } from '../src/model/maten.mjs';

test('twee herhalingen achter elkaar worden apart gespeeld', () => {
  const maten = [
    { nummer: '1', herhaling: { begin: true } },
    { nummer: '2', herhaling: { eind: true, keer: 2 } },
    { nummer: '3', herhaling: { begin: true } },
    { nummer: '4', herhaling: { eind: true, keer: 2 } },
  ];

  assert.deepEqual(speelVolgorde(maten), [0, 1, 0, 1, 2, 3, 2, 3]);
});
