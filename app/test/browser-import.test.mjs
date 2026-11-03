import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Deze bestanden draaien ook in de browser, waar fast-xml-parser niet bestaat. Ze mogen die bibliotheek niet
// laden, ook niet via een ander bestand dat ze importeren.
const BROWSER_BESTANDEN = ['../src/musicxml/schrijven.mjs', '../src/model/dynamiek.mjs', '../src/model/corrigeren.mjs'];
const hier = dirname(fileURLToPath(import.meta.url));

async function importKeten(pad, gezien = new Set()) {
  const volledig = resolve(hier, pad);
  if (gezien.has(volledig)) return gezien;
  gezien.add(volledig);
  const tekst = await readFile(volledig, 'utf8');
  for (const [, naam] of tekst.matchAll(/(?:^|\n)\s*(?:import|export)\s[^'"\n]*?from\s*['"]([^'"]+)['"]/g)) {
    if (naam.startsWith('.')) await importKeten(resolve(dirname(volledig), naam), gezien);
    else gezien.add(`pakket:${naam}`);
  }
  return gezien;
}

for (const bestand of BROWSER_BESTANDEN) {
  test(`${bestand} laadt fast-xml-parser niet`, async () => {
    const keten = await importKeten(bestand);
    assert.ok(![...keten].includes('pakket:fast-xml-parser'), `${bestand} haalt fast-xml-parser binnen`);
  });
}
