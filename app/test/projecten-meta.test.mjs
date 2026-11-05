import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import projecten from '../src/server/projecten.mjs';

const partituur = { versie: 1, titel: 'Mars', componist: '', partijen: [] };

async function tijdelijkeMap(t) {
  const map = await mkdtemp(join(tmpdir(), 'score2sound-'));
  t.after(() => rm(map, { recursive: true, force: true }));
  return join(map, 'projecten');
}

test('API /api/projecten: metadata bijwerken en teruggeven', async (t) => {
  process.env.SCORE2SOUND_PROJECTEN = await tijdelijkeMap(t);
  t.after(() => delete process.env.SCORE2SOUND_PROJECTEN);
  const vraag = (methode, rest = '', body) => projecten({
    methode,
    pad: '/api/projecten',
    rest,
    query: {},
    body: Buffer.from(body === undefined ? '' : JSON.stringify(body)),
    koppen: {},
  });

  const bewaard = await vraag('POST', '', { naam: 'Mars', partituur });
  const bijgewerkt = await vraag('POST', `${bewaard.body.id}/meta`, { map: 'Orkest', labels: [] });
  assert.equal(bijgewerkt.status, 200);
  assert.equal(bijgewerkt.body.map, 'Orkest');
  assert.equal('partituur' in bijgewerkt.body, false);

  const lijst = await vraag('GET');
  assert.equal(lijst.body[0].map, 'Orkest');
  assert.deepEqual(lijst.body[0].labels, []);

  const teLang = await vraag('POST', `${bewaard.body.id}/meta`, { map: 'x'.repeat(41), labels: [] });
  assert.equal(teLang.status, 400);
  assert.match(teLang.body.fout, /40/);
});
