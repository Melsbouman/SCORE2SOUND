import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function vraag(poort, methode, pad, { body, cookie, origin = `http://127.0.0.1:${poort}` } = {}) {
  return new Promise((ok, mis) => {
    const gegevens = body === undefined ? undefined : JSON.stringify(body);
    const verzoek = request({
      host: '127.0.0.1',
      port: poort,
      method: methode,
      path: pad,
      headers: {
        ...(gegevens === undefined ? {} : { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(gegevens) }),
        ...(cookie ? { Cookie: cookie } : {}),
        ...(origin === null ? {} : { Origin: origin }),
      },
    }, (antwoord) => {
      const delen = [];
      antwoord.on('data', (deel) => delen.push(deel));
      antwoord.on('end', () => ok({
        status: antwoord.statusCode,
        koppen: antwoord.headers,
        body: JSON.parse(Buffer.concat(delen).toString('utf8')),
      }));
    });
    verzoek.on('error', mis);
    verzoek.end(gegevens);
  });
}

test('een gebruiker kan het wachtwoord wijzigen', async (t) => {
  const map = await mkdtemp(join(tmpdir(), 'score2sound-wachtwoord-wijzigen-'));
  const bron = `import { maakServer } from ${JSON.stringify(new URL('../server.mjs', import.meta.url).href)}; const server = maakServer(); server.listen(0, '127.0.0.1', () => console.log(server.address().port));`;
  const server = spawn(process.execPath, ['--input-type=module', '--eval', bron], {
    env: {
      ...process.env,
      SCORE2SOUND_ACCOUNTS: 'aan',
      SCORE2SOUND_ACCOUNTSMAP: map,
      SCORE2SOUND_CODES: 'WELKOM',
    },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  t.after(async () => {
    if (server.exitCode === null && server.signalCode === null) {
      server.kill();
      await once(server, 'exit');
    }
    await rm(map, { recursive: true, force: true });
  });
  let uitvoer = '';
  const poort = await new Promise((ok, mis) => {
    server.stdout.setEncoding('utf8');
    server.stdout.on('data', (deel) => {
      uitvoer += deel;
      const regel = uitvoer.split('\n')[0].trim();
      const nummer = Number(regel);
      if (Number.isInteger(nummer) && nummer > 0) ok(nummer);
    });
    server.once('error', mis);
    server.once('exit', (code) => mis(new Error(`De server stopte voor hij startte (${code}).`)));
  });

  assert.equal((await vraag(poort, 'POST', '/api/account/wachtwoord', {
    body: { oud: 'lang-genoeg', nieuw: 'nieuw-lang-genoeg' },
  })).status, 401);

  const registratie = await vraag(poort, 'POST', '/api/account/registreer', {
    body: { email: 'speler@voorbeeld.nl', wachtwoord: 'lang-genoeg', code: 'WELKOM' },
  });
  assert.equal(registratie.status, 200);
  const cookie = registratie.koppen['set-cookie'][0].split(';')[0];

  const tweedeLogin = await vraag(poort, 'POST', '/api/account/login', {
    body: { email: 'speler@voorbeeld.nl', wachtwoord: 'lang-genoeg' },
  });
  assert.equal(tweedeLogin.status, 200);
  const tweedeCookie = tweedeLogin.koppen['set-cookie'][0].split(';')[0];

  const verkeerdOud = await vraag(poort, 'POST', '/api/account/wachtwoord', {
    body: { oud: 'verkeerd-wachtwoord', nieuw: 'nieuw-lang-genoeg' }, cookie,
  });
  assert.equal(verkeerdOud.status, 400);
  assert.equal(verkeerdOud.body.fout, 'Het huidige wachtwoord klopt niet.');

  const teKort = await vraag(poort, 'POST', '/api/account/wachtwoord', {
    body: { oud: 'lang-genoeg', nieuw: 'kort' }, cookie,
  });
  assert.equal(teKort.status, 400);
  assert.equal(teKort.body.fout, 'Kies een nieuw wachtwoord van minstens 10 tekens.');

  const hetzelfde = await vraag(poort, 'POST', '/api/account/wachtwoord', {
    body: { oud: 'lang-genoeg', nieuw: 'lang-genoeg' }, cookie,
  });
  assert.equal(hetzelfde.status, 400);
  assert.equal(hetzelfde.body.fout, 'Kies een nieuw wachtwoord van minstens 10 tekens.');

  const gewijzigd = await vraag(poort, 'POST', '/api/account/wachtwoord', {
    body: { oud: 'lang-genoeg', nieuw: 'nieuw-lang-genoeg' }, cookie,
  });
  assert.equal(gewijzigd.status, 200);
  assert.deepEqual(gewijzigd.body, { gewijzigd: true });
  assert.equal((await vraag(poort, 'GET', '/api/account', { cookie })).status, 200);
  assert.equal((await vraag(poort, 'GET', '/api/account', { cookie: tweedeCookie })).status, 401);

  assert.equal((await vraag(poort, 'POST', '/api/account/login', {
    body: { email: 'speler@voorbeeld.nl', wachtwoord: 'nieuw-lang-genoeg' },
  })).status, 200);
  assert.equal((await vraag(poort, 'POST', '/api/account/login', {
    body: { email: 'speler@voorbeeld.nl', wachtwoord: 'lang-genoeg' },
  })).status, 400);
});
