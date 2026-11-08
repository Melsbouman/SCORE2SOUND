import assert from "node:assert/strict";
import test from "node:test";

import { SYMBOOL } from "../public/js/views/muzieksymbolen.js";

const sleutels = [
  "heel", "half", "kwart", "achtste", "zestiende", "tweeendertigste", "vierenzestigste", "kruis", "mol",
  "herstellingsteken", "dubbelkruis", "dubbelmol", "rustkwart", "fermate",
  "staccato", "accent", "tenuto", "punt", "overbinding", "crescendo",
  "decrescendo", "p", "mp", "mf", "f",
];

test("SYMBOOL bevat alle muzieksymbolen", () => {
  assert.deepEqual(Object.keys(SYMBOOL), sleutels);

  for (const [naam, waarde] of Object.entries(SYMBOOL)) {
    assert.notEqual(waarde, "", `${naam} is niet leeg`);
    if (naam === "overbinding") {
      assert.match(waarde, /^<svg[\s\S]*<path[\s\S]*<\/svg>$/);
      continue;
    }
    assert.equal([...waarde].length, 1, `${naam} bevat precies een teken`);
    const codepunt = waarde.codePointAt(0);
    assert.ok(codepunt >= 0xE000 && codepunt <= 0xEFFF, `${naam} staat in het private-use-gebied`);
  }
});
