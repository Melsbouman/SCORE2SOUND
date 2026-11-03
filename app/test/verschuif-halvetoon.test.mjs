import test from 'node:test';
import assert from 'node:assert/strict';
import { verschuifHalvetoon, zoekElement } from '../src/model/corrigeren.mjs';

const noot = (stap, alter, octaaf) => ({
  soort: 'noot', start: 0, duur: 480, stem: 1, notenbalk: 1, toonhoogte: { stap, alter, octaaf }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 1,
});
const rust = { soort: 'rust', start: 480, duur: 480, stem: 1, notenbalk: 1, heleMaat: false, zekerheid: 1 };
const met = (...elementen) => ({
  versie: 1, titel: '', componist: '',
  partijen: [{ id: 'P1', naam: 'A', afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
    maten: [{ nummer: '1', index: 0, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
      sleutels: [], tempo: null, herhaling: { begin: false, eind: false, keer: 2 }, elementen }] }],
});
const naar = (n, richting) => zoekElement(verschuifHalvetoon(met(n), 'n-P1-0-0', richting), 'n-P1-0-0').toonhoogte;

test('omhoog gaat per halve toon, met kruisen', () => {
  assert.deepEqual(naar(noot('C', 0, 5), 1), { stap: 'C', alter: 1, octaaf: 5 });
  assert.deepEqual(naar(noot('C', 1, 5), 1), { stap: 'D', alter: 0, octaaf: 5 });
  assert.deepEqual(naar(noot('E', 0, 5), 1), { stap: 'F', alter: 0, octaaf: 5 });
  assert.deepEqual(naar(noot('B', 0, 4), 1), { stap: 'C', alter: 0, octaaf: 5 });
});

test('omlaag gaat per halve toon, met mollen', () => {
  assert.deepEqual(naar(noot('D', 0, 5), -1), { stap: 'D', alter: -1, octaaf: 5 });
  assert.deepEqual(naar(noot('D', -1, 5), -1), { stap: 'C', alter: 0, octaaf: 5 });
  assert.deepEqual(naar(noot('C', 0, 5), -1), { stap: 'B', alter: 0, octaaf: 4 });
  assert.deepEqual(naar(noot('F', 0, 5), -1), { stap: 'E', alter: 0, octaaf: 5 });
});

test('een rust of een onbekende id blijft zoals hij was', () => {
  const oud = met(noot('C', 0, 5), rust);
  assert.deepEqual(verschuifHalvetoon(oud, 'n-P1-0-1', 1), oud);
  assert.deepEqual(verschuifHalvetoon(oud, 'n-P9-0-0', 1), oud);
});

test('de invoer wordt niet veranderd', () => {
  const oud = met(noot('C', 0, 5));
  verschuifHalvetoon(oud, 'n-P1-0-0', 1);
  assert.deepEqual(oud, met(noot('C', 0, 5)));
});
