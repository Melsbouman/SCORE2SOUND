import test from 'node:test';
import assert from 'node:assert/strict';

import { herstelInstrumentnamen } from '../src/model/instrumentnamen.mjs';

test('herstelt bekende slagwerknamen naar Percussion', () => {
  assert.deepEqual(herstelInstrumentnamen([
    'Drums',
    'Xylophone',
    'Snare Drum',
    'Bass Drum',
    'Cymbals',
    'Glockenspiel',
    'Tambourine',
    'Triangle',
  ]), [
    'Percussion',
    'Percussion',
    'Percussion',
    'Percussion',
    'Percussion',
    'Percussion',
    'Percussion',
    'Percussion',
  ]);
});

test('behoudt namen van blaasinstrumenten', () => {
  assert.deepEqual(herstelInstrumentnamen(['Flugelhorn', 'Solo Cornet']), [
    'Flugelhorn',
    'Solo Cornet',
  ]);
});
