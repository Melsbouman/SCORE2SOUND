import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

// De browser kan een kale pakketnaam ('fast-xml-parser') niet vinden: dan laadt de hele module niet, terwijl de tests in
// Node wel slagen. Modules die de browser laadt importeren daarom alleen relatieve of absolute paden. Een import die alleen
// in Node draait (await import(...) achter een controle) mag wel.
const BROWSERMAPPEN = ['model', 'musicxml', 'controle', 'midi', 'import', 'project', 'herkenning', 'pdf'];
// Deze bestanden staan in een browsermap maar draaien alleen in Node (niemand in de browser importeert ze).
const ALLEEN_SERVER = new Set(['project/opslag.mjs', 'controle/indeling.mjs']);

test('modules voor de browser importeren geen kale pakketnamen', async () => {
  const fouten = [];
  for (const map of BROWSERMAPPEN) {
    const pad = new URL(`../src/${map}/`, import.meta.url);
    let namen = [];
    try {
      namen = await readdir(pad);
    } catch {
      continue;
    }
    for (const naam of namen.filter((bestand) => bestand.endsWith('.mjs'))) {
      if (ALLEEN_SERVER.has(`${map}/${naam}`)) continue;
      const bron = await readFile(new URL(naam, pad), 'utf8');
      for (const [, doel] of bron.matchAll(/^\s*(?:import|export)\s[^;]*?from\s+['"]([^'"]+)['"]/gm)) {
        if (!doel.startsWith('.') && !doel.startsWith('/')) fouten.push(`${join(map, naam)}: ${doel}`);
      }
    }
  }
  assert.deepEqual(fouten, []);
});
