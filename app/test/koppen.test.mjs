import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { before, test } from 'node:test';

async function startServer(https) {
  const port = 31000 + Math.floor(Math.random() * 10000);
  const env = { ...process.env, PORT: String(port) };
  if (https) env.SCORE2SOUND_HTTPS = 'aan';
  else delete env.SCORE2SOUND_HTTPS;

  const server = spawn(process.execPath, ['server.mjs'], {
    cwd: new URL('..', import.meta.url),
    env,
    stdio: 'ignore',
  });
  const url = `http://127.0.0.1:${port}/`;
  for (let poging = 0; poging < 50; poging += 1) {
    try {
      const response = await fetch(url);
      server.kill();
      return response;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
  throw new Error('De testserver startte niet op tijd.');
}

before(() => {
  delete process.env.SCORE2SOUND_HTTPS;
});

test('stuurt de vaste beveiligingskoppen zonder HSTS', async () => {
  const response = await startServer(false);

  assert.equal(response.headers.get('strict-transport-security'), null);
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.equal(
    response.headers.get('permissions-policy'),
    'camera=(), microphone=(), geolocation=()',
  );
  assert.ok(response.headers.get('content-security-policy'));
});

test('stuurt HSTS als SCORE2SOUND_HTTPS aan staat', async () => {
  const response = await startServer(true);

  assert.match(
    response.headers.get('strict-transport-security'),
    /max-age=31536000/,
  );
  assert.ok(response.headers.get('content-security-policy'));
});
