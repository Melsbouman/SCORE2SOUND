import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readdir, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ruimOudeHerkenningenOp, ruimTussenbestandenOp } from '../src/server/opruimen.mjs';

const DAG = 24 * 60 * 60 * 1000;
const NU = Date.parse('2026-12-01T12:00:00Z');

async function opzet(t) {
  const basis = await mkdtemp(join(tmpdir(), 'score2sound-opruimen-'));
  t.after(() => rm(basis, { recursive: true, force: true }));
  const map = join(basis, 'herkenning');
  const projectenMap = join(basis, 'projecten');
  await mkdir(map);
  await mkdir(projectenMap);
  return { map, projectenMap };
}

async function herkenning(map, id, dagenOud) {
  const uitmap = join(map, id);
  await mkdir(uitmap);
  await writeFile(join(uitmap, 'blad-1.png'), 'x');
  const tijd = new Date(NU - dagenOud * DAG);
  await utimes(uitmap, tijd, tijd);
}

test('na een herkenning blijven alleen de pagina\'s staan', async (t) => {
  const { map } = await opzet(t);
  const uitmap = join(map, 'aaaaaaaaaaaa');
  await mkdir(uitmap);
  for (const naam of ['blad-1.png', 'blad-12.png', 'invoer.pdf', 'invoer.omr', 'invoer.xml', 'invoer.mvt1.xml', 'invoer-20261101T2114.log']) {
    await writeFile(join(uitmap, naam), 'x');
  }
  await ruimTussenbestandenOp(uitmap);
  assert.deepEqual((await readdir(uitmap)).sort(), ['blad-1.png', 'blad-12.png']);
});

test('een oude herkenning zonder project verdwijnt, de rest blijft', async (t) => {
  const { map, projectenMap } = await opzet(t);
  await herkenning(map, 'aaaaaaaaaaaa', 40); // oud, niet gebruikt
  await herkenning(map, 'bbbbbbbbbbbb', 40); // oud, wel in een project
  await herkenning(map, 'cccccccccccc', 2); // nieuw
  await mkdir(join(map, 'niet-van-ons'));
  await writeFile(join(projectenMap, '111111111111.json'), JSON.stringify({ partituur: { bron: { herkenning: 'bbbbbbbbbbbb' } } }));
  await writeFile(join(projectenMap, '222222222222.json'), JSON.stringify({ partituur: { partijen: [] } }));

  const weg = await ruimOudeHerkenningenOp({ map, projectenMap, nu: NU });
  assert.deepEqual(weg, ['aaaaaaaaaaaa']);
  assert.deepEqual((await readdir(map)).sort(), ['bbbbbbbbbbbb', 'cccccccccccc', 'niet-van-ons']);
});

test('zonder mappen gebeurt er niets', async (t) => {
  const { map } = await opzet(t);
  assert.deepEqual(await ruimOudeHerkenningenOp({ map: join(map, 'nee'), projectenMap: join(map, 'ook-niet'), nu: NU }), []);
});
