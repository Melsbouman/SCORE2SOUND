import test from 'node:test';
import assert from 'node:assert/strict';
import { lijnStapelsUit } from '../src/model/stapels.mjs';

// Een maat met n noten (en een rust als hij leeg is).
const maat = (n, extra = {}) => ({ elementen: n === 0 ? [{ soort: 'rust' }] : Array.from({ length: n }, () => ({ soort: 'noot' })), ...extra });

test('zonder ontbrekende maten blijft de gewone volgorde', () => {
  const maten = [maat(3), maat(0), maat(4), maat(4)];
  assert.deepEqual(lijnStapelsUit(maten, [3, 0, 4, 4]), [0, 1, 2, 3]);
});

test('een lege stapel waarvoor Audiveris geen maat schreef, wordt een gat; de rest schuift niet op', () => {
  // Op het blad: 4, 5, leeg, 7, 0, 5. In de MusicXML ontbreekt de lege maat.
  const maten = [maat(4), maat(5), maat(7), maat(0), maat(5)];
  assert.deepEqual(lijnStapelsUit(maten, [4, 5, 0, 7, 0, 5]), [0, 1, undefined, 2, 3, 4]);
});

test('onbekende stapels (null) volgen de gewone volgorde', () => {
  const maten = [maat(2), maat(3), maat(1)];
  assert.deepEqual(lijnStapelsUit(maten, [null, null, null]), [0, 1, 2]);
});

test('verborgen en ingevoegde maten doen niet mee', () => {
  const maten = [maat(2), maat(0, { maatrust: 3 }), maat(0, { verborgen: true }), maat(0, { verborgen: true }), maat(0, { ingevoegd: true }), maat(6)];
  assert.deepEqual(lijnStapelsUit(maten, [2, 0, 6]), [0, 1, 5]);
});

test('kleine verschillen in het aantal koppen (herkenningsfouten) laten de volgorde staan', () => {
  const maten = [maat(4), maat(4), maat(3), maat(4)];
  assert.deepEqual(lijnStapelsUit(maten, [4, 5, 3, 4]), [0, 1, 2, 3]);
});
