import test from 'node:test';
import assert from 'node:assert/strict';
import { vulBeginRust } from '../src/model/beginrust.mjs';

// Tien maten; repetitiecijfer 41 op de vierde maat.
function stuk(eersteBlad) {
  const maten = Array.from({ length: 10 }, (_, index) => ({
    nummer: String(index + 1), index, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
    sleutels: [], tempo: null, herhaling: { begin: false, eind: false, keer: 2 },
    elementen: [{ soort: 'noot', start: 0, duur: 1920 }],
  }));
  maten[3].elementen.unshift({ soort: 'aanwijzing', start: 0, type: 'letter', waarde: '41', zekerheid: 1, kader: true });
  return { bron: { bladen: [{ nummer: eersteBlad, breedte: 2480, hoogte: 3508 }] }, partijen: [{ id: 'P1', maten }] };
}

test('een scan vanaf blad 2 krijgt geen beginrust; de nummering begint zoals het repetitiecijfer zegt', () => {
  const maten = vulBeginRust(stuk(2)).partijen[0].maten;
  assert.equal(maten.length, 10);
  assert.equal(maten[3].nummer, '41');
  assert.equal(maten[0].nummer, '38');
});

test('een scan vanaf blad 1 krijgt wel een beginrust', () => {
  const maten = vulBeginRust(stuk(1)).partijen[0].maten;
  assert.equal(maten.length, 47);
  assert.equal(maten[0].maatrust, 37);
});
