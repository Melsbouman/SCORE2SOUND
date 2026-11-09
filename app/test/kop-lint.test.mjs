import test from 'node:test';
import assert from 'node:assert/strict';
import { vlakkenVoor } from '../public/js/views/kop.js';

test('in de editor zijn het lint, de paletten, de zoom, de partituur en de afspeelbalk zichtbaar', () => {
  assert.deepEqual(vlakkenVoor('editor'), ['lint', 'paletten', 'zoom', 'weergave', 'speler']);
});

test('op de andere schermen staat het lint niet', () => {
  for (const scherm of ['begin', 'bibliotheek', 'inloggen', 'instellingen']) assert.ok(!vlakkenVoor(scherm).includes('lint'));
  assert.deepEqual(vlakkenVoor('onbekend'), []);
});
