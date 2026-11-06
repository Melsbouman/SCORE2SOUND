import test from 'node:test';
import assert from 'node:assert/strict';
import { zoekWerken, uitgelicht, componisten } from '../src/model/ontdekken.mjs';

const WERKEN = [
  { id: 'a', titel: 'Die Nacht', componist: 'Franz Schubert', reeks: '' },
  { id: 'b', titel: 'Nächtliche Fahrt', componist: 'Felix Mendelssohn', reeks: 'Lieder' },
  { id: 'c', titel: 'Erlkönig', componist: 'Franz Schubert', reeks: '' },
  { id: 'd', titel: 'Mondnacht', componist: 'Robert Schumann', reeks: 'Liederkreis' },
  { id: 'e', titel: 'Widmung', componist: 'Robert Schumann', reeks: '' },
];

test('zoekWerken is hoofdletter- en accentongevoelig en eist alle woorden', () => {
  assert.deepEqual(zoekWerken(WERKEN, 'SCHUBERT').map((w) => w.id), ['a', 'c']);
  assert.deepEqual(zoekWerken(WERKEN, 'franz nacht').map((w) => w.id), ['a']);
  assert.deepEqual(zoekWerken(WERKEN, 'nachtliche').map((w) => w.id), ['b']);
  assert.deepEqual(zoekWerken(WERKEN, 'erlkonig').map((w) => w.id), ['c']);
  assert.deepEqual(zoekWerken(WERKEN, '   '), []);
  assert.equal(zoekWerken(WERKEN, 'r', { max: 2 }).length, 2);
});

test('uitgelicht is voor een dag steeds hetzelfde en wisselt per dag', () => {
  assert.deepEqual(uitgelicht(WERKEN, 3, 5).map((w) => w.id), uitgelicht(WERKEN, 3, 5).map((w) => w.id));
  assert.notEqual(uitgelicht(WERKEN, 1, 0)[0].id, uitgelicht(WERKEN, 1, 1)[0].id);
  assert.equal(uitgelicht(WERKEN, 10, 2).length, 5);
  assert.deepEqual(uitgelicht([], 3, 1), []);
});

test('componisten telt en sorteert op aantal en dan naam', () => {
  assert.deepEqual(componisten(WERKEN), [
    { naam: 'Franz Schubert', aantal: 2 },
    { naam: 'Robert Schumann', aantal: 2 },
    { naam: 'Felix Mendelssohn', aantal: 1 },
  ]);
});
