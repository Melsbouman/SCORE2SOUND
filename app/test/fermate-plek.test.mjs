import test from 'node:test';
import assert from 'node:assert/strict';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note>
        <pitch><step>C</step><octave>4</octave></pitch>
        <duration>1</duration><voice>1</voice><type>quarter</type>
      </note>
      <backup><duration>1</duration></backup>
      <note>
        <pitch><step>E</step><octave>4</octave></pitch>
        <duration>1</duration><voice>2</voice><type>quarter</type>
        <notations><fermata type="inverted"/></notations>
      </note>
      <note>
        <pitch><step>F</step><octave>4</octave></pitch>
        <duration>1</duration><voice>2</voice><type>quarter</type>
      </note>
    </measure>
  </part>
</score-partwise>`;

test('een fermate blijft onder de noot op hetzelfde tijdstip staan', () => {
  const gelezen = leesMusicXML(xml);
  const noten = gelezen.partijen[0].maten[0].elementen.filter((element) => element.soort === 'noot');
  const c = noten.find((noot) => noot.toonhoogte.stap === 'C');
  const e = noten.find((noot) => noot.toonhoogte.stap === 'E');
  const f = noten.find((noot) => noot.toonhoogte.stap === 'F');

  assert.equal(c.start, 0);
  assert.equal(e.start, 0);
  assert.equal(e.fermate, true);
  assert.equal(e.fermateType, 'inverted');
  assert.equal(f.start, 480);
  assert.equal(f.fermate, undefined);

  const terug = naarMusicXML(gelezen);
  assert.match(terug, /<pitch><step>E<\/step><octave>4<\/octave><\/pitch>[\s\S]*?<notations><fermata type="inverted"\/><\/notations>/);
  assert.doesNotMatch(terug, /<pitch><step>F<\/step><octave>4<\/octave><\/pitch>[\s\S]*?<notations><fermata/);
});
