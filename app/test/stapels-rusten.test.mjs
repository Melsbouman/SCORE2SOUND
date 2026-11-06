import assert from 'node:assert/strict';
import test from 'node:test';

import { aantalUitSamengesteldeRust, stapelKaart } from '../src/model/stapels.mjs';

const rust = { soort: 'rust', heleMaat: true };
const cijfer = (waarde) => ({ soort: 'aanwijzing', type: 'letter', waarde });
const maat = (elementen = [], maatrust = 1) => ({ elementen, maatrust });

test('een hele-maatrust met het cijfer 14 geeft een samengestelde rust van 14 maten', () => {
  assert.equal(aantalUitSamengesteldeRust(maat([rust, cijfer('14')])), 14);
});

test('een noot naast de hele-maatrust sluit een samengestelde rust uit', () => {
  assert.equal(aantalUitSamengesteldeRust(maat([rust, cijfer('14'), { soort: 'noot' }])), null);
});

test('een samengestelde rust kan niet langer zijn dan 40 maten', () => {
  assert.equal(aantalUitSamengesteldeRust(maat([rust, cijfer('41')])), null);
});

test('stapelKaart slaat rusten van 9 en 5 maten over', () => {
  const maten = Array.from({ length: 16 }, () => maat());
  maten[0] = maat([], 9);
  maten[9] = maat([], 1);
  maten[10] = maat([], 5);

  assert.deepEqual(stapelKaart(maten), [0, 9, 10, 15]);
});
