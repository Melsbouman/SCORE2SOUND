import test from 'node:test';
import assert from 'node:assert/strict';
import { klikGebeurtenissen } from '../src/midi/klik.mjs';

const rust = {
  soort: 'rust', start: 0, duur: 1920, stem: 1, notenbalk: 1, heleMaat: true, zekerheid: 1,
};
const noot = {
  soort: 'noot', start: 0, duur: 480, stem: 1, notenbalk: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 4 }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 1,
};
const maat = (index, elementen, extra = {}) => ({
  nummer: String(index + 1), index, opmaat: false, maatsoort: { teller: 4, noemer: 4 },
  toonsoort: { kwinten: 0, modus: 'majeur' }, sleutels: [], tempo: index === 0 ? 100 : null,
  herhaling: { begin: false, eind: false, keer: 2 }, elementen, ...extra,
});
const partituur = {
  versie: 1, titel: 'Maatrust', componist: '',
  partijen: [{
    id: 'P1', naam: 'Piano', afkorting: '',
    instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
    maten: [
      maat(0, [rust], { maatrust: 9 }),
      ...Array.from({ length: 8 }, (_, index) => maat(index + 1, [rust], { verborgen: true })),
      maat(9, [noot]),
    ],
  }],
};

test('een maatrust van negen maten klikt alle rustmaten en de volgende maat', () => {
  const klikken = klikGebeurtenissen(partituur);

  assert.equal(klikken.length, 40);
  assert.deepEqual(
    klikken.filter((klik) => klik.kracht === 110).map((klik) => klik.tik),
    Array.from({ length: 10 }, (_, index) => index * 1920),
  );
});
