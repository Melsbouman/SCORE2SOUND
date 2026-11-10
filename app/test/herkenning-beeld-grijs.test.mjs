import test from 'node:test';
import assert from 'node:assert/strict';
import { zwartWit, papierDrempel, otsuDrempel, verkleinMet } from '../src/herkenning/beeld.mjs';
import { meetSchaal } from '../src/herkenning/schaal.mjs';
import { vindBalken } from '../src/herkenning/raster.mjs';
import { maakBlad } from './hulp/blad.mjs';

// Een blad met lichtgrijze notenbalklijnen (grijs 170) en een groot zwart vlak (zoals een titel): Otsu legt de drempel
// tussen zwart en papier, en dan vallen de lijnen weg (zo gaat het bij African Symphony).
function grijsBlad() {
  const { beeld } = maakBlad({ balken: 5, inkt: 170, koppen: false, maatstrepen: false });
  for (let y = 20; y < 120; y += 1) for (let x = 100; x < 1100; x += 1) beeld.pixels[y * beeld.breedte + x] = 0;
  return beeld;
}
const balken = (zw) => vindBalken(zw, meetSchaal(zw)).balken.length;

test('papierDrempel: net onder het papier, boven de grijze lijnen', () => {
  const beeld = grijsBlad();
  const drempel = papierDrempel(beeld.pixels);
  assert.ok(drempel > 170 && drempel < 255, `drempel ${drempel}`);
  assert.ok(otsuDrempel(beeld.pixels) < 170);
});

test('zwartWit met de papierdrempel vindt de grijze notenbalken, met Otsu niet', () => {
  const beeld = grijsBlad();
  assert.equal(balken(zwartWit(beeld)), 0);
  assert.equal(balken(zwartWit(beeld, { drempel: papierDrempel(beeld.pixels) })), 5);
});

test('zwartWit: een gegeven drempel telt (tot en met de drempel is zwart)', () => {
  const beeld = { breedte: 3, hoogte: 1, pixels: Uint8Array.from([100, 150, 200]) };
  assert.deepEqual([...zwartWit(beeld, { drempel: 150 }).pixels], [1, 1, 0]);
});

test('verkleinMet: het gemiddelde van het bedekte stuk, ook bij een gebroken factor', () => {
  // 4 x 2: rij 1 = 0 0 200 200, rij 2 = 0 0 200 200; factor 2 geeft 0 en 200.
  const blad = { breedte: 4, hoogte: 2, pixels: Uint8Array.from([0, 0, 200, 200, 0, 0, 200, 200]) };
  assert.deepEqual([...verkleinMet(blad, 2).pixels], [0, 200]);
  // 3 x 3 met factor 1,5 wordt 2 x 2: het eerste pixel bedekt een hele kolom 0 en een halve kolom 1 (rij en kolom gelijk).
  const drie = { breedte: 3, hoogte: 3, pixels: Uint8Array.from([0, 90, 180, 0, 90, 180, 0, 90, 180]) };
  const klein = verkleinMet(drie, 1.5);
  assert.deepEqual([klein.breedte, klein.hoogte], [2, 2]);
  assert.deepEqual([...klein.pixels], [30, 150, 30, 150]);
  // Een factor van 1 of kleiner verandert niets.
  assert.equal(verkleinMet(blad, 1), blad);
});
