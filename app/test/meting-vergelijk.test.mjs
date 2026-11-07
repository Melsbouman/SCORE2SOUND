import test from 'node:test';
import assert from 'node:assert/strict';
import { vergelijkMusicXML } from '../src/meting/vergelijk.mjs';

const xml = (stappen) => `<?xml version="1.0"?><score-partwise version="3.1"><part-list><score-part id="P1"><part-name>Cornet</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>1</divisions></attributes>${stappen.map((s) => s === 'R' ? '<note><rest/><duration>1</duration><type>quarter</type></note>' : `<note><pitch><step>${s[0]}</step><octave>${s[1]}</octave></pitch><duration>1</duration><type>quarter</type></note>`).join('')}</measure></part></score-partwise>`;

test('gelijke bestanden geven nauwkeurigheid 1', () => {
  const r = vergelijkMusicXML(xml(['C4', 'D4', 'E4', 'F4']), xml(['C4', 'D4', 'E4', 'F4']));
  assert.equal(r.noten, 4);
  assert.equal(r.juist, 4);
  assert.equal(r.nauwkeurigheid, 1);
  assert.equal(r.maten, 1);
  assert.equal(r.matenJuist, 1);
});

test('een foute toonhoogte telt als een fout en maakt de maat fout', () => {
  const r = vergelijkMusicXML(xml(['C4', 'D4', 'E4', 'F4']), xml(['C4', 'D4', 'G4', 'F4']));
  assert.equal(r.noten, 4);
  assert.equal(r.juist, 3);
  assert.equal(r.nauwkeurigheid, 0.75);
  assert.equal(r.matenJuist, 0);
});

test('rusten tellen niet mee als noot', () => {
  const r = vergelijkMusicXML(xml(['C4', 'R', 'E4', 'R']), xml(['C4', 'R', 'E4', 'R']));
  assert.equal(r.noten, 2);
  assert.equal(r.juist, 2);
});

test('een leeg resultaat geeft nauwkeurigheid 0', () => {
  const r = vergelijkMusicXML(xml(['C4', 'D4']), xml([]));
  assert.equal(r.noten, 2);
  assert.equal(r.juist, 0);
  assert.equal(r.nauwkeurigheid, 0);
});