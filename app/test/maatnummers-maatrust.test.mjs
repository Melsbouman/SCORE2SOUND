import test from "node:test";
import assert from "node:assert/strict";

import { controleerMaatnummers } from "../src/controle/maatnummers.mjs";

function partituurMetLaatsteMaat(nummer) {
  return {
    partijen: [{
      id: "P1",
      maten: [
        { nummer: "1", maatrust: 9 },
        { nummer: "2", verborgen: true },
        { nummer: "3", verborgen: true },
        { nummer: "4", verborgen: true },
        { nummer: "5", verborgen: true },
        { nummer: "6", verborgen: true },
        { nummer: "7", verborgen: true },
        { nummer: "8", verborgen: true },
        { nummer: "9", verborgen: true },
        { nummer },
      ],
    }],
  };
}

test("een maatrust van 9 maten telt de maatnummering niet als fout", () => {
  assert.deepEqual(controleerMaatnummers(partituurMetLaatsteMaat("10")), []);
  assert.equal(controleerMaatnummers(partituurMetLaatsteMaat("11")).length, 1);
});
