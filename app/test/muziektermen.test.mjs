import test from 'node:test';
import assert from 'node:assert/strict';

import { verbeterTekst } from '../src/model/muziektermen.mjs';

test('verbetert bijna herkende muziektermen woord voor woord', () => {
  assert.equal(verbeterTekst('teneramenre'), 'teneramente');
  assert.equal(verbeterTekst('poco agitate'), 'poco agitato');
  assert.equal(verbeterTekst('.m0rend0'), '.morendo');
  assert.equal(verbeterTekst('pocorit.'), 'pocorit.');
  assert.equal(verbeterTekst('Tempol'), 'Tempo I');
});

test('laat tekst die niet verbeterd hoeft te worden ongemoeid', () => {
  assert.equal(verbeterTekst('teneramente'), 'teneramente');
  assert.equal(verbeterTekst('Allegro ritmico'), 'Allegro ritmico');
  assert.equal(verbeterTekst('123'), '123');
  assert.equal(verbeterTekst('vliegtuig'), 'vliegtuig');
});
