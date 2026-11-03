import test from 'node:test';
import assert from 'node:assert/strict';
import { zetToonhoogte, zoekElement } from '../src/model/corrigeren.mjs';

const noot = (start, stap, zekerheid) => ({
  soort: 'noot', start, duur: 480, stem: 1, notenbalk: 1, toonhoogte: { stap, alter: 0, octaaf: 5 }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid,
});
const voorbeeld = () => ({
  versie: 1, titel: '', componist: '',
  partijen: [{ id: 'P1', naam: 'A', afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
    maten: [{ nummer: '1', index: 0, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
      sleutels: [], tempo: null, herhaling: { begin: false, eind: false, keer: 2 },
      elementen: [noot(0, 'C', 1), noot(480, 'D', 0.4), { soort: 'rust', start: 960, duur: 480, stem: 1, notenbalk: 1, heleMaat: false, zekerheid: 1 }] }] }],
});

test('zetToonhoogte geeft een noot de nieuwe toonhoogte en maakt hem zeker', () => {
  const oud = voorbeeld();
  const nieuw = zetToonhoogte(oud, 'n-P1-0-1', { stap: 'E', alter: 1, octaaf: 4 });
  const element = zoekElement(nieuw, 'n-P1-0-1');
  assert.deepEqual(element.toonhoogte, { stap: 'E', alter: 1, octaaf: 4 });
  assert.equal(element.zekerheid, 1);
  assert.equal(zoekElement(oud, 'n-P1-0-1').toonhoogte.stap, 'D');
});

test('zetToonhoogte verandert niets bij een rust of een onbekende id', () => {
  const oud = voorbeeld();
  assert.deepEqual(zetToonhoogte(oud, 'n-P1-0-2', { stap: 'E', alter: 0, octaaf: 5 }), oud);
  assert.deepEqual(zetToonhoogte(oud, 'n-P9-0-0', { stap: 'E', alter: 0, octaaf: 5 }), oud);
});
