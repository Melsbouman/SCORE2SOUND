import test from 'node:test';
import assert from 'node:assert/strict';
import { vulBeginRust } from '../src/model/beginrust.mjs';

const noot = {
  soort: 'noot', start: 0, duur: 480, stem: 1, notenbalk: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 1,
};
const letter = (waarde) => ({ soort: 'aanwijzing', start: 0, type: 'letter', waarde, zekerheid: 1 });
const stuk = (elementen) => ({
  versie: 1, titel: '', componist: '',
  partijen: [{
    id: 'P1', naam: 'A', afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
    maten: [{
      nummer: '1', index: 0, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
      sleutels: [{ teken: 'G', lijn: 2, notenbalk: 1, octaafVerschuiving: 0 }], tempo: 96,
      herhaling: { begin: false, eind: false, keer: 2 }, elementen,
    }],
  }],
});

test('zonder cijferletter blijft de partituur gelijk', () => {
  const oud = stuk([noot]);
  assert.deepEqual(vulBeginRust(oud), oud);
});

test('een onredelijk hoge letter 300 blijft gelijk', () => {
  const oud = stuk([letter('300'), noot]);
  assert.deepEqual(vulBeginRust(oud), oud);
});

test('een letter 5 in maat 0 voegt vier maten rust toe', () => {
  const maten = vulBeginRust(stuk([letter('5'), noot])).partijen[0].maten;

  assert.equal(maten.length, 5);
  assert.equal(maten[0].maatrust, 4);
  assert.equal(maten[0].verborgen, undefined);
  assert.deepEqual(maten.slice(1, 4).map((maat) => maat.verborgen), [true, true, true]);
  assert.equal(maten[4].nummer, '5');
});
