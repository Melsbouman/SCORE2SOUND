import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { maakApp } from '../public/js/app.js';

// Elke app.x die de browsercode gebruikt, bestaat in app.js (zoals browser-imports.test.mjs dat voor imports doet). Een agent
// schreef app.staat() in plaats van app.stand en het scherm Nieuwe partij startte niet. Optionele aanroepen (app.x?.()) en
// commentaar tellen niet mee.
test('elke app.x in de browsercode bestaat in app.js', async () => {
  const namen = new Set(Object.keys(maakApp()));
  const fouten = [];
  for (const map of ['../public/js/', '../public/js/views/']) {
    const url = new URL(map, import.meta.url);
    for (const bestand of (await readdir(url)).filter((naam) => naam.endsWith('.js'))) {
      const bron = (await readFile(new URL(bestand, url), 'utf8')).replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/ .*$/gm, '');
      for (const [, naam] of bron.matchAll(/(?<![\w./'"-])app\.([A-Za-z]+)\b(?!\?\.)/g)) {
        if (!namen.has(naam)) fouten.push(`${map}${bestand}: app.${naam}`);
      }
    }
  }
  assert.deepEqual(fouten, []);
});
