import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';

test('een meermaatsrust van negen maten blijft behouden na schrijven en lezen', async () => {
  const eerst = leesMusicXML(await readFile(new URL('./fixtures/rust-9-maatrust.xml', import.meta.url), 'utf8'));
  const xml = naarMusicXML(eerst);
  const opnieuw = leesMusicXML(xml);

  assert.equal(opnieuw.partijen[0].maten[0].maatrust, 9);
  assert.ok(xml.includes('<multiple-rest>9</multiple-rest>'));
});
