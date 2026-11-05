import test from 'node:test';
import assert from 'node:assert/strict';
import { speelVolgorde } from '../src/model/maten.mjs';

test('een lege maatlijst geeft een lege speelvolgorde', () => {
  assert.deepEqual(speelVolgorde([]), []);
});

test('maten zonder herhaling worden een keer in volgorde gespeeld', () => {
  assert.deepEqual(speelVolgorde([{}, {}, {}]), [0, 1, 2]);
});

test('een herhaling zonder beginteken begint bij de eerste maat', () => {
  assert.deepEqual(speelVolgorde([{ herhaling: { eind: true } }, {}, {}]), [0, 0, 1, 2]);
});
