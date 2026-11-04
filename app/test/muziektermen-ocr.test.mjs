import test from 'node:test';
import assert from 'node:assert/strict';

import { herstelMuziekterm } from '../src/model/muziektermen.mjs';

test('herstelt OCR-fouten in muziektermen uit een kleine partituur', () => {
  const partituur = {
    partijen: [{
      maten: ['teneramenre', 'poco agitate', '.m0rend0', 'dirn.'].map((waarde) => ({
        aanwijzingen: [{ soort: 'aanwijzing', type: 'tekst', waarde }],
      })),
    }],
  };

  const termen = partituur.partijen[0].maten
    .map((maat) => herstelMuziekterm(maat.aanwijzingen[0].waarde));

  assert.deepEqual(termen, ['teneramente', 'poco agitato', 'morendo', 'dim.']);
});
