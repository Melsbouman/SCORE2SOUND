import test from 'node:test';
import assert from 'node:assert/strict';
import { meermaatsRustenUitCijfers } from '../src/model/meermaatsrust.mjs';

// Een partij in 4/4 met een rustmaat en een maat met een noot; de rustmaat staat op het blad van x = 668 tot 991, balk 1159-1234.
function partituur(extra = []) {
  const maat = (index, elementen) => ({
    nummer: String(index + 1), index, maatsoort: { teller: 4, noemer: 4 },
    vak: { blad: 2, links: 668 + 323 * index, rechts: 991 + 323 * index, boven: 1159.5, onder: 1234.5 }, elementen,
  });
  return {
    partijen: [{
      id: 'P1', naam: 'Cornet', maten: [
        maat(0, [{ soort: 'rust', start: 0, duur: 1920, stem: 1, notenbalk: 1, heleMaat: true, zekerheid: 1 }, ...extra]),
        maat(1, [{ soort: 'noot', start: 0, duur: 1920, stem: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 }, zekerheid: 1 }]),
      ],
    }],
  };
}
const ocr = (regels) => [{ blad: 2, regels: regels.map((woorden) => ({ tekst: woorden.map((w) => w[0]).join(' '), woorden: woorden.map(([tekst, x, y, breedte, hoogte]) => ({ tekst, x, y, breedte, hoogte })) })) }];

test('een getal in een zin (Optional from bar 41) is geen rustcijfer', () => {
  const uit = meermaatsRustenUitCijfers(partituur(), ocr([[['from', 499, 1046, 116, 39], ['bar', 632, 1046, 83, 39], ['41', 732, 1046, 51, 38]]]));
  assert.equal(uit.partijen[0].maten.length, 2);
});

test('een rustcijfer met wat ruimte naast een woord (open 2) telt wel', () => {
  const uit = meermaatsRustenUitCijfers(partituur(), ocr([[['open', 560, 1046, 110, 39], ['2', 806, 1040, 36, 46]]]));
  assert.equal(uit.partijen[0].maten[0].maatrust, 2);
  assert.equal(uit.partijen[0].maten.length, 3);
});

test('een repetitiecijfer dat al als letter in de maat staat, is geen rustcijfer', () => {
  const letter = { soort: 'aanwijzing', start: 0, type: 'letter', waarde: '12', zekerheid: 1 };
  const uit = meermaatsRustenUitCijfers(partituur([letter]), ocr([[['12', 800, 1040, 50, 46]]]));
  assert.equal(uit.partijen[0].maten.length, 2);
});
