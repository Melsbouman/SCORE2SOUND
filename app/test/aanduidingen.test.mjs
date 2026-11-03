import test from 'node:test';
import assert from 'node:assert/strict';
import { AANDUIDINGEN, plaatsingVan } from '../src/model/aanduidingen.mjs';

test('de bibliotheek heeft vier groepen met unieke, niet lege namen', () => {
  assert.deepEqual(Object.keys(AANDUIDINGEN), ['tempo', 'expressie', 'spelwijze', 'dynamiek']);
  for (const lijst of Object.values(AANDUIDINGEN)) {
    assert.ok(lijst.length >= 8);
    assert.equal(new Set(lijst).size, lijst.length);
    assert.ok(lijst.every((naam) => typeof naam === 'string' && naam.trim() !== ''));
  }
  assert.ok(AANDUIDINGEN.tempo.includes('Andante'));
  assert.ok(AANDUIDINGEN.tempo.includes('rit.'));
  assert.ok(AANDUIDINGEN.dynamiek.includes('mf'));
  assert.ok(AANDUIDINGEN.dynamiek.includes('cresc.'));
});

test('tempo, expressie en spelwijze staan boven de balk', () => {
  for (const tekst of ['Andante', 'Andante con espress.', 'rit.', 'a tempo', 'dolce', 'pizz.', 'Tempo I']) {
    assert.equal(plaatsingVan(tekst), 'above', tekst);
  }
});

test('sterkte en cresc. en dim. staan onder de balk', () => {
  for (const tekst of ['p', 'mf', 'ff', 'sfz', 'cresc.', 'dim.', 'decresc.', 'crescendo', 'poco a poco cresc.', 'MF']) {
    assert.equal(plaatsingVan(tekst), 'below', tekst);
  }
});
