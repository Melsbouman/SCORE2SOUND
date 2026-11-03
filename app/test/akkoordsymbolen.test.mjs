import test from 'node:test';
import assert from 'node:assert/strict';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';
import { schrijfMidi } from '../src/midi/schrijven.mjs';

const NOOT = '<note><pitch><step>C</step><octave>4</octave></pitch><duration>480</duration><voice>1</voice><type>quarter</type></note>';

const MUSICXML = `<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1">
<measure number="1"><attributes><divisions>480</divisions></attributes>
<harmony><root><root-step>C</root-step></root><kind>major</kind></harmony>${NOOT}
<harmony><root><root-step>A</root-step></root><kind>minor</kind></harmony>${NOOT}
<harmony><root><root-step>G</root-step></root><kind>dominant</kind><bass><bass-step>B</bass-step></bass></harmony>${NOOT}
<harmony><root><root-step>F</root-step><root-alter>1</root-alter></root><kind>minor</kind></harmony>${NOOT}
</measure>
<measure number="2">${NOOT}${NOOT}${NOOT}${NOOT}</measure>
</part></score-partwise>`;

const akkoorden = (maat) => maat.elementen
  .filter((element) => element.type === 'akkoord')
  .map(({ start, waarde }) => ({ start, waarde }));

test('MusicXML-akkoordsymbolen worden op hun start gelezen en teruggeschreven', () => {
  const partituur = leesMusicXML(MUSICXML);
  const maten = partituur.partijen[0].maten;
  const verwacht = [
    { start: 0, waarde: 'C' },
    { start: 480, waarde: 'Am' },
    { start: 960, waarde: 'G7/B' },
    { start: 1440, waarde: 'F#m' },
  ];

  assert.deepEqual(akkoorden(maten[0]), verwacht);
  assert.deepEqual(akkoorden(maten[1]), []);
  assert.deepEqual(akkoorden(leesMusicXML(naarMusicXML(partituur)).partijen[0].maten[0]), verwacht);
});

test('onbekende akkoordnamen blijven als tekst van kind behouden', () => {
  const partituur = leesMusicXML(MUSICXML);
  const akkoord = partituur.partijen[0].maten[0].elementen.find((element) => element.type === 'akkoord');
  akkoord.waarde = 'Cadd9';

  const xml = naarMusicXML(partituur);
  assert.match(xml, /<kind text="add9">other<\/kind>/);
  assert.equal(akkoorden(leesMusicXML(xml).partijen[0].maten[0])[0].waarde, 'Cadd9');
});

test('akkoordsymbolen veranderen de MIDI-bytes niet', () => {
  const metAkkoorden = leesMusicXML(MUSICXML);
  const zonderAkkoorden = structuredClone(metAkkoorden);
  for (const maat of zonderAkkoorden.partijen[0].maten) {
    maat.elementen = maat.elementen.filter((element) => element.type !== 'akkoord');
  }

  assert.deepEqual(schrijfMidi(metAkkoorden), schrijfMidi(zonderAkkoorden));
});
