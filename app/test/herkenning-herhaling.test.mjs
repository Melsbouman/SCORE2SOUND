import test from 'node:test';
import assert from 'node:assert/strict';
import { zwartWit } from '../src/herkenning/beeld.mjs';
import { meetSchaal } from '../src/herkenning/schaal.mjs';
import { vindBalken } from '../src/herkenning/raster.mjs';
import { vindMaten } from '../src/herkenning/maten.mjs';
import { sjabloon } from '../src/herkenning/sjablonen.mjs';
import { maakBlad } from './hulp/blad.mjs';

const ia = 20;

// Eén balk met: een herhaling-begin (dik, dun, punten rechts), een gewone maatstreep, een herhaling-eind (punten links, dun,
// dik), een dubbele streep met aan beide kanten punten, en een eindstreep zonder punten. Een gepunteerde noot vlak voor de
// gewone maatstreep heeft maar één punt: dat is geen herhaalteken.
function blad() {
  const { beeld, verwacht } = maakBlad({ balken: 1, koppen: false, maatstrepen: false, lijnafstand: ia });
  const y = (stap) => Math.round(verwacht.balken[0].lijnen[0].a + (stap * ia) / 2);
  const zet = (x, yy) => { beeld.pixels[Math.round(yy) * beeld.breedte + Math.round(x)] = 0; };
  const vlak = (x0, x1, y0, y1) => { for (let x = x0; x <= x1; x += 1) for (let yy = y0; yy <= y1; yy += 1) zet(x, yy); };
  const stempel = (naam, ax, ay) => {
    const t = sjabloon(naam, ia);
    for (let dy = 0; dy < t.hoogte; dy += 1) for (let dx = 0; dx < t.breedte; dx += 1) if (t.pixels[dy * t.breedte + dx]) zet(ax - t.ankerX + dx, ay - t.ankerY + dy);
  };
  const dun = (x) => vlak(x, x + 1, y(0) - 1, y(8) + 1);
  const dik = (x) => vlak(x, x + 9, y(0) - 1, y(8) + 1);
  const punten = (x) => { for (const stap of [3, 5]) stempel('punt', x, y(stap)); };
  stempel('sleutel-g', 110, y(6));
  dik(300); dun(316); punten(322);
  stempel('kop-zwart', 560, y(5)); stempel('punt', 585, y(5));
  dun(600);
  punten(878); dun(892); dik(898);
  punten(976); dun(990); dun(998); punten(1006);
  dun(1085); dik(1091);
  return beeld;
}

test('maatstrepen: herhaaltekens herkend aan de punten in de tweede en derde tussenruimte', () => {
  const zw = zwartWit(blad());
  const schaal = meetSchaal(zw);
  const raster = vindBalken(zw, schaal);
  const [{ strepen }] = vindMaten(zw, raster, schaal);
  assert.deepEqual(strepen.map((streep) => [streep.soort, streep.herhaling ?? null]), [
    ['begin', 'begin'], ['enkel', null], ['eind', 'eind'], ['dubbel', 'beide'], ['eind', null],
  ]);
});

test('maatstrepen: zonder punten geen herhaling', () => {
  const { beeld } = maakBlad({ balken: 2, lijnafstand: ia, eindstreep: true });
  const zw = zwartWit(beeld);
  const schaal = meetSchaal(zw);
  const raster = vindBalken(zw, schaal);
  for (const { strepen } of vindMaten(zw, raster, schaal)) assert.ok(strepen.every((streep) => streep.herhaling === undefined));
});
