import test from 'node:test';
import assert from 'node:assert/strict';
import { zwartWit } from '../src/herkenning/beeld.mjs';
import { meetSchaal } from '../src/herkenning/schaal.mjs';
import { vindBalken } from '../src/herkenning/raster.mjs';
import { verwijderLijnen } from '../src/herkenning/vormen.mjs';
import { zoekNootkoppen } from '../src/herkenning/koppen.mjs';
import { zoekRusten } from '../src/herkenning/rusten.mjs';
import { leesMeermaatsAantallen } from '../src/herkenning/cijfers.mjs';
import { sjabloon } from '../src/herkenning/sjablonen.mjs';
import { maakBlad } from './hulp/blad.mjs';

const ia = 20;

// Eén balk met drie meermaatsrusten: boven de eerste een 3, boven de tweede een 12 (twee cijfers met een kleine opening),
// boven de derde niets (de 8 ver boven de balk is een repetitiecijfer, geen aantal maten).
function blad() {
  const { beeld, verwacht } = maakBlad({ balken: 1, koppen: false, maatstrepen: false, lijnafstand: ia });
  const y = (stap) => Math.round(verwacht.balken[0].lijnen[0].a + (stap * ia) / 2);
  const zet = (x, yy) => { beeld.pixels[Math.round(yy) * beeld.breedte + Math.round(x)] = 0; };
  const vlak = (x0, x1, y0, y1) => { for (let x = x0; x <= x1; x += 1) for (let yy = y0; yy <= y1; yy += 1) zet(x, yy); };
  const stempel = (naam, ax, ay) => {
    const t = sjabloon(naam, ia);
    for (let dy = 0; dy < t.hoogte; dy += 1) for (let dx = 0; dx < t.breedte; dx += 1) if (t.pixels[dy * t.breedte + dx]) zet(ax - t.ankerX + dx, ay - t.ankerY + dy);
  };
  const meermaats = (x0, x1) => { vlak(x0, x1, y(4) - 5, y(4) + 5); vlak(x0, x0 + 2, y(2), y(6)); vlak(x1 - 2, x1, y(2), y(6)); };
  // Een getal gecentreerd op x = midden, met het midden van de cijfers op stap `stap`.
  const getal = (n, midden, stap) => {
    const cijfers = String(n).split('').map((c) => sjabloon(`cijfer-${c}`, ia));
    const opening = 3;
    let links = midden - (cijfers.reduce((som, t) => som + t.breedte, 0) + opening * (cijfers.length - 1)) / 2;
    String(n).split('').forEach((c, i) => { stempel(`cijfer-${c}`, links + cijfers[i].ankerX, y(stap)); links += cijfers[i].breedte + opening; });
  };
  stempel('sleutel-g', 105, y(6));
  meermaats(200, 320); getal(3, 260, -3);
  meermaats(450, 570); getal(12, 510, -3);
  meermaats(700, 820); getal(8, 760, -12);
  return beeld;
}

function lees() {
  const zw = zwartWit(blad());
  const schaal = meetSchaal(zw);
  const raster = vindBalken(zw, schaal);
  const kaal = verwijderLijnen(zw, raster, schaal);
  const rusten = zoekRusten(kaal, raster, schaal, { koppen: zoekNootkoppen(kaal, raster, schaal) });
  return { rusten, aantallen: leesMeermaatsAantallen(kaal, raster, schaal, rusten) };
}

test('cijfers: het aantal maten boven elke meermaatsrust', () => {
  const { rusten, aantallen } = lees();
  assert.deepEqual(rusten[0].filter((rust) => rust.soort === 'meermaats').length, 3);
  assert.equal(aantallen.length, 1);
  assert.deepEqual(aantallen[0].map((a) => a.aantal), [3, 12, null]);
  assert.deepEqual(aantallen[0].map((a) => Math.round(a.x / 10)), [26, 51, 76]);
});

test('cijfers: zonder meermaatsrusten een lege lijst per balk', () => {
  const zw = zwartWit(blad());
  const schaal = meetSchaal(zw);
  const raster = vindBalken(zw, schaal);
  const kaal = verwijderLijnen(zw, raster, schaal);
  assert.deepEqual(leesMeermaatsAantallen(kaal, raster, schaal, [[]]), [[]]);
});
