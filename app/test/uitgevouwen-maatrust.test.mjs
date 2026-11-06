import test from 'node:test';
import assert from 'node:assert/strict';
import { uitgevouwen } from '../src/model/maten.mjs';

const maat = (index, extra = {}) => ({
  nummer: String(index + 1),
  index,
  herhaling: { begin: false, eind: false, keer: 2 },
  elementen: [],
  ...extra,
});

test('een herhaling over een maatrust van negen maten geeft achttien rustmaten', () => {
  const maten = [maat(0, { maatrust: 9, herhaling: { begin: true, eind: false, keer: 2 } })];
  for (let index = 1; index < 8; index += 1) maten.push(maat(index, { verborgen: true }));
  maten.push(maat(8, { verborgen: true, herhaling: { begin: false, eind: true, keer: 2 } }));
  maten.push(maat(9, { elementen: [{ soort: 'noot' }] }));

  const uit = uitgevouwen({ partijen: [{ id: 'P1', maten }] });

  assert.equal(uit.partijen[0].maten.length, 19);
});
