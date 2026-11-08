import test from 'node:test';
import assert from 'node:assert/strict';
import { vergelijkGedrukteMaatnummers } from '../src/model/gedruktenummers.mjs';

// Een partij met drie regels van vier maten; balk 80 pixels hoog, regels op y 300, 700 en 1100, maten vanaf x 150.
function partituur(nummers) {
  return {
    partijen: [{
      id: 'P1',
      maten: nummers.map((nummer, index) => ({
        nummer: String(nummer), index, regelbegin: index % 4 === 0,
        vak: { blad: 1, links: 150 + (index % 4) * 500, rechts: 650 + (index % 4) * 500, boven: 300 + Math.floor(index / 4) * 400, onder: 380 + Math.floor(index / 4) * 400 },
        elementen: [],
      })),
    }],
  };
}
// Het gedrukte nummer links boven de eerste maat van regel r (0, 1, 2).
const nummer = (tekst, regel) => ({ tekst: String(tekst), x: 150, y: 300 + regel * 400 - 50, breedte: 40, hoogte: 40 });
const blad = (woorden) => [{ blad: 1, regels: woorden.map((w) => ({ tekst: w.tekst, woorden: [w] })) }];

test('kloppende maatnummers geven geen melding en tellen als gelijk', () => {
  const uit = vergelijkGedrukteMaatnummers(partituur([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]), blad([nummer(5, 1), nummer(9, 2)]));
  assert.deepEqual({ gelijk: uit.gelijk, regels: uit.regels, meldingen: uit.meldingen.length }, { gelijk: 2, regels: 2, meldingen: 0 });
});

test('ontbrekende maten (een meermaatsrust zonder aantal) geven één melding waar het verschil begint', () => {
  // Op het blad begint regel 2 bij 8 en regel 3 bij 12; de herkenning heeft daar 5 en 9 (3 maten te weinig).
  const uit = vergelijkGedrukteMaatnummers(partituur([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]), blad([nummer(8, 1), nummer(12, 2)]));
  assert.equal(uit.gelijk, 0);
  assert.equal(uit.meldingen.length, 1);
  assert.equal(uit.meldingen[0].maat, 4);
  assert.equal(uit.meldingen[0].tekst, 'Op het blad begint deze regel bij maat 8, de herkenning nummert hem 5: er ontbreken 3 maten in de regels ervoor (kijk naar meermaatsrusten).');
});

test('te veel ingevoegde maten geven een melding met te veel', () => {
  const uit = vergelijkGedrukteMaatnummers(partituur([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]), blad([nummer(4, 1)]));
  assert.match(uit.meldingen[0].tekst, /er staat 1 maat te veel/);
});

test('een getal ver van het begin van de regel of onder de balk telt niet', () => {
  const ver = { tekst: '30', x: 1200, y: 650, breedte: 40, hoogte: 40 };
  const onder = { tekst: '30', x: 150, y: 820, breedte: 40, hoogte: 40 };
  const uit = vergelijkGedrukteMaatnummers(partituur([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]), blad([ver, onder]));
  assert.equal(uit.regels, 0);
});
