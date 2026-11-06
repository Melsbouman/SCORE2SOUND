import test from 'node:test';
import assert from 'node:assert/strict';
import { herstelInstrumentnamen } from '../src/model/instrumentnamen.mjs';

test('instrumentnamen: Tenor Trombone, Bass Trombone, EEb Tuba, Eb Tuba, Horn in Eb', () => {
  const result = herstelInstrumentnamen(['Tenor Trombone', 'Bass Trombone', 'EEb Tuba', 'Eb Tuba', 'Horn in Eb']);
  assert.deepEqual(result, ['Tenor Trombone', 'Bass Trombone', 'Tuba', 'Eb Tuba', 'Horn in Eb']);
});