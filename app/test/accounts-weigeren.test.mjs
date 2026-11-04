import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { maakAccounts } from "../src/server/accounts.mjs";

async function metAccounts(voerUit) {
  const map = await mkdtemp(path.join(tmpdir(), "score2sound-accounts-"));
  const accounts = maakAccounts({ map, uitnodigingscode: "welkom" });

  try {
    await voerUit(accounts);
  } finally {
    await rm(map, { recursive: true, force: true });
  }
}

test("registreer weigert een wachtwoord van 9 tekens", async () => {
  await metAccounts(async (accounts) => {
    await assert.rejects(
      accounts.registreer({
        email: "muzikant@example.com",
        wachtwoord: "123456789",
        uitnodigingscode: "welkom",
      }),
      { message: "Kies een wachtwoord van minstens 10 tekens." },
    );
  });
});

test("registreer weigert een e-mailadres dat al bestaat", async () => {
  await metAccounts(async (accounts) => {
    const gegevens = {
      email: "muzikant@example.com",
      wachtwoord: "lang-genoeg",
      uitnodigingscode: "welkom",
    };

    await accounts.registreer(gegevens);
    await assert.rejects(accounts.registreer(gegevens));
  });
});
