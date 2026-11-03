import test from 'node:test';
import assert from 'node:assert/strict';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';

const noot = (start, begin, eind) => ({
  soort: 'noot', start, duur: 480, stem: 1, notenbalk: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin, eind }, versiering: null, zekerheid: 1,
});
const maat = (index, elementen) => ({
  nummer: String(index + 1), index, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
  sleutels: [{ teken: 'G', lijn: 2, notenbalk: 1, octaafVerschuiving: 0 }], tempo: null, herhaling: { begin: false, eind: false, keer: 2 }, elementen,
});
const stuk = (...maten) => ({
  versie: 1, titel: '', componist: '',
  partijen: [{ id: 'P1', naam: 'A', afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } }, maten }],
});
const bogen = (xml) => [...xml.matchAll(/<slur type="(start|stop)" number="(\d+)"/g)].map((m) => `${m[1]}${m[2]}`);
const vier = (...vlaggen) => vlaggen.map(([begin, eind], i) => noot(i * 480, begin, eind));

test('een boog in een boog krijgt een eigen nummer', () => {
  const xml = naarMusicXML(stuk(maat(0, vier([true, false], [true, false], [false, true], [false, true]))));
  assert.deepEqual(bogen(xml), ['start1', 'start2', 'stop2', 'stop1']);
});

test('twee bogen na elkaar gebruiken weer nummer 1, ook als de ene eindigt waar de andere begint', () => {
  const xml = naarMusicXML(stuk(maat(0, vier([true, false], [false, true], [true, false], [false, true]))));
  assert.deepEqual(bogen(xml), ['start1', 'stop1', 'start1', 'stop1']);
  const aansluitend = naarMusicXML(stuk(maat(0, vier([true, false], [false, true], [true, false], [false, true]).map((n, i) => (i === 1 ? { ...n, legato: { begin: true, eind: true } } : n)))));
  assert.deepEqual(bogen(aansluitend).slice(0, 3), ['start1', 'stop1', 'start1']);
});

test('een boog over meerdere maten houdt hetzelfde nummer en een kortere boog erin krijgt 2', () => {
  const xml = naarMusicXML(stuk(
    maat(0, vier([true, false], [false, false], [false, false], [false, false])),
    maat(1, vier([false, false], [true, false], [false, true], [false, false])),
    maat(2, vier([false, false], [false, false], [false, true], [false, false])),
  ));
  assert.deepEqual(bogen(xml), ['start1', 'start2', 'stop2', 'stop1']);
});

test('een boog zonder einde blijft open en geeft geen foutieve stop', () => {
  const xml = naarMusicXML(stuk(maat(0, vier([true, false], [false, false], [false, false], [false, false]))));
  assert.deepEqual(bogen(xml), ['start1']);
});
