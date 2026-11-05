import test from 'node:test';
import assert from 'node:assert/strict';

import { herstelInstrumentnamen } from '../src/model/instrumentnamen.mjs';

test('herstelt gelezen instrumentnamen naar bestaande namen', () => {
  const namen = [
    'Eb Comet',
    'Fliigelhom 1',
    ', Fliigelhom 2',
    'Fliigelhom 3',
    'Horn 1 Kb',
    'Hnm2 Eb',
    "Ham's Eb_",
    'Trumpet 1',
    'Tmmbbne 1 C',
    'Trombone 2 C',
  ];

  assert.deepEqual(herstelInstrumentnamen(namen), [
    'Eb Cornet',
    'Flugelhorn 1',
    'Flugelhorn 2',
    'Flugelhorn 3',
    'Horn 1 Eb',
    'Horn 2 Eb',
    'Horn 3 Eb',
    'Trumpet 1',
    'Trombone 1 C',
    'Trombone 2 C',
  ]);
});
