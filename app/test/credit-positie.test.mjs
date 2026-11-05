import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { leesCredits } from '../src/server/herken.mjs';

test('credit 12 heeft zijn pagina en positie uit MusicXML', async () => {
  const xml = await readFile(new URL('./fixtures/sand-and-stars-begin.xml', import.meta.url), 'utf8');
  const credit = leesCredits(xml).find(({ tekst }) => tekst === '12');

  assert.deepEqual(
    { pagina: credit?.pagina, x: credit?.x, y: credit?.y },
    { pagina: 0, x: 393, y: 1662 },
  );
});
