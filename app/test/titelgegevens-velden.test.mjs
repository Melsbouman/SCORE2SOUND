import test from 'node:test';
import assert from 'node:assert/strict';
import { zetTitelgegevens } from '../src/model/titelgegevens.mjs';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';

const XML = '<score-partwise version="3.1"><part-list><score-part id="P1"><part-name>A</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes><note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note></measure></part></score-partwise>';

test('alleen titel zetten laat componist en arrangeur ongemoeid', () => {
  const oud = leesMusicXML(XML);
  const nieuw = zetTitelgegevens(oud, { titel: 'Nieuwe titel' });
  assert.equal(nieuw.titel, 'Nieuwe titel');
  assert.equal(nieuw.componist, '');
  assert.equal(nieuw.arrangeur, undefined);
  assert.equal(oud.titel, '');
  assert.equal(oud.componist, '');
  assert.equal(oud.arrangeur, undefined);
});
test('alleen componist zetten laat titel en arrangeur ongemoeid', () => {
  const oud = leesMusicXML(XML);
  const nieuw = zetTitelgegevens(oud, { componist: 'Bach' });
  assert.equal(nieuw.titel, '');
  assert.equal(nieuw.componist, 'Bach');
  assert.equal(nieuw.arrangeur, undefined);
  assert.equal(oud.titel, '');
  assert.equal(oud.componist, '');
  assert.equal(oud.arrangeur, undefined);
});
test('alleen arrangeur zetten laat titel en componist ongemoeid', () => {
  const oud = leesMusicXML(XML);
  const nieuw = zetTitelgegevens(oud, { arrangeur: 'Mels' });
  assert.equal(nieuw.titel, '');
  assert.equal(nieuw.componist, '');
  assert.equal(nieuw.arrangeur, 'Mels');
  assert.equal(oud.titel, '');
  assert.equal(oud.componist, '');
  assert.equal(oud.arrangeur, undefined);
});
test('lege titel "" wordt behandeld zoals de code dat nu doet', () => {
  const oud = leesMusicXML(XML);
  const nieuw = zetTitelgegevens(oud, { titel: '' });
  assert.equal(nieuw.titel, '');
  assert.equal(oud.titel, '');
});
test('origineel wordt niet gemuteerd (structuredClone vooraf vergelijken)', () => {
  const oud = leesMusicXML(XML);
  const oudKopie = structuredClone(oud);
  const nieuw = zetTitelgegevens(oud, { titel: 'Test' });
  assert.deepEqual(oud, oudKopie);
});
