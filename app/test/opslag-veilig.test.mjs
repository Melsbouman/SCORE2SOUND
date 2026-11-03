import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { maakOpslag } from '../src/project/opslag.mjs';

const partituur = { versie: 1, titel: 'Mars', componist: '', partijen: [] };

async function tijdelijkeMap(t) {
  const map = await mkdtemp(join(tmpdir(), 'score2sound-opslag-'));
  t.after(() => rm(map, { recursive: true, force: true }));
  return map;
}

test('opslag: bewaren laat geen tijdelijk bestand achter', async (t) => {
  const map = await tijdelijkeMap(t);
  const opslag = maakOpslag(map);
  const project = await opslag.bewaar({ naam: 'Mars', partituur });

  assert.deepEqual(await readdir(map), [`${project.id}.json`]);
});

test('opslag: een oud tijdelijk bestand wordt genegeerd', async (t) => {
  const map = await tijdelijkeMap(t);
  const opslag = maakOpslag(map);
  const id = 'a'.repeat(12);
  await writeFile(join(map, `${id}.json.tmp`), 'geen geldig project', 'utf8');

  assert.deepEqual(await opslag.lijst(), []);
  await assert.rejects(opslag.open(id), /Onbekend project/);
});

test('opslag: opnieuw bewaren vervangt hetzelfde projectbestand', async (t) => {
  const map = await tijdelijkeMap(t);
  const opslag = maakOpslag(map);
  const eerste = await opslag.bewaar({ naam: 'Eerste', partituur });
  const laatste = await opslag.bewaar({ id: eerste.id, naam: 'Laatste', partituur });

  assert.equal(laatste.naam, 'Laatste');
  assert.equal((await opslag.open(eerste.id)).naam, 'Laatste');
  assert.deepEqual(await readdir(map), [`${eerste.id}.json`]);
});
