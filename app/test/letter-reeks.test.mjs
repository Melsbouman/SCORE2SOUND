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
const partij = (letters, aantal = 12) => ({
  id: 'P1', naam: 'A', afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
  maten: Array.from({ length: aantal }, (_, i) => maat(i, letters[i] ? [letter(letters[i]), noot()] : [noot()])),
});
const stuk = (p) => ({ versie: 1, titel: '', componist: '', partijen: [p] });
const lettersIn = (s) => s.partijen[0].maten.flatMap((m) => m.elementen.filter((e) => e.type === 'letter').map((e) => ({ waarde: e.waarde, maat: m.index, zekerheid: e.zekerheid })));

test('de reeks begint altijd bij A: een eerste letter B krijgt een A ervoor, op een maat voor de B', () => {
  const l = lettersIn(vulLetterGaten(stuk(partij({ 4: 'B', 8: 'C' }))));
  assert.deepEqual(l.map((x) => x.waarde), ['A', 'B', 'C']);
  assert.ok(l[0].maat < 4);
  assert.equal(l[0].zekerheid, 0.3);
});

test('een letter die niet verder loopt dan de vorige is verkeerd gelezen en wordt de volgende in de reeks', () => {
  const l = lettersIn(vulLetterGaten(stuk(partij({ 0: 'A', 3: 'B', 6: 'B', 9: 'D' }))));
  assert.deepEqual(l.map((x) => x.waarde), ['A', 'B', 'C', 'D']);
  assert.equal(l.find((x) => x.maat === 6).zekerheid, 0.3);
  assert.equal(l.find((x) => x.maat === 9).zekerheid, 1);
});

test('een letter die terugspringt (A, B, C, B, E) wordt de volgende van de reeks (D)', () => {
  const l = lettersIn(vulLetterGaten(stuk(partij({ 0: 'A', 2: 'B', 4: 'C', 7: 'B', 10: 'E' }))));
  assert.deepEqual(l.map((x) => x.waarde), ['A', 'B', 'C', 'D', 'E']);
});

test('een goede reeks A tot en met D blijft helemaal ongemoeid', () => {
  const oud = stuk(partij({ 0: 'A', 3: 'B', 6: 'C', 9: 'D' }));
  const kopie = structuredClone(oud);
  assert.deepEqual(vulLetterGaten(oud), kopie);
});
