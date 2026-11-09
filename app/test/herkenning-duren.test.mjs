import test from 'node:test';
import assert from 'node:assert/strict';
import { zwartWit } from '../src/herkenning/beeld.mjs';
import { meetSchaal } from '../src/herkenning/schaal.mjs';
import { vindBalken } from '../src/herkenning/raster.mjs';
import { verwijderLijnen } from '../src/herkenning/vormen.mjs';
import { zoekNootkoppen } from '../src/herkenning/koppen.mjs';
import { bepaalDuren } from '../src/herkenning/duren.mjs';
import { sjabloon } from '../src/herkenning/sjablonen.mjs';
import { maakBlad } from './hulp/blad.mjs';

const ia = 20;

// Een balk met noten van bekende duur: koppen en vlaggen uit Bravura, stokken en waardestrepen getekend.
function bladMetNoten() {
  const { beeld, verwacht } = maakBlad({ balken: 1, koppen: false, maatstrepen: false, lijnafstand: ia });
  const lijn0 = verwacht.balken[0].lijnen[0].a;
  const yOp = (stap) => Math.round(lijn0 + (stap * ia) / 2);
  const zet = (x, y) => { beeld.pixels[Math.round(y) * beeld.breedte + Math.round(x)] = 0; };
  const vlak = (x0, x1, y0, y1) => { for (let x = x0; x <= x1; x += 1) for (let y = y0; y <= y1; y += 1) zet(x, y); };
  const stempel = (naam, ax, ay) => {
    const t = sjabloon(naam, ia);
    for (let y = 0; y < t.hoogte; y += 1) for (let x = 0; x < t.breedte; x += 1) if (t.pixels[y * t.breedte + x]) zet(ax - t.ankerX + x, ay - t.ankerY + y);
  };
  const breedteKop = sjabloon('kop-zwart', ia).breedte;
  // Een kop met een stok omhoog (rechts), 3,5 lijnafstand lang; geeft de x van de stok en het eind.
  const noot = (soort, ax, stap) => {
    stempel(`kop-${soort}`, ax, yOp(stap));
    const stokX = ax + breedteKop - 1;
    const eind = yOp(stap) - Math.round(ia * 3.5);
    if (soort !== 'heel') vlak(stokX - 1, stokX, eind, yOp(stap) - 2);
    return { stokX, eind };
  };
  noot('zwart', 250, 7); // kwart
  const achtste = noot('zwart', 350, 6); // achtste met vlag
  stempel('vlag-8-op', achtste.stokX - 1, achtste.eind);
  const a = noot('zwart', 470, 7); // twee zestienden met twee waardestrepen
  const b = noot('zwart', 530, 7);
  vlak(a.stokX - 1, b.stokX, a.eind, a.eind + 4);
  vlak(a.stokX - 1, b.stokX, a.eind + 9, a.eind + 13);
  noot('half', 650, 5); // gepunteerde halve
  stempel('punt', 650 + breedteKop + 6, yOp(5));
  noot('heel', 780, 3); // hele
  return beeld;
}

test('duur uit stok, vlag, waardestrepen en punt', () => {
  const zw = zwartWit(bladMetNoten());
  const schaal = meetSchaal(zw);
  const raster = vindBalken(zw, schaal);
  const kaal = verwijderLijnen(zw, raster, schaal);
  const [noten] = bepaalDuren(kaal, raster, schaal, zoekNootkoppen(kaal, raster, schaal));
  assert.deepEqual(noten.map((noot) => noot.duur), [480, 240, 120, 120, 1440, 1920]);
  assert.deepEqual(noten.map((noot) => noot.stok?.richting ?? '-'), ['op', 'op', 'op', 'op', 'op', '-']);
  assert.equal(noten[4].punt, true);
  assert.ok(noten.slice(0, 4).every((noot) => !noot.punt), 'geen valse punten');
});

// Lastige gevallen, elk met een eigen noot:
// - twee achtsten onder één waardestreep met korte stokken (2,5 lijnafstand): de bovenkant van de eigen kop is geen tweede streep;
// - een achtste met een vlag; de stok heeft een gaatje van twee pixels, zodat het gevonden eind onder het begin van de vlag ligt;
// - twee achtsten met stokken omlaag die twee à drie pixels links van de kop staan (een kop die iets te ver naar rechts geschat is);
// - een kwart met een boog vlak boven het eind van de stok (de boog zit er niet aan vast: geen vlag);
// - twee achtsten onder een schuine waardestreep.
function bladMetLastigeNoten() {
  const { beeld, verwacht } = maakBlad({ balken: 1, koppen: false, maatstrepen: false, lijnafstand: ia });
  const lijn0 = verwacht.balken[0].lijnen[0].a;
  const yOp = (stap) => Math.round(lijn0 + (stap * ia) / 2);
  const zet = (x, y) => { beeld.pixels[Math.round(y) * beeld.breedte + Math.round(x)] = 0; };
  const wis = (x, y) => { beeld.pixels[Math.round(y) * beeld.breedte + Math.round(x)] = 255; };
  const vlak = (x0, x1, y0, y1) => { for (let x = x0; x <= x1; x += 1) for (let y = y0; y <= y1; y += 1) zet(x, y); };
  const stempel = (naam, ax, ay) => {
    const t = sjabloon(naam, ia);
    for (let y = 0; y < t.hoogte; y += 1) for (let x = 0; x < t.breedte; x += 1) if (t.pixels[y * t.breedte + x]) zet(ax - t.ankerX + x, ay - t.ankerY + y);
  };
  const breedteKop = sjabloon('kop-zwart', ia).breedte;
  // Korte stokken onder een waardestreep.
  for (const ax of [200, 260]) stempel('kop-zwart', ax, yOp(7));
  const kort = yOp(7) - Math.round(ia * 2.5);
  for (const ax of [200, 260]) vlak(ax + breedteKop - 2, ax + breedteKop - 1, kort, yOp(7) - 2);
  vlak(200 + breedteKop - 2, 260 + breedteKop - 1, kort, kort + 5);
  // Vlag boven een gaatje in de stok.
  stempel('kop-zwart', 360, yOp(6));
  const stokX = 360 + breedteKop - 1;
  const top = yOp(6) - Math.round(ia * 3.5);
  vlak(stokX - 1, stokX, top, yOp(6) - 2);
  stempel('vlag-8-op', stokX - 1, top);
  // (De vlag raakt de stok van ongeveer 6 tot 20 pixels onder de top; het gaatje ligt daar onderin.)
  for (const y of [top + 17, top + 18]) { wis(stokX - 1, y); wis(stokX, y); }
  // Stokken omlaag, drie pixels links van de kop, met een waardestreep.
  for (const ax of [460, 520]) stempel('kop-zwart', ax, yOp(2));
  const laag = yOp(2) + Math.round(ia * 3.5);
  for (const ax of [460, 520]) vlak(ax - 3, ax - 2, yOp(2) + 2, laag);
  vlak(457, 518, laag - 5, laag);
  // Kwart met een boog vlak boven de stok.
  stempel('kop-zwart', 620, yOp(7));
  const stok2 = 620 + breedteKop - 1;
  const top2 = yOp(7) - Math.round(ia * 3.5);
  vlak(stok2 - 1, stok2, top2, yOp(7) - 2);
  vlak(stok2 - 30, stok2 + 30, top2 - 7, top2 - 4);
  // Schuine waardestreep: de streep stijgt 12 pixels over 60 pixels.
  for (const ax of [720, 780]) stempel('kop-zwart', ax, yOp(7));
  const [s1, s2] = [720 + breedteKop - 1, 780 + breedteKop - 1];
  const e1 = yOp(7) - Math.round(ia * 3.5);
  const e2 = e1 - 12;
  vlak(s1 - 1, s1, e1, yOp(7) - 2);
  vlak(s2 - 1, s2, e2, yOp(7) - 2);
  for (let x = s1 - 1; x <= s2; x += 1) {
    const yb = Math.round(e1 + ((e2 - e1) * (x - s1)) / (s2 - s1));
    vlak(x, x, yb, yb + 5);
  }
  return beeld;
}

test('duur: korte stokken, een vlag boven een gaatje, stokken naast de kop, een boog boven een kwart en een schuine streep', () => {
  const zw = zwartWit(bladMetLastigeNoten());
  const schaal = meetSchaal(zw);
  const raster = vindBalken(zw, schaal);
  const kaal = verwijderLijnen(zw, raster, schaal);
  const [noten] = bepaalDuren(kaal, raster, schaal, zoekNootkoppen(kaal, raster, schaal));
  assert.deepEqual(noten.map((noot) => noot.duur), [240, 240, 240, 240, 240, 480, 240, 240]);
  // Onder een streep loopt de streep van de ene stok naar de andere, in beide richtingen, ook als hij schuin is.
  for (const [i, j] of [[0, 1], [3, 4], [6, 7]]) {
    assert.ok(noten[i].balk && noten[j].balk, `waardestreep bij ${i} en ${j}`);
    assert.ok(noten[i].balk.rechts >= noten[j].stok.x - 2, `streep ${i} tot ${noten[i].balk.rechts}, stok ${j} op ${noten[j].stok.x}`);
    assert.ok(noten[j].balk.links <= noten[i].stok.x + 2, `streep ${j} vanaf ${noten[j].balk.links}, stok ${i} op ${noten[i].stok.x}`);
  }
  assert.equal(noten[2].balk, undefined, 'een vlag is geen waardestreep');
});
