import test from "node:test";
import assert from "node:assert/strict";

import { speelVolgorde } from "../src/model/maten.mjs";

test("speelt twee herhalingen direct na elkaar", () => {
  const maten = [
    { herhaling: { begin: true } },
    { herhaling: { eind: true } },
    { herhaling: { begin: true } },
    { herhaling: { eind: true } },
    {},
    {},
    {},
    {},
  ];

  assert.deepEqual(speelVolgorde(maten), [0, 1, 0, 1, 2, 3, 2, 3, 4, 5, 6, 7]);
});
