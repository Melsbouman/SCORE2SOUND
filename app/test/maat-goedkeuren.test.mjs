import test from 'node:test';
import assert from 'node:assert/strict';
import { keurMaatGoed } from '../src/model/corrigeren.mjs';

const noot = (start, zekerheid) => ({
  soort: 'noot', start, duur: 480, stem: 1, notenbalk: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid,
});
const maat = (index, elementen) => ({
  nummer: String(index + 1), index, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
  sleutels: [], tempo: null, herhaling: { begin: false, eind: false, keer: 2 }, elementen,
});
const voorbeeld = () => ({
  versie: 1, titel: '', componist: '',
  partijen: [
    { id: 'P1', naam: 'A', afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
      maten: [maat(0, [noot(0, 0.4), { soort: 'rust', start: 480, duur: 480, stem: 1, notenbalk: 1, heleMaat: false, zekerheid: 0.5 }]), maat(1, [noot(0, 0.4)])] },
    { id: 'P2', naam: 'B', afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
      maten: [maat(0, [noot(0, 0.3)])] },
  ],
});

test('keurMaatGoed zet alleen de gekozen maat van de gekozen partij op zeker', () => {
  const oud = voorbeeld();
  const nieuw = keurMaatGoed(oud, 'P1', 0);
  assert.deepEqual(nieuw.partijen[0].maten[0].elementen.map((e) => e.zekerheid), [1, 1]);
  assert.equal(nieuw.partijen[0].maten[1].elementen[0].zekerheid, 0.4);
  assert.equal(nieuw.partijen[1].maten[0].elementen[0].zekerheid, 0.3);
  assert.equal(oud.partijen[0].maten[0].elementen[0].zekerheid, 0.4);
});

test('keurMaatGoed met een onbekende partij of maat verandert niets', () => {
  const oud = voorbeeld();
  assert.deepEqual(keurMaatGoed(oud, 'P9', 0), oud);
  assert.deepEqual(keurMaatGoed(oud, 'P1', 7), oud);
});
