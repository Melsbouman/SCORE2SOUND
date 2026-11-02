import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { brotliDecompressSync, gunzipSync } from 'node:zlib';
import { maakServer } from '../server.mjs';

function vraag(poort, pad, koppen = {}) {
  return new Promise((ok, mis) => {
    const verzoek = request({ host: '127.0.0.1', port: poort, method: 'GET', path: pad, headers: koppen }, (antwoord) => {
      const delen = [];
      antwoord.on('data', (d) => delen.push(d));
      antwoord.on('end', () => ok({ status: antwoord.statusCode, koppen: antwoord.headers, inhoud: Buffer.concat(delen) }));
    });
    verzoek.on('error', mis);
    verzoek.end();
  });
}

async function opzet(t) {
  const server = maakServer();
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  t.after(() => server.close());
  return server.address().port;
}

const VEROVIO = '/vendor/verovio/verovio-toolkit-wasm.js';

test('Verovio komt ingepakt als de browser dat aankan, en is dan veel kleiner', async (t) => {
  const poort = await opzet(t);
  const kaal = await vraag(poort, VEROVIO);
  assert.equal(kaal.koppen['content-encoding'], undefined);

  const br = await vraag(poort, VEROVIO, { 'Accept-Encoding': 'gzip, deflate, br' });
  assert.equal(br.status, 200);
  assert.equal(br.koppen['content-encoding'], 'br');
  assert.match(br.koppen.vary, /Accept-Encoding/);
  assert.ok(br.inhoud.length < kaal.inhoud.length / 2, `${br.inhoud.length} van ${kaal.inhoud.length}`);
  assert.deepEqual(brotliDecompressSync(br.inhoud), kaal.inhoud);

  const gz = await vraag(poort, VEROVIO, { 'Accept-Encoding': 'gzip' });
  assert.equal(gz.koppen['content-encoding'], 'gzip');
  assert.deepEqual(gunzipSync(gz.inhoud), kaal.inhoud);
});

test('omgezette bibliotheken blijven omgezet na het inpakken', async (t) => {
  const poort = await opzet(t);
  const br = await vraag(poort, '/vendor/spessasynth/index.js', { 'Accept-Encoding': 'br' });
  assert.doesNotMatch(brotliDecompressSync(br.inhoud).toString('utf8'), /from\s*["']spessasynth_core["']/);
});

test('een ongewijzigd bestand krijgt 304 zonder inhoud', async (t) => {
  const poort = await opzet(t);
  const eerste = await vraag(poort, '/app.css', { 'Accept-Encoding': 'br' });
  assert.equal(eerste.koppen['cache-control'], 'no-cache');
  assert.ok(eerste.koppen.etag);

  const tweede = await vraag(poort, '/app.css', { 'Accept-Encoding': 'br', 'If-None-Match': eerste.koppen.etag });
  assert.equal(tweede.status, 304);
  assert.equal(tweede.inhoud.length, 0);
  assert.match(tweede.koppen['content-security-policy'], /default-src 'self'/);

  const anders = await vraag(poort, '/app.css', { 'Accept-Encoding': 'br', 'If-None-Match': '"iets-anders"' });
  assert.equal(anders.status, 200);
});

test('ingepakt en kaal hebben elk een eigen etag', async (t) => {
  const poort = await opzet(t);
  const kaal = await vraag(poort, '/app.css');
  const br = await vraag(poort, '/app.css', { 'Accept-Encoding': 'br' });
  assert.notEqual(kaal.koppen.etag, br.koppen.etag);
});

test('een bestand dat niet bestaat blijft 404, en de API wordt niet ingepakt', async (t) => {
  const poort = await opzet(t);
  assert.equal((await vraag(poort, '/bestaat-niet.js', { 'Accept-Encoding': 'br' })).status, 404);
  const api = await vraag(poort, '/api/projecten', { 'Accept-Encoding': 'br' });
  assert.equal(api.koppen['content-encoding'], undefined);
});
