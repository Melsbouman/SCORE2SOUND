import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import projecten from '../src/server/projecten.mjs';

async function tijdelijkeMap(t) {
  const map = await mkdtemp(join(tmpdir(), 'score2sound-'));
  t.after(() => rm(map, { recursive: true, force: true }));
  return join(map, 'projecten');
}

function maakProject(vulling = '') {
  return {
    naam: 'Mars',
    partituur: {
      versie: 1,
      titel: 'Mars',
      componist: '',
      partijen: [],
      opmerking: vulling,
    },
  };
}

test('API /api/projecten: kwota voorkomt bewaren als de opslag vol is', async (t) => {
  process.env.SCORE2SOUND_PROJECTEN = await tijdelijkeMap(t);
  process.env.SCORE2SOUND_KWOTA = '2000';
  t.after(() => {
    delete process.env.SCORE2SOUND_PROJECTEN;
    delete process.env.SCORE2SOUND_KWOTA;
  });
  const vraag = (gebruiker, body) => projecten({
    methode: 'POST',
    pad: '/api/projecten',
    rest: '',
    query: {},
    body: Buffer.from(JSON.stringify(body)),
    koppen: {},
    gebruiker,
  });
  const gebruiker = 'gebruiker-a';

  assert.equal((await vraag(gebruiker, maakProject('x'.repeat(1400)))).status, 200);
  assert.equal((await vraag(gebruiker, maakProject('x'.repeat(1400)))).status, 413);
  assert.equal((await projecten({
    methode: 'GET',
    pad: '/api/projecten',
    rest: '',
    query: {},
    body: Buffer.from(''),
    koppen: {},
    gebruiker,
  })).body.length, 1);
  assert.equal((await vraag(gebruiker, maakProject())).status, 200);
});

test('API /api/projecten: zonder gebruiker geldt het kwota niet', async (t) => {
  process.env.SCORE2SOUND_PROJECTEN = await tijdelijkeMap(t);
  process.env.SCORE2SOUND_KWOTA = '2000';
  t.after(() => {
    delete process.env.SCORE2SOUND_PROJECTEN;
    delete process.env.SCORE2SOUND_KWOTA;
  });
  const resultaat = await projecten({
    methode: 'POST',
    pad: '/api/projecten',
    rest: '',
    query: {},
    body: Buffer.from(JSON.stringify(maakProject('x'.repeat(2500)))),
    koppen: {},
  });

  assert.equal(resultaat.status, 200);
});
