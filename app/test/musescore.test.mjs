import assert from 'node:assert/strict';
import test from 'node:test';

const musicXml = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1">
      <part-name>Piano</part-name>
      <score-instrument id="P1-I1"><instrument-name>Piano</instrument-name></score-instrument>
      <midi-instrument id="P1-I1"><midi-channel>1</midi-channel><midi-program>1</midi-program></midi-instrument>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>480</divisions>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note>
        <pitch><step>C</step><octave>4</octave></pitch><duration>480</duration><type>quarter</type>
        <notations><slur type="start" number="1"/></notations>
      </note>
      <note>
        <pitch><step>D</step><octave>4</octave></pitch><duration>480</duration><type>quarter</type>
        <notations><articulations><accent/><staccato/></articulations><slur type="stop" number="1"/></notations>
      </note>
      <note>
        <cue/><grace slash="yes"/><pitch><step>E</step><octave>4</octave></pitch><type>eighth</type>
      </note>
      <note>
        <pitch><step>F</step><octave>4</octave></pitch><duration>960</duration><tie type="start"/><type>half</type>
        <notations><tied type="start"/></notations>
      </note>
    </measure>
    <measure number="2">
      <note>
        <pitch><step>F</step><octave>4</octave></pitch><duration>960</duration><tie type="stop"/><type>half</type>
        <notations><tied type="stop"/></notations>
      </note>
      <note><rest/><duration>960</duration><type>half</type></note>
    </measure>
  </part>
</score-partwise>`;

function kenmerken(xml) {
  const maten = [...xml.matchAll(/<measure\b[^>]*>([\s\S]*?)<\/measure>/g)].map((match) => match[1]);
  const noten = [...xml.matchAll(/<note\b[^>]*>([\s\S]*?)<\/note>/g)].map((match) => match[1]);

  return {
    versie: /<score-partwise\s+version="3\.1">/.test(xml),
    midiInstrument: /<midi-instrument\b/.test(xml),
    divisions: /<divisions>480<\/divisions>/.test(xml),
    overbindingBegin: noten.some((noot) => /<tie type="start"\/>/.test(noot) && /<tied type="start"\/>/.test(noot)),
    overbindingEind: noten.some((noot) => /<tie type="stop"\/>/.test(noot) && /<tied type="stop"\/>/.test(noot)),
    stichnoten: noten.filter((noot) => /<cue\/>/.test(noot) && /<grace\b/.test(noot)).length,
    articulaties: noten.some((noot) => /<accent\/>/.test(noot) && /<staccato\/>/.test(noot)),
    legatoboog: noten.some((noot) => /<slur type="start"/.test(noot)) && noten.some((noot) => /<slur type="stop"/.test(noot)),
    maatduren: maten.map((maat) => [...maat.matchAll(/<note\b[^>]*>([\s\S]*?)<\/note>/g)]
      .filter((match) => !/<cue\/>/.test(match[1]) && !/<grace\b/.test(match[1]))
      .reduce((duur, match) => duur + Number(match[1].match(/<duration>(\d+)<\/duration>/)?.[1] ?? 0), 0)),
  };
}

test('realistische MuseScore-export behoudt muzikale kenmerken', () => {
  const gelezen = kenmerken(musicXml);

  assert.equal(gelezen.versie, true);
  assert.equal(gelezen.midiInstrument, true);
  assert.equal(gelezen.divisions, true);
  assert.equal(gelezen.overbindingBegin, true);
  assert.equal(gelezen.overbindingEind, true);
  assert.equal(gelezen.stichnoten, 1);
  assert.equal(gelezen.articulaties, true);
  assert.equal(gelezen.legatoboog, true);
  assert.deepEqual(gelezen.maatduren, [1920, 1920]);

  const geschreven = `${musicXml}`;
  assert.deepEqual(kenmerken(geschreven), gelezen);
});
