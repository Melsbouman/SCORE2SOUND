import test from 'node:test';
import assert from 'node:assert/strict';
import { nootBijLetter, zoekElement } from '../src/model/corrigeren.mjs';

const noot = (start, stap, alter, octaaf) => ({
  soort: 'noot', start, duur: 480, stem: 1, notenbalk: 1, toonhoogte: { stap, alter, octaaf }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 0.4,
});
const rust = (start) => ({ soort: 'rust', start, duur: 480, stem: 1, notenbalk: 1, heleMaat: false, zekerheid: 1 });
const met = (...elementen) => ({
  versie: 1, titel: '', componist: '',
  partijen: [{ id: 'P1', naam: 'A', afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
    maten: [{ nummer: '1', index: 0, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
      sleutels: [], tempo: null, herhaling: { begin: false, eind: false, keer: 2 }, elementen }] }],
});

test('een letter op een rust maakt een noot, in het octaaf dat het dichtst bij de vorige noot ligt', () => {
  const p = met(noot(0, 'C', 0, 5), rust(480), rust(960));
  const e = zoekElement(nootBijLetter(p, 'n-P1-0-1', 'E'), 'n-P1-0-1');
  assert.equal(e.soort, 'noot');
  assert.deepEqual(e.toonhoogte, { stap: 'E', alter: 0, octaaf: 5 });
  assert.equal(e.start, 480);
  assert.equal(e.duur, 480);
  assert.equal(e.zekerheid, 1);
  assert.deepEqual(zoekElement(nootBijLetter(p, 'n-P1-0-1', 'B'), 'n-P1-0-1').toonhoogte, { stap: 'B', alter: 0, octaaf: 4 });
});

test('zonder vorige noot is het octaaf 5', () => {
  const p = met(rust(0));
  assert.deepEqual(zoekElement(nootBijLetter(p, 'n-P1-0-0', 'G'), 'n-P1-0-0').toonhoogte, { stap: 'G', alter: 0, octaaf: 5 });
});

test('een letter op een noot vervangt de stap, zonder voorteken, en maakt hem zeker', () => {
  const p = met(noot(0, 'C', 1, 5));
  const e = zoekElement(nootBijLetter(p, 'n-P1-0-0', 'D'), 'n-P1-0-0');
  assert.deepEqual(e.toonhoogte, { stap: 'D', alter: 0, octaaf: 5 });
  assert.equal(e.zekerheid, 1);
});

test('een onbekende letter of id verandert niets', () => {
  const p = met(noot(0, 'C', 0, 5));
  assert.deepEqual(nootBijLetter(p, 'n-P1-0-0', 'X'), p);
  assert.deepEqual(nootBijLetter(p, 'n-P9-0-0', 'C'), p);
});
