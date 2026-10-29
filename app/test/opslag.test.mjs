import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { maakOpslag } from '../src/project/opslag.mjs';
import projecten from '../src/server/projecten.mjs';

const partituur = { versie: 1, titel: 'Mars', componist: '', partijen: [] };

async function tijdelijkeMap(t) {
  const map = await mkdtemp(join(tmpdir(), 'score2sound-'));
  t.after(() => rm(map, { recursive: true, force: true }));
  return join(map, 'projecten');
}

test('opslag: bewaren, openen, bijwerken en de lijst', async (t) => {
  const opslag = maakOpslag(await tijdelijkeMap(t));
  assert.deepEqual(await opslag.lijst(), [], 'een map die nog niet bestaat is een lege lijst');

  const eerste = await opslag.bewaar({ naam: '  Mars  ', partituur });
  assert.match(eerste.id, /^[a-f0-9]{12}$/);
  assert.equal(eerste.naam, 'Mars');
  assert.equal(eerste.aangemaakt, eerste.bijgewerkt);
  assert.ok(!Number.isNaN(Date.parse(eerste.aangemaakt)));
  assert.deepEqual(await opslag.open(eerste.id), eerste);

  await new Promise((ok) => setTimeout(ok, 5));
  const tweede = await opslag.bewaar({ naam: 'Wals', partituur });
  await new Promise((ok) => setTimeout(ok, 5));
  const bijgewerkt = await opslag.bewaar({ id: eerste.id, naam: 'Mars 2', partituur });
  assert.equal(bijgewerkt.id, eerste.id);
  assert.equal(bijgewerkt.aangemaakt, eerste.aangemaakt);
  assert.ok(bijgewerkt.bijgewerkt > eerste.bijgewerkt);

  const lijst = await opslag.lijst();
  assert.deepEqual(lijst.map((p) => [p.id, p.naam]), [[eerste.id, 'Mars 2'], [tweede.id, 'Wals']], 'nieuwste bovenaan');
  assert.deepEqual(Object.keys(lijst[0]).sort(), ['aangemaakt', 'bijgewerkt', 'id', 'naam'], 'zonder partituur');
});

test('opslag: verwijderen, en geen paden buiten de map', async (t) => {
  const map = await tijdelijkeMap(t);
  const opslag = maakOpslag(map);
  const project = await opslag.bewaar({ naam: 'Weg', partituur });
  await opslag.verwijder(project.id);
  await assert.rejects(opslag.open(project.id), /Onbekend project/);
  assert.deepEqual(await readdir(map), []);
  for (const fout of ['../geheim', 'ABCDEF123456', '', 'a'.repeat(12) + '/x']) {
    await assert.rejects(opslag.open(fout), /Onbekend project/, JSON.stringify(fout));
    await assert.rejects(opslag.verwijder(fout), /Onbekend project/, JSON.stringify(fout));
  }
  await assert.rejects(opslag.bewaar({ id: 'aaaaaaaaaaaa', naam: 'x', partituur }), /Onbekend project/);
});

test('opslag: naam en partituur worden gecontroleerd', async (t) => {
  const opslag = maakOpslag(await tijdelijkeMap(t));
  assert.equal((await opslag.bewaar({ partituur })).naam, 'Naamloos');
  assert.equal((await opslag.bewaar({ naam: 'x'.repeat(300), partituur })).naam.length, 120);
  await assert.rejects(opslag.bewaar({ naam: 'Leeg' }), /geen partituur/);
  await assert.rejects(opslag.bewaar({ naam: 'Fout', partituur: { partijen: 'nee' } }), /geen partituur/);
});

test('API /api/projecten: lijst, bewaren, openen, verwijderen en fouten', async (t) => {
  process.env.SCORE2SOUND_PROJECTEN = await tijdelijkeMap(t);
  t.after(() => delete process.env.SCORE2SOUND_PROJECTEN);
  const vraag = (methode, rest = '', body) => projecten({ methode, pad: '/api/projecten', rest, query: {}, body: Buffer.from(body === undefined ? '' : JSON.stringify(body)), koppen: {} });

  assert.deepEqual(await vraag('GET'), { status: 200, body: [] });
  const bewaard = await vraag('POST', '', { naam: 'Mars', partituur });
  assert.equal(bewaard.status, 200);
  assert.equal(bewaard.body.naam, 'Mars');
  const id = bewaard.body.id;
  assert.equal((await vraag('GET', id)).body.partituur.titel, 'Mars');
  assert.equal((await vraag('POST', '', { id, naam: 'Mars 2', partituur })).body.naam, 'Mars 2');
  assert.equal((await vraag('GET')).body.length, 1);
  assert.deepEqual(await vraag('DELETE', id), { status: 200, body: { verwijderd: true } });
  assert.equal((await vraag('GET', id)).status, 404);
  assert.match((await vraag('GET', id)).body.fout, /Onbekend project/);

  const kapot = await projecten({ methode: 'POST', pad: '/api/projecten', rest: '', query: {}, body: Buffer.from('{niet goed'), koppen: {} });
  assert.equal(kapot.status, 400);
  assert.match(kapot.body.fout, /JSON/);
  assert.equal((await vraag('POST', '', { naam: 'Zonder' })).status, 400);
  assert.equal((await vraag('PUT')).status, 405);
});
