import test from 'node:test';
import assert from 'node:assert/strict';
import { vulOntbrekendeMaten } from '../src/model/ontbrekend.mjs';

// Repetitiecijfers 53 en 61 (8 maten), maar in de herkenning maar 3 maten ertussen waarvan één leeg.
function partituur() {
  const maat = (index, elementen) => ({ nummer: String(index + 1), index, maatsoort: { teller: 2, noemer: 4 }, elementen });
  const noot = { soort: 'noot', start: 0, duur: 960, stem: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 } };
  return {
    partijen: [{
      id: 'P1',
      maten: [
        maat(0, [noot, { soort: 'aanwijzing', type: 'letter', waarde: '53' }]),
        maat(1, [noot]),
        maat(2, []),
        maat(3, [noot, { soort: 'aanwijzing', type: 'letter', waarde: '61' }]),
      ],
    }],
  };
}

test('een lege maat in een gat tussen repetitiecijfers wordt een meermaatsrust van het ontbrekende aantal', () => {
  const uit = vulOntbrekendeMaten(partituur());
  const maten = uit.partijen[0].maten;
  assert.equal(maten[2].maatrust, 6);
  assert.equal(maten.filter((m) => m.ingevoegd).length, 0);
});

test('een tweede ronde vult hetzelfde gat niet nog een keer', () => {
  const eerste = vulOntbrekendeMaten(partituur());
  const tweede = vulOntbrekendeMaten(eerste);
  assert.deepEqual(tweede, eerste);
});
