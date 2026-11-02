import test from "node:test";
import assert from "node:assert/strict";

import { tekstSoort } from "../src/model/tekstsoort.mjs";

test("tekstSoort deelt woorden bij de muziek in zonder de tekst te wijzigen", () => {
  assert.equal(tekstSoort("dolce"), "expressie");
  assert.equal(tekstSoort("rall."), "tempo");
  assert.equal(tekstSoort("muted"), "spelwijze");
  assert.equal(tekstSoort("cadenza"), "structuur");

  const tekst = "cant.";
  assert.equal(tekstSoort(tekst), "expressie");
  assert.equal(tekst, "cant.");
  assert.equal(tekstSoort("onbekende tekst"), "tekst");
});
