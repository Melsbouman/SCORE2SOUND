import test from "node:test";
import assert from "node:assert/strict";

import { maakZip } from "../src/model/zipschrijven.mjs";
import { leesZip } from "../src/server/zip.mjs";

test("schrijft meerdere bestanden die weer gelezen kunnen worden", () => {
  const zip = maakZip([
    { naam: "eerste.txt", inhoud: "Eerste bestand" },
    { naam: "muziek/partitúúr.txt", inhoud: new TextEncoder().encode("Tweede bestand") },
  ]);

  const bestanden = leesZip(Buffer.from(zip));

  assert.deepEqual([...bestanden.keys()], ["eerste.txt", "muziek/partitúúr.txt"]);
  assert.equal(bestanden.get("eerste.txt").toString(), "Eerste bestand");
  assert.equal(bestanden.get("muziek/partitúúr.txt").toString(), "Tweede bestand");
});

test("schrijft een geldig leeg zip-bestand", () => {
  const bestanden = leesZip(Buffer.from(maakZip([])));

  assert.equal(bestanden.size, 0);
});
