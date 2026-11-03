import test from 'node:test';
import assert from 'node:assert/strict';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';

const MUSICXML = `<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1"><measure number="1">
    <attributes><divisions>2</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
    <note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><notations><ornaments><tremolo type="single">3</tremolo></ornaments></notations></note>
    <note><pitch><step>D</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><notations><arpeggiate direction="down"/></notations></note>
    <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><notations><glissando type="start" number="1">gliss.</glissando></notations></note>
    <note><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><notations><glissando type="stop" number="1">gliss.</glissando></notations></note>
    <note><pitch><step>G</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice></note>
  </measure></part>
</score-partwise>`;

const noten = (xml) => leesMusicXML(xml).partijen[0].maten[0].elementen;
const tekens = (noot) => ({
  ...(noot.tremolo !== undefined ? { tremolo: noot.tremolo } : {}),
  ...(noot.arpeggio !== undefined ? { arpeggio: noot.arpeggio } : {}),
  ...(noot.glissando !== undefined ? { glissando: noot.glissando } : {}),
});

test('tremolo, arpeggio en glissando blijven behouden bij lezen en schrijven', () => {
  const gelezen = noten(MUSICXML);
  assert.deepEqual(gelezen.map(tekens), [
    { tremolo: { streepjes: 3, type: 'single' } },
    { arpeggio: 'omlaag' },
    { glissando: { begin: true, eind: false } },
    { glissando: { begin: false, eind: true } },
    {},
  ]);
  assert.equal('tremolo' in gelezen[4], false);
  assert.equal('arpeggio' in gelezen[4], false);
  assert.equal('glissando' in gelezen[4], false);

  const teruggeschreven = naarMusicXML(leesMusicXML(MUSICXML));
  assert.match(teruggeschreven, /<tremolo type="single">3<\/tremolo>/);
  assert.match(teruggeschreven, /<arpeggiate direction="down"\/>/);
  assert.match(teruggeschreven, /<glissando type="start" number="1"\/>/);
  assert.match(teruggeschreven, /<glissando type="stop" number="1"\/>/);
  assert.deepEqual(noten(teruggeschreven).map(tekens), gelezen.map(tekens));
});
