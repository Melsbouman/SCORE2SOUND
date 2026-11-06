import test from 'node:test';
import assert from 'node:assert/strict';

import { tempoVoorWoord } from '../src/model/tempotekst.mjs';

test('tempoVoorWoord geeft het tempo voor bekende tempowoorden', () => {
  assert.equal(tempoVoorWoord('Allegro'), 120);
  assert.equal(tempoVoorWoord('allegro'), 120);
  assert.equal(tempoVoorWoord('Andante'), 76);
  assert.equal(tempoVoorWoord('Presto'), 180);
  assert.equal(tempoVoorWoord('Largo'), 50);
  assert.equal(tempoVoorWoord('Lento'), 56);
  assert.equal(tempoVoorWoord('Moderato'), 100);
  assert.equal(tempoVoorWoord('Adagio'), 66);
  assert.equal(tempoVoorWoord('Vivace'), 160);
});

test('tempoVoorWoord geeft null voor een onbekend woord', () => {
  assert.equal(tempoVoorWoord('onbekend'), null);
});
