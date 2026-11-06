import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const HIER = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

function bestanden(map) {
  return readdirSync(map, { withFileTypes: true }).flatMap((item) => (
    item.isDirectory() ? bestanden(join(map, item.name)) : item.name.endsWith('.js') ? [join(map, item.name)] : []
  ));
}

test('elke map uit src/ die de browser importeert wordt door de server uitgeleverd', () => {
  const server = readFileSync(join(HIER, 'server.mjs'), 'utf8');
  const nodig = new Set();
  for (const bestand of bestanden(join(HIER, 'public', 'js'))) {
    const tekst = readFileSync(bestand, 'utf8');
    for (const treffer of tekst.matchAll(/from\s+'(?:\/|(?:\.\.\/)+)src\/([a-z]+)\//g)) nodig.add(treffer[1]);
  }
  assert.ok(nodig.size > 0);
  for (const map of nodig) {
    assert.ok(server.includes(`'/src/${map}/'`), `server.mjs levert /src/${map}/ niet uit`);
  }
});
