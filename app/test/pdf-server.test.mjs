import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { maakServer } from "../server.mjs";

async function metServer(actie) {
  const server = maakServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    const adres = server.address();
    await actie(`http://127.0.0.1:${adres.port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((fout) => (fout ? reject(fout) : resolve()));
    });
  }
}

test("POST /api/pdf maakt een pdf van MusicXML", async () => {
  const musicXml = await readFile(
    new URL("../public/voorbeeld.musicxml", import.meta.url),
  );

  await metServer(async (basisUrl) => {
    const antwoord = await fetch(`${basisUrl}/api/pdf`, {
      method: "POST",
      body: musicXml,
    });

    assert.equal(antwoord.status, 200);
    assert.match(antwoord.headers.get("content-type"), /^application\/pdf\b/);
    const inhoud = Buffer.from(await antwoord.arrayBuffer());
    assert.equal(inhoud.subarray(0, 5).toString(), "%PDF-");
  });
});

test("POST /api/pdf met een lege body geeft 400", async () => {
  await metServer(async (basisUrl) => {
    const antwoord = await fetch(`${basisUrl}/api/pdf`, {
      method: "POST",
      body: "",
    });

    assert.equal(antwoord.status, 400);
  });
});

test("GET /api/pdf geeft 405", async () => {
  await metServer(async (basisUrl) => {
    const antwoord = await fetch(`${basisUrl}/api/pdf`);

    assert.equal(antwoord.status, 405);
  });
});
