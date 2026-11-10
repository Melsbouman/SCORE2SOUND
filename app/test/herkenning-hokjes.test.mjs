import test from 'node:test';
import assert from 'node:assert/strict';
import { zwartWit } from '../src/herkenning/beeld.mjs';
import { meetSchaal } from '../src/herkenning/schaal.mjs';
import { vindBalken } from '../src/herkenning/raster.mjs';
import { verwijderLijnen } from '../src/herkenning/vormen.mjs';
import { zoekHokjes } from '../src/herkenning/hokjes.mjs';
import { sjabloon } from '../src/herkenning/sjablonen.mjs';
import { maakBlad } from './hulp/blad.mjs';

const ia = 20;

function nieuwBlad() {
  const { beeld, verwacht } = maakBlad({ balken: 1, koppen: false, maatstrepen: false, lijnafstand: ia });
  const zet = (x, y) => { beeld.pixels[Math.round(y) * beeld.breedte + Math.round(x)] = 0; };
  const y = (stap) => Math.round(verwacht.balken[0].lijnen[0].a + (stap * ia) / 2);
  const vlak = (x0, x1, y0, y1) => { for (let x = x0; x <= x1; x += 1) for (let yy = y0; yy <= y1; yy += 1) zet(x, yy); };
  const stempel = (naam, ax, ay, schaal = ia) => {
    const t = sjabloon(naam, schaal);
    for (let dy = 0; dy < t.hoogte; dy += 1) for (let dx = 0; dx < t.breedte; dx += 1) if (t.pixels[dy * t.breedte + dx]) zet(ax - t.ankerX + dx, ay - t.ankerY + dy);
  };
  // Een lijn boven de balk op stap -6 met een haakje van twee lijnafstanden omlaag aan de opgegeven kanten.
  const hokje = (x0, x1, { links = true, rechts = false } = {}) => {
    vlak(x0, x1, y(-6), y(-6) + 1);
    if (links) vlak(x0, x0 + 1, y(-6), y(-6) + 2 * ia);
    if (rechts) vlak(x1 - 1, x1, y(-6), y(-6) + 2 * ia);
  };
  return { beeld, y, zet, vlak, stempel, hokje };
}

function lees(beeld) {
  const zw = zwartWit(beeld);
  const schaal = meetSchaal(zw);
  const raster = vindBalken(zw, schaal);
  const kaal = verwijderLijnen(zw, raster, schaal);
  return zoekHokjes(kaal, raster, schaal);
}

test('hokjes: een gesloten hokje met een 1 erin', () => {
  const { beeld, y, stempel, hokje } = nieuwBlad();
  hokje(300, 420, { links: true, rechts: true });
  stempel('cijfer-1', 322, y(-4), ia * 0.6);
  const [hokjes] = lees(beeld);
  assert.equal(hokjes.length, 1);
  assert.deepEqual(hokjes[0].nummers, [1]);
  assert.equal(hokjes[0].gesloten, true);
  assert.ok(Math.abs(hokjes[0].links - 300) <= 3, `links ${hokjes[0].links}`);
  assert.ok(Math.abs(hokjes[0].rechts - 420) <= 3, `rechts ${hokjes[0].rechts}`);
});

test('hokjes: een open hokje met alleen een linker haakje en een 2', () => {
  const { beeld, y, stempel, hokje } = nieuwBlad();
  hokje(300, 420, { links: true, rechts: false });
  stempel('cijfer-2', 324, y(-4), ia * 0.6);
  const [hokjes] = lees(beeld);
  assert.equal(hokjes.length, 1);
  assert.deepEqual(hokjes[0].nummers, [2]);
  assert.equal(hokjes[0].gesloten, false);
});

test('hokjes: een boog boven de balk en een rechte lijn zonder haakje zijn geen hokje', () => {
  const { beeld, y, zet, vlak } = nieuwBlad();
  // Een stuk van een cirkel, 6 lijnafstanden (120 pixels) breed en 40 pixels hoog.
  const straal = (60 * 60 + 40 * 40) / (2 * 40);
  const middenY = y(-2) - 40 + straal;
  for (let x = 300; x <= 420; x += 0.25) {
    const yy = middenY - Math.sqrt(straal * straal - (x - 360) * (x - 360));
    zet(x, yy);
    zet(x, yy + 1);
  }
  // Een rechte lijn zonder haakje, hoger op het blad.
  vlak(600, 720, y(-8), y(-8) + 1);
  const [hokjes] = lees(beeld);
  assert.deepEqual(hokjes, []);
});

test('hokjes: een hokje met een onleesbaar teken erin heeft geen nummers', () => {
  const { beeld, y, vlak, hokje } = nieuwBlad();
  hokje(300, 420, { links: true, rechts: true });
  vlak(318, 330, y(-4), y(-4) + 12);
  const [hokjes] = lees(beeld);
  assert.equal(hokjes.length, 1);
  assert.deepEqual(hokjes[0].nummers, []);
});

// Een kadertje rond een repetitieletter (met een onderkant), een groep achtsten met de stokken omhoog tot een waardestreep boven
// de balk (de 'haakjes' eindigen in nootkoppen), en een triolenhaak met het cijfer in de lijn: geen hokjes. Een echt hokje
// ernaast wel.
test('hokjes: een kadertje, een waardestreep met stokken en een haak zonder cijfer eronder zijn geen hokje', () => {
  const { beeld, y, vlak, stempel, hokje } = nieuwBlad();
  // Kadertje van 3,8 lijnafstanden met een letter (drie streepjes) erin.
  const k = Math.round(3.8 * ia);
  vlak(150, 150 + k, y(-10), y(-10) + 1);
  vlak(150, 150 + k, y(-10) + k - 1, y(-10) + k);
  vlak(150, 151, y(-10), y(-10) + k);
  vlak(149 + k, 150 + k, y(-10), y(-10) + k);
  vlak(165, 167, y(-10) + 15, y(-10) + k - 15);
  vlak(165, 185, y(-10) + 15, y(-10) + 17);
  vlak(165, 180, y(-10) + 35, y(-10) + 37);
  // Twee achtsten (kop op stap 3) met stokken omhoog tot een waardestreep op stap -3.
  for (const x of [400, 480]) {
    stempel('kop-zwart', x, y(3));
    const stok = x + sjabloon('kop-zwart', ia).breedte - sjabloon('kop-zwart', ia).ankerX - 2;
    vlak(stok, stok + 1, y(-3), y(3));
  }
  vlak(400 + sjabloon('kop-zwart', ia).breedte - sjabloon('kop-zwart', ia).ankerX - 2, 481 + sjabloon('kop-zwart', ia).breedte - sjabloon('kop-zwart', ia).ankerX - 2, y(-3), y(-3) + 4);
  // Triolenhaak: twee stukken lijn met haakjes omlaag en een 3 in de lijn.
  vlak(600, 640, y(-6), y(-6) + 1);
  vlak(600, 601, y(-6), y(-6) + ia);
  stempel('cijfer-3', 652, y(-6), ia * 0.6);
  vlak(664, 704, y(-6), y(-6) + 1);
  vlak(703, 704, y(-6), y(-6) + ia);
  // Een echt hokje met een 2.
  hokje(800, 1000);
  stempel('cijfer-2', 822, y(-4), ia * 0.6);
  const [hokjes] = lees(beeld);
  assert.deepEqual(hokjes.map((h) => [Math.round(h.links / 10) * 10, h.nummers]), [[800, [2]]]);
});
