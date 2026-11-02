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

test('API /api/projecten: iedere gebruiker ziet alleen eigen projecten', async (t) => {
  process.env.SCORE2SOUND_PROJECTEN = await tijdelijkeMap(t);
  t.after(() => delete process.env.SCORE2SOUND_PROJECTEN);
  const vraag = (gebruiker, methode, rest = '', body) => projecten({
    methode,
    pad: '/api/projecten',
    rest,
    query: {},
    body: Buffer.from(body === undefined ? '' : JSON.stringify(body)),
    koppen: {},
    gebruiker,
  });

  const bewaard = await vraag('gebruiker-a', 'POST', '', { naam: 'Mars', partituur });
  assert.equal(bewaard.status, 200);
  const id = bewaard.body.id;
  assert.deepEqual((await vraag('gebruiker-a', 'GET')).body.map((project) => project.id), [id]);

  assert.deepEqual(await vraag('gebruiker-b', 'GET'), { status: 200, body: [] });
  assert.equal((await vraag('gebruiker-b', 'GET', id)).status, 404);
  assert.equal((await vraag('gebruiker-b', 'DELETE', id)).status, 404);
  assert.equal((await vraag('gebruiker-b', 'POST', '', { id, naam: 'Mars 2', partituur })).status, 404);
  assert.equal((await vraag('gebruiker-a', 'GET', id)).body.naam, 'Mars');
});

test('API /api/projecten: zonder gebruiker blijft de gewone opslag werken', async (t) => {
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
  assert.equal(bewaard.status, 200);
  const id = bewaard.body.id;
  assert.deepEqual((await vraag('GET')).body.map((project) => project.id), [id]);
  assert.equal((await vraag('GET', id)).body.naam, 'Mars');
  assert.deepEqual(await vraag('DELETE', id), { status: 200, body: { verwijderd: true } });
  assert.equal((await vraag('GET', id)).status, 404);
});
