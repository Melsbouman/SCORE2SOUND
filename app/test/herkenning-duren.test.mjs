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
