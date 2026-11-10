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
  // Cijfers naast elkaar met een kleine opening, samen gecentreerd op x, ongeveer 1,8 lijnafstanden hoog (zoals repetitiecijfers
  // op echte scans: 1,9 tot 2,4).
  const getal = (n, x, y) => {
    const la = ia * 0.9;
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
  vierkant(400, y(-9), 3.6 * ia);
  getal(12, 400, y(-9));
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
  rondje(500, y(-9), 1.8 * ia);
  getal(5, 500, y(-9));
  const uitkomst = lees(beeld);
  assert.deepEqual(uitkomst[0], []);
  assert.equal(uitkomst[1].length, 1);
  assert.equal(uitkomst[1][0].kader, 'cirkel');
  assert.equal(uitkomst[1][0].waarde, '5');
});

test('repetitiecijfer: een rondje zonder cijfer geeft null', () => {
  const { beeld, op, rondje } = nieuwBlad();
  rondje(500, op(0)(-9), 1.8 * ia);
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

// Op echte scans: een letter in een vierkantje (even breed als hoog) is geen cijfer; een rondje met een kleine onderbreking in de
// rand wordt toch gevonden; een groot vierkantje (3,8 lijnafstanden) dat vlak op de balk staat ook.
test('repetitiecijfer: letter in een vierkantje geeft null, een rondje met een onderbreking en een groot vierkantje op de balk', () => {
  const { beeld, op, getal, vierkant, rondje, zet } = nieuwBlad();
  const wis = (x, y) => { beeld.pixels[Math.round(y) * beeld.breedte + Math.round(x)] = 255; };
  const y0 = op(0);
  // Een 'H' van drie streepjes (even breed als hoog) in een vierkantje.
  vierkant(300, y0(-9), 3.6 * ia);
  for (let d = -13; d <= 13; d += 1) { for (let t = 0; t < 3; t += 1) { zet(287 + t, y0(-9) + d); zet(311 + t, y0(-9) + d); zet(300 + d, y0(-9) + t); } }
  // Een rondje met een 7 erin en twee onderbrekingen van 3 pixels in de rand.
  rondje(600, y0(-9), 1.8 * ia);
  for (let d = -1; d <= 1; d += 1) { for (let t = -3; t <= 3; t += 1) wis(600 + d, y0(-9) - 1.8 * ia + t); }
  getal(7, 600, y0(-9));
  // Op balk 1: een vierkantje van 3,8 lijnafstanden waarvan de onderkant vlak boven de bovenste lijn staat, met 45 erin.
  const y1 = op(1);
  const zijde = 3.8 * ia;
  vierkant(800, y1(0) - zijde / 2 - 3, zijde);
  getal(45, 800, y1(0) - zijde / 2 - 3);
  const [boven, onder] = lees(beeld);
  assert.deepEqual(boven.map((r) => [r.kader, r.waarde]), [['vierkant', null], ['cirkel', '7']]);
  assert.deepEqual(onder.map((r) => [r.kader, r.waarde]), [['vierkant', '45']]);
});

// Een 1 zonder voet (een staander met een vlaggetje, zoals op Devils Galop) naast een 9: 19. Het Bravura-sjabloon van de 1 heeft
// een voet; zonder de regel voor een rechte staander lijkt zo'n 1 meer op een 2.
test('repetitiecijfer: een 1 zonder voet (staander met vlaggetje) wordt gelezen', () => {
  const { beeld, op, vierkant, stempel, zet } = nieuwBlad();
  const y = op(0);
  const midden = y(-9);
  vierkant(400, midden, 3.6 * ia);
  const h = Math.round(1.8 * ia);
  const boven = midden - h / 2;
  // Staander van 5 pixels breed rechts in een kader van 13 breed, vlaggetje linksboven.
  for (let dy = 0; dy < h; dy += 1) for (let dx = 8; dx < 13; dx += 1) zet(372 + dx, boven + dy);
  for (let d = 0; d < 8; d += 1) for (let t = 0; t < 4; t += 1) zet(372 + 8 - d, boven + d + t);
  stempel('cijfer-9', 396, midden, ia * 0.9);
  const [boven0] = lees(beeld);
  assert.deepEqual(boven0.map((r) => r.waarde), ['19']);
});
