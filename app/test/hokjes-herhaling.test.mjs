import test from 'node:test';
import assert from 'node:assert/strict';
import { speelVolgorde } from '../src/model/maten.mjs';

const maat = (index, extra = {}) => ({
  index,
  nummer: String(index + 1),
  herhaling: { begin: false, eind: false, keer: 2 },
  elementen: [],
  ...extra,
});

test('een eerste hokje van twee maten eindigt voor hokje 2', () => {
  const maten = [
    maat(0, { herhaling: { begin: true, eind: false, keer: 2 } }),
    maat(1),
    maat(2, { volta: { nummers: [1], begin: true, eind: false } }),
    maat(3, {
      herhaling: { begin: false, eind: true, keer: 2 },
      volta: { nummers: [1], begin: false, eind: true },
    }),
    maat(4, { volta: { nummers: [2], begin: true, eind: true } }),
    maat(5),
  ];

  assert.deepEqual(speelVolgorde(maten), [0, 1, 2, 3, 0, 1, 4, 5]);
});
