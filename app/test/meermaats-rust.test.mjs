import assert from 'node:assert/strict';
import test from 'node:test';

import { vulOntbrekendeMaten } from '../src/model/ontbrekend.mjs';
import { stapelKaart } from '../src/model/stapels.mjs';

const rust = { soort: 'rust', start: 0, duur: 1920, stem: 1, notenbalk: 1, heleMaat: true, zekerheid: 1 };
const cijfer = (waarde) => ({ soort: 'aanwijzing', start: 0, type: 'letter', waarde, zekerheid: 1 });
const maat = (nummer, elementen) => ({
  nummer: String(nummer), index: nummer - 1, opmaat: false, maatsoort: { teller: 4, noemer: 4 },
  toonsoort: { kwinten: 0, modus: 'majeur' }, sleutels: [], tempo: null,
  herhaling: { begin: false, eind: false, keer: 2 }, elementen,
});

test('het cijfer boven een hele-maatrust bepaalt het aantal maten', () => {
  const partituur = {
    partijen: [{ maten: [
      maat(1, [rust, cijfer('3')]),
      maat(2, [{ soort: 'noot', start: 0, duur: 480 }]),
    ] }],
  };

  const maten = vulOntbrekendeMaten(partituur).partijen[0].maten;

  assert.equal(maten.length, 4);
  assert.equal(maten[0].maatrust, 3);
  assert.deepEqual(maten.slice(1, 3).map((huidige) => huidige.verborgen), [true, true]);
  assert.equal(maten[0].elementen.some((element) => element.type === 'letter'), false);
  assert.deepEqual(stapelKaart(maten), [0, 3]);
});
