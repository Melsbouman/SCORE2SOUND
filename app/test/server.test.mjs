import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { maakServer } from '../server.mjs';

// Een ruw verzoek, zodat een pad als /%2e%2e/ niet door de client wordt opgeschoond.
function vraag(poort, methode, pad) {
  return new Promise((ok, mis) => {
    const verzoek = request({ host: '127.0.0.1', port: poort, method: methode, path: pad }, (antwoord) => {
      const delen = [];
      antwoord.on('data', (d) => delen.push(d));
      antwoord.on('end', () => ok({ status: antwoord.statusCode, koppen: antwoord.headers, tekst: Buffer.concat(delen).toString('utf8') }));
    });
    verzoek.on('error', mis);
    verzoek.end();
  });
}

test('de server levert de app, de bibliotheken en de lege API-paden', async (t) => {
  const server = maakServer();
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  t.after(() => server.close());
  const poort = server.address().port;

  const start = await vraag(poort, 'GET', '/');
  assert.equal(start.status, 200);
  assert.match(start.koppen['content-type'], /text\/html/);
  assert.match(start.koppen['content-security-policy'], /default-src 'self'/);
  assert.match(start.tekst, /<section id="weergave"/);

  const module = await vraag(poort, 'GET', '/js/main.js');
  assert.equal(module.status, 200);
  assert.match(module.koppen['content-type'], /text\/javascript/);

  const verovio = await vraag(poort, 'GET', '/vendor/verovio/verovio-toolkit-wasm.js');
  assert.equal(verovio.status, 200);

  // De API-paden bestaan (geen 404); wat ze antwoorden, testen de eigen tests van de API.
  for (const [methode, pad] of [['POST', '/api/importeer'], ['GET', '/api/projecten'], ['GET', '/api/projecten/abc']]) {
    assert.notEqual((await vraag(poort, methode, pad)).status, 404, `${methode} ${pad}`);
  }
});

test('bibliotheken voor de browser hebben geen kale imports meer', async (t) => {
  const server = maakServer();
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  t.after(() => server.close());
  const poort = server.address().port;
  for (const pad of ['/vendor/spessasynth/index.js', '/vendor/spessasynth-core/index.js']) {
    const { status, tekst } = await vraag(poort, 'GET', pad);
    assert.equal(status, 200, pad);
    assert.doesNotMatch(tekst, /from\s*["'](spessasynth_core|fflate|stb-vorbis)["']/, pad);
  }
  assert.equal((await vraag(poort, 'GET', '/vendor/fflate/browser.js')).status, 200);
  assert.equal((await vraag(poort, 'GET', '/vendor/stb-vorbis/index.js')).status, 200);
});

test('de server geeft geen bestanden buiten de toegestane mappen', async (t) => {
  const server = maakServer();
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  t.after(() => server.close());
  const poort = server.address().port;

  assert.equal((await vraag(poort, 'GET', '/%2e%2e/server.mjs')).status, 404);
  assert.equal((await vraag(poort, 'GET', '/%2e%2e/package.json')).status, 404);
  assert.equal((await vraag(poort, 'GET', '/src/server/importeer.mjs')).status, 404);
  assert.equal((await vraag(poort, 'GET', '/vendor/verovio/..%2f..%2f..%2fserver.mjs')).status, 404);
  assert.equal((await vraag(poort, 'GET', '/bestaat-niet.js')).status, 404);
  assert.equal((await vraag(poort, 'DELETE', '/index.html')).status, 405);
});
