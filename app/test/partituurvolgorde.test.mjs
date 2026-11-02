import assert from 'node:assert/strict';
import test from 'node:test';

import { sorteerPartijen } from '../src/model/partituurvolgorde.mjs';

test('sorteert partijen op de gebruikelijke instrumentvolgorde', () => {
  const partijen = [
    { id: 'tuba', naam: 'Tuba', inhoud: { noten: [1] } },
    { id: 'cornet', naam: 'Cornet', inhoud: { noten: [2] } },
    { id: 'fluit', naam: 'Fluit', inhoud: { noten: [3] } },
    { id: 'bugel-2', naam: 'Bugel 2', inhoud: { noten: [4] } },
    { id: 'bugel-1', naam: 'Bugel 1', inhoud: { noten: [5] } },
    { id: 'onbekend', naam: 'Onbekend', inhoud: { noten: [6] } },
    { id: 'trombone', naam: 'Trombone', inhoud: { noten: [7] } },
    { id: 'sax-alto', naam: 'Sax Alto', inhoud: { noten: [8] } },
  ];
  const partituur = { titel: 'Test', partijen };

  const resultaat = sorteerPartijen(partituur);

  assert.deepEqual(
    resultaat.partijen.map((partij) => partij.id),
    ['fluit', 'sax-alto', 'cornet', 'bugel-2', 'bugel-1', 'trombone', 'tuba', 'onbekend'],
  );
  assert.equal(resultaat.partijen[3], partijen[3]);
  assert.equal(resultaat.partijen[4], partijen[4]);
  assert.equal(resultaat.partijen.at(-1), partijen[5]);
  assert.deepEqual(partituur.partijen, partijen);
  assert.notEqual(resultaat, partituur);
  assert.notEqual(resultaat.partijen, partituur.partijen);
});
