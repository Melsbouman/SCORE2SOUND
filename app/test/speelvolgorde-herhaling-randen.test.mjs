import test from 'node:test';
import assert from 'node:assert/strict';
import { speelVolgorde } from '../src/model/maten.mjs';

test('twee herhalingen na elkaar worden elk een keer herhaald', () => {
  const maten = [
    { herhaling: { begin: true } },
    { herhaling: { eind: true } },
    { herhaling: { begin: true } },
    { herhaling: { eind: true } },
    {},
  ];
  assert.deepEqual(speelVolgorde(maten), [0, 1, 0, 1, 2, 3, 2, 3, 4]);
});

test('een beginteken zonder eindteken speelt gewoon door', () => {
  assert.deepEqual(speelVolgorde([{ herhaling: { begin: true } }, {}]), [0, 1]);
});
