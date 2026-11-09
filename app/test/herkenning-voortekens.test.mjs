import test from 'node:test';
import assert from 'node:assert/strict';
import { zwartWit } from '../src/herkenning/beeld.mjs';
import { meetSchaal } from '../src/herkenning/schaal.mjs';
import { vindBalken } from '../src/herkenning/raster.mjs';
import { verwijderLijnen } from '../src/herkenning/vormen.mjs';
import { zoekNootkoppen } from '../src/herkenning/koppen.mjs';
import { zoekRusten } from '../src/herkenning/rusten.mjs';
import { leesBalkkoppen } from '../src/herkenning/kop.mjs';
import { zoekVoortekens } from '../src/herkenning/voortekens.mjs';
import { sjabloon } from '../src/herkenning/sjablonen.mjs';
import { maakBlad } from './hulp/blad.mjs';

const ia = 20;

// Eén balk met een vioolsleutel en noten uit Bravura, met en zonder voorteken. Een voorteken staat vlak voor zijn kop.
function bladMetVoortekens() {
  const { beeld, verwacht } = maakBlad({ balken: 1, koppen: false, maatstrepen: false, lijnafstand: ia });
  const zet = (x, y) => { beeld.pixels[Math.round(y) * beeld.breedte + Math.round(x)] = 0; };
  const wis = (x, y) => { beeld.pixels[Math.round(y) * beeld.breedte + Math.round(x)] = 255; };
  const y = (stap) => Math.round(verwacht.balken[0].lijnen[0].a + (stap * ia) / 2);
  const stempel = (naam, ax, ay) => {
    const t = sjabloon(naam, ia);
    for (let dy = 0; dy < t.hoogte; dy += 1) for (let dx = 0; dx < t.breedte; dx += 1) if (t.pixels[dy * t.breedte + dx]) zet(ax - t.ankerX + dx, ay - t.ankerY + dy);
    return t;
  };
  // Een voorteken met zijn rechterkant 4 pixels voor de kop.
  const voor = (naam, kopX, stap, extra = 0) => stempel(naam, kopX - 4 - extra - sjabloon(naam, ia).breedte, y(stap));
  stempel('sleutel-g', 110, y(6));
  stempel('kop-zwart', 250, y(5)); voor('kruis', 250, 5);
  stempel('kop-zwart', 330, y(3)); voor('mol', 330, 3);
  stempel('kop-zwart', 410, y(6)); voor('herstel', 410, 6);
  stempel('kop-zwart', 490, y(4));
  // Een mol die in twee stukken is gevallen (een witte kolom tussen stok en buik).
  stempel('kop-zwart', 570, y(7));
  const mol = voor('mol', 570, 7);
  const molX = 570 - 4 - mol.breedte;
  for (let dy = 0; dy < mol.hoogte; dy += 1) wis(molX + Math.round(ia * 0.16), y(7) - mol.ankerY + dy);
  // Een herstelteken tussen haakjes: twee smalle boogjes links en rechts.
  stempel('kop-zwart', 670, y(5));
  const herstel = voor('herstel', 670, 5, 7);
  const herstelX = 670 - 11 - herstel.breedte;
  const boogje = (x0, richting) => {
    for (let dy = -ia; dy <= ia; dy += 1) {
      const x = x0 + Math.round(richting * (dy * dy) / (ia * 6));
      zet(x, y(5) + dy); zet(x + 1, y(5) + dy);
    }
  };
  boogje(herstelX - 9, 1);
  boogje(670 - 6, -1);
  // Een akkoord met twee mollen: die voor de onderste kop staat verder naar links.
  stempel('kop-zwart', 790, y(5));
  stempel('kop-zwart', 790, y(7));
  voor('mol', 790, 5);
  voor('mol', 790, 7, sjabloon('mol', ia).breedte + 2);
  // Een kwartrust zonder kop ernaast is geen voorteken.
  stempel('rust-kwart', 880, y(4));
  return beeld;
}

test('voortekens: kruis, mol en herstel horen bij de kop rechts ervan, ook in stukken, tussen haakjes en in een akkoord', () => {
  const zw = zwartWit(bladMetVoortekens());
  const schaal = meetSchaal(zw);
  const raster = vindBalken(zw, schaal);
  const kaal = verwijderLijnen(zw, raster, schaal);
  const balkkoppen = leesBalkkoppen(kaal, raster, schaal, { zw });
  const koppen = zoekNootkoppen(kaal, raster, schaal, { balkkoppen });
  const alleVoortekens = zoekVoortekens(kaal, raster, schaal, { koppen, balkkoppen });
  const rusten = zoekRusten(kaal, raster, schaal, { koppen, balkkoppen, voortekens: alleVoortekens });
  const [voortekens] = alleVoortekens;
  // Per kop (van links naar rechts; in het akkoord van boven naar beneden) de plek en het voorteken.
  const perKop = koppen[0].map((kop, k) => {
    const v = voortekens.find((teken) => teken.kop === k);
    return { x: kop.x, stap: kop.stap, teken: v ? `${v.soort}${v.haakjes ? ' ()' : ''}` : '-' };
  }).sort((p, q) => (Math.abs(p.x - q.x) > 5 ? p.x - q.x : p.stap - q.stap));
  assert.deepEqual(perKop.map((kop) => kop.stap), [5, 3, 6, 4, 7, 5, 5, 7]);
  assert.deepEqual(perKop.map((kop) => kop.teken), ['kruis', 'mol', 'herstel', '-', 'mol', 'herstel ()', 'mol', 'mol']);
  assert.deepEqual(rusten[0].map((rust) => rust.soort), ['kwart']);
});

test('voortekens: zonder koppen geen voortekens', () => {
  const zw = zwartWit(bladMetVoortekens());
  const schaal = meetSchaal(zw);
  const raster = vindBalken(zw, schaal);
  const kaal = verwijderLijnen(zw, raster, schaal);
  assert.deepEqual(zoekVoortekens(kaal, raster, schaal, { koppen: [[]] }), [[]]);
});
