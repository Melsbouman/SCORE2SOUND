import test from 'node:test';
import assert from 'node:assert/strict';

import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';
import { controleerMaatduur } from '../src/controle/maatduur.mjs';

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1"><part-name>Slagwerk</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>percussion</sign><line>2</line></clef>
      </attributes>
      <note><unpitched><display-step>C</display-step><display-octave>5</display-octave></unpitched><duration>1</duration><voice>1</voice><type>quarter</type></note>
      <note><unpitched><display-step>E</display-step><display-octave>5</display-octave></unpitched><duration>1</duration><voice>1</voice><type>quarter</type></note>
      <note><unpitched><display-step>C</display-step><display-octave>5</display-octave></unpitched><duration>1</duration><voice>1</voice><type>quarter</type></note>
      <note><unpitched><display-step>E</display-step><display-octave>5</display-octave></unpitched><duration>1</duration><voice>1</voice><type>quarter</type></note>
    </measure>
  </part>
</score-partwise>`;

const verwachteToonhoogten = [
  { stap: 'C', alter: 0, octaaf: 5 },
  { stap: 'E', alter: 0, octaaf: 5 },
  { stap: 'C', alter: 0, octaaf: 5 },
  { stap: 'E', alter: 0, octaaf: 5 },
];

test('ongestemde slagwerknoten blijven behouden bij lezen en schrijven', () => {
  const score = leesMusicXML(xml);
  const noten = score.partijen[0].maten[0].elementen;

  assert.deepEqual(noten.map((noot) => noot.ongestemd), [true, true, true, true]);
  assert.deepEqual(noten.map((noot) => noot.toonhoogte), verwachteToonhoogten);
  assert.deepEqual(controleerMaatduur(score), []);

  const geschreven = naarMusicXML(score);
  assert.equal((geschreven.match(/<unpitched>/g) ?? []).length, 4);
  assert.equal(geschreven.includes('<pitch>'), false);

  const opnieuw = leesMusicXML(geschreven).partijen[0].maten[0].elementen;
  assert.deepEqual(opnieuw.map((noot) => noot.ongestemd), [true, true, true, true]);
  assert.deepEqual(opnieuw.map((noot) => noot.toonhoogte), verwachteToonhoogten);
});
