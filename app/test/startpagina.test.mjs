import test from 'node:test';
import assert from 'node:assert/strict';
import { maakServer } from '../server.mjs';

async function metServer(taak) {
  const server = maakServer();
  await new Promise((klaar) => server.listen(0, klaar));
  try {
    return await taak(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((klaar) => server.close(klaar));
  }
}

test('zonder sessie toont / de landingspagina', async () => {
  await metServer(async (basis) => {
    const antwoord = await fetch(`${basis}/`);
    assert.equal(antwoord.status, 200);
    assert.match(await antwoord.text(), /Zet bladmuziek om in bewerkbare/);
  });
});

test('met een sessiecookie toont / de editor', async () => {
  await metServer(async (basis) => {
    const antwoord = await fetch(`${basis}/`, { headers: { cookie: 'score2sound=abc' } });
    assert.equal(antwoord.status, 200);
    assert.match(await antwoord.text(), /id="weergave"/);
  });
});

test('/app toont altijd de editor', async () => {
  await metServer(async (basis) => {
    const antwoord = await fetch(`${basis}/app`);
    assert.equal(antwoord.status, 200);
    assert.match(await antwoord.text(), /id="weergave"/);
  });
});

test('welkom.html en welkom.css zijn gewoon op te halen', async () => {
  await metServer(async (basis) => {
    assert.equal((await fetch(`${basis}/welkom.html`)).status, 200);
    assert.equal((await fetch(`${basis}/welkom.css`)).status, 200);
  });
});
