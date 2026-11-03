import test from 'node:test';
import assert from 'node:assert/strict';
import { stemmingNaam, partijTitel } from '../src/model/stemming.mjs';

test('stemmingNaam geeft de toon van een transponerend instrument', () => {
  assert.equal(stemmingNaam({ chromatisch: -2, diatonisch: -1 }), 'B♭');
  assert.equal(stemmingNaam({ chromatisch: -9, diatonisch: -5 }), 'E♭');
  assert.equal(stemmingNaam({ chromatisch: -3, diatonisch: -2 }), 'A');
  assert.equal(stemmingNaam({ chromatisch: -7, diatonisch: -4 }), 'F');
  assert.equal(stemmingNaam({ chromatisch: -14, diatonisch: -8 }), 'B♭');
});

test('stemmingNaam is null in C, zonder transpositie of bij iets onbekends', () => {
  assert.equal(stemmingNaam({ chromatisch: 0, diatonisch: 0 }), null);
  assert.equal(stemmingNaam(undefined), null);
  assert.equal(stemmingNaam({ chromatisch: -1, diatonisch: 0 }), null);
});

test('partijTitel zet de stemming achter de naam', () => {
  assert.equal(partijTitel({ naam: 'Flugelhorn 1', instrument: { transpositie: { chromatisch: -2, diatonisch: -1 } } }), 'Flugelhorn 1 in B♭');
  assert.equal(partijTitel({ naam: 'Fluit', instrument: { transpositie: { chromatisch: 0, diatonisch: 0 } } }), 'Fluit');
  assert.equal(partijTitel({ naam: '', instrument: { transpositie: { chromatisch: -2, diatonisch: -1 } } }), '');
});
