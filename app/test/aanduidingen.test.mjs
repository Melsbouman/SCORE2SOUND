import test from 'node:test';
import assert from 'node:assert/strict';
import { AANDUIDINGEN, uitlegVan } from '../src/model/aanduidingen.mjs';

test('aanduidingen zijn verdeeld over de acht vaste groepen', () => {
  assert.deepEqual(Object.keys(AANDUIDINGEN), [
    'Tempo',
    'Tempoveranderingen',
    'Dynamiek',
    'Volumeveranderingen',
    'Articulatie',
    'Karakter en stijl',
    'Structuur en navigatie',
    'Toevoegingen',
  ]);
});

test('aanduidingen hebben uitleg', () => {
  assert.equal(uitlegVan('Andante').length > 0, true);
  assert.equal(uitlegVan('mf'), 'Matig hard');
});
