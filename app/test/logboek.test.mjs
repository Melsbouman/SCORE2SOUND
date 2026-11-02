import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";

import { logRegel } from "../server.mjs";

test("logRegel bevat tijd, methode, pad, statuscode en duur", () => {
  const regel = logRegel(
    "GET",
    "/partituur",
    200,
    12,
    new Date("2026-11-02T12:00:00.000Z"),
  );

  assert.equal(regel, "2026-11-02T12:00:00.000Z GET /partituur 200 12");
});

test("logRegel neemt de zoekopdracht niet over", () => {
  const regel = logRegel("GET", "/partituur?token=geheim", 200, 0);

  assert.equal(regel.includes("token"), false);
  assert.equal(regel.includes("geheim"), false);
});

async function doeVerzoek(metLogboek) {
  const oudeWaarde = process.env.SCORE2SOUND_LOG;
  const oudeLog = console.log;
  const regels = [];
  process.env.SCORE2SOUND_LOG = metLogboek ? "aan" : "";
  console.log = (regel) => regels.push(regel);

  const server = createServer((_verzoek, antwoord) => {
    antwoord.statusCode = 204;
    antwoord.end();
  });

  try {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address();
    await fetch(`http://127.0.0.1:${port}/controle?token=geheim`);
    await new Promise((resolve) => setImmediate(resolve));
  } finally {
    await new Promise((resolve) => server.close(resolve));
    console.log = oudeLog;
    if (oudeWaarde === undefined) delete process.env.SCORE2SOUND_LOG;
    else process.env.SCORE2SOUND_LOG = oudeWaarde;
  }

  return regels;
}

test("de server logt precies één regel wanneer het logboek aan staat", async () => {
  const regels = await doeVerzoek(true);

  assert.equal(regels.length, 1);
  assert.match(regels[0], / GET \/controle 204 \d+$/);
  assert.equal(regels[0].includes("geheim"), false);
});

test("de server logt niets wanneer het logboek uit staat", async () => {
  const regels = await doeVerzoek(false);

  assert.deepEqual(regels, []);
});
