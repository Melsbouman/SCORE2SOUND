import test from 'node:test';
import assert from 'node:assert/strict';
import { voegAanwijzingToe, verwijderAanwijzing } from '../src/model/corrigeren.mjs';

const noot = (start) => ({
  soort: 'noot', start, duur: 480, stem: 1, notenbalk: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 1,
});
const voorbeeld = () => ({
  versie: 1, titel: '', componist: '',
  partijen: [{ id: 'P1', naam: 'A', afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
    maten: [{ nummer: '1', index: 0, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
      sleutels: [], tempo: null, herhaling: { begin: false, eind: false, keer: 2 }, elementen: [noot(0), noot(480)] }] }],
});
const soorten = (p) => p.partijen[0].maten[0].elementen.map((e) => e.soort);

test('voegAanwijzingToe zet de aanwijzing op de juiste plek in de maat', () => {
  const oud = voorbeeld();
  const nieuw = voegAanwijzingToe(oud, 'P1', 0, 480, 'tekst', 'dolce');
  assert.deepEqual(soorten(nieuw), ['noot', 'aanwijzing', 'noot']);
  assert.deepEqual(nieuw.partijen[0].maten[0].elementen[1], { soort: 'aanwijzing', start: 480, type: 'tekst', waarde: 'dolce', zekerheid: 1 });
  assert.deepEqual(soorten(oud), ['noot', 'noot']);
});

test('een aanwijzing op hetzelfde moment als een noot komt voor die noot', () => {
  const nieuw = voegAanwijzingToe(voorbeeld(), 'P1', 0, 0, 'dynamiek', 'mf');
  assert.deepEqual(soorten(nieuw), ['aanwijzing', 'noot', 'noot']);
});

test('een onbekende partij of maat verandert niets', () => {
  const oud = voorbeeld();
  assert.deepEqual(voegAanwijzingToe(oud, 'P9', 0, 0, 'tekst', 'x'), oud);
  assert.deepEqual(voegAanwijzingToe(oud, 'P1', 5, 0, 'tekst', 'x'), oud);
});

test('verwijderAanwijzing haalt alleen een aanwijzing weg', () => {
  const metAanwijzing = voegAanwijzingToe(voorbeeld(), 'P1', 0, 480, 'tekst', 'dolce');
  assert.deepEqual(soorten(verwijderAanwijzing(metAanwijzing, 'n-P1-0-1')), ['noot', 'noot']);
  assert.deepEqual(verwijderAanwijzing(metAanwijzing, 'n-P1-0-0'), metAanwijzing);
  assert.deepEqual(verwijderAanwijzing(metAanwijzing, 'n-P9-0-0'), metAanwijzing);
});
