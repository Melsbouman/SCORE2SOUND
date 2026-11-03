import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request } from 'node:http';
import { brotliDecompressSync } from 'node:zlib';
import { maakServer } from '../server.mjs';

function vraag(poort, methode, pad, body, koppen = {}) {
  return new Promise((ok, mis) => {
    const verzoek = request({ host: '127.0.0.1', port: poort, method: methode, path: pad, headers: koppen }, (antwoord) => {
      const delen = [];
      antwoord.on('data', (deel) => delen.push(deel));
      antwoord.on('end', () => ok({
        status: antwoord.statusCode,
        koppen: antwoord.headers,
        inhoud: Buffer.concat(delen),
      }));
    });
    verzoek.on('error', mis);
    verzoek.end(body);
  });
}

async function opzet(t) {
  const map = await mkdtemp(join(tmpdir(), 'score2sound-api-inpakken-'));
  const oudeMap = process.env.SCORE2SOUND_PROJECTEN;
  process.env.SCORE2SOUND_PROJECTEN = map;
  const server = maakServer();
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  t.after(async () => {
    await new Promise((ok, mis) => server.close((fout) => fout ? mis(fout) : ok()));
    if (oudeMap === undefined) delete process.env.SCORE2SOUND_PROJECTEN;
    else process.env.SCORE2SOUND_PROJECTEN = oudeMap;
    await rm(map, { recursive: true, force: true });
  });
  return server.address().port;
}

test('grote API-antwoorden worden ingepakt en na uitpakken blijven ze gelijk', async (t) => {
  const poort = await opzet(t);
  const partituur = { partijen: [{ naam: 'Piano', tekst: 'x'.repeat(50_000) }] };
  const opgeslagen = await vraag(poort, 'POST', '/api/projecten', JSON.stringify({ naam: 'Groot project', partituur }), {
    'Content-Type': 'application/json',
  });
  assert.equal(opgeslagen.status, 200);
  const project = JSON.parse(opgeslagen.inhoud.toString('utf8'));

  const br = await vraag(poort, 'GET', `/api/projecten/${project.id}`, undefined, { 'Accept-Encoding': 'br' });
  assert.equal(br.status, 200);
  assert.equal(br.koppen['content-encoding'], 'br');
  assert.match(br.koppen.vary, /Accept-Encoding/);
  assert.deepEqual(JSON.parse(brotliDecompressSync(br.inhoud).toString('utf8')), project);

  const kaal = await vraag(poort, 'GET', `/api/projecten/${project.id}`);
  assert.equal(kaal.koppen['content-encoding'], undefined);
  assert.deepEqual(JSON.parse(kaal.inhoud.toString('utf8')), project);

  const klein = await vraag(poort, 'GET', '/api/gezond', undefined, { 'Accept-Encoding': 'br' });
  assert.equal(klein.koppen['content-encoding'], undefined);
});
