import test from 'node:test';
import assert from 'node:assert/strict';
import { herstelMuziekterm } from '../src/model/muziektermen.mjs';

test('herstelMuziekterm: exacte spelling van nieuwe tempo-termen', () => {
  assert.equal(herstelMuziekterm('Allegretto'), 'Allegretto');
  assert.equal(herstelMuziekterm('Larghetto'), 'Larghetto');
  assert.equal(herstelMuziekterm('Andantino'), 'Andantino');
});

test('herstelMuziekterm: bestaande tempo-termen blijven ongewijzigd', () => {
  assert.equal(herstelMuziekterm('Moderato'), 'Moderato');
  assert.equal(herstelMuziekterm('Maestoso'), 'Maestoso');
});

test('herstelMuziekterm: typfouten in bestaande termen worden nog steeds gecorrigeerd', () => {
  assert.equal(herstelMuziekterm('Aliegro'), 'allegro');
});