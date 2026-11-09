import test from 'node:test';
import assert from 'node:assert/strict';
import { zwartWit, papierDrempel, otsuDrempel } from '../src/herkenning/beeld.mjs';
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
