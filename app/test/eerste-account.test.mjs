import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { maakAccounts } from '../src/server/accounts.mjs';

const nieuweMap = () => mkdtemp(join(tmpdir(), 'eerste-account-'));

test('zonder codes en zonder accounts mag het eerste account zich registreren zonder code', async () => {
  const accounts = maakAccounts({ map: await nieuweMap(), codes: [] });
  const gebruiker = await accounts.registreer({ email: 'mels@example.nl', wachtwoord: 'een-lang-wachtwoord' });
  assert.equal(gebruiker.email, 'mels@example.nl');
  const token = await accounts.logIn({ email: 'mels@example.nl', wachtwoord: 'een-lang-wachtwoord' });
  assert.equal((await accounts.gebruikerVan(token)).email, 'mels@example.nl');
});

test('het tweede account zonder code wordt geweigerd', async () => {
  const accounts = maakAccounts({ map: await nieuweMap(), codes: [] });
  await accounts.registreer({ email: 'een@example.nl', wachtwoord: 'een-lang-wachtwoord' });
  await assert.rejects(
    accounts.registreer({ email: 'twee@example.nl', wachtwoord: 'een-lang-wachtwoord' }),
    /uitnodigingscode/,
  );
});

test('met ingestelde codes blijft een code verplicht, ook voor het eerste account', async () => {
  const accounts = maakAccounts({ map: await nieuweMap(), codes: ['GEHEIM'] });
  await assert.rejects(
    accounts.registreer({ email: 'een@example.nl', wachtwoord: 'een-lang-wachtwoord' }),
    /uitnodigingscode/,
  );
});
