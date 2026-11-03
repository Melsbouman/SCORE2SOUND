import test from 'node:test';
import assert from 'node:assert/strict';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';

const maakPartituur = () => ({
  partijen: ['P1', 'P2', 'P3'].map((id) => ({
    id,
    naam: id,
    instrument: { midiProgramma: 0 },
    maten: [],
  })),
});

const partijIds = (xml, element) => [...xml.matchAll(new RegExp(`<${element} id="([^"]+)"`, 'g'))]
  .map(([, id]) => id);

test('verbergt partijen alleen voor de weergave en uit beide MusicXML-lijsten', () => {
  const xml = naarMusicXML(maakPartituur(), { weergave: true, verberg: ['P2'] });
  assert.deepEqual(partijIds(xml, 'score-part'), ['P1', 'P3']);
  assert.deepEqual(partijIds(xml, 'part'), ['P1', 'P3']);
});

test('zonder weergave blijven alle partijen geschreven, ook met verberg', () => {
  const xml = naarMusicXML(maakPartituur(), { verberg: ['P2'] });
  assert.deepEqual(partijIds(xml, 'score-part'), ['P1', 'P2', 'P3']);
  assert.deepEqual(partijIds(xml, 'part'), ['P1', 'P2', 'P3']);
});

test('houdt de eerste partij over als alle partijen verborgen zijn', () => {
  const xml = naarMusicXML(maakPartituur(), { weergave: true, verberg: ['P1', 'P2', 'P3'] });
  assert.deepEqual(partijIds(xml, 'score-part'), ['P1']);
  assert.deepEqual(partijIds(xml, 'part'), ['P1']);
});

test('zonder verberg blijft de bestaande MusicXML-uitvoer gelijk', () => {
  const xml = naarMusicXML(maakPartituur());
  assert.equal(xml, '<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><part-list><score-part id="P1"><part-name>P1</part-name><midi-instrument id="P1-I1"><midi-program>1</midi-program></midi-instrument></score-part><score-part id="P2"><part-name>P2</part-name><midi-instrument id="P2-I1"><midi-program>1</midi-program></midi-instrument></score-part><score-part id="P3"><part-name>P3</part-name><midi-instrument id="P3-I1"><midi-program>1</midi-program></midi-instrument></score-part></part-list><part id="P1"></part><part id="P2"></part><part id="P3"></part></score-partwise>');
});
