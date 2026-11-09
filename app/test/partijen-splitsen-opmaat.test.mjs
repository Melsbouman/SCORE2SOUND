import test from 'node:test';
import assert from 'node:assert/strict';
import { splitsPartijenOpKoppen } from '../src/model/partijnaam.mjs';

const maten = (aantal, paginabegins, opmaat = false) => Array.from({ length: aantal }, (_, index) => ({
  index, nummer: String(index + 9), paginabegin: paginabegins.includes(index), opmaat: opmaat && index === 0,
}));

test('een stuk met opmaat houdt maat 0 voor de opmaat (anders klopt het gedrukte maatnummer niet meer)', () => {
  const partituur = { partijen: [{ id: 'P1', naam: 'Cornet', instrument: { midiProgramma: 56 }, maten: maten(4, [0], true) }] };
  const uit = splitsPartijenOpKoppen(partituur, [null]);
  assert.deepEqual(uit.partijen[0].maten.map((maat) => maat.nummer), ['0', '1', '2', '3']);
});

test('zonder opmaat begint de nummering bij 1', () => {
  const partituur = { partijen: [{ id: 'P1', naam: 'Cornet', instrument: { midiProgramma: 56 }, maten: maten(3, [0]) }] };
  assert.deepEqual(splitsPartijenOpKoppen(partituur, [null]).partijen[0].maten.map((maat) => maat.nummer), ['1', '2', '3']);
});

test('na het splitsen krijgt elk deel het instrument dat bij de naam uit de kop hoort', () => {
  // Audiveris noemde de partij Eb Kornet (transpositie +3); de koppen zeggen Solo Cornet en daarna 2nd Cornet (beide in Bes).
  const partituur = { partijen: [{ id: 'P1', naam: 'Eb Kornet', instrument: { midiProgramma: 56, transpositie: { chromatisch: 3, diatonisch: 2 } }, maten: maten(6, [0, 2, 4]) }] };
  const uit = splitsPartijenOpKoppen(partituur, ['Solo Cornet', 'Solo Cornet', '2nd Cornet']);
  assert.deepEqual(uit.partijen.map((partij) => [partij.naam, partij.instrument.transpositie]), [
    ['Solo Cornet', { chromatisch: -2, diatonisch: -1 }],
    ['2nd Cornet', { chromatisch: -2, diatonisch: -1 }],
  ]);
});
