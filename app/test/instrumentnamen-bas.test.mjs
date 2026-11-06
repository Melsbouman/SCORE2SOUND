import test from 'node:test';
import assert from 'node:assert/strict';

import { herstelInstrumentnamen } from '../src/model/instrumentnamen.mjs';

test('instrumentnamen bas', () => {
  const namen = [
    'BBb Bass',
    'Eb Bass',
    'BB♭ Bass',
    'Bb Bass',
    'Basses'
  ];
  const verwacht = [
    'BBb Bass',
    'Eb Bass',
    'BBb Bass',
    'Bb Bass',
    'Bass'
  ];
  assert.deepEqual(herstelInstrumentnamen(namen), verwacht);
});