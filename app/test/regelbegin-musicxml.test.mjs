import test from 'node:test';
import assert from 'node:assert/strict';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';

const xml = (print = '') => `<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">${print ? '<print new-system="yes"/>' : ''}</measure>
    <measure number="2"/>
    <measure number="3">${print ? '<print new-system="yes" new-page="yes"/>' : ''}</measure>
    <measure number="4"/>
  </part>
</score-partwise>`;

test('regel- en pagina-einde blijven behouden bij MusicXML lezen en schrijven', () => {
  const partituur = leesMusicXML(xml(true));
  const maten = partituur.partijen[0].maten;

  assert.deepEqual(maten.map(({ regelbegin }) => regelbegin), [true, undefined, true, undefined]);
  assert.deepEqual(maten.map(({ paginabegin }) => paginabegin), [undefined, undefined, true, undefined]);

  const opnieuw = leesMusicXML(naarMusicXML(partituur)).partijen[0].maten;
  assert.deepEqual(opnieuw.map(({ regelbegin }) => regelbegin), [true, undefined, true, undefined]);
  assert.deepEqual(opnieuw.map(({ paginabegin }) => paginabegin), [undefined, undefined, true, undefined]);
});

test('zonder print-elementen blijven regel- en pagina-einde afwezig', () => {
  const partituur = leesMusicXML(xml());

  assert.deepEqual(partituur.partijen[0].maten.map((maat) => [maat.regelbegin, maat.paginabegin]), [
    [undefined, undefined], [undefined, undefined], [undefined, undefined], [undefined, undefined],
  ]);
  assert.doesNotMatch(naarMusicXML(partituur), /<print(?:\s|>)/);
});
