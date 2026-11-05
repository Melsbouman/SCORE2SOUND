import test from 'node:test';
import assert from 'node:assert/strict';
import { plakMaten } from '../src/model/maten-bewerken.mjs';

test('maten 1 en 2 plakken na maat 4 voegt de reeks op plek 5 en 6 toe', () => {
  const partituur = {
    partijen: [{
      id: 'P1',
      maten: [
        { nummer: '1', index: 0, elementen: [{ soort: 'noot', toonhoogte: { stap: 'C', alter: 0, octaaf: 4 } }] },
        { nummer: '2', index: 1, elementen: [{ soort: 'noot', toonhoogte: { stap: 'D', alter: 0, octaaf: 4 } }] },
        { nummer: '3', index: 2, elementen: [{ soort: 'noot', toonhoogte: { stap: 'E', alter: 0, octaaf: 4 } }] },
        { nummer: '4', index: 3, elementen: [{ soort: 'noot', toonhoogte: { stap: 'F', alter: 0, octaaf: 4 } }] },
      ],
    }],
  };

  const nieuw = plakMaten(partituur, 'P1', 0, 1, 3);

  assert.equal(nieuw.partijen[0].maten.length, 6);
  assert.deepEqual(nieuw.partijen[0].maten[4].elementen, partituur.partijen[0].maten[0].elementen);
  assert.deepEqual(nieuw.partijen[0].maten[5].elementen, partituur.partijen[0].maten[1].elementen);
});
