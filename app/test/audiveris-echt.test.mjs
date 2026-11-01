// Herkent het voorbeeld echt met Audiveris. Duurt een halve minuut en draait alleen op verzoek:
// SCORE2SOUND_ECHT=1 node --test test/audiveris-echt.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { audiverisPad } from '../src/server/audiveris.mjs';
import { echteDraaier, maakHerken } from '../src/server/herken.mjs';

const uit = !process.env.SCORE2SOUND_ECHT || !existsSync(audiverisPad());

test('Audiveris herkent het voorbeeld noot voor noot', { skip: uit, timeout: 180000 }, async (t) => {
  const map = await mkdtemp(join(tmpdir(), 'herken-echt-'));
  t.after(() => rm(map, { recursive: true, force: true }));
  const api = maakHerken({ map, draaier: echteDraaier });
  const verzoek = (methode, rest = '', body = Buffer.alloc(0), query = {}) => ({ methode, rest, body, query });
  const png = await readFile(new URL('./voorbeelden/herkenning.png', import.meta.url));
  const { body: { id } } = await api(verzoek('POST', '', png, { naam: 'herkenning.png' }));

  let stand;
  do {
    await new Promise((ok) => setTimeout(ok, 500));
    stand = (await api(verzoek('GET', id))).body;
  } while (stand.stand === 'wacht' || stand.stand === 'bezig');

  assert.equal(stand.stand, 'klaar', stand.fout);
  const noten = stand.partituur.partijen.flatMap((p) => p.maten.flatMap((m) => m.elementen)).filter((e) => e.soort === 'noot');
  assert.equal(noten.length, 23);
  assert.ok(noten.every((n) => n.plek));
  assert.equal((await api(verzoek('GET', `${id}/blad/1`))).soort, 'image/png');
});
