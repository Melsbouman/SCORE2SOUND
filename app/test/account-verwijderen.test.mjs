import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
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

test('account-API verwijdert alleen het account na bevestiging met het wachtwoord', async (t) => {
  const map = await mkdtemp(join(tmpdir(), 'score2sound-account-verwijderen-'));
  const accountsMap = join(map, 'accounts');
  const projectenMap = join(map, 'projecten');
  const herkenningMap = join(map, 'herkenning');
  const bron = `import { maakServer } from ${JSON.stringify(new URL('../server.mjs', import.meta.url).href)}; const server = maakServer(); server.listen(0, '127.0.0.1', () => console.log(server.address().port));`;
  const server = spawn(process.execPath, ['--input-type=module', '--eval', bron], {
    env: {
      ...process.env,
      SCORE2SOUND_ACCOUNTS: 'aan',
      SCORE2SOUND_ACCOUNTSMAP: accountsMap,
      SCORE2SOUND_PROJECTEN: projectenMap,
      SCORE2SOUND_HERKENNING: herkenningMap,
      SCORE2SOUND_CODES: 'WELKOM,TWEEDE',
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

  const registratie = await vraag(poort, 'POST', '/api/account/registreer', {
    body: { email: 'speler@voorbeeld.nl', wachtwoord: 'lang-genoeg', code: 'WELKOM' },
  });
  assert.equal(registratie.status, 200);
  const cookie = registratie.koppen['set-cookie'][0].split(';')[0];
  const gebruikerMap = join(projectenMap, registratie.body.gebruiker.id);
  const bestand = join(gebruikerMap, 'partituur.txt');
  await mkdir(gebruikerMap, { recursive: true });
  await writeFile(bestand, 'muziek');

  const tweedeRegistratie = await vraag(poort, 'POST', '/api/account/registreer', {
    body: { email: 'ander@voorbeeld.nl', wachtwoord: 'ander-wachtwoord', code: 'TWEEDE' },
  });
  assert.equal(tweedeRegistratie.status, 200);
  const tweedeGebruikerMap = join(projectenMap, tweedeRegistratie.body.gebruiker.id);
  const tweedeBestand = join(tweedeGebruikerMap, 'partituur.txt');
  await mkdir(tweedeGebruikerMap, { recursive: true });
  await writeFile(tweedeBestand, 'andere muziek');

  assert.equal((await vraag(poort, 'DELETE', '/api/account', {
    body: { wachtwoord: 'lang-genoeg' },
  })).status, 401);

  const foutWachtwoord = await vraag(poort, 'DELETE', '/api/account', {
    cookie,
    body: { wachtwoord: 'verkeerd-wachtwoord' },
  });
  assert.equal(foutWachtwoord.status, 400);
  await access(bestand);

  const verwijderd = await vraag(poort, 'DELETE', '/api/account', {
    cookie,
    body: { wachtwoord: 'lang-genoeg' },
  });
  assert.equal(verwijderd.status, 200);
  assert.deepEqual(verwijderd.body, { verwijderd: true });
  assert.equal((await vraag(poort, 'POST', '/api/account/login', {
    body: { email: 'speler@voorbeeld.nl', wachtwoord: 'lang-genoeg' },
  })).status, 400);
  await assert.rejects(access(gebruikerMap), { code: 'ENOENT' });
  await access(tweedeBestand);
});
