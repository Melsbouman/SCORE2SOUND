import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('de melding over niet-gekoppelde noten noemt de redenen per soort', async () => {
  const bron = await readFile(new URL('../src/server/herken.mjs', import.meta.url), 'utf8');
  assert.ok(bron.includes('uit.redenen'));
  assert.ok(bron.includes('geenKopInMaat'));
  assert.ok(bron.includes('andereToonhoogte'));
  assert.ok(bron.includes('alGebruikt'));
});
