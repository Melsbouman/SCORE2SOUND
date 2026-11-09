import assert from 'node:assert/strict';
import test from 'node:test';

import { woordenNaarMaten } from '../src/model/tekstlezerwoorden.mjs';

const partituur = {
  partijen: [{
    maten: [
      { elementen: [{ soort: 'noot', plek: { blad: 1, x: 100, y: 500 } }] },
      { elementen: [{ soort: 'noot', plek: { blad: 1, x: 400, y: 500 } }] },
      { elementen: [{ soort: 'noot', plek: { blad: 1, x: 700, y: 500 } }] },
    ],
  }],
};

const ocrPerBlad = [{
  blad: 1,
  regels: [{
    tekst: 'Marcato',
    woorden: [{ tekst: 'Marcato', x: 410, y: 400, breedte: 80, hoogte: 20 }],
  }],
}];

test('woordenNaarMaten zet een aanwijzing bij de maat onder het OCR-woord zonder duplicaat', () => {
  const eenmaal = woordenNaarMaten(partituur, ocrPerBlad);
  const tweemaal = woordenNaarMaten(eenmaal, ocrPerBlad);
  const verwacht = { soort: 'aanwijzing', type: 'tekst', waarde: 'Marcato', start: 0, zekerheid: 0.6 };

  assert.deepEqual(eenmaal.partijen[0].maten[1].elementen.at(-1), verwacht);
  assert.equal(tweemaal.partijen[0].maten[1].elementen.filter((element) => element.waarde === 'Marcato').length, 1);
});
