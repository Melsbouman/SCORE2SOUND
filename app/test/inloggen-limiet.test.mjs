import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function vraag(poort, methode, pad, { body, adres } = {}) {
  return new Promise((ok, mis) => {
    const gegevens = body === undefined ? undefined : JSON.stringify(body);
    const verzoek = request({
      host: '127.0.0.1',
      port: poort,
      method: methode,
      path: pad,
      headers: {
        ...(gegevens === undefined ? {} : { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(gegevens) }),
        ...(adres ? { 'X-Forwarded-For': adres } : {}),
        Origin: `http://127.0.0.1:${poort}`,
      },
    }, (antwoord) => {
      const delen = [];
      antwoord.on('data', (deel) => delen.push(deel));
      antwoord.on('end', () => ok({
        status: antwoord.statusCode,
        body: JSON.parse(Buffer.concat(delen).toString('utf8')),
      }));
    });
    verzoek.on('error', mis);
    verzoek.end(gegevens);
  });
}

test('account-API begrenst registreer- en inlogpogingen per IP-adres', async (t) => {
  const map = await mkdtemp(join(tmpdir(), 'score2sound-inloggen-limiet-'));
  process.env.SCORE2SOUND_ACCOUNTS = 'aan';
  process.env.SCORE2SOUND_ACCOUNTSMAP = map;
  const { maakServer } = await import(`../server.mjs?inloggen-limiet=${Date.now()}`);
  const server = maakServer();
  server.listen(0, '127.0.0.1');
  await new Promise((ok, mis) => {
    server.once('listening', ok);
    server.once('error', mis);
  });
  t.after(async () => {
    await new Promise((ok, mis) => server.close((fout) => fout ? mis(fout) : ok()));
    await rm(map, { recursive: true, force: true });
  });
  const poort = server.address().port;

  const poging = {
    body: { email: 'niemand@voorbeeld.nl', wachtwoord: 'verkeerd-wachtwoord' },
    adres: '192.0.2.10',
  };
  for (let nummer = 0; nummer < 10; nummer += 1) {
    assert.ok([400, 401].includes((await vraag(poort, 'POST', '/api/account/login', poging)).status));
  }

  const geblokkeerd = await vraag(poort, 'POST', '/api/account/login', poging);
  assert.equal(geblokkeerd.status, 429);
  assert.deepEqual(geblokkeerd.body, {
    fout: 'Te veel pogingen. Probeer het over een paar minuten opnieuw.',
  });

  const anderAdres = await vraag(poort, 'POST', '/api/account/login', {
    ...poging,
    adres: '192.0.2.11',
  });
  assert.ok([400, 401].includes(anderAdres.status));
  assert.equal((await vraag(poort, 'GET', '/api/account')).status, 401);
});
