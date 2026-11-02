import test from 'node:test';
import assert from 'node:assert/strict';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';
import { leesXml, kind, kinderen } from '../src/musicxml/xml.mjs';

const stuk = (maat) => `<?xml version="1.0"?><score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Bugel</part-name></score-part></part-list>
<part id="P1"><measure number="1"><attributes><divisions>2</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>${maat}</measure></part></score-partwise>`;

test('aanwijzingen staan boven of onder de balk op de juiste plek', () => {
  const xml = stuk(
    '<direction><direction-type><words>rall.</words></direction-type></direction>'
    + '<direction><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>96</per-minute></metronome></direction-type><sound tempo="96"/></direction>'
    + '<direction><direction-type><rehearsal enclosure="square">A</rehearsal></direction-type></direction>'
    + '<direction><direction-type><dynamics><p/></dynamics></direction-type></direction>'
    + '<direction><direction-type><wedge type="crescendo"/></direction-type></direction>'
    + '<note><pitch><step>C</step><octave>4</octave></pitch><duration>8</duration><voice>1</voice><type>whole</type></note>',
  );
  const terug = naarMusicXML(leesMusicXML(xml));
  const richtingen = kinderen(kind(kind(leesXml(terug), 'part'), 'measure'), 'direction');

  assert.deepEqual(richtingen.map((richting) => [
    kinderen(kind(richting, 'direction-type'))[0].naam,
    richting.attr.placement,
  ]), [
    ['words', 'above'],
    ['metronome', 'above'],
    ['rehearsal', 'above'],
    ['dynamics', 'below'],
    ['wedge', 'below'],
  ]);
});
