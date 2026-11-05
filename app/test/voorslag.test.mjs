import test from 'node:test';
import assert from 'node:assert/strict';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1">
      <part-name>Piano</part-name>
      <midi-instrument id="P1-I1"><midi-program>1</midi-program></midi-instrument>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note>
        <grace slash="yes"/>
        <pitch><step>D</step><octave>5</octave></pitch>
        <voice>1</voice>
        <type>eighth</type>
      </note>
      <note>
        <pitch><step>C</step><octave>5</octave></pitch>
        <duration>4</duration>
        <voice>1</voice>
        <type>quarter</type>
      </note>
      <note>
        <rest/>
        <duration>12</duration>
        <voice>1</voice>
        <type>half</type>
        <dot/>
      </note>
    </measure>
  </part>
</score-partwise>`;

test('bewaart een schuine voorslag zonder dat die maattijd inneemt', () => {
  const partituur = leesMusicXML(xml);
  const [voorslag, hoofdnoot, rust] = partituur.partijen[0].maten[0].elementen;

  assert.deepEqual(voorslag.voorslag, { schuin: true });
  assert.equal(voorslag.duur, 0);
  assert.equal(voorslag.start, 0);
  assert.equal(hoofdnoot.start, 0);
  assert.equal(rust.start, 480);

  const geschreven = naarMusicXML(partituur);
  const geschrevenVoorslag = geschreven.match(/<note><grace slash="yes"\/>.*?<\/note>/)?.[0];
  assert.ok(geschrevenVoorslag);
  assert.match(geschrevenVoorslag, /<pitch><step>D<\/step><octave>5<\/octave><\/pitch>/);
  assert.doesNotMatch(geschrevenVoorslag, /<duration>/);
});
