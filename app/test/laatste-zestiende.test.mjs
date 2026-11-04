import test from 'node:test';
import assert from 'node:assert/strict';
import { herstelMaatduur } from '../src/model/maatduur.mjs';

const noot = (start, duur, balk) => ({
  soort: 'noot', start, duur, stem: 1, notenbalk: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 }, akkoord: false,
  balk, zekerheid: 1,
});

test('de laatste noot van een gebalkte zestiende-reeks wordt niet verlengd om de maat te vullen', () => {
  const partituur = {
    partijen: [{
      id: 'P1',
      maten: [{
        nummer: '1', index: 0, maatsoort: { teller: 4, noemer: 4 },
        elementen: [
          noot(0, 120, 'begin'),
          noot(120, 120, 'midden'),
          noot(240, 120, 'midden'),
          noot(360, 1560, 'eind'),
        ],
      }],
    }],
  };

  const hersteld = herstelMaatduur(partituur, 'P1', 0);
  const elementen = hersteld.partijen[0].maten[0].elementen;
  assert.equal(elementen[3].duur, 120);
  assert.deepEqual(elementen[4], {
    soort: 'rust', start: 480, duur: 1440, stem: 1, notenbalk: 1, heleMaat: false, zekerheid: 1,
  });
  assert.equal(partituur.partijen[0].maten[0].elementen[3].duur, 1560);
});
