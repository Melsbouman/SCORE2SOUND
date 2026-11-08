import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// De browserkant (app/public/js) importeert modules uit app/src. Vraagt een scherm een naam die de module niet exporteert,
// dan start main.js niet en blijft de hele app leeg. Deze test laadt elke gebruikte src-module en controleert de namen.
const APP = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_JS = join(APP, 'public', 'js');

function browserbestanden(map) {
  return readdirSync(map, { withFileTypes: true }).flatMap((ingang) => {
    const pad = join(map, ingang.name);
    if (ingang.isDirectory()) return browserbestanden(pad);
    return ingang.name.endsWith('.js') ? [pad] : [];
  });
}

// import { a, b as c } from '/src/...' of uit een relatief pad dat in app/src eindigt.
function importsUitSrc(pad) {
  const tekst = readFileSync(pad, 'utf8');
  const uit = [];
  for (const [, namen, bron] of tekst.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g)) {
    let doel = null;
    if (bron.startsWith('/src/')) doel = join(APP, bron);
    else if (bron.startsWith('.')) {
      const absoluut = resolve(dirname(pad), bron);
      if (absoluut.startsWith(join(APP, 'src'))) doel = absoluut;
    }
    if (!doel) continue;
    const lijst = namen.split(',').map((naam) => naam.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);
    uit.push({ doel, namen: lijst });
  }
  return uit;
}

test('elke naam die de browser uit app/src importeert, wordt door die module geëxporteerd', async () => {
  const fouten = [];
  for (const bestand of browserbestanden(PUBLIC_JS)) {
    for (const { doel, namen } of importsUitSrc(bestand)) {
      const module = await import(pathToFileURL(doel).href);
      for (const naam of namen) {
        if (!(naam in module)) fouten.push(`${bestand.slice(APP.length + 1)} vraagt '${naam}' uit ${doel.slice(APP.length + 1)}`);
      }
    }
  }
  assert.deepEqual(fouten, []);
});
