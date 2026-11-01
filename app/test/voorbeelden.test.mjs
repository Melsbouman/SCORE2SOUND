import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { XMLValidator } from 'fast-xml-parser';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';

// De testvoorbeelden zijn de basis van veel andere tests: ze moeten in elk geval geldige XML zijn.
const MAP = new URL('./voorbeelden/', import.meta.url);

test('elk testvoorbeeld is geldige MusicXML (score-partwise)', async () => {
  const namen = (await readdir(MAP)).filter((n) => n.endsWith('.musicxml'));
  assert.ok(namen.length >= 3, 'er horen minstens drie voorbeelden te zijn');
  for (const naam of namen) {
    const tekst = await readFile(new URL(naam, MAP), 'utf8');
    const uitslag = XMLValidator.validate(tekst);
    assert.equal(uitslag, true, `${naam}: ${JSON.stringify(uitslag)}`);
    assert.match(tekst, /<score-partwise/, `${naam} is geen score-partwise`);
  }
});

test('het voorbeeld van de herkenning: Audiveris gaf precies de geschreven noten terug', async () => {
  const noten = async (bestand) => leesMusicXML(await readFile(new URL(bestand, MAP), 'utf8')).partijen
    .map((partij) => partij.maten.map((maat) => maat.elementen.filter((e) => e.soort === 'noot').map((e) => [e.start, e.duur, e.toonhoogte])));
  assert.deepEqual(await noten('herkenning.xml'), await noten('herkenning.musicxml'));
});
