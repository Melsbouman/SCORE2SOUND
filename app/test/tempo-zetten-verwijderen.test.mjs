import test from 'node:test';
import assert from 'node:assert/strict';
import { tempoLijst, verwijderTempo, zetTempo } from '../src/model/tempo.mjs';

test('tempo zetten en verwijderen herstelt het oorspronkelijke tempoverloop', () => {
  const partituur = {
    partijen: [
      {
        maten: Array.from({ length: 4 }, (_, index) => ({
          nummer: index + 1,
          elementen: [],
          ...(index === 0 ? { tempo: 100 } : {}),
        })),
      },
    ],
  };

  const metTempo = zetTempo(partituur, 2, 140);
  assert.deepEqual(tempoLijst(metTempo), [
    { maat: 0, nummer: 1, bpm: 100 },
    { maat: 2, nummer: 3, bpm: 140 },
  ]);

  const zonderTempo = verwijderTempo(metTempo, 2);
  assert.deepEqual(tempoLijst(zonderTempo), [
    { maat: 0, nummer: 1, bpm: 100 },
  ]);
});
