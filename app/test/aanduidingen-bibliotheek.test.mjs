import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { AANDUIDINGEN, plaatsingVan, uitlegVan } from '../src/model/aanduidingen.mjs';
import { AANDUIDINGENLIJST } from '../src/model/aanduidingenlijst.mjs';

test('de bibliotheek heeft dezelfde acht groepen als de vaste lijst van Mels, in dezelfde volgorde', () => {
  assert.deepEqual(Object.keys(AANDUIDINGEN), [
    'Tempo', 'Tempoveranderingen', 'Dynamiek', 'Volumeveranderingen', 'Articulatie', 'Karakter en stijl', 'Structuur en navigatie', 'Toevoegingen',
  ]);
});

test('elke aanduiding uit de lijst staat in de bibliotheek: dynamiek en volume met hun afkorting, de rest met de naam', () => {
  for (const item of AANDUIDINGENLIJST) {
    const verwacht = ['Dynamiek', 'Volumeveranderingen'].includes(item.groep) ? item.afkorting : item.naam;
    assert.ok(AANDUIDINGEN[item.groep].includes(verwacht), `${item.groep}: ${verwacht} ontbreekt`);
  }
  assert.equal(Object.values(AANDUIDINGEN).flat().length, AANDUIDINGENLIJST.length);
});

test('uitlegVan geeft de uitleg uit de lijst voor een naam en voor een afkorting', () => {
  assert.equal(uitlegVan('Marcato'), 'Elke noot extra benadrukken en aanzetten');
  assert.equal(uitlegVan('mf'), 'Matig hard');
  assert.equal(uitlegVan('cresc.'), 'Geleidelijk luider worden');
  assert.equal(uitlegVan('rit.'), 'Vertragen');
  assert.equal(uitlegVan('onbekend woord'), '');
});

test('de plaatsing blijft: sterkte en volume onder de balk, de rest erboven', () => {
  for (const term of ['mf', 'ff', 'cresc.', 'dim.', 'decresc.', 'sfz']) assert.equal(plaatsingVan(term), 'below', term);
  for (const term of ['Andante', 'Marcato', 'Dolce', 'Rubato', 'Fine']) assert.equal(plaatsingVan(term), 'above', term);
});

test('de knoppen in de editor krijgen de uitleg als tooltip', async () => {
  const bron = await readFile(new URL('../public/js/views/aanduidingen.js', import.meta.url), 'utf8');
  assert.ok(bron.includes('uitlegVan'));
  assert.ok(/title/.test(bron));
});
