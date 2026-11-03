import test from 'node:test';
import assert from 'node:assert/strict';
import { kopieerMaat } from '../src/model/corrigeren.mjs';

const noot = (start) => ({
  soort: 'noot', start, duur: 480, stem: 1, notenbalk: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 1,
});
const maat = (index, elementen) => ({
  nummer: String(index + 1), index, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
  sleutels: [], tempo: null, herhaling: { begin: false, eind: false, keer: 2 }, elementen,
});
const voorbeeld = () => ({
  versie: 1, titel: '', componist: '',
  partijen: [{ id: 'P1', naam: 'A', afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
    maten: [maat(0, [noot(0), noot(480)]), maat(1, [])] }],
});

test('kopieerMaat zet de elementen van de ene maat in de andere, als echte kopie', () => {
  const oud = voorbeeld();
  const nieuw = kopieerMaat(oud, 'P1', 0, 1);
  assert.deepEqual(nieuw.partijen[0].maten[1].elementen, oud.partijen[0].maten[0].elementen);
  assert.notEqual(nieuw.partijen[0].maten[1].elementen[0], nieuw.partijen[0].maten[0].elementen[0]);
  assert.equal(nieuw.partijen[0].maten[1].nummer, '2');
  assert.deepEqual(oud.partijen[0].maten[1].elementen, []);
});

test('kopieerMaat met een onbekende partij of maat verandert niets', () => {
  const oud = voorbeeld();
  assert.deepEqual(kopieerMaat(oud, 'P9', 0, 1), oud);
  assert.deepEqual(kopieerMaat(oud, 'P1', 0, 7), oud);
  assert.deepEqual(kopieerMaat(oud, 'P1', 5, 1), oud);
});
