import test from 'node:test';
import assert from 'node:assert/strict';

import { herstelMuziekterm } from '../src/model/muziektermen.mjs';

test('herstelt duidelijk verkeerd gelezen muziektermen', () => {
  assert.equal(herstelMuziekterm('poco agitate'), 'poco agitato');
  assert.equal(herstelMuziekterm('.m0rend0'), 'morendo');
});

test('behoudt correcte en onbekende tekst', () => {
  assert.equal(herstelMuziekterm('dolce'), 'dolce');
  assert.equal(herstelMuziekterm('xyzqwerty'), 'xyzqwerty');
});

test('marc. (speelwijze: marcato) wordt hersteld uit mare en marc', () => {
  assert.equal(herstelMuziekterm('mare'), 'marc.');
  assert.equal(herstelMuziekterm('marc'), 'marc.');
  assert.equal(herstelMuziekterm('marc.'), 'marc.');
});
