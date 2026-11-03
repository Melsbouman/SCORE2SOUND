import test from 'node:test';
import assert from 'node:assert/strict';
import { speelVolgorde } from '../src/model/maten.mjs';

const maat = (herhaling) => (herhaling ? { herhaling } : {});

test('een lege lijst geeft een lege volgorde', () => {
  assert.deepEqual(speelVolgorde([]), []);
});

test('twee herhalingen na elkaar worden elk apart herhaald', () => {
  const maten = [maat({ begin: true }), maat({ eind: true, keer: 2 }), maat({ begin: true }), maat({ eind: true, keer: 2 })];
  assert.deepEqual(speelVolgorde(maten), [0, 1, 0, 1, 2, 3, 2, 3]);
});

test('een herhaling met keer 3 wordt drie keer gespeeld', () => {
  const maten = [maat({ begin: true }), maat({ eind: true, keer: 3 })];
  assert.deepEqual(speelVolgorde(maten), [0, 1, 0, 1, 0, 1]);
});
