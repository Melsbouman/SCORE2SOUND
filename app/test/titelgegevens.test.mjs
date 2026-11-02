import test from 'node:test';
import assert from 'node:assert/strict';
import { zetTitelgegevens } from '../src/model/titelgegevens.mjs';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';

const XML = '<score-partwise version="3.1"><part-list><score-part id="P1"><part-name>A</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes><note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note></measure></part></score-partwise>';

test('zetTitelgegevens maakt een kopie en knipt spaties weg', () => {
  const oud = leesMusicXML(XML);
  const nieuw = zetTitelgegevens(oud, { titel: '  Mars ', componist: 'Bach', arrangeur: ' Mels ' });
  assert.equal(nieuw.titel, 'Mars');
  assert.equal(nieuw.componist, 'Bach');
  assert.equal(nieuw.arrangeur, 'Mels');
  assert.equal(oud.titel, '');
  assert.equal(oud.arrangeur, undefined);
});

test('zetTitelgegevens laat velden die niet worden opgegeven zoals ze zijn, en leeg maken kan', () => {
  const oud = { ...leesMusicXML(XML), titel: 'X', componist: 'Y', arrangeur: 'Z' };
  const nieuw = zetTitelgegevens(oud, { componist: '' });
  assert.equal(nieuw.titel, 'X');
  assert.equal(nieuw.componist, '');
  assert.equal(nieuw.arrangeur, 'Z');
});

test('de arrangeur gaat heen en terug door MusicXML', () => {
  const p = zetTitelgegevens(leesMusicXML(XML), { titel: 'Mars', componist: 'Bach', arrangeur: 'Mels & zo' });
  const terug = leesMusicXML(naarMusicXML(p));
  assert.equal(terug.titel, 'Mars');
  assert.equal(terug.componist, 'Bach');
  assert.equal(terug.arrangeur, 'Mels & zo');
});

test('zonder arrangeur komt er geen arrangeur-veld bij het lezen', () => {
  assert.equal(leesMusicXML(XML).arrangeur, undefined);
  assert.equal(leesMusicXML(naarMusicXML(leesMusicXML(XML))).arrangeur, undefined);
});
