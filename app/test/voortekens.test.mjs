import test from 'node:test';
import assert from 'node:assert/strict';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';

const noot = (start, stap, alter, octaaf = 5, extra = {}) => ({
  soort: 'noot', start, duur: 480, stem: 1, notenbalk: 1, toonhoogte: { stap, alter, octaaf }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 1, ...extra,
});
const maat = (index, kwinten, elementen) => ({
  nummer: String(index + 1), index, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten, modus: 'majeur' },
  sleutels: [{ teken: 'G', lijn: 2, notenbalk: 1, octaafVerschuiving: 0 }], tempo: null, herhaling: { begin: false, eind: false, keer: 2 }, elementen,
});
const stuk = (...maten) => ({
  versie: 1, titel: '', componist: '',
  partijen: [{ id: 'P1', naam: 'A', afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } }, maten }],
});
const tekens = (xml) => [...xml.matchAll(/<note[ >](?:(?!<\/note>).)*?<\/note>/gs)].map((n) => (n[0].match(/<accidental>([a-z-]+)<\/accidental>/) ?? [, '-'])[1]);

test('een kruis dat niet in de toonsoort zit, krijgt een voorteken, en niet nog een keer in dezelfde maat', () => {
  const xml = naarMusicXML(stuk(maat(0, 0, [noot(0, 'C', 1), noot(480, 'C', 1), noot(960, 'D', 0), noot(1440, 'C', 0)])));
  assert.deepEqual(tekens(xml), ['sharp', '-', '-', 'natural']);
});

test('in de volgende maat geldt het voorteken niet meer', () => {
  const xml = naarMusicXML(stuk(maat(0, 0, [noot(0, 'C', 1), noot(480, 'D', 0), noot(960, 'D', 0), noot(1440, 'D', 0)]), maat(1, 0, [noot(0, 'C', 1), noot(480, 'D', 0), noot(960, 'D', 0), noot(1440, 'D', 0)])));
  assert.deepEqual(tekens(xml), ['sharp', '-', '-', '-', 'sharp', '-', '-', '-']);
});

test('noten in de toonsoort krijgen geen voorteken, een herstellingsteken wel', () => {
  const xml = naarMusicXML(stuk(maat(0, 1, [noot(0, 'F', 1), noot(480, 'F', 0), noot(960, 'F', 1), noot(1440, 'G', 0)])));
  assert.deepEqual(tekens(xml), ['-', 'natural', 'sharp', '-']);
});

test('mollen en de toonsoort met mollen', () => {
  const xml = naarMusicXML(stuk(maat(0, -2, [noot(0, 'B', -1, 4), noot(480, 'E', -1), noot(960, 'E', 0), noot(1440, 'A', -1)])));
  assert.deepEqual(tekens(xml), ['-', '-', 'natural', 'flat']);
});

test('een andere octaaf geldt apart en een tweede noot van een overbinding krijgt geen voorteken', () => {
  const xml = naarMusicXML(stuk(maat(0, 0, [noot(0, 'C', 1, 5), noot(480, 'C', 0, 6), noot(960, 'C', 1, 5), noot(1440, 'C', 1, 5, { overbinding: { begin: false, eind: true } })])));
  assert.deepEqual(tekens(xml), ['sharp', '-', '-', '-']);
});

test('een overbinding over de maatgrens krijgt in de volgende maat geen voorteken', () => {
  const xml = naarMusicXML(stuk(
    maat(0, 0, [noot(0, 'D', 0), noot(480, 'D', 0), noot(960, 'D', 0), noot(1440, 'C', 1, 5, { overbinding: { begin: true, eind: false } })]),
    maat(1, 0, [noot(0, 'C', 1, 5, { overbinding: { begin: false, eind: true } }), noot(480, 'D', 0), noot(960, 'D', 0), noot(1440, 'D', 0)]),
  ));
  assert.deepEqual(tekens(xml), ['-', '-', '-', 'sharp', '-', '-', '-', '-']);
});

test('dubbelkruis en dubbelmol', () => {
  const xml = naarMusicXML(stuk(maat(0, 0, [noot(0, 'F', 2), noot(480, 'B', -2), noot(960, 'G', 0), noot(1440, 'G', 0)])));
  assert.deepEqual(tekens(xml), ['double-sharp', 'flat-flat', '-', '-']);
});
