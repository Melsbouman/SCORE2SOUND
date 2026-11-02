import test from 'node:test';
import assert from 'node:assert/strict';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';
import { speelVolgorde, uitgevouwen } from '../src/model/maten.mjs';

const maat = (index, sprong = undefined) => ({
  nummer: String(index + 1),
  index,
  opmaat: false,
  maatsoort: { teller: 4, noemer: 4 },
  toonsoort: { kwinten: 0, modus: 'majeur' },
  sleutels: [{ teken: 'G', lijn: 2, notenbalk: 1, octaafVerschuiving: 0 }],
  tempo: null,
  herhaling: { begin: false, eind: false, keer: 2 },
  elementen: [],
  ...(sprong ? { sprong } : {}),
});

const partituur = (maten) => ({
  versie: 1,
  titel: '',
  componist: '',
  partijen: [{
    id: 'P1',
    naam: 'Piano',
    afkorting: '',
    instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
    maten,
  }],
});

const zesMaten = () => Array.from({ length: 6 }, (_, index) => maat(index));

test('D.S. al Fine speelt vanaf het segno door tot Fine', () => {
  const maten = zesMaten();
  maten[1].sprong = { segno: 'segno' };
  maten[3].sprong = { fine: true };
  maten[5].sprong = { dalSegno: 'segno' };
  assert.deepEqual(speelVolgorde(maten), [0, 1, 2, 3, 4, 5, 1, 2, 3]);
});

test('herhalingen binnen een teruggespeeld deel worden niet opnieuw uitgevoerd', () => {
  const maten = zesMaten();
  maten[1].sprong = { segno: 'segno' };
  maten[1].herhaling.begin = true;
  maten[2].herhaling.eind = true;
  maten[3].sprong = { fine: true };
  maten[5].sprong = { dalSegno: 'segno' };
  assert.deepEqual(speelVolgorde(maten), [0, 1, 2, 1, 2, 3, 4, 5, 1, 2, 3]);
});

test('D.C. al Fine gaat terug naar de eerste maat en stopt bij Fine', () => {
  const maten = zesMaten();
  maten[2].sprong = { fine: true };
  maten[4].sprong = { daCapo: true };
  assert.deepEqual(speelVolgorde(maten), [0, 1, 2, 3, 4, 0, 1, 2]);
});

test('To Coda springt na de terugkeer vanaf het segno naar de coda', () => {
  const maten = zesMaten();
  maten[1].sprong = { segno: 'segno' };
  maten[2].sprong = { naarCoda: 'coda' };
  maten[4].sprong = { coda: 'coda' };
  maten[5].sprong = { dalSegno: 'segno' };
  assert.deepEqual(speelVolgorde(maten), [0, 1, 2, 3, 4, 5, 1, 2, 4, 5]);
});

test('sprongmarkeringen blijven behouden bij schrijven en teruglezen', () => {
  const maten = zesMaten();
  maten[0].sprong = { segno: 'segno' };
  maten[1].sprong = { coda: 'coda' };
  maten[2].sprong = { dalSegno: 'segno' };
  maten[3].sprong = { naarCoda: 'coda' };
  maten[4].sprong = { daCapo: true };
  maten[5].sprong = { fine: true };
  const opnieuw = leesMusicXML(naarMusicXML(partituur(maten)));
  assert.deepEqual(opnieuw.partijen[0].maten.map((deel) => deel.sprong ?? null), maten.map((deel) => deel.sprong ?? null));
});

test('een partituur zonder sprongen speelt de herhalingen zoals voorheen', () => {
  const maten = zesMaten();
  maten[0].herhaling.begin = true;
  maten[2].herhaling.eind = true;
  assert.deepEqual(speelVolgorde(maten), [0, 1, 2, 0, 1, 2, 3, 4, 5]);
  assert.deepEqual(uitgevouwen(partituur(maten)).partijen[0].maten.map((deel) => deel.nummer), ['1', '2', '3', '1', '2', '3', '4', '5', '6']);
});

test('sprongteksten en MusicXML-sound-attributen worden ingelezen', () => {
  const xml = `<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
    <part id="P1">
      <measure number="1"><direction><direction-type><segno/></direction-type><sound segno="segno"/></direction></measure>
      <measure number="2"><direction><direction-type><words>D.C. al Fine</words></direction-type></direction></measure>
      <measure number="3"><direction><direction-type><words>D.S. al Fine</words></direction-type></direction></measure>
      <measure number="4"><direction><direction-type><coda/></direction-type><sound coda="coda"/></direction></measure>
      <measure number="5"><barline><sound tocoda="coda"/></barline></measure>
      <measure number="6"><barline><sound fine="yes"/></barline></measure>
    </part></score-partwise>`;
  const maten = leesMusicXML(xml).partijen[0].maten;
  assert.deepEqual(maten.map((deel) => deel.sprong ?? null), [
    { segno: 'segno' },
    { daCapo: true },
    { dalSegno: 'segno' },
    { coda: 'coda' },
    { naarCoda: 'coda' },
    { fine: true },
  ]);
});
