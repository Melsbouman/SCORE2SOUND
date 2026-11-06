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

test('elke /api/-route die de browser aanroept bestaat op de server', () => {
  const server = readFileSync(join(HIER, 'server.mjs'), 'utf8');
  const routes = new Set([...server.matchAll(/\['(\/api\/[a-z-]+)',/g)].map((m) => m[1]));
  assert.ok(routes.size > 3);
  const gebruikt = new Set();
  for (const bestand of bestanden(join(HIER, 'public', 'js'))) {
    const tekst = readFileSync(bestand, 'utf8');
    for (const m of tekst.matchAll(/fetch\(\s*[`'"](\/api\/[a-z-]+)/g)) gebruikt.add(m[1]);
  }
  assert.ok(gebruikt.size > 0);
  for (const route of gebruikt) assert.ok(routes.has(route), `de browser roept ${route} aan, maar de server kent die niet`);
});
