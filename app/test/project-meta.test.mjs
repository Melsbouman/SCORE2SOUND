import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { schoonMeta } from '../src/project/meta.mjs';
import { maakOpslag } from '../src/project/opslag.mjs';

test('projectmeta wordt afgekapt, ontdubbeld en gecontroleerd', () => {
  assert.deepEqual(schoonMeta({
    map: `  ${'m'.repeat(50)}  `,
    labels: [' concert ', 'concert', '', 'a'.repeat(30), 'een', 'twee', 'drie', 'vier'],
  }), {
    map: 'm'.repeat(40),
    labels: ['concert', 'a'.repeat(24), 'een', 'twee', 'drie'],
  });
  assert.throws(() => schoonMeta({ map: 12, labels: [] }), /tekst/);
  assert.throws(() => schoonMeta({ map: null, labels: ['goed', 12] }), /tekst/);
});

test('projectmeta wordt bewaard zonder de partituur te veranderen', async (t) => {
  const map = await mkdtemp(join(tmpdir(), 'score2sound-project-meta-'));
  t.after(() => rm(map, { recursive: true, force: true }));
  const opslag = maakOpslag(map);
  const partituur = { versie: 1, titel: 'Mars', componist: '', partijen: [] };
  const project = await opslag.bewaar({ naam: 'Mars', partituur });

  await opslag.zetMeta(project.id, { map: ' Orkest ', labels: [' concert ', '14 mei'] });

  const [inLijst] = await opslag.lijst();
  assert.equal(inLijst.map, 'Orkest');
  assert.deepEqual(inLijst.labels, ['concert', '14 mei']);
  assert.deepEqual((await opslag.open(project.id)).partituur, partituur);
});
