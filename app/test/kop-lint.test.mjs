import test from 'node:test';
import assert from 'node:assert/strict';
import { vlakkenVoor } from '../public/js/views/kop.js';

test('in de editor zijn het lint, de zoom en de partituur zichtbaar', () => {
  assert.deepEqual(vlakkenVoor('editor'), ['lint', 'zoom', 'weergave']);
});

test('op de andere schermen staat het lint niet', () => {
  for (const scherm of ['begin', 'bibliotheek', 'inloggen', 'instellingen']) assert.ok(!vlakkenVoor(scherm).includes('lint'));
  assert.deepEqual(vlakkenVoor('onbekend'), []);
});
