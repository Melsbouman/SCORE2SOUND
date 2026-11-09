import test from 'node:test';
import assert from 'node:assert/strict';
import { zwartWit } from '../src/herkenning/beeld.mjs';
import { meetSchaal } from '../src/herkenning/schaal.mjs';
import { vindBalken } from '../src/herkenning/raster.mjs';
import { verwijderLijnen } from '../src/herkenning/vormen.mjs';
import { zoekNootkoppen } from '../src/herkenning/koppen.mjs';
import { bepaalDuren } from '../src/herkenning/duren.mjs';
import { leesTriolen } from '../src/herkenning/groepcijfers.mjs';
import { sjabloon } from '../src/herkenning/sjablonen.mjs';
import { maakBlad } from './hulp/blad.mjs';

const ia = 20;

// Eén balk met: drie achtsten onder één waardestreep (stokken omhoog) met een 3 boven de streep; twee achtsten zonder cijfer;
// drie achtsten met stokken omlaag en een 3 onder de streep; en drie achtsten met een 3 ver boven de balk (een repetitiecijfer
// hoort er niet bij als het meer dan twee lijnafstanden van de streep staat).
function blad() {
  const { beeld, verwacht } = maakBlad({ balken: 1, koppen: false, maatstrepen: false, lijnafstand: ia });
  const y = (stap) => Math.round(verwacht.balken[0].lijnen[0].a + (stap * ia) / 2);
  const zet = (x, yy) => { beeld.pixels[Math.round(yy) * beeld.breedte + Math.round(x)] = 0; };
  const vlak = (x0, x1, y0, y1) => { for (let x = x0; x <= x1; x += 1) for (let yy = y0; yy <= y1; yy += 1) zet(x, yy); };
  const stempel = (naam, ax, ay) => {
    const t = sjabloon(naam, ia);
    for (let dy = 0; dy < t.hoogte; dy += 1) for (let dx = 0; dx < t.breedte; dx += 1) if (t.pixels[dy * t.breedte + dx]) zet(ax - t.ankerX + dx, ay - t.ankerY + dy);
    return t;
  };
  const kop = sjabloon('kop-zwart', ia);
  // Een groep achtsten op stap `stap`, stokken omhoog (rechts van de kop) of omlaag (links), met één waardestreep.
  const groep = (xs, stap, omhoog) => {
    for (const x of xs) stempel('kop-zwart', x, y(stap));
    const stokken = xs.map((x) => (omhoog ? x + kop.breedte - 2 : x));
    const eind = omhoog ? y(stap) - Math.round(ia * 3.5) : y(stap) + Math.round(ia * 3.5);
    for (const sx of stokken) vlak(sx, sx + 1, Math.min(eind, y(stap)), Math.max(eind, y(stap)));
    const [b0, b1] = omhoog ? [eind, eind + 5] : [eind - 5, eind];
    vlak(stokken[0], stokken.at(-1) + 1, b0, b1);
    return { midden: (stokken[0] + stokken.at(-1)) / 2, eind };
  };
  stempel('sleutel-g', 110, y(6));
  const a = groep([220, 270, 320], 7, true);
  stempel('cijfer-3', a.midden - sjabloon('cijfer-3', ia).breedte / 2, a.eind - Math.round(ia * 1.4));
  groep([420, 470], 7, true);
  const c = groep([570, 620, 670], 1, false);
  stempel('cijfer-3', c.midden - sjabloon('cijfer-3', ia).breedte / 2, c.eind + Math.round(ia * 1.4));
  const d = groep([780, 830, 880], 7, true);
  stempel('cijfer-3', d.midden - sjabloon('cijfer-3', ia).breedte / 2, d.eind - Math.round(ia * 4));
  return beeld;
}

test('triolen: een 3 bij een groep onder één waardestreep', () => {
  const zw = zwartWit(blad());
  const schaal = meetSchaal(zw);
  const raster = vindBalken(zw, schaal);
  const kaal = verwijderLijnen(zw, raster, schaal);
  const noten = bepaalDuren(kaal, raster, schaal, zoekNootkoppen(kaal, raster, schaal));
  assert.equal(noten[0].length, 11);
  const [triolen] = leesTriolen(kaal, raster, schaal, noten);
  assert.deepEqual(triolen.map((t) => [t.koppen, t.aantal]), [[[0, 1, 2], 3], [[5, 6, 7], 3]]);
});

test('triolen: zonder noten een lege lijst per balk', () => {
  const zw = zwartWit(blad());
  const schaal = meetSchaal(zw);
  const raster = vindBalken(zw, schaal);
  const kaal = verwijderLijnen(zw, raster, schaal);
  assert.deepEqual(leesTriolen(kaal, raster, schaal, [[]]), [[]]);
});
