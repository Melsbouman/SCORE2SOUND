import test from 'node:test';
import assert from 'node:assert/strict';
import { voegHaakToe } from '../src/model/corrigeren.mjs';

const noot = (start) => ({
  soort: 'noot', start, duur: 480, stem: 1, notenbalk: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 1,
});
const maat = (index) => ({
  nummer: String(index + 1), index, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
  sleutels: [], tempo: null, herhaling: { begin: false, eind: false, keer: 2 }, elementen: [noot(0), noot(480), noot(960), noot(1440)],
});
const voorbeeld = () => ({
  versie: 1, titel: '', componist: '',
  partijen: [{ id: 'P1', naam: 'A', afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
    maten: [maat(0), maat(1)] }],
});
const aanwijzingen = (p, maatIndex) => p.partijen[0].maten[maatIndex].elementen.filter((e) => e.soort === 'aanwijzing');

test('een crescendohaak krijgt een begin en een eind, ook over twee maten', () => {
  const nieuw = voegHaakToe(voorbeeld(), 'P1', 0, 480, 1, 960, 'crescendo');
  assert.deepEqual(aanwijzingen(nieuw, 0).map((e) => [e.type, e.waarde, e.start]), [['crescendo', 'begin', 480]]);
  assert.deepEqual(aanwijzingen(nieuw, 1).map((e) => [e.type, e.waarde, e.start]), [['crescendo', 'eind', 960]]);
});

test('een decrescendohaak in een maat staat op de juiste plekken tussen de noten', () => {
  const nieuw = voegHaakToe(voorbeeld(), 'P1', 0, 0, 0, 1440, 'decrescendo');
  assert.deepEqual(nieuw.partijen[0].maten[0].elementen.map((e) => e.soort + (e.waarde ? ':' + e.waarde : '')),
    ['aanwijzing:begin', 'noot', 'noot', 'noot', 'aanwijzing:eind', 'noot']);
});

test('een ongeldige soort of plek verandert niets', () => {
  const oud = voorbeeld();
  assert.deepEqual(voegHaakToe(oud, 'P1', 0, 0, 1, 0, 'tekst'), oud);
  assert.deepEqual(voegHaakToe(oud, 'P9', 0, 0, 1, 0, 'crescendo'), oud);
  assert.deepEqual(voegHaakToe(oud, 'P1', 1, 0, 0, 0, 'crescendo'), oud);
  assert.deepEqual(voegHaakToe(oud, 'P1', 0, 0, 5, 0, 'crescendo'), oud);
});
