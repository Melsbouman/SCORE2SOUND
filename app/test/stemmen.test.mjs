// Bekende verschillen:
// - De volledige rondgang van een maat met twee stemmen slaagt nog niet.

import test from 'node:test';
import assert from 'node:assert/strict';

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1"><part-name>Piano</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note>
        <pitch><step>C</step><octave>4</octave></pitch>
        <duration>2</duration><voice>1</voice><type>half</type>
      </note>
      <note>
        <pitch><step>E</step><octave>4</octave></pitch>
        <duration>2</duration><voice>1</voice><type>half</type>
      </note>
      <backup><duration>4</duration></backup>
      <note>
        <pitch><step>G</step><octave>3</octave></pitch>
        <duration>1</duration><voice>2</voice><type>quarter</type>
      </note>
      <note>
        <pitch><step>A</step><octave>3</octave></pitch>
        <duration>1</duration><voice>2</voice><type>quarter</type>
      </note>
      <note>
        <pitch><step>B</step><octave>3</octave></pitch>
        <duration>1</duration><voice>2</voice><type>quarter</type>
      </note>
      <note>
        <pitch><step>C</step><octave>4</octave></pitch>
        <duration>1</duration><voice>2</voice><type>quarter</type>
      </note>
    </measure>
  </part>
</score-partwise>`;

function stemmenEnStarts(project) {
  return project.partijen[0].maten[0].elementen
    .filter((element) => element.soort === 'noot')
    .map(({ stem, start }) => ({ stem, start }));
}

test('leest, controleert en schrijft een maat met twee stemmen', async () => {
  const { leesMusicXML } = await import('../src/musicxml/lezen.mjs');
  const { naarMusicXML } = await import('../src/musicxml/schrijven.mjs');
  const { controleerMaatduur } = await import('../src/controle/maatduur.mjs');
  const project = leesMusicXML(xml);
  const verwacht = [
    { stem: 1, start: 0 },
    { stem: 2, start: 0 },
    { stem: 2, start: 480 },
    { stem: 1, start: 960 },
    { stem: 2, start: 960 },
    { stem: 2, start: 1440 },
  ];

  assert.deepEqual(stemmenEnStarts(project), verwacht);
  assert.deepEqual(controleerMaatduur(project), []);

  const opnieuw = leesMusicXML(naarMusicXML(project));
  assert.deepEqual(stemmenEnStarts(opnieuw), verwacht);
});
