import test from 'node:test';
import assert from 'node:assert/strict';
import { markeerVerdachteNoten } from '../src/model/verdacht.mjs';

const toon = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const noot = (start, stap, octaaf) => ({
  soort: 'noot', start, duur: 480, stem: 1, notenbalk: 1, toonhoogte: { stap, alter: 0, octaaf }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 1,
});
const rust = (start) => ({ soort: 'rust', start, duur: 480, stem: 1, notenbalk: 1, heleMaat: false, zekerheid: 1 });
const stuk = (...maten) => ({
  versie: 1, titel: '', componist: '',
  partijen: [{ id: 'P1', naam: 'A', afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
    maten: maten.map((elementen, index) => ({ nummer: String(index + 1), index, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
      sleutels: [], tempo: null, herhaling: { begin: false, eind: false, keer: 2 }, elementen })) }],
});
const zekerheden = (p) => p.partijen[0].maten.flatMap((m) => m.elementen).filter((e) => e.soort === 'noot').map((e) => e.zekerheid);

test('een noot die twee octaven van beide buren afligt, wordt onzeker', () => {
  const nieuw = markeerVerdachteNoten(stuk([noot(0, 'C', 5), noot(480, 'C', 7), noot(960, 'C', 5)]));
  assert.deepEqual(zekerheden(nieuw), [1, 0.5, 1]);
});

test('gewone sprongen en lopen blijven zeker', () => {
  const nieuw = markeerVerdachteNoten(stuk([noot(0, 'C', 5), noot(480, 'G', 5), noot(960, 'C', 6), noot(1440, 'E', 5)]));
  assert.deepEqual(zekerheden(nieuw), [1, 1, 1, 1]);
});

test('rusten en maatgrenzen tellen niet als onderbreking: de buren zijn de vorige en volgende noot', () => {
  const nieuw = markeerVerdachteNoten(stuk([noot(0, 'C', 5), rust(480)], [noot(0, 'C', 7), rust(480)], [noot(0, 'C', 5)]));
  assert.deepEqual(zekerheden(nieuw), [1, 0.5, 1]);
});

test('de eerste of laatste noot heeft een buur en moet meer dan anderhalve octaaf verschillen', () => {
  assert.deepEqual(zekerheden(markeerVerdachteNoten(stuk([noot(0, 'C', 5), noot(480, 'C', 8)]))), [1, 0.5]);
  assert.deepEqual(zekerheden(markeerVerdachteNoten(stuk([noot(0, 'C', 5), noot(480, 'C', 7)]))), [1, 1]);
});

test('een al onzekere noot blijft op de laagste zekerheid en de invoer verandert niet', () => {
  const oud = stuk([noot(0, 'C', 5), { ...noot(480, 'C', 7), zekerheid: 0.3 }, noot(960, 'C', 5)]);
  const nieuw = markeerVerdachteNoten(oud);
  assert.deepEqual(zekerheden(nieuw), [1, 0.3, 1]);
  assert.equal(oud.partijen[0].maten[0].elementen[1].zekerheid, 0.3);
});
