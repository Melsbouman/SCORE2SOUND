import test from "node:test";
import assert from "node:assert/strict";
import { meetNauwkeurigheid } from "../src/controle/nauwkeurigheid.mjs";

function noot(start, duur, stap, zekerheid = 1) {
  return { soort: "noot", start, duur, toonhoogte: { stap, octaaf: 4 }, zekerheid };
}

function partituur(partijen) {
  return { partijen };
}

function partij(naam, maten) {
  return { naam, maten };
}

function maat(...noten) {
  return { noten, rusten: [] };
}

test("gelijke partituren geven 100 procent", () => {
  const juist = partituur([partij("Piano", [maat(noot(0, 480, "C"))])]);
  assert.deepEqual(meetNauwkeurigheid(juist, juist), {
    partijen: [{
      naam: "Piano", maten: 1, matenGelijk: 1, noten: 1, notenGoed: 1, ontbrekend: 0, teveel: 0,
    }],
    totaal: { maten: 1, matenGelijk: 1, noten: 1, notenGoed: 1, procentMaten: 100, procentNoten: 100 },
  });
});

test("een andere toonhoogte is een fout in de maat", () => {
  const herkend = partituur([partij("Piano", [maat(noot(0, 480, "D"))])]);
  const juist = partituur([partij("Piano", [maat(noot(0, 480, "C"))])]);
  const resultaat = meetNauwkeurigheid(herkend, juist);
  assert.equal(resultaat.partijen[0].matenGelijk, 0);
  assert.equal(resultaat.partijen[0].notenGoed, 0);
  assert.equal(resultaat.partijen[0].ontbrekend, 1);
  assert.equal(resultaat.partijen[0].teveel, 1);
});

test("een ontbrekende maat telt mee", () => {
  const herkend = partituur([partij("Piano", [])]);
  const juist = partituur([partij("Piano", [maat(noot(0, 480, "C"))])]);
  const resultaat = meetNauwkeurigheid(herkend, juist);
  assert.equal(resultaat.partijen[0].maten, 1);
  assert.equal(resultaat.partijen[0].matenGelijk, 0);
  assert.equal(resultaat.partijen[0].ontbrekend, 1);
});

test("een andere zekerheid verandert de vergelijking niet", () => {
  const herkend = partituur([partij("Piano", [maat(noot(0, 480, "C", 0.2))])]);
  const juist = partituur([partij("Piano", [maat(noot(0, 480, "C", 1))])]);
  assert.equal(meetNauwkeurigheid(herkend, juist).totaal.procentMaten, 100);
});

test("partijen worden op volgorde vergeleken", () => {
  const herkend = partituur([
    partij("Viool", [maat(noot(0, 480, "G"))]),
    partij("Piano", [maat(noot(0, 480, "C"))]),
  ]);
  const juist = partituur([
    partij("Piano", [maat(noot(0, 480, "C"))]),
    partij("Viool", [maat(noot(0, 480, "G"))]),
  ]);
  assert.equal(meetNauwkeurigheid(herkend, juist).totaal.notenGoed, 0);
});
