import test from 'node:test';
import assert from 'node:assert/strict';
import { verplaatsNoot, zoekElement } from '../src/model/corrigeren.mjs';

const noot = (start, duur, stap = 'C') => ({
  soort: 'noot', start, duur, stem: 1, notenbalk: 1, toonhoogte: { stap, alter: 0, octaaf: 5 }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: ['staccato'], legato: { begin: false, eind: false }, versiering: null, zekerheid: 0.4,
});
const rust = (start, duur) => ({ soort: 'rust', start, duur, stem: 1, notenbalk: 1, heleMaat: false, zekerheid: 1 });
const maat = (index, elementen) => ({
  nummer: String(index + 1), index, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
  sleutels: [], tempo: null, herhaling: { begin: false, eind: false, keer: 2 }, elementen,
});
const stuk = () => ({
  versie: 1, titel: '', componist: '',
  partijen: [{ id: 'P1', naam: 'A', afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
    maten: [maat(0, [noot(0, 480, 'E'), rust(480, 480), noot(960, 960, 'G')]), maat(1, [rust(0, 480), noot(480, 1440, 'A')])] }],
});

test('een noot wisselt van plaats met een rust van dezelfde duur in dezelfde maat', () => {
  const oud = stuk();
  const nieuw = verplaatsNoot(oud, 'n-P1-0-0', 'n-P1-0-1');
  assert.deepEqual(zoekElement(nieuw, 'n-P1-0-0'), { soort: 'rust', start: 0, duur: 480, stem: 1, notenbalk: 1, heleMaat: false, zekerheid: 1 });
  const verplaatst = zoekElement(nieuw, 'n-P1-0-1');
  assert.equal(verplaatst.soort, 'noot');
  assert.equal(verplaatst.start, 480);
  assert.equal(verplaatst.duur, 480);
  assert.equal(verplaatst.toonhoogte.stap, 'E');
  assert.deepEqual(verplaatst.articulaties, ['staccato']);
  assert.equal(verplaatst.zekerheid, 0.4);
  assert.equal(zoekElement(oud, 'n-P1-0-0').soort, 'noot');
});

test('verplaatsen naar een rust in een andere maat van dezelfde partij kan ook', () => {
  const nieuw = verplaatsNoot(stuk(), 'n-P1-0-0', 'n-P1-1-0');
  assert.equal(zoekElement(nieuw, 'n-P1-0-0').soort, 'rust');
  const doel = zoekElement(nieuw, 'n-P1-1-0');
  assert.equal(doel.soort, 'noot');
  assert.equal(doel.start, 0);
  assert.equal(doel.toonhoogte.stap, 'E');
});

test('een andere duur, een doel dat geen rust is, hetzelfde element of een onbekende id verandert niets', () => {
  const oud = stuk();
  assert.deepEqual(verplaatsNoot(oud, 'n-P1-0-2', 'n-P1-0-1'), oud);
  assert.deepEqual(verplaatsNoot(oud, 'n-P1-0-0', 'n-P1-0-2'), oud);
  assert.deepEqual(verplaatsNoot(oud, 'n-P1-0-0', 'n-P1-0-0'), oud);
  assert.deepEqual(verplaatsNoot(oud, 'n-P9-0-0', 'n-P1-0-1'), oud);
  assert.deepEqual(verplaatsNoot(oud, 'n-P1-0-1', 'n-P1-0-0'), oud);
});
