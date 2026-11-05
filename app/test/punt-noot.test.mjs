import test from 'node:test';
import assert from 'node:assert/strict';

import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';

test('een gepunteerde halve noot blijft drie kwarten en krijgt precies een punt', () => {
  const invoer = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>480</divisions>
        <time><beats>3</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note>
        <pitch><step>A</step><octave>4</octave></pitch>
        <duration>1440</duration>
        <voice>1</voice>
        <type>half</type>
        <dot/>
      </note>
    </measure>
  </part>
</score-partwise>`;

  const partituur = leesMusicXML(invoer);
  const noot = partituur.partijen[0].maten[0].elementen[0];
  assert.equal(noot.duur, 1440);

  const uitvoer = naarMusicXML(partituur);
  const nootXml = uitvoer.match(/<note>[\s\S]*?<\/note>/)?.[0] ?? '';
  assert.match(nootXml, /<duration>1440<\/duration>/);
  assert.match(nootXml, /<type>half<\/type><dot\/>/);
  assert.equal((nootXml.match(/<dot\/>/g) ?? []).length, 1);
  assert.doesNotMatch(nootXml, /<time-modification>/);
});
