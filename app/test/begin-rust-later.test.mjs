import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';
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
  partijen: [{ id: 'P1', naam: 'A', afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } }, maten }],
});

test('het repetitiecijfer 16 in de vierde maat betekent 12 maten rust ervoor, als een samengestelde maat', () => {
  const nieuw = vulBeginRust(stuk(maat(0, [noot(0)]), maat(1, [noot(0)]), maat(2, [noot(0)]), maat(3, [letter('16'), noot(0)]), maat(4, [noot(0)]), maat(5, [noot(0)])));
  const maten = nieuw.partijen[0].maten;
  assert.equal(maten.length, 18);
  assert.equal(maten[0].maatrust, 12);
  assert.equal(maten[0].verborgen, undefined);
  for (let i = 1; i < 12; i += 1) assert.equal(maten[i].verborgen, true, `maat ${i}`);
  assert.equal(maten[12].nummer, '13');
  assert.equal(maten[12].index, 12);
  assert.equal(maten[15].nummer, '16');
  assert.equal(maten[15].elementen[0].type, 'letter');
});

test('klopt het maatnummer al met het repetitiecijfer, dan verandert er niets', () => {
  const oud = stuk(maat(0, [noot(0)]), maat(1, [noot(0)]), maat(2, [noot(0)]), maat(3, [letter('4'), noot(0)]));
  assert.deepEqual(vulBeginRust(oud), oud);
});

test('een enkele maat rust krijgt geen maatrust', () => {
  const nieuw = vulBeginRust(stuk(maat(0, [letter('2'), noot(0)])));
  assert.equal(nieuw.partijen[0].maten.length, 2);
  assert.equal(nieuw.partijen[0].maten[0].maatrust, undefined);
});

test('alleen de eerste acht maten worden bekeken', () => {
  const maten = Array.from({ length: 12 }, (_, i) => maat(i, [i === 10 ? letter('99') : noot(0)]));
  const oud = stuk(...maten);
  assert.deepEqual(vulBeginRust(oud), oud);
});

test('bij de echte herkenning van Sand and Stars komen de 12 beginmaten rust terug', async () => {
  const partituur = leesMusicXML(await readFile(new URL('./fixtures/sand-and-stars-begin.xml', import.meta.url), 'utf8'));
  const nieuw = vulBeginRust(partituur);
  const maten = nieuw.partijen[0].maten;
  assert.equal(maten.length, 42);
  assert.equal(maten[0].maatrust, 12);
  assert.equal(maten[12].nummer, '13');
});
