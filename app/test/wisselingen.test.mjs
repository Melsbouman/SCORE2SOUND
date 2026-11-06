// Bekende verschillen:
// - schrijfMidi schrijft alleen de eerste maatsoort als meta 0x58 en niet elke wisseling.

import test from 'node:test';
import assert from 'node:assert/strict';

import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';
import { controleerMaatduur } from '../src/controle/maatduur.mjs';
import { schrijfMidi } from '../src/midi/schrijven.mjs';

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1"><part-name>Piano</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note><rest/><duration>4</duration><type>whole</type></note>
    </measure>
    <measure number="2">
      <attributes><key><fifths>2</fifths></key></attributes>
      <note><rest/><duration>4</duration><type>whole</type></note>
    </measure>
    <measure number="3">
      <attributes><time><beats>3</beats><beat-type>4</beat-type></time></attributes>
      <note><rest/><duration>3</duration><type>half</type><dot/></note>
    </measure>
    <measure number="4">
      <attributes><time><beats>6</beats><beat-type>8</beat-type></time></attributes>
      <note><rest/><duration>3</duration><type>half</type><dot/></note>
    </measure>
    <measure number="5">
      <note><rest/><duration>3</duration><type>half</type><dot/></note>
    </measure>
  </part>
</score-partwise>`;

function wisselingen(score) {
  return score.partijen[0].maten.map((maat) => ({
    maatsoort: maat.maatsoort,
    toonsoort: maat.toonsoort,
  }));
}

test('maatsoort- en toonsoortwisselingen blijven behouden', () => {
  const score = leesMusicXML(xml);
  const verwacht = [
    { maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' } },
    { maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 2, modus: 'majeur' } },
    { maatsoort: { teller: 3, noemer: 4 }, toonsoort: { kwinten: 2, modus: 'majeur' } },
    { maatsoort: { teller: 6, noemer: 8 }, toonsoort: { kwinten: 2, modus: 'majeur' } },
    { maatsoort: { teller: 6, noemer: 8 }, toonsoort: { kwinten: 2, modus: 'majeur' } },
  ];

  assert.deepEqual(wisselingen(score), verwacht);
  assert.deepEqual(controleerMaatduur(score), []);
  assert.deepEqual(wisselingen(leesMusicXML(naarMusicXML(score))), verwacht);
});

test('MIDI bevat een maatsoortgebeurtenis voor elke wisseling', () => {
  const score = leesMusicXML(xml);
  const midi = schrijfMidi(score);
  let aantalMaatsoorten = 0;
  for (let index = 0; index < midi.length - 1; index += 1) {
    if (midi[index] === 0xff && midi[index + 1] === 0x58) aantalMaatsoorten += 1;
  }
  assert.equal(aantalMaatsoorten, 3);
});
