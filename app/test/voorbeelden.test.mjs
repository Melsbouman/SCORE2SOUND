import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { XMLValidator } from 'fast-xml-parser';

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
