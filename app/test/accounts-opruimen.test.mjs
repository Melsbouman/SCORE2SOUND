import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { maakAccounts } from '../src/server/accounts.mjs';

test('opruimen verwijdert alleen verlopen sessies', async () => {
  const map = await mkdtemp(join(tmpdir(), 'score2sound-accounts-opruimen-'));
  let tijd = 1_000;
  const accounts = maakAccounts({ map, codes: ['WELKOM'], nu: () => tijd });

  try {
    const gebruiker = await accounts.registreer({
      email: 'speler@voorbeeld.nl', wachtwoord: 'lang-genoeg', code: 'WELKOM',
    });
    const verlopenToken = await accounts.logIn({
      email: 'speler@voorbeeld.nl', wachtwoord: 'lang-genoeg',
    });

    tijd += 2 * 24 * 60 * 60 * 1000;
    const geldigToken = await accounts.logIn({
      email: 'speler@voorbeeld.nl', wachtwoord: 'lang-genoeg',
    });
    tijd += 29 * 24 * 60 * 60 * 1000;

    assert.equal(accounts.ruimSessiesOp(), 1);
    assert.equal(await accounts.gebruikerVan(verlopenToken), null);
    assert.deepEqual(await accounts.gebruikerVan(geldigToken), {
      id: gebruiker.id,
      email: 'speler@voorbeeld.nl',
    });
  } finally {
    await rm(map, { recursive: true, force: true });
  }
});
