import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';

// Lezen, schrijven en weer lezen geeft hetzelfde model: zo gaat er bij opslaan, weergeven en exporteren niets verloren.
for (const naam of ['eenvoudig', 'ensemble', 'fout-maatduur']) {
  test(`heen en terug: ${naam}`, async () => {
    const eerst = leesMusicXML(await readFile(new URL(`./voorbeelden/${naam}.musicxml`, import.meta.url), 'utf8'));
    assert.deepEqual(leesMusicXML(naarMusicXML(eerst)), eerst);
  });
}
