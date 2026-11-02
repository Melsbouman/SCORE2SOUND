import test from 'node:test';
import assert from 'node:assert/strict';

import { controleerIndeling } from '../src/controle/indeling.mjs';

function maakPartituur(regelbeginnen) {
  return {
    titel: 'Indeling',
    partijen: [],
    maten: Array.from({ length: 8 }, (_, index) => ({
      nummer: index + 1,
      regelbegin: regelbeginnen.includes(index + 1),
      partijen: [],
    })),
  };
}

// Een kleine vervanger houdt deze test onafhankelijk van het laden van Verovio in Node.
function renderSysteemTelling() {
  return [
    { eerste: 1, aantal: 3 },
    { eerste: 4, aantal: 3 },
    { eerste: 7, aantal: 2 },
  ];
}

test('controleert de maten per systeem', () => {
  const resultaat = controleerIndeling(
    maakPartituur([1, 4, 7]),
    renderSysteemTelling,
  );

  assert.equal(resultaat.goed, true);
  assert.deepEqual(resultaat.systemen.map(({ aantal }) => aantal), [3, 3, 2]);
  assert.deepEqual(resultaat.afwijkingen, []);
});

test('meldt een regelbegin dat niet met de rendering overeenkomt', () => {
  const resultaat = controleerIndeling(
    maakPartituur([1, 5, 7]),
    renderSysteemTelling,
  );

  assert.equal(resultaat.goed, false);
  assert.equal(resultaat.afwijkingen.length > 0, true);
  assert.deepEqual(resultaat.afwijkingen[0], {
    systeem: 1,
    verwachtEerste: 1,
    gevondenEerste: 1,
    verwachtAantal: 4,
    gevondenAantal: 3,
  });
});
