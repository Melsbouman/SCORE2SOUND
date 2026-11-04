import test from 'node:test';
import assert from 'node:assert/strict';
import { splitsNoot } from '../src/model/corrigeren.mjs';

const noot = (start, duur, extra = {}) => ({
  soort: 'noot', start, duur, stem: 1, notenbalk: 1, toonhoogte: { stap: 'D', alter: 1, octaaf: 4 }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 0.5, ...extra,
});
const stuk = (elementen) => ({
  versie: 1, titel: '', componist: '',
  partijen: [{ id: 'P1', naam: 'A', afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
    maten: [{ nummer: '1', index: 0, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
      sleutels: [], tempo: null, herhaling: { begin: false, eind: false, keer: 2 }, elementen }] }],
});

test('een noot wordt twee even lange noten met een overbinding ertussen', () => {
  const oud = stuk([noot(0, 960)]);
  const [a, b] = splitsNoot(oud, 'n-P1-0-0').partijen[0].maten[0].elementen;
  assert.equal(a.start, 0);
  assert.equal(a.duur, 480);
  assert.deepEqual(a.overbinding, { begin: true, eind: false });
  assert.equal(b.start, 480);
  assert.equal(b.duur, 480);
  assert.deepEqual(b.overbinding, { begin: false, eind: true });
  assert.deepEqual(b.toonhoogte, { stap: 'D', alter: 1, octaaf: 4 });
  assert.equal(b.zekerheid, 0.5);
  assert.equal(oud.partijen[0].maten[0].elementen.length, 1);
});

test('een noot die al aan een volgende is gebonden houdt dat op de tweede helft', () => {
  const nieuw = splitsNoot(stuk([noot(0, 960, { overbinding: { begin: true, eind: false } })]), 'n-P1-0-0');
  const [a, b] = nieuw.partijen[0].maten[0].elementen;
  assert.deepEqual(a.overbinding, { begin: true, eind: false });
  assert.deepEqual(b.overbinding, { begin: true, eind: true });
});

test('een rust, een oneven duur of een onbekende id verandert niets', () => {
  const oud = stuk([noot(0, 7)]);
  assert.deepEqual(splitsNoot(oud, 'n-P1-0-0'), oud);
  assert.deepEqual(splitsNoot(oud, 'n-P9-0-0'), oud);
  const rust = stuk([{ soort: 'rust', start: 0, duur: 960, stem: 1, notenbalk: 1, heleMaat: false, zekerheid: 1 }]);
  assert.deepEqual(splitsNoot(rust, 'n-P1-0-0'), rust);
});
