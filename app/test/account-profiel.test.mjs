import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { maakAccounts } from '../src/server/accounts.mjs';

async function metAccounts(fn) {
  const map = await mkdtemp(join(tmpdir(), 'score2sound-account-profiel-'));
  try {
    await fn(maakAccounts({ map, codes: [{ code: 'WELKOM', max: 2 }] }));
  } finally {
    await rm(map, { recursive: true, force: true });
  }
}

test('profiel bewaren en teruggeven laat een tweede account ongemoeid', async () => {
  await metAccounts(async (accounts) => {
    const eerste = await accounts.registreer({
      email: 'een@voorbeeld.nl', wachtwoord: 'lang-genoeg', code: 'WELKOM',
    });
    await accounts.registreer({
      email: 'twee@voorbeeld.nl', wachtwoord: 'ook-lang-genoeg', code: 'WELKOM',
    });
    const eersteToken = await accounts.logIn({
      email: 'een@voorbeeld.nl', wachtwoord: 'lang-genoeg',
    });
    const tweedeToken = await accounts.logIn({
      email: 'twee@voorbeeld.nl', wachtwoord: 'ook-lang-genoeg',
    });

    await accounts.zetProfiel(eerste.id, {
      naam: '  Melodie  ',
      avatar: { soort: 'afbeelding', waarde: 'data:image/png;base64,AAAA' },
    });

    assert.deepEqual((await accounts.gebruikerVan(eersteToken, true)).profiel, {
      naam: 'Melodie',
      avatar: { soort: 'afbeelding', waarde: 'data:image/png;base64,AAAA' },
    });
    assert.deepEqual((await accounts.gebruikerVan(tweedeToken, true)).profiel, {
      naam: '', avatar: { soort: 'emoji', waarde: '🎵' },
    });
  });
});

test('een te lange naam wordt geweigerd', async () => {
  await metAccounts(async (accounts) => {
    const gebruiker = await accounts.registreer({
      email: 'een@voorbeeld.nl', wachtwoord: 'lang-genoeg', code: 'WELKOM',
    });
    await assert.rejects(
      accounts.zetProfiel(gebruiker.id, {
        naam: 'a'.repeat(41), avatar: { soort: 'emoji', waarde: '🎵' },
      }),
      /hoogstens 40/,
    );
  });
});

test('een avatar moet een emoji of geldige data-url zijn', async () => {
  await metAccounts(async (accounts) => {
    const gebruiker = await accounts.registreer({
      email: 'een@voorbeeld.nl', wachtwoord: 'lang-genoeg', code: 'WELKOM',
    });
    await assert.rejects(
      accounts.zetProfiel(gebruiker.id, {
        naam: '', avatar: { soort: 'emoji', waarde: 'muziek' },
      }),
      /geldige emoji of afbeelding/,
    );
    await assert.rejects(
      accounts.zetProfiel(gebruiker.id, {
        naam: '', avatar: { soort: 'afbeelding', waarde: 'data:image/gif;base64,AAAA' },
      }),
      /geldige emoji of afbeelding/,
    );
  });
});
