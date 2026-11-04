import test from 'node:test';
import assert from 'node:assert/strict';

import { herstelTeksten } from '../src/model/tekstherstel.mjs';

const stuk = (elementen) => ({
  partijen: [{ maten: [{ elementen }] }],
});

test('herstelt verkeerd gelezen tekstaanwijzingen tot aanduidingen uit de lijst', () => {
  const oud = stuk([
    { soort: 'aanwijzing', start: 0, type: 'tekst', waarde: 'poco agitate', zekerheid: 1 },
    { soort: 'aanwijzing', start: 0, type: 'tekst', waarde: 'dolce', zekerheid: 1 },
    { soort: 'aanwijzing', start: 0, type: 'letter', waarde: 'poco agitate', zekerheid: 1 },
  ]);
  const kopie = structuredClone(oud);
  const nieuw = herstelTeksten(oud);
  assert.deepEqual(oud, kopie);
  assert.deepEqual(nieuw.partijen[0].maten[0].elementen.map((e) => [e.type, e.waarde]), [
    ['tekst', 'poco'], ['tekst', 'Agitato'], ['tekst', 'Dolce'], ['letter', 'poco agitate'],
  ]);
});
