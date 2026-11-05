import test from 'node:test';
import assert from 'node:assert/strict';

import { kiesBladindeling } from '../src/export/bladverdeling.mjs';

const partituurMetPartijen = (aantal) => ({
  partijen: Array.from({ length: aantal }, (_, index) => ({
    id: `partij-${index + 1}`,
    maten: [],
  })),
});

test('24 partijen worden over twee groepen verdeeld', () => {
  const groepen = kiesBladindeling(partituurMetPartijen(24));

  assert.equal(groepen.length, 2);
});

test('3 partijen blijven in een groep', () => {
  const groepen = kiesBladindeling(partituurMetPartijen(3));

  assert.equal(groepen.length, 1);
});

test('de groepen bevatten samen alle partijen', () => {
  const partituur = partituurMetPartijen(24);
  const groepen = kiesBladindeling(partituur);

  assert.equal(
    groepen.reduce((totaal, groep) => totaal + groep.partijen.length, 0),
    partituur.partijen.length,
  );
});
