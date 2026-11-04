import test from 'node:test';
import assert from 'node:assert/strict';
import { plaatsingVan } from '../src/model/aanduidingen.mjs';

test('dynamiek en volumeveranderingen staan onder de balk', () => {
  for (const term of ['mf', 'ff', 'cresc.', 'dim.', 'decresc.', 'sfz']) {
    assert.equal(plaatsingVan(term), 'below');
  }
});

test('andere aanduidingen staan boven de balk', () => {
  for (const term of ['Andante', 'Marcato', 'Dolce', 'Rubato', 'Fine']) {
    assert.equal(plaatsingVan(term), 'above');
  }
});
