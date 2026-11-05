import test from 'node:test';
import assert from 'node:assert/strict';
import { zetToonsoort } from '../src/model/maten-bewerken.mjs';

test('toonsoort zetten op maat 2 verandert maat 2 tot en met 4', () => {
  const partituur = {
    partijen: [{
      id: 'partij-1',
      maten: [0, 1, 2, 3].map((index) => ({
        nummer: String(index + 1),
        index,
        toonsoort: { kwinten: 0, modus: 'majeur' },
      })),
    }],
  };

  const nieuw = zetToonsoort(partituur, 1, 2);

  assert.deepEqual(nieuw.partijen[0].maten.map((maat) => maat.toonsoort), [
    { kwinten: 0, modus: 'majeur' },
    { kwinten: 2, modus: 'majeur' },
    { kwinten: 2, modus: 'majeur' },
    { kwinten: 2, modus: 'majeur' },
  ]);
});
