import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

async function startServer(t, accounts) {
  const omgeving = { ...process.env };
  if (accounts) omgeving.SCORE2SOUND_ACCOUNTS = 'aan';
  else delete omgeving.SCORE2SOUND_ACCOUNTS;
  const bron = `import { maakServer } from ${JSON.stringify(new URL('../server.mjs', import.meta.url).href)}; const server = maakServer(); server.listen(0, '127.0.0.1', () => console.log(server.address().port));`;
  const server = spawn(process.execPath, ['--input-type=module', '--eval', bron], {
    env: omgeving,
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  t.after(async () => {
    if (server.exitCode === null && server.signalCode === null) {
      server.kill();
      await once(server, 'exit');
    }
  });

  let uitvoer = '';
  const poort = await new Promise((ok, mis) => {
    server.stdout.setEncoding('utf8');
    server.stdout.on('data', (deel) => {
      uitvoer += deel;
      const nummer = Number(uitvoer.split('\n')[0].trim());
      if (Number.isInteger(nummer) && nummer > 0) ok(nummer);
    });
    server.once('error', mis);
    server.once('exit', (code) => mis(new Error(`De server stopte voor hij startte (${code}).`)));
  });
  return poort;
}

function vraag(poort, pad) {
  return new Promise((ok, mis) => {
    const verzoek = request({ host: '127.0.0.1', port: poort, method: 'GET', path: pad }, (antwoord) => {
      const delen = [];
      antwoord.on('data', (deel) => delen.push(deel));
      antwoord.on('end', () => ok({
        status: antwoord.statusCode,
        body: JSON.parse(Buffer.concat(delen).toString('utf8')),
      }));
    });
    verzoek.on('error', mis);
    verzoek.end();
  });
}

test('gezondheidsadres werkt zonder accounts', async (t) => {
  const poort = await startServer(t, false);
  const antwoord = await vraag(poort, '/api/gezond');
  assert.equal(antwoord.status, 200);
  assert.deepEqual(antwoord.body, { ok: true });
});

test('gezondheidsadres werkt met accounts en andere API-paden blijven beveiligd', async (t) => {
  const poort = await startServer(t, true);
  const gezond = await vraag(poort, '/api/gezond');
  assert.equal(gezond.status, 200);
  assert.deepEqual(gezond.body, { ok: true });

  const projecten = await vraag(poort, '/api/projecten');
  assert.equal(projecten.status, 401);
});
