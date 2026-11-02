import test from 'node:test';
import assert from 'node:assert/strict';

import { voegSplitsingenSamen } from '../src/server/samenvoegen.mjs';

function maat(nummer, metNoot, notenbalk = 1) {
  return {
    nummer,
    index: nummer - 1,
    sleutels: [{ notenbalk, soort: 'G' }],
    noten: [{ rust: !metNoot, duur: 480, notenbalk }],
  };
}

function partij(id, naam, matenMetNoten, notenbalk = 1) {
  return {
    id,
    naam,
    afkorting: naam,
    instrument: { naam },
    maten: Array.from({ length: 6 }, (_, index) =>
      maat(index + 1, matenMetNoten.includes(index + 1), notenbalk)),
  };
}

test('voegt opeenvolgende stukken van één partij samen', () => {
  const partituur = {
    partijen: [
      partij('P1', 'Solo Eb Horn', [1, 2]),
      partij('P2', 'Voice', [3, 4]),
      partij('P3', 'Voice', [5, 6]),
    ],
  };

  const resultaat = voegSplitsingenSamen(partituur);

  assert.equal(resultaat.samengevoegd, 2);
  assert.equal(resultaat.partituur.partijen.length, 1);
  assert.equal(resultaat.partituur.partijen[0].naam, 'Solo Eb Horn');
  assert.deepEqual(resultaat.partituur.partijen[0].maten.map((waarde) => waarde.noten[0].rust),
    [false, false, false, false, false, false]);
  assert.deepEqual(resultaat.partituur.partijen[0].maten.map((waarde) => waarde.index),
    [0, 1, 2, 3, 4, 5]);
});

test('voegt partijen met noten in dezelfde maat niet samen', () => {
  const partituur = { partijen: [partij('P1', 'Voice', [1]), partij('P2', 'Voice', [1])] };
  const resultaat = voegSplitsingenSamen(partituur);
  assert.equal(resultaat.partituur, partituur);
  assert.equal(resultaat.partituur.partijen.length, 2);
});

test('voegt twee echte instrumenten niet samen', () => {
  const partituur = { partijen: [partij('P1', 'Cornet', [1, 2]), partij('P2', 'Bugel', [3, 4])] };
  const resultaat = voegSplitsingenSamen(partituur);
  assert.equal(resultaat.partituur, partituur);
  assert.equal(resultaat.partituur.partijen.length, 2);
});

test('voegt een partij met twee notenbalken niet samen', () => {
  const eerste = partij('P1', 'Voice', [1, 2]);
  eerste.maten[0].sleutels.push({ notenbalk: 2, soort: 'F' });
  const partituur = { partijen: [eerste, partij('P2', 'Voice', [3, 4])] };
  const resultaat = voegSplitsingenSamen(partituur);
  assert.equal(resultaat.partituur, partituur);
  assert.equal(resultaat.partituur.partijen.length, 2);
});
