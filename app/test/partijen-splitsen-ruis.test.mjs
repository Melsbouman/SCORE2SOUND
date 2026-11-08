import test from 'node:test';
import assert from 'node:assert/strict';
import { partijNaamUitKop, splitsPartijenOpKoppen } from '../src/model/partijnaam.mjs';
import { vulBeginRust } from '../src/model/beginrust.mjs';

test('ruis van de tekstherkenning in een paginakop geeft dezelfde partijnaam', () => {
  assert.equal(partijNaamUitKop('Bl» Solo Cornet 3, 4'), 'Solo Cornet 3, 4');
  assert.equal(partijNaamUitKop('Bl; Solo Cornet 3, 4'), 'Solo Cornet 3, 4');
  assert.equal(partijNaamUitKop('Bb Solo Cornet 3, 4'), 'Solo Cornet 3, 4');
  assert.equal(partijNaamUitKop('2nd Bb Comet'), '2nd Cornet');
});

const maten = (aantal, paginabegins) => Array.from({ length: aantal }, (_, index) => ({ index, nummer: String(index + 1), paginabegin: paginabegins.includes(index) }));

test('de naam van Audiveris telt niet als paginanaam: geen splitsing en de partij krijgt de naam uit de kop', () => {
  // Zoals Suite Gothique: op pagina 1 leest de tekstherkenning de partijnaam niet, op pagina 2 en 4 wel.
  const partituur = { partijen: [{ id: 'P1', naam: 'Eb Kornet', instrument: { midiProgramma: 56, transpositie: { chromatisch: 3, diatonisch: 2 } }, maten: maten(8, [0, 2, 4, 6]) }] };
  const uit = splitsPartijenOpKoppen(partituur, [null, '2nd Cornet', null, '2nd Cornet']);
  assert.equal(uit.partijen.length, 1);
  assert.equal(uit.partijen[0].naam, '2nd Cornet');
  assert.equal(uit.partijen[0].maten.length, 8);
  assert.deepEqual(uit.partijen[0].instrument.transpositie, { chromatisch: -2, diatonisch: -1 });
});

test('een andere naam in een kop splitst nog steeds, ook als pagina 1 geen naam heeft', () => {
  const partituur = { partijen: [{ id: 'P1', naam: 'Voice', instrument: { midiProgramma: 56 }, maten: maten(6, [0, 2, 4]) }] };
  const uit = splitsPartijenOpKoppen(partituur, [null, 'Flugelhorn', 'Solo Cornet']);
  assert.deepEqual(uit.partijen.map((partij) => [partij.naam, partij.maten.length]), [['Flugelhorn', 4], ['Solo Cornet', 2]]);
});

test('een beginrust zet alleen op de eerste ingevoegde maat een regel- en paginabegin', () => {
  // Zoals Sand and Stars: twaalf maten rust vooraan; eerder kreeg elke verborgen maat paginabegin en telde als nieuwe pagina.
  const eerste = {
    nummer: '1', index: 0, opmaat: false, regelbegin: true, paginabegin: true, vak: { blad: 1, links: 100, rechts: 300, boven: 500, onder: 580 },
    maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' }, sleutels: [], tempo: null,
    herhaling: { begin: false, eind: false, keer: 2 },
    elementen: [{ soort: 'aanwijzing', start: 0, type: 'letter', waarde: '13', zekerheid: 1 }, { soort: 'noot', start: 0, duur: 1920 }],
  };
  const uit = vulBeginRust({ partijen: [{ id: 'P1', maten: [eerste] }] }).partijen[0].maten;
  assert.equal(uit.length, 13);
  assert.deepEqual(uit.map((maat) => Boolean(maat.paginabegin)), [true, ...Array(12).fill(false)]);
  assert.deepEqual(uit.map((maat) => Boolean(maat.regelbegin)), [true, ...Array(12).fill(false)]);
  assert.equal(uit.slice(0, 12).some((maat) => maat.vak), false);
  assert.equal(uit[12].vak.links, 100);
});
