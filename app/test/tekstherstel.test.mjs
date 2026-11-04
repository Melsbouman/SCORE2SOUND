import test from 'node:test';
import assert from 'node:assert/strict';

import { herstelTeksten } from '../src/model/tekstherstel.mjs';

test('herstelt verkeerd gelezen muziektermen in tekstaanwijzingen', () => {
  const partituur = {
    aanwijzingen: [
      { type: 'tekst', waarde: 'poco agitate' },
      { type: 'tekst', waarde: 'dolce' },
      { type: 'letter', waarde: 'poco agitate' },
    ],
  };

  const hersteld = herstelTeksten(partituur);

  assert.deepEqual(hersteld.aanwijzingen, [
    { type: 'tekst', waarde: 'poco agitato' },
    { type: 'tekst', waarde: 'dolce' },
    { type: 'letter', waarde: 'poco agitate' },
  ]);
  assert.deepEqual(partituur.aanwijzingen, [
    { type: 'tekst', waarde: 'poco agitate' },
    { type: 'tekst', waarde: 'dolce' },
    { type: 'letter', waarde: 'poco agitate' },
  ]);
});
