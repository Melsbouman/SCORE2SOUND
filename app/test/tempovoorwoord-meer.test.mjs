import { test } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { tempoVoorWoord } from '../src/model/tempotekst.mjs';

test('tempoVoorWoord returns 108 for Allegretto', () => {
  assert.strictEqual(tempoVoorWoord('Allegretto'), 108);
});

test('tempoVoorWoord returns 60 for larghetto', () => {
  assert.strictEqual(tempoVoorWoord('larghetto'), 60);
});

test('tempoVoorWoord returns 84 for Andantino', () => {
  assert.strictEqual(tempoVoorWoord('Andantino'), 84);
});

test('tempoVoorWoord returns 80 for Maestoso', () => {
  assert.strictEqual(tempoVoorWoord('Maestoso'), 80);
});

test('tempoVoorWoord returns 120 for existing Allegro', () => {
  assert.strictEqual(tempoVoorWoord('Allegro'), 120);
});