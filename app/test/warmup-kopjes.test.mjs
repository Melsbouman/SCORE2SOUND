import test from "node:test";
import assert from "node:assert/strict";

test("een tekstaanwijzing blijft staan in een maat zonder noten", () => {
  const model = {
    partijen: [
      {
        maten: [
          {
            gebeurtenissen: [],
            tekstaanwijzingen: [{ tekst: "PART I", tik: 0 }],
          },
        ],
      },
    ],
  };

  assert.deepEqual(model.partijen[0].maten[0].tekstaanwijzingen, [
    { tekst: "PART I", tik: 0 },
  ]);
  assert.deepEqual(model.partijen[0].maten[0].gebeurtenissen, []);
});
