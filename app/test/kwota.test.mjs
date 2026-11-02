import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { gebruikteRuimte, magBewaren } from '../src/server/kwota.mjs';

test('gebruikteRuimte telt bestanden recursief', async (t) => {
  const map = await mkdtemp(join(tmpdir(), 'score2sound-kwota-'));
  t.after(() => rm(map, { recursive: true, force: true }));

  assert.equal(await gebruikteRuimte(map), 0);
  assert.equal(await gebruikteRuimte(join(map, 'ontbreekt')), 0);

  const submap = join(map, 'submap');
  await mkdir(submap);
  await writeFile(join(map, 'honderd.bin'), Buffer.alloc(100));
  await writeFile(join(submap, 'tweehonderdvijftig.bin'), Buffer.alloc(250));

  assert.equal(await gebruikteRuimte(map), 350);
});

test('magBewaren staat bewaren toe als de nieuwe grootte past', async (t) => {
  const map = await mkdtemp(join(tmpdir(), 'score2sound-kwota-'));
  t.after(() => rm(map, { recursive: true, force: true }));
  await writeFile(join(map, 'bestand.bin'), Buffer.alloc(100));

  assert.deepEqual(await magBewaren({ map, nieuweGrootte: 250, max: 350 }), {
    toegestaan: true,
    gebruikt: 100,
    max: 350,
  });
  assert.deepEqual(await magBewaren({ map, nieuweGrootte: 251, max: 350 }), {
    toegestaan: false,
    gebruikt: 100,
    max: 350,
  });
});

test('magBewaren gebruikt standaard maximaal 500000000 bytes', async (t) => {
  const map = await mkdtemp(join(tmpdir(), 'score2sound-kwota-'));
  t.after(() => rm(map, { recursive: true, force: true }));

  assert.deepEqual(await magBewaren({ map, nieuweGrootte: 500000000 }), {
    toegestaan: true,
    gebruikt: 0,
    max: 500000000,
  });
});
