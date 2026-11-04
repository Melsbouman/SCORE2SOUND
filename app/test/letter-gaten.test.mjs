import test from 'node:test';
import assert from 'node:assert/strict';
import { vulLetterGaten } from '../src/model/lettergaten.mjs';

const noot = () => ({
  soort: 'noot', start: 0, duur: 480, stem: 1, notenbalk: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 1,
});
const letter = (waarde) => ({ soort: 'aanwijzing', start: 0, type: 'letter', waarde, zekerheid: 1 });
const maat = (index, elementen = [noot()]) => ({
  nummer: String(index + 1), index, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
  sleutels: [], tempo: null, herhaling: { begin: false, eind: false, keer: 2 }, elementen,
});
const partij = (id, letters, aantal = 10) => ({
  id, naam: id, afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
  maten: Array.from({ length: aantal }, (_, i) => maat(i, letters[i] ? [letter(letters[i]), noot()] : [noot()])),
});
const stuk = (...partijen) => ({ versie: 1, titel: '', componist: '', partijen });
const lettersIn = (p) => p.maten.flatMap((m) => m.elementen.filter((e) => e.type === 'letter').map((e) => ({ waarde: e.waarde, maat: m.index, zekerheid: e.zekerheid })));

test('een ontbrekende letter tussen twee letters wordt onzeker ingevoegd (B, C, E wordt B, C, D, E)', () => {
  const uit = vulLetterGaten(stuk(partij('P1', { 1: 'B', 3: 'C', 7: 'E' })));
  const letters = lettersIn(uit.partijen[0]);
  assert.deepEqual(letters.map((l) => l.waarde), ['B', 'C', 'D', 'E']);
  const d = letters.find((l) => l.waarde === 'D');
  assert.ok(d.maat > 3 && d.maat < 7, `D staat op maat ${d.maat}`);
  assert.equal(d.zekerheid, 0.3);
  assert.deepEqual(letters.filter((l) => l.waarde !== 'D').map((l) => l.zekerheid), [1, 1, 1]);
});

test('twee ontbrekende letters krijgen elk een eigen maat in volgorde (B, E wordt B, C, D, E)', () => {
  const uit = vulLetterGaten(stuk(partij('P1', { 1: 'B', 8: 'E' })));
  const letters = lettersIn(uit.partijen[0]);
  assert.deepEqual(letters.map((l) => l.waarde), ['B', 'C', 'D', 'E']);
  assert.equal(new Set(letters.map((l) => l.maat)).size, 4);
  assert.deepEqual(letters.map((l) => l.maat), [...letters.map((l) => l.maat)].sort((a, b) => a - b));
});

test('een reeks zonder gat blijft gelijk en de invoer verandert niet', () => {
  const oud = stuk(partij('P1', { 0: 'A', 2: 'B', 5: 'C' }));
  const kopie = structuredClone(oud);
  const uit = vulLetterGaten(oud);
  assert.deepEqual(uit, kopie);
  assert.deepEqual(oud, kopie);
});

test('er is geen plek tussen twee letters in opeenvolgende maten: niets invoegen', () => {
  const uit = vulLetterGaten(stuk(partij('P1', { 3: 'C', 4: 'E' })));
  assert.deepEqual(lettersIn(uit.partijen[0]).map((l) => l.waarde), ['C', 'E']);
});

test('elke partij wordt apart behandeld', () => {
  const uit = vulLetterGaten(stuk(partij('P1', { 1: 'B', 3: 'C', 7: 'E' }), partij('P2', { 1: 'A', 4: 'B' })));
  assert.deepEqual(lettersIn(uit.partijen[0]).map((l) => l.waarde), ['B', 'C', 'D', 'E']);
  assert.deepEqual(lettersIn(uit.partijen[1]).map((l) => l.waarde), ['A', 'B']);
});
