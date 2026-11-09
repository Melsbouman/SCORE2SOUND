import test from 'node:test';
import assert from 'node:assert/strict';
import { zwartWit } from '../src/herkenning/beeld.mjs';
import { meetSchaal } from '../src/herkenning/schaal.mjs';
import { vindBalken } from '../src/herkenning/raster.mjs';
import { verwijderLijnen } from '../src/herkenning/vormen.mjs';
import { leesBalkkoppen } from '../src/herkenning/kop.mjs';
import { sjabloon } from '../src/herkenning/sjablonen.mjs';
import { maakBlad } from './hulp/blad.mjs';

const ia = 20;

// Een blad met zes balken; op elke balk stempelen we tekens uit Bravura aan het begin, op bekende plekken.
function bladMetKoppen() {
  const { beeld, verwacht } = maakBlad({ balken: 6, koppen: false, maatstrepen: false, lijnafstand: ia, afstandBalken: 230 });
  const zet = (x, y) => { beeld.pixels[Math.round(y) * beeld.breedte + Math.round(x)] = 0; };
  const wis = (x, y) => { beeld.pixels[Math.round(y) * beeld.breedte + Math.round(x)] = 255; };
  const op = (b) => (stap) => Math.round(verwacht.balken[b].lijnen[0].a + (stap * ia) / 2);
  const stempel = (naam, ax, ay) => {
    const t = sjabloon(naam, ia);
    for (let y = 0; y < t.hoogte; y += 1) for (let x = 0; x < t.breedte; x += 1) if (t.pixels[y * t.breedte + x]) zet(ax - t.ankerX + x, ay - t.ankerY + y);
    return t;
  };
  // Balk 0: vioolsleutel, drie mollen (b, e, a), 3/4, en dan een noot.
  let y = op(0);
  stempel('sleutel-g', 110, y(6));
  [4, 1, 5].forEach((stap, i) => stempel('mol', 175 + i * 20, y(stap)));
  stempel('cijfer-3', 245, y(2));
  stempel('cijfer-4', 245, y(6));
  stempel('kop-zwart', 320, y(5));
  // Balk 1: vioolsleutel, twee kruisen (f, c) en een C.
  y = op(1);
  stempel('sleutel-g', 110, y(6));
  [0, 3].forEach((stap, i) => stempel('kruis', 175 + i * 22, y(stap)));
  stempel('maat-c', 235, y(4));
  // Balk 2: bassleutel, één mol (b, in de bassleutel op de tweede lijn van onder) en 12/8.
  y = op(2);
  stempel('sleutel-f', 110, y(2));
  stempel('mol', 180, y(6));
  stempel('cijfer-1', 215, y(2));
  stempel('cijfer-2', 242, y(2));
  stempel('cijfer-8', 228, y(6));
  // Balk 3: vioolsleutel en een mol op b met direct een noot erachter: een voorteken van die noot, geen voortekening.
  y = op(3);
  stempel('sleutel-g', 110, y(6));
  stempel('mol', 175, y(4));
  stempel('kop-zwart', 197, y(4));
  // Balk 4: vioolsleutel en een achtste rust aan het begin van de regel: geen maatsoort.
  y = op(4);
  stempel('sleutel-g', 110, y(6));
  stempel('rust-8', 178, y(4));
  // Balk 5: vioolsleutel en een mol die in twee stukken is gevallen (een witte kolom tussen stok en buik, zoals op een scan).
  y = op(5);
  stempel('sleutel-g', 110, y(6));
  const mol = stempel('mol', 175, y(4));
  const stokBreedte = Math.round(ia * 0.16);
  for (let dy = 0; dy < mol.hoogte; dy += 1) wis(175 + stokBreedte, y(4) - mol.ankerY + dy);
  return beeld;
}

function lees(beeld) {
  const zw = zwartWit(beeld);
  const schaal = meetSchaal(zw);
  const raster = vindBalken(zw, schaal);
  const kaal = verwijderLijnen(zw, raster, schaal);
  return leesBalkkoppen(kaal, raster, schaal, { zw });
}

test('balkkop: sleutel, voortekening en maatsoort aan het begin van elke balk', () => {
  const koppen = lees(bladMetKoppen());
  assert.equal(koppen.length, 6);
  const kort = koppen.map((k) => ({
    sleutel: k.sleutel && `${k.sleutel.soort}${k.sleutel.lijn}`,
    aantal: k.voortekening.aantal,
    stappen: k.voortekening.tekens.map((t) => t.stap),
    maatsoort: k.maatsoort && (k.maatsoort.symbool ?? `${k.maatsoort.teller}/${k.maatsoort.noemer}`),
  }));
  assert.deepEqual(kort, [
    { sleutel: 'G2', aantal: -3, stappen: [4, 1, 5], maatsoort: '3/4' },
    { sleutel: 'G2', aantal: 2, stappen: [0, 3], maatsoort: 'C' },
    { sleutel: 'F4', aantal: -1, stappen: [6], maatsoort: '12/8' },
    { sleutel: 'G2', aantal: 0, stappen: [], maatsoort: null },
    { sleutel: 'G2', aantal: 0, stappen: [], maatsoort: null },
    { sleutel: 'G2', aantal: -1, stappen: [4], maatsoort: null },
  ]);
  assert.deepEqual(koppen[1].maatsoort, { teller: 4, noemer: 4, symbool: 'C' });
});

test('balkkop: de muziek begint na het laatste teken van de kop, niet later', () => {
  const koppen = lees(bladMetKoppen());
  // Balk 0: na de 3/4 (vanaf x 245), vóór de noot op x 320.
  assert.ok(koppen[0].einde > 260 && koppen[0].einde < 315, `einde ${koppen[0].einde}`);
  // Balk 3 en 4: direct na de sleutel, dus vóór de mol en de rust op x 175.
  assert.ok(koppen[3].einde < 175, `einde ${koppen[3].einde}`);
  assert.ok(koppen[4].einde < 175, `einde ${koppen[4].einde}`);
});

test('balkkop: een balk zonder tekens aan het begin heeft geen sleutel', () => {
  const { beeld } = maakBlad({ balken: 1, koppen: false, maatstrepen: false, lijnafstand: ia });
  const [kop] = lees(beeld);
  assert.equal(kop.sleutel, null);
  assert.equal(kop.voortekening.aantal, 0);
  assert.equal(kop.maatsoort, null);
});

// Meer gevallen: alla breve, een noemer 2, een noemer van twee cijfers, een tenorsleutel met kruisen, en een noot die (zonder
// eigen voorteken) vlak na de voortekening staat.
function bladMetMeer() {
  const { beeld, verwacht } = maakBlad({ balken: 5, koppen: false, maatstrepen: false, lijnafstand: ia, afstandBalken: 230 });
  const zet = (x, y) => { beeld.pixels[Math.round(y) * beeld.breedte + Math.round(x)] = 0; };
  const op = (b) => (stap) => Math.round(verwacht.balken[b].lijnen[0].a + (stap * ia) / 2);
  const stempel = (naam, ax, ay) => {
    const t = sjabloon(naam, ia);
    for (let y = 0; y < t.hoogte; y += 1) for (let x = 0; x < t.breedte; x += 1) if (t.pixels[y * t.breedte + x]) zet(ax - t.ankerX + x, ay - t.ankerY + y);
    return t;
  };
  // Cijfers naast elkaar met een kleine opening (zoals in een lettertype), samen gecentreerd op x.
  const getal = (n, x, y) => {
    const cijfers = String(n).split('').map((c) => sjabloon(`cijfer-${c}`, ia));
    const opening = Math.round(ia * 0.15);
    let links = x - (cijfers.reduce((som, t) => som + t.breedte, 0) + opening * (cijfers.length - 1)) / 2;
    String(n).split('').forEach((c, i) => { stempel(`cijfer-${c}`, links + cijfers[i].ankerX, y); links += cijfers[i].breedte + opening; });
  };
  let y = op(0);
  stempel('sleutel-g', 110, y(6));
  stempel('maat-alla-breve', 180, y(4));
  y = op(1);
  stempel('sleutel-g', 110, y(6));
  getal(3, 200, y(2));
  getal(2, 200, y(6));
  y = op(2);
  stempel('sleutel-g', 110, y(6));
  getal(9, 210, y(2));
  getal(16, 210, y(6));
  // Tenorsleutel (C op de vierde lijn van onder, stap 2) met twee kruisen: f op stap 6, c op stap 2.
  y = op(3);
  stempel('sleutel-c', 110, y(2));
  [6, 2].forEach((stap, i) => stempel('kruis', 175 + i * 22, y(stap)));
  // Twee mollen (b, e) en dan, 0,6 lijnafstand verder, een noot op e zonder eigen voorteken.
  y = op(4);
  stempel('sleutel-g', 110, y(6));
  [4, 1].forEach((stap, i) => stempel('mol', 175 + i * 20, y(stap)));
  stempel('kop-zwart', 195 + sjabloon('mol', ia).breedte + Math.round(ia * 0.6), y(1));
  return beeld;
}

test('balkkop: alla breve, 3/2, 9/16, kruisen bij een tenorsleutel, en een noot vlak na de voortekening', () => {
  const koppen = lees(bladMetMeer());
  const kort = koppen.map((k) => ({
    sleutel: k.sleutel && `${k.sleutel.soort}${k.sleutel.lijn}`,
    aantal: k.voortekening.aantal,
    maatsoort: k.maatsoort && (k.maatsoort.symbool ?? `${k.maatsoort.teller}/${k.maatsoort.noemer}`),
  }));
  assert.deepEqual(kort, [
    { sleutel: 'G2', aantal: 0, maatsoort: 'alla-breve' },
    { sleutel: 'G2', aantal: 0, maatsoort: '3/2' },
    { sleutel: 'G2', aantal: 0, maatsoort: '9/16' },
    { sleutel: 'C4', aantal: 2, maatsoort: null },
    { sleutel: 'G2', aantal: -2, maatsoort: null },
  ]);
  assert.deepEqual(koppen[3].voortekening.tekens.map((t) => t.stap), [6, 2]);
});
