import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

test('inlogroutes beveiligen wachtwoord, uitloggen en herhaalde pogingen', async () => {
  const map = await mkdtemp(join(tmpdir(), 'score2sound-inloggen-routes-'));
  process.env.SCORE2SOUND_ACCOUNTSMAP = map;
  process.env.SCORE2SOUND_CODES = 'WELKOM';

  try {
    const { default: inloggen } = await import(`../src/server/inloggen.mjs?inloggen-routes=${Date.now()}`);

    const wachtwoord = await inloggen({
      methode: 'POST',
      rest: 'wachtwoord',
      koppen: {},
      body: Buffer.from(JSON.stringify({ oud: 'lang-genoeg', nieuw: 'nieuw-lang-genoeg' })),
    });
    assert.equal(wachtwoord.status, 401);

    const uitgelogd = await inloggen({ methode: 'POST', rest: 'uit', koppen: {} });
    assert.equal(uitgelogd.status, 200);
    assert.match(uitgelogd.koppen['Set-Cookie'], /Max-Age=0/);

    const poging = {
      methode: 'POST',
      rest: 'login',
      adres: '192.0.2.10',
      koppen: {},
      body: Buffer.from(JSON.stringify({
        email: 'niemand@voorbeeld.nl',
        wachtwoord: 'verkeerd-wachtwoord',
      })),
    };
    for (let nummer = 0; nummer < 10; nummer += 1) {
      assert.equal((await inloggen(poging)).status, 400);
    }

    const geblokkeerd = await inloggen(poging);
    assert.equal(geblokkeerd.status, 429);
    assert.deepEqual(geblokkeerd.body, {
      fout: 'Te veel pogingen. Probeer het over een paar minuten opnieuw.',
    });
  } finally {
    await rm(map, { recursive: true, force: true });
  }
});
