import test from 'node:test';
import assert from 'node:assert/strict';
import { herstelInstrumentnamen } from '../src/model/instrumentnamen.mjs';

test('instrumentnamen-volledig: Tenor Trombone, Bass Trombone, EEb Tuba, Eb Tuba, Horn in Eb worden hersteld', () => {
  const result = herstelInstrumentnamen(['Tenor Trombone', 'Bass Trombone', 'EEb Tuba', 'Eb Tuba', 'Horn in Eb']);
  assert.deepStrictEqual(result, ['Tenor Trombone', 'Bass Trombone', 'EEb Tuba', 'Eb Tuba', 'Horn in Eb']);
});