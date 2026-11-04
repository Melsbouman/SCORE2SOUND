import test from 'node:test';
import assert from 'node:assert/strict';
import { ruimZangtekstOp } from '../src/model/zangtekst.mjs';

const noot = (start, lettergreep) => ({
  soort: 'noot', start, duur: 480, stem: 1, notenbalk: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 1,
  teksten: [{ couplet: 1, lettergreep, soort: 'single' }],
});
const stuk = (noten) => ({ versie: 1, titel: '', componist: '', partijen: [{ id: 'P1', naam: 'A', afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
  maten: [{ nummer: '1', index: 0, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' }, sleutels: [], tempo: null, herhaling: { begin: false, eind: false, keer: 2 }, elementen: noten }] }] });

test('gewone zangtekst die met ag, music of rights begint (again, against, musical, rightly) blijft staan', () => {
  const woorden = ['again', 'against', 'musical', 'rightly', 'age', 'sing', 'love', 'now', 'to', 'me'];
  const uit = ruimZangtekstOp(stuk(woorden.map((w, i) => noot(i * 480, w))));
  assert.deepEqual(uit.partijen[0].maten[0].elementen.map((e) => e.teksten?.[0]?.lettergreep), woorden);
});
