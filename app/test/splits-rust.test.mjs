import test from 'node:test';
import assert from 'node:assert/strict';
import { splitsRust, zoekElement } from '../src/model/corrigeren.mjs';

const rust = (start, duur) => ({ soort: 'rust', start, duur, stem: 1, notenbalk: 1, heleMaat: false, zekerheid: 1 });
const noot = (start, duur) => ({
  soort: 'noot', start, duur, stem: 1, notenbalk: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 1,
});
const stuk = () => ({
  versie: 1, titel: '', componist: '',
  partijen: [{ id: 'P1', naam: 'A', afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
    maten: [{ nummer: '1', index: 0, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
      sleutels: [], tempo: null, herhaling: { begin: false, eind: false, keer: 2 }, elementen: [rust(0, 960), noot(960, 960)] }] }],
});

test('een rust wordt twee rusten met de halve duur, in dezelfde volgorde', () => {
  const oud = stuk();
  const nieuw = splitsRust(oud, 'n-P1-0-0');
  const elementen = nieuw.partijen[0].maten[0].elementen;
  assert.equal(elementen.length, 3);
  assert.deepEqual(elementen[0], rust(0, 480));
  assert.deepEqual(elementen[1], rust(480, 480));
  assert.equal(elementen[2].soort, 'noot');
  assert.equal(elementen[2].start, 960);
  assert.equal(oud.partijen[0].maten[0].elementen.length, 2);
});

test('een noot, een onbekende id of een oneven duur verandert niets', () => {
  const oud = stuk();
  assert.deepEqual(splitsRust(oud, 'n-P1-0-1'), oud);
  assert.deepEqual(splitsRust(oud, 'n-P9-0-0'), oud);
  const oneven = stuk();
  oneven.partijen[0].maten[0].elementen[0] = rust(0, 5);
  assert.deepEqual(splitsRust(oneven, 'n-P1-0-0'), oneven);
  assert.equal(zoekElement(splitsRust(oud, 'n-P1-0-1'), 'n-P1-0-1').soort, 'noot');
});
