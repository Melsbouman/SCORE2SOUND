import test from 'node:test';
import assert from 'node:assert/strict';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';
import { controleerMaatduur } from '../src/controle/maatduur.mjs';
import { leesXml, kind, kinderen, getal } from '../src/musicxml/xml.mjs';

const voorbeeld = `<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Fluit</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>480</divisions><time><beats>4</beats><beat-type>4</beat-type></time><measure-style><multiple-rest>3</multiple-rest></measure-style></attributes>
      <note><rest measure="yes"/><duration>1920</duration><voice>1</voice></note>
    </measure>
    <measure number="2"><note print-object="no"><rest measure="yes"/><duration>1920</duration><voice>1</voice></note></measure>
    <measure number="3"><note print-object="no"><rest measure="yes"/><duration>1920</duration><voice>1</voice></note></measure>
    <measure number="4"><note><pitch><step>C</step><octave>5</octave></pitch><duration>1920</duration><voice>1</voice></note></measure>
  </part>
</score-partwise>`;

const metadata = (maten) => maten.map(({ maatrust, verborgen }) => ({
  ...(maatrust !== undefined ? { maatrust } : {}),
  ...(verborgen !== undefined ? { verborgen } : {}),
}));

test('meermaats-rust blijft behouden bij inlezen en schrijven', () => {
  const partituur = leesMusicXML(voorbeeld);
  const maten = partituur.partijen[0].maten;
  assert.deepEqual(metadata(maten), [{ maatrust: 3 }, { verborgen: true }, { verborgen: true }, {}]);
  assert.equal(maten.length, 4);
  assert.deepEqual(controleerMaatduur(partituur), []);

  const xml = naarMusicXML(partituur);
  const partij = kinderen(leesXml(xml), 'part')[0];
  const geschrevenMaten = kinderen(partij, 'measure');
  const stijl = kind(kind(geschrevenMaten[0], 'attributes'), 'measure-style');
  assert.equal(getal(stijl, 'multiple-rest'), 3);
  assert.equal(kind(geschrevenMaten[1], 'note').attr['print-object'], 'no');
  assert.equal(kind(geschrevenMaten[2], 'note').attr['print-object'], 'no');

  const opnieuw = leesMusicXML(xml);
  assert.equal(opnieuw.partijen[0].maten.length, 4);
  assert.deepEqual(metadata(opnieuw.partijen[0].maten), metadata(maten));
  assert.deepEqual(controleerMaatduur(opnieuw), []);
});

test('een noot in de meermaats-rust maakt de reeks weer zichtbaar', () => {
  const partituur = leesMusicXML(voorbeeld);
  partituur.partijen[0].maten[1].elementen = [{
    soort: 'noot',
    start: 0,
    duur: 1920,
    stem: 1,
    notenbalk: 1,
    toonhoogte: { stap: 'D', alter: 0, octaaf: 5 },
    zekerheid: 1,
  }];
  const xml = naarMusicXML(partituur);
  const geschrevenMaten = kinderen(kind(leesXml(xml), 'part'), 'measure');
  assert.equal(kind(kind(geschrevenMaten[0], 'attributes'), 'measure-style'), null);
  assert.equal(kind(geschrevenMaten[1], 'note').attr['print-object'], undefined);
  assert.equal(kind(geschrevenMaten[2], 'note').attr['print-object'], undefined);
  assert.deepEqual(metadata(leesMusicXML(xml).partijen[0].maten), [{}, {}, {}, {}]);
});
