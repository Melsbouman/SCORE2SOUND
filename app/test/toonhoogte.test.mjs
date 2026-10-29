import test from 'node:test';
import assert from 'node:assert/strict';
import { naarMidi, vanMidi, halveTonen, transponeer, naam } from '../src/model/toonhoogte.mjs';

const t = (stap, alter, octaaf) => ({ stap, alter, octaaf });

test('naarMidi: de centrale C is 60', () => {
  assert.equal(naarMidi(t('C', 0, 4)), 60);
  assert.equal(naarMidi(t('A', 0, 4)), 69);
  assert.equal(naarMidi(t('F', 1, 5)), 78);
  assert.equal(naarMidi(t('B', -1, 3)), 58);
  assert.equal(naarMidi(t('C', -1, 4)), 59);
  assert.equal(naarMidi(t('B', 1, 3)), 60);
  assert.equal(naarMidi(t('C', 0, -1)), 0);
});

test('naarMidi: een onbekende stap of alter is een fout', () => {
  assert.throws(() => naarMidi(t('H', 0, 4)));
  assert.throws(() => naarMidi(t('C', 3, 4)));
});

test('vanMidi: spelt met kruisen, of met mollen als je dat vraagt', () => {
  assert.deepEqual(vanMidi(60), t('C', 0, 4));
  assert.deepEqual(vanMidi(61), t('C', 1, 4));
  assert.deepEqual(vanMidi(61, 'mol'), t('D', -1, 4));
  assert.deepEqual(vanMidi(70, 'mol'), t('B', -1, 4));
  assert.deepEqual(vanMidi(71), t('B', 0, 4));
  assert.deepEqual(vanMidi(0), t('C', 0, -1));
});

test('halveTonen: het verschil tussen twee toonhoogtes', () => {
  assert.equal(halveTonen(t('C', 0, 4), t('G', 0, 4)), 7);
  assert.equal(halveTonen(t('G', 0, 4), t('C', 0, 4)), -7);
  assert.equal(halveTonen(t('E', 0, 4), t('F', 0, 4)), 1);
});

test('transponeer: diatonisch de stap, chromatisch het voorteken', () => {
  // Althoorn in Es: genoteerd C5 klinkt als Es4.
  assert.deepEqual(transponeer(t('C', 0, 5), { chromatisch: -9, diatonisch: -5 }), t('E', -1, 4));
  // Bugel in Bes: genoteerd D4 klinkt als C4.
  assert.deepEqual(transponeer(t('D', 0, 4), { chromatisch: -2, diatonisch: -1 }), t('C', 0, 4));
  assert.deepEqual(transponeer(t('F', 1, 4), { chromatisch: 2, diatonisch: 1 }), t('G', 1, 4));
  assert.deepEqual(transponeer(t('B', 0, 3), { chromatisch: 1, diatonisch: 1 }), t('C', 0, 4));
  assert.deepEqual(transponeer(t('E', 0, 4), { chromatisch: 0, diatonisch: 0 }), t('E', 0, 4));
});

test('naam: Nederlandse notennamen met octaaf', () => {
  assert.equal(naam(t('C', 0, 4)), 'C4');
  assert.equal(naam(t('F', 1, 4)), 'Fis4');
  assert.equal(naam(t('B', -1, 3)), 'Bes3');
  assert.equal(naam(t('B', 0, 3)), 'B3');
  assert.equal(naam(t('E', -1, 4)), 'Es4');
  assert.equal(naam(t('A', -1, 4)), 'As4');
  assert.equal(naam(t('D', -1, 5)), 'Des5');
  assert.equal(naam(t('F', 2, 4)), 'Fisis4');
  assert.equal(naam(t('E', -2, 4)), 'Eses4');
  assert.equal(naam(t('B', -2, 3)), 'Beses3');
});
