import test from 'node:test';
import assert from 'node:assert/strict';
import { vulBeginRust } from '../src/model/beginrust.mjs';

const noot = (start) => ({
  soort: 'noot', start, duur: 480, stem: 1, notenbalk: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 1,
});
const letter = (waarde) => ({ soort: 'aanwijzing', start: 0, type: 'letter', waarde, zekerheid: 1 });
const maat = (index, elementen) => ({
  nummer: String(index + 1), index, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
  sleutels: [{ teken: 'G', lijn: 2, notenbalk: 1, octaafVerschuiving: 0 }], tempo: 96, herhaling: { begin: false, eind: false, keer: 2 }, elementen,
});
const stuk = (...maten) => ({
  versie: 1, titel: '', componist: '',
  partijen: [
    { id: 'P1', naam: 'A', afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } }, maten },
    { id: 'P2', naam: 'B', afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } }, maten: maten.map((m) => ({ ...m, elementen: [noot(0)] })) },
  ],
});

test('een repetitiecijfer 13 in de eerste maat voegt 12 maten rust toe voor alle partijen', () => {
  const nieuw = vulBeginRust(stuk(maat(0, [letter('13'), noot(0)]), maat(1, [noot(0)])));
  for (const partij of nieuw.partijen) {
    assert.equal(partij.maten.length, 14);
    for (let i = 0; i < 12; i += 1) {
      assert.deepEqual(partij.maten[i].elementen, [{ soort: 'rust', start: 0, duur: 1920, stem: 1, notenbalk: 1, heleMaat: true, zekerheid: 1 }]);
      assert.equal(partij.maten[i].nummer, String(i + 1));
      assert.equal(partij.maten[i].index, i);
    }
    assert.equal(partij.maten[12].nummer, '13');
    assert.equal(partij.maten[12].index, 12);
    assert.equal(partij.maten[13].nummer, '14');
    assert.equal(partij.maten[13].index, 13);
  }
  assert.deepEqual(nieuw.partijen[0].maten[0].sleutels, nieuw.partijen[0].maten[12].sleutels);
  assert.equal(nieuw.partijen[0].maten[0].tempo, 96);
});

test('een letter, het cijfer 1 of geen repetitiecijfer in de eerste maat verandert niets', () => {
  for (const waarde of ['A', '1', 'x']) {
    const oud = stuk(maat(0, [letter(waarde), noot(0)]));
    assert.deepEqual(vulBeginRust(oud), oud);
  }
  const zonder = stuk(maat(0, [noot(0)]));
  assert.deepEqual(vulBeginRust(zonder), zonder);
});

test('een onwaarschijnlijk groot cijfer (boven 200) wordt genegeerd', () => {
  const oud = stuk(maat(0, [letter('999'), noot(0)]));
  assert.deepEqual(vulBeginRust(oud), oud);
});

test('de invoer wordt niet veranderd', () => {
  const oud = stuk(maat(0, [letter('5'), noot(0)]));
  vulBeginRust(oud);
  assert.equal(oud.partijen[0].maten.length, 1);
});
