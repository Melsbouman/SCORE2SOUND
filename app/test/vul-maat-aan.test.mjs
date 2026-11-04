import test from 'node:test';
import assert from 'node:assert/strict';
import { vulMaatAan } from '../src/model/corrigeren.mjs';

const noot = (start, duur) => ({
  soort: 'noot', start, duur, stem: 1, notenbalk: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 1,
});
const stuk = (elementen) => ({
  versie: 1, titel: '', componist: '',
  partijen: [{ id: 'P1', naam: 'A', afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
    maten: [{ nummer: '1', index: 0, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
      sleutels: [], tempo: null, herhaling: { begin: false, eind: false, keer: 2 }, elementen }] }],
});

test('een te korte maat wordt aan het eind met een rust aangevuld', () => {
  const oud = stuk([noot(0, 480), noot(480, 480)]);
  const nieuw = vulMaatAan(oud, 'P1', 0);
  const e = nieuw.partijen[0].maten[0].elementen;
  assert.equal(e.length, 3);
  assert.deepEqual(e[2], { soort: 'rust', start: 960, duur: 960, stem: 1, notenbalk: 1, heleMaat: false, zekerheid: 1 });
  assert.equal(oud.partijen[0].maten[0].elementen.length, 2);
});

test('een volle maat, een te volle maat en een onbekende partij of maat veranderen niets', () => {
  const vol = stuk([noot(0, 960), noot(960, 960)]);
  assert.deepEqual(vulMaatAan(vol, 'P1', 0), vol);
  const teVol = stuk([noot(0, 1920), noot(1920, 480)]);
  assert.deepEqual(vulMaatAan(teVol, 'P1', 0), teVol);
  assert.deepEqual(vulMaatAan(vol, 'P9', 0), vol);
  assert.deepEqual(vulMaatAan(vol, 'P1', 5), vol);
});

test('een lege maat krijgt een rust voor de hele maat', () => {
  const nieuw = vulMaatAan(stuk([]), 'P1', 0);
  assert.deepEqual(nieuw.partijen[0].maten[0].elementen, [{ soort: 'rust', start: 0, duur: 1920, stem: 1, notenbalk: 1, heleMaat: true, zekerheid: 1 }]);
});
