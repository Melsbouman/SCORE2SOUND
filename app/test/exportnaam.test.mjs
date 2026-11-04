import test from 'node:test';
import assert from 'node:assert/strict';
import { exportNaam } from '../src/model/exportnaam.mjs';

const partij = (naam, chromatisch = 0) => ({ naam, instrument: { midiProgramma: 56, transpositie: { chromatisch, diatonisch: 0 } } });

test('titel in hoofdletters wordt netjes en de naam begint met S2S', () => {
  assert.equal(exportNaam({ titel: 'GALOP', partijen: [] }, { extensie: 'pdf' }), 'S2S - Galop.pdf');
});

test('titel, componist, arrangeur en partij komen allemaal in de naam', () => {
  const naam = exportNaam({ titel: 'GALOP', componist: 'D. Shostakowich', arrangeur: 'M. Bouman', partijen: [partij('2nd Cornet', -2)] }, { extensie: 'pdf' });
  assert.equal(naam, 'S2S - Galop - D. Shostakowich (arr. M. Bouman) - 2nd Cornet in Bb.pdf');
});

test('ontbrekende onderdelen worden weggelaten en een titel met kleine letters blijft zoals hij is', () => {
  assert.equal(exportNaam({ titel: 'Sand and Stars', componist: 'Thierry Deleruyelle', partijen: [partij('A'), partij('B')] }), 'S2S - Sand and Stars - Thierry Deleruyelle');
  assert.equal(exportNaam({}), 'S2S - partituur');
});

test('tekens die Windows niet toestaat verdwijnen en de naam blijft korter dan 100 tekens', () => {
  const naam = exportNaam({ titel: 'Rock: live? <1>', componist: 'A/B', partijen: [] });
  assert.ok(!/[:?*"<>|\/\\]/.test(naam));
  assert.ok(exportNaam({ titel: 'x'.repeat(300) }).length <= 100);
});
