import test from 'node:test';
import assert from 'node:assert/strict';
import { zwartWit } from '../src/herkenning/beeld.mjs';
import { meetSchaal } from '../src/herkenning/schaal.mjs';
import { vindBalken } from '../src/herkenning/raster.mjs';
import { verwijderLijnen } from '../src/herkenning/vormen.mjs';
import { zoekRepetitiecijfers } from '../src/herkenning/repetitie.mjs';
import { sjabloon } from '../src/herkenning/sjablonen.mjs';
import { maakBlad } from './hulp/blad.mjs';

const ia = 20;

function nieuwBlad() {
  const { beeld, verwacht } = maakBlad({ balken: 2, koppen: false, maatstrepen: false, lijnafstand: ia, afstandBalken: 230 });
  const zet = (x, y) => { beeld.pixels[Math.round(y) * beeld.breedte + Math.round(x)] = 0; };
  const op = (b) => (stap) => Math.round(verwacht.balken[b].lijnen[0].a + (stap * ia) / 2);
  const stempel = (naam, ax, ay, lijnafstand = ia) => {
    const t = sjabloon(naam, lijnafstand);
    for (let dy = 0; dy < t.hoogte; dy += 1) for (let dx = 0; dx < t.breedte; dx += 1) if (t.pixels[dy * t.breedte + dx]) zet(ax - t.ankerX + dx, ay - t.ankerY + dy);
    return t;
  };
  // Cijfers naast elkaar met een kleine opening, samen gecentreerd op x. Repetitiecijfers zijn kleiner dan maatsoortcijfers,
  // zodat ze in het kader passen (de herkenning schaalt de vorm naar het sjabloon, dus de grootte maakt daar niet uit).
  const getal = (n, x, y) => {
    const la = ia * 0.6;
    const namen = String(n).split('').map((c) => `cijfer-${c}`);
    const cijfers = namen.map((naam) => sjabloon(naam, la));
    const opening = Math.round(ia * 0.15);
    let links = x - (cijfers.reduce((som, t) => som + t.breedte, 0) + opening * (cijfers.length - 1)) / 2;
    namen.forEach((naam, i) => { stempel(naam, links + cijfers[i].ankerX, y, la); links += cijfers[i].breedte + opening; });
  };
  const vierkant = (cx, cy, zijde) => {
    const h = zijde / 2;
    for (let d = -h; d <= h; d += 0.5) {
      for (let t = 0; t < 2; t += 1) {
        zet(cx + d, cy - h + t); zet(cx + d, cy + h - t);
        zet(cx - h + t, cy + d); zet(cx + h - t, cy + d);
      }
    }
  };
  const rondje = (cx, cy, straal) => {
    for (let y = cy - straal - 2; y <= cy + straal + 2; y += 0.5) {
      for (let x = cx - straal - 2; x <= cx + straal + 2; x += 0.5) {
        const afstand = Math.hypot(x - cx, y - cy);
        if (afstand >= straal - 1 && afstand < straal + 1) zet(x, y);
      }
    }
  };
  return { beeld, op, stempel, getal, vierkant, rondje, zet };
}

function lees(beeld) {
  const zw = zwartWit(beeld);
  const schaal = meetSchaal(zw);
  const raster = vindBalken(zw, schaal);
  const kaal = verwijderLijnen(zw, raster, schaal);
  return zoekRepetitiecijfers(kaal, raster, schaal);
}

test('repetitiecijfer: een vierkant met 12 boven balk 0', () => {
  const { beeld, op, getal, vierkant } = nieuwBlad();
  const y = op(0);
  vierkant(400, y(-8), 2.4 * ia);
  getal(12, 400, y(-8));
  const uitkomst = lees(beeld);
  assert.equal(uitkomst.length, 2);
  assert.equal(uitkomst[0].length, 1);
  assert.equal(uitkomst[0][0].kader, 'vierkant');
  assert.equal(uitkomst[0][0].waarde, '12');
  assert.ok(Math.abs(uitkomst[0][0].x - 400) <= 3, `x ${uitkomst[0][0].x}`);
  assert.deepEqual(uitkomst[1], []);
});

test('repetitiecijfer: een rondje met 5 boven balk 1', () => {
  const { beeld, op, getal, rondje } = nieuwBlad();
  const y = op(1);
  rondje(500, y(-8), 1.3 * ia);
  getal(5, 500, y(-8));
  const uitkomst = lees(beeld);
  assert.deepEqual(uitkomst[0], []);
  assert.equal(uitkomst[1].length, 1);
  assert.equal(uitkomst[1][0].kader, 'cirkel');
  assert.equal(uitkomst[1][0].waarde, '5');
});

test('repetitiecijfer: een rondje zonder cijfer geeft null', () => {
  const { beeld, op, rondje } = nieuwBlad();
  rondje(500, op(0)(-8), 1.3 * ia);
  const uitkomst = lees(beeld);
  assert.equal(uitkomst[0].length, 1);
  assert.equal(uitkomst[0][0].kader, 'cirkel');
  assert.equal(uitkomst[0][0].waarde, null);
});

test('repetitiecijfer: een hele nootkop op een hulplijn boven de balk is geen kader', () => {
  const { beeld, op, stempel, zet } = nieuwBlad();
  const y = op(0);
  for (let x = 400 - 16; x <= 400 + 16; x += 1) { zet(x, y(-2)); zet(x, y(-2) + 1); }
  stempel('kop-heel', 400, y(-2));
  const uitkomst = lees(beeld);
  assert.deepEqual(uitkomst[0], []);
});
