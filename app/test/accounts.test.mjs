import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { maakAccounts } from '../src/server/accounts.mjs';

async function metAccounts(fn, opties = {}) {
  const map = await mkdtemp(join(tmpdir(), 'score2sound-accounts-'));
  try {
    await fn(maakAccounts({ map, codes: ['WELKOM'], ...opties }), map);
  } finally {
    await rm(map, { recursive: true, force: true });
  }
}

test('registreren en inloggen geeft een geldige sessie', async () => {
  await metAccounts(async (accounts) => {
    const geregistreerd = await accounts.registreer({
      email: 'Speler@Voorbeeld.nl', wachtwoord: 'lang-genoeg', code: 'WELKOM',
    });
    const token = await accounts.logIn({ email: 'speler@voorbeeld.nl', wachtwoord: 'lang-genoeg' });
    assert.equal(token.length, 64);
    assert.deepEqual(await accounts.gebruikerVan(token), {
      id: geregistreerd.id, email: 'speler@voorbeeld.nl',
    });
  });
});

test('een e-mailadres kan maar één keer worden gebruikt', async () => {
  await metAccounts(async (accounts) => {
    await accounts.registreer({ email: 'a@b.nl', wachtwoord: 'lang-genoeg', code: 'WELKOM' });
    await assert.rejects(
      accounts.registreer({ email: 'A@B.NL', wachtwoord: 'ander-wachtwoord', code: 'WELKOM' }),
      /al in gebruik/,
    );
  }, { codes: [{ code: 'WELKOM', max: 2 }] });
});

test('een te kort wachtwoord wordt geweigerd', async () => {
  await metAccounts(async (accounts) => {
    await assert.rejects(
      accounts.registreer({ email: 'a@b.nl', wachtwoord: 'kort', code: 'WELKOM' }),
      /minstens 10/,
    );
  });
});

test('een ongeldige of gebruikte uitnodigingscode wordt geweigerd', async () => {
  await metAccounts(async (accounts) => {
    await assert.rejects(
      accounts.registreer({ email: 'a@b.nl', wachtwoord: 'lang-genoeg', code: 'NEE' }),
      /niet geldig/,
    );
    await accounts.registreer({ email: 'a@b.nl', wachtwoord: 'lang-genoeg', code: 'WELKOM' });
    await assert.rejects(
      accounts.registreer({ email: 'c@d.nl', wachtwoord: 'lang-genoeg', code: 'WELKOM' }),
      /niet geldig/,
    );
  });
});

test('een sessie verloopt na 30 dagen', async () => {
  let tijd = 1_000;
  await metAccounts(async (accounts) => {
    await accounts.registreer({ email: 'a@b.nl', wachtwoord: 'lang-genoeg', code: 'WELKOM' });
    const token = await accounts.logIn({ email: 'a@b.nl', wachtwoord: 'lang-genoeg' });
    tijd += 30 * 24 * 60 * 60 * 1000;
    assert.equal(await accounts.gebruikerVan(token), null);
  }, { nu: () => tijd });
});

test('uitloggen maakt het token ongeldig', async () => {
  await metAccounts(async (accounts) => {
    await accounts.registreer({ email: 'a@b.nl', wachtwoord: 'lang-genoeg', code: 'WELKOM' });
    const token = await accounts.logIn({ email: 'a@b.nl', wachtwoord: 'lang-genoeg' });
    accounts.logUit(token);
    assert.equal(await accounts.gebruikerVan(token), null);
  });
});

test('het wachtwoord staat niet als tekst in het gebruikersbestand', async () => {
  await metAccounts(async (accounts, map) => {
    await accounts.registreer({ email: 'a@b.nl', wachtwoord: 'heel-geheim', code: 'WELKOM' });
    const [naam] = await readdir(map);
    const inhoud = await readFile(join(map, naam), 'utf8');
    assert.equal(inhoud.includes('heel-geheim'), false);
    assert.match(inhoud, /wachtwoordHash/);
  });
});

test('na vijf mislukte inlogpogingen moet de gebruiker wachten', async () => {
  await metAccounts(async (accounts) => {
    await accounts.registreer({ email: 'a@b.nl', wachtwoord: 'lang-genoeg', code: 'WELKOM' });
    for (let poging = 0; poging < 5; poging += 1) {
      await assert.rejects(
        accounts.logIn({ email: 'a@b.nl', wachtwoord: 'verkeerd-wachtwoord' }),
        /klopt niet/,
      );
    }
    await assert.rejects(
      accounts.logIn({ email: 'a@b.nl', wachtwoord: 'lang-genoeg' }),
      /later opnieuw/,
    );
  });
});

test('verwijderen haalt het gebruikersbestand weg', async () => {
  await metAccounts(async (accounts, map) => {
    const gebruiker = await accounts.registreer({
      email: 'a@b.nl', wachtwoord: 'lang-genoeg', code: 'WELKOM',
    });
    assert.equal(await accounts.verwijder(gebruiker.id), true);
    assert.deepEqual(await readdir(map), []);
  });
});
