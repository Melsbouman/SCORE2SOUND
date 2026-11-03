import test from 'node:test';
import assert from 'node:assert/strict';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';
import { controleerMaatduur } from '../src/controle/maatduur.mjs';
import { schrijfMidi } from '../src/midi/schrijven.mjs';

const noot = (stap, lyric = '') => `<note><pitch><step>${stap}</step><octave>4</octave></pitch><duration>480</duration><voice>1</voice><type>quarter</type>${lyric}</note>`;
const musicXML = (teksten = true) => `<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Zang</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>480</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>${noot('C', teksten ? '<lyric number="1"><syllabic>begin</syllabic><text>Zin</text></lyric><lyric number="2"><syllabic>single</syllabic><text>Tweede couplet</text></lyric>' : '')}${noot('D', teksten ? '<lyric number="1"><syllabic>end</syllabic><text>gen</text></lyric>' : '')}${noot('E', teksten ? '<lyric number="1"><syllabic>single</syllabic><text>een</text></lyric>' : '')}${noot('F', teksten ? '<lyric number="1"><syllabic>single</syllabic><text>twee</text></lyric>' : '')}</measure></part></score-partwise>`;

const noten = (partituur) => partituur.partijen[0].maten[0].elementen.filter((element) => element.soort === 'noot');

test('MusicXML-zangtekst wordt gelezen, geschreven en opnieuw gelezen', () => {
  const partituur = leesMusicXML(musicXML());
  const verwacht = [
    [
      { couplet: 1, lettergreep: 'Zin', soort: 'begin' },
      { couplet: 2, lettergreep: 'Tweede couplet', soort: 'single' },
    ],
    [{ couplet: 1, lettergreep: 'gen', soort: 'eind' }],
    [{ couplet: 1, lettergreep: 'een', soort: 'single' }],
    [{ couplet: 1, lettergreep: 'twee', soort: 'single' }],
  ];

  assert.deepEqual(noten(partituur).map((noot) => noot.teksten), verwacht);
  assert.deepEqual(controleerMaatduur(partituur), []);
  const opnieuw = leesMusicXML(naarMusicXML(partituur));
  assert.deepEqual(noten(opnieuw).map((noot) => noot.teksten), verwacht);
  assert.equal(noten(opnieuw).length, 4);
});

test('noten zonder zangtekst hebben geen teksten-veld', () => {
  assert.ok(noten(leesMusicXML(musicXML(false))).every((noot) => !('teksten' in noot)));
});

test('zangtekst verandert de MIDI-bytes niet', () => {
  const metTekst = leesMusicXML(musicXML());
  const zonderTekst = leesMusicXML(musicXML(false));
  assert.deepEqual(schrijfMidi(metTekst), schrijfMidi(zonderTekst));
});
