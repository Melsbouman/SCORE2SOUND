import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { maakAccounts } from '../src/server/accounts.mjs';

async function metAccounts(fn, opties = {}) {
  const map = await mkdtemp(join(tmpdir(), 'score2sound-accounts-veilig-'));
  try {
    await fn(maakAccounts({ map, codes: [{ code: 'WELKOM', max: 2 }], ...opties }), map);
  } finally {
    await rm(map, { recursive: true, force: true });
  }
}

test('registreren en inloggen laten geen tijdelijke bestanden achter', async () => {
  await metAccounts(async (accounts, map) => {
    const gebruiker = await accounts.registreer({
      email: 'speler@voorbeeld.nl', wachtwoord: 'lang-genoeg', code: 'WELKOM',
    });
    assert.deepEqual((await readdir(map)).filter((naam) => naam.endsWith('.tmp')), []);

    const token = await accounts.logIn({
      email: 'speler@voorbeeld.nl', wachtwoord: 'lang-genoeg',
    });
    assert.deepEqual((await readdir(map)).filter((naam) => naam.endsWith('.tmp')), []);
    assert.deepEqual(await accounts.gebruikerVan(token), {
      id: gebruiker.id,
      email: 'speler@voorbeeld.nl',
    });
  });
});

test('een achtergebleven tijdelijk bestand breekt het lezen van gebruikers niet', async () => {
  await metAccounts(async (accounts, map) => {
    const gebruiker = await accounts.registreer({
      email: 'speler@voorbeeld.nl', wachtwoord: 'lang-genoeg', code: 'WELKOM',
    });
    await writeFile(join(map, `${gebruiker.id}.json.achtergebleven.tmp`), '{ onvolledig', 'utf8');

    const token = await accounts.logIn({
      email: 'speler@voorbeeld.nl', wachtwoord: 'lang-genoeg',
    });
    assert.deepEqual(await accounts.gebruikerVan(token), {
      id: gebruiker.id,
      email: 'speler@voorbeeld.nl',
    });
  });
});

test('een tweede registratie en de bijbehorende sessie blijven werken', async () => {
  await metAccounts(async (accounts) => {
    await accounts.registreer({
      email: 'eerste@voorbeeld.nl', wachtwoord: 'lang-genoeg', code: 'WELKOM',
    });
    const tweede = await accounts.registreer({
      email: 'tweede@voorbeeld.nl', wachtwoord: 'lang-genoeg', code: 'WELKOM',
    });
    const token = await accounts.logIn({
      email: 'tweede@voorbeeld.nl', wachtwoord: 'lang-genoeg',
    });

    assert.deepEqual(await accounts.gebruikerVan(token), {
      id: tweede.id,
      email: 'tweede@voorbeeld.nl',
    });
  });
});
