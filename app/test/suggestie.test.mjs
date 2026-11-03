import test from 'node:test';
import assert from 'node:assert/strict';
import { suggestieToonhoogte } from '../src/model/corrigeren.mjs';

const noot = (start, stap, zekerheid) => ({
  soort: 'noot', start, duur: 480, stem: 1, notenbalk: 1, toonhoogte: { stap, alter: 0, octaaf: 5 }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid,
});
const voorbeeld = (elementen) => ({
  versie: 1, titel: '', componist: '',
  partijen: [{ id: 'P1', naam: 'A', afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
    maten: [{ nummer: '1', index: 0, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
      sleutels: [], tempo: null, herhaling: { begin: false, eind: false, keer: 2 }, elementen }] }],
});

test('de suggestie is de toonhoogte van de vorige zekere noot', () => {
  const p = voorbeeld([noot(0, 'C', 1), noot(480, 'D', 0.4), noot(960, 'E', 1)]);
  assert.deepEqual(suggestieToonhoogte(p, 'n-P1-0-1'), { stap: 'C', alter: 0, octaaf: 5 });
});

test('is er geen vorige zekere noot, dan is het de volgende zekere noot', () => {
  const p = voorbeeld([noot(0, 'D', 0.4), noot(480, 'E', 1)]);
  assert.deepEqual(suggestieToonhoogte(p, 'n-P1-0-0'), { stap: 'E', alter: 0, octaaf: 5 });
});

test('zonder zekere noten of met een onbekende id is de suggestie null', () => {
  const p = voorbeeld([noot(0, 'D', 0.4)]);
  assert.equal(suggestieToonhoogte(p, 'n-P1-0-0'), null);
  assert.equal(suggestieToonhoogte(p, 'n-P9-0-0'), null);
});
