import test from "node:test";
import assert from "node:assert/strict";

import { controleerMaatnummers } from "../src/controle/maatnummers.mjs";

function partituurMetMaten(maten) {
  return {
    partijen: [{ id: "P1", maten }],
  };
}

test("opeenvolgende maatnummers geven geen meldingen", () => {
  const partituur = partituurMetMaten([
    { nummer: "1" },
    { nummer: "2" },
    { nummer: "3" },
  ]);

  assert.deepEqual(controleerMaatnummers(partituur), []);
});

test("een opmaat met nummer 0 is toegestaan", () => {
  const partituur = partituurMetMaten([
    { nummer: "0", opmaat: true },
    { nummer: "1" },
    { nummer: "2" },
  ]);

  assert.deepEqual(controleerMaatnummers(partituur), []);
});

test("een sprong in maatnummers geeft een melding", () => {
  const partituur = partituurMetMaten([
    { nummer: "1" },
    { nummer: "2" },
    { nummer: "5" },
  ]);

  const meldingen = controleerMaatnummers(partituur);
  assert.equal(meldingen.length, 1);
  assert.equal(meldingen[0].maat, "5");
});

test("een meermaats-rust staat een grotere volgende maatstap toe", () => {
  const partituur = partituurMetMaten([
    { nummer: "1", maatrust: 3 },
    { nummer: "2", verborgen: true },
    { nummer: "3", verborgen: true },
    { nummer: "4" },
  ]);

  assert.deepEqual(controleerMaatnummers(partituur), []);
});

test("een dubbel maatnummer geeft een melding", () => {
  const partituur = partituurMetMaten([
    { nummer: "1" },
    { nummer: "2" },
    { nummer: "2" },
  ]);

  assert.equal(controleerMaatnummers(partituur).length, 1);
});

test("niet-numerieke maatnummers worden overgeslagen", () => {
  const partituur = partituurMetMaten([
    { nummer: "1" },
    { nummer: "X1" },
    { nummer: "2" },
  ]);

  assert.deepEqual(controleerMaatnummers(partituur), []);
});
