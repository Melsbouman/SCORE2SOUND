import test from 'node:test';
import assert from 'node:assert/strict';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { controleerMaatduur } from '../src/controle/maatduur.mjs';
import { schrijfMidi } from '../src/midi/schrijven.mjs';

const maakMusicXML = (voorslag) => `<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1"><measure number="1">
    <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
    ${voorslag ? '<note><grace slash="yes"/><pitch><step>B</step><octave>4</octave></pitch><voice>1</voice><type>eighth</type></note>' : ''}
    <note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>
    <note><pitch><step>D</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>
    <note><pitch><step>E</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>
    <note><pitch><step>F</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>
  </measure></part></score-partwise>`;

test('een voorslag wordt ingelezen zonder maatduur of MIDI te veranderen', () => {
  const metVoorslag = leesMusicXML(maakMusicXML(true));
  const zonderVoorslag = leesMusicXML(maakMusicXML(false));
  const maat = metVoorslag.partijen[0].maten[0];
  const eersteNoot = maat.elementen.find((element) => element.soort === 'noot' && !element.voorslag);
  const voorslag = maat.elementen.find((element) => element.voorslag);

  assert.deepEqual(voorslag.voorslag, { schuin: true });
  assert.equal(voorslag.duur, 0);
  assert.equal(voorslag.start, eersteNoot.start);
  assert.deepEqual(controleerMaatduur(metVoorslag), []);
  assert.deepEqual(schrijfMidi(metVoorslag), schrijfMidi(zonderVoorslag));
});
