import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';

import { controleerMaatduur } from '../src/controle/maatduur.mjs';
import { schrijfMidi } from '../src/midi/schrijven.mjs';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';

const aantalPartijen = 23;
const aantalMaten = 100;

function maakPartituurXml() {
  const partijenlijst = Array.from(
    { length: aantalPartijen },
    (_, index) => `<score-part id="P${index + 1}"><part-name>Partij ${index + 1}</part-name></score-part>`,
  ).join('');
  const noot = '<note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>';
  const partijen = Array.from({ length: aantalPartijen }, (_, partijIndex) => {
    const maten = Array.from({ length: aantalMaten }, (_, maatIndex) => {
      const attributen = maatIndex === 0
        ? '<attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>'
        : '';
      return `<measure number="${maatIndex + 1}">${attributen}${noot.repeat(4)}</measure>`;
    }).join('');
    return `<part id="P${partijIndex + 1}">${maten}</part>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><part-list>${partijenlijst}</part-list>${partijen}</score-partwise>`;
}

function meet(naam, grens, actie) {
  const begin = performance.now();
  const resultaat = actie();
  const duur = performance.now() - begin;
  assert.ok(duur <= grens, `${naam} duurde ${duur.toFixed(1)} ms (maximaal ${grens} ms)`);
  return resultaat;
}

test('grote partituren blijven vlot te verwerken', () => {
  const partituur = leesMusicXML(maakPartituurXml());

  const xml = meet('naarMusicXML', 3000, () => naarMusicXML(partituur));
  meet('leesMusicXML', 3000, () => leesMusicXML(xml));
  meet('schrijfMidi', 2000, () => schrijfMidi(partituur));
  meet('controleerMaatduur', 1000, () => controleerMaatduur(partituur));
});
