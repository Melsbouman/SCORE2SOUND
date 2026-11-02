import test from 'node:test';
import assert from 'node:assert/strict';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';
import { schrijfMidi } from '../src/midi/schrijven.mjs';

const MUSICXML = `<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>480</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>480</duration><voice>1</voice></note>
      <direction><direction-type><octave-shift type="down" size="8" number="1"/></direction-type></direction>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>480</duration><voice>1</voice></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>480</duration><voice>1</voice></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>480</duration><voice>1</voice></note>
    </measure>
    <measure number="2">
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>480</duration><voice>1</voice></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>480</duration><voice>1</voice></note>
      <direction><direction-type><octave-shift type="stop" size="8" number="1"/></direction-type></direction>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>480</duration><voice>1</voice></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>480</duration><voice>1</voice></note>
    </measure>
  </part>
</score-partwise>`;

function midiNoten(bytes) {
  const midi = Buffer.from(bytes);
  const noten = [];
  let positie = 14;
  while (positie < midi.length) {
    const einde = positie + 8 + midi.readUInt32BE(positie + 4);
    positie += 8;
    while (positie < einde) {
      let byte;
      do {
        byte = midi[positie++];
      } while (byte & 0x80);
      const status = midi[positie++];
      if (status === 0xff) {
        positie += 1;
        let lengte = 0;
        do {
          byte = midi[positie++];
          lengte = (lengte << 7) | (byte & 0x7f);
        } while (byte & 0x80);
        positie += lengte;
      } else if ((status & 0xf0) === 0x90) {
        const toets = midi[positie++];
        const snelheid = midi[positie++];
        if (snelheid) noten.push(toets);
      } else {
        positie += (status & 0xf0) === 0xc0 || (status & 0xf0) === 0xd0 ? 1 : 2;
      }
    }
  }
  return noten;
}

function octaafAanwijzingen(partituur) {
  return partituur.partijen[0].maten.flatMap((maat) => maat.elementen)
    .filter((element) => element.type === 'octaafteken')
    .map(({ start, waarde, grootte, nummer }) => ({ start, waarde, grootte, nummer }));
}

test('octaafteken geldt tot de stop over de maatgrens en blijft schrijfbaar', () => {
  const partituur = leesMusicXML(MUSICXML);
  const maten = partituur.partijen[0].maten;
  const noten = maten.map((maat) => maat.elementen.filter((element) => element.soort === 'noot'));

  assert.deepEqual(noten.map((maat) => maat.map((noot) => noot.octaafVerschuiving ?? null)), [
    [null, 1, 1, 1],
    [1, 1, null, null],
  ]);
  assert.deepEqual(octaafAanwijzingen(partituur), [
    { start: 480, waarde: 'begin-omhoog', grootte: 8, nummer: 1 },
    { start: 960, waarde: 'eind', grootte: 8, nummer: 1 },
  ]);

  const xml = naarMusicXML(partituur);
  assert.match(xml, /<octave-shift type="down" size="8" number="1"\/>/);
  assert.match(xml, /<octave-shift type="stop" size="8" number="1"\/>/);
  assert.deepEqual(octaafAanwijzingen(leesMusicXML(xml)), octaafAanwijzingen(partituur));
});

test('octaafverschuiving verhoogt MIDI met twaalf halve tonen en geen teken behoudt bytes', () => {
  const metTeken = leesMusicXML(MUSICXML);
  const zonderTeken = leesMusicXML(MUSICXML.replace(/<direction><direction-type><octave-shift[^>]*\/><\/direction-type><\/direction>/g, ''));
  const notenMet = midiNoten(schrijfMidi(metTeken));
  const notenZonder = midiNoten(schrijfMidi(zonderTeken));

  assert.equal(notenMet[1] - notenZonder[1], 12);
  assert.deepEqual(schrijfMidi(zonderTeken), schrijfMidi(leesMusicXML(naarMusicXML(zonderTeken))));
});
