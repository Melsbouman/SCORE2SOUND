import test from 'node:test';
import assert from 'node:assert/strict';
import { plakMaten } from '../src/model/maten-bewerken.mjs';

test('maat 1 plakken na maat 3 voegt een kopie als maat 4 toe', () => {
  const partituur = {
    partijen: [{
      id: 'partij-1',
      maten: [
        { nummer: '1', index: 0, elementen: [{ soort: 'noot', toonhoogte: { stap: 'C', alter: 0, octaaf: 4 } }] },
        { nummer: '2', index: 1, elementen: [{ soort: 'noot', toonhoogte: { stap: 'D', alter: 0, octaaf: 4 } }] },
        { nummer: '3', index: 2, elementen: [{ soort: 'noot', toonhoogte: { stap: 'E', alter: 0, octaaf: 4 } }] },
      ],
    }],
  };

  const nieuw = plakMaten(partituur, 'partij-1', 0, 0, 2);

  assert.equal(nieuw.partijen[0].maten.length, 4);
  assert.deepEqual(nieuw.partijen[0].maten[3].elementen, partituur.partijen[0].maten[0].elementen);
  assert.deepEqual(nieuw.partijen[0].maten.map((maat) => maat.nummer), ['1', '2', '3', '4']);
});
