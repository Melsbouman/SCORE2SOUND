import test from 'node:test';
import assert from 'node:assert/strict';
import { zwartWit } from '../src/herkenning/beeld.mjs';
import { meetSchaal } from '../src/herkenning/schaal.mjs';
import { vindBalken } from '../src/herkenning/raster.mjs';
import { verwijderLijnen } from '../src/herkenning/vormen.mjs';
import { zoekNootkoppen } from '../src/herkenning/koppen.mjs';
import { zoekVoortekens } from '../src/herkenning/voortekens.mjs';
import { verwijderHulplijnen } from '../src/herkenning/hulplijnen.mjs';
import { sjabloon } from '../src/herkenning/sjablonen.mjs';
import { maakBlad } from './hulp/blad.mjs';

const ia = 20;

// Een noot hoog boven de balk (stap -4, hulplijnen op -2 en -4) met een kruis dat de hulplijn raakt, een noot ver onder de
// balk (stap 12, hulplijnen op 10 en 12) met een mol die de hulplijn raakt, en een gewone noot met een kruis.
function blad() {
  const { beeld, verwacht } = maakBlad({ balken: 1, koppen: false, maatstrepen: false, lijnafstand: ia });
  const y = (stap) => Math.round(verwacht.balken[0].lijnen[0].a + (stap * ia) / 2);
  const zet = (x, yy) => { beeld.pixels[Math.round(yy) * beeld.breedte + Math.round(x)] = 0; };
  const stempel = (naam, ax, ay) => {
    const t = sjabloon(naam, ia);
    for (let dy = 0; dy < t.hoogte; dy += 1) for (let dx = 0; dx < t.breedte; dx += 1) if (t.pixels[dy * t.breedte + dx]) zet(ax - t.ankerX + dx, ay - t.ankerY + dy);
  };
  const kop = sjabloon('kop-zwart', ia);
  const hulplijn = (x, stap) => { for (let dx = -8; dx <= kop.breedte + 8; dx += 1) { zet(x + dx, y(stap)); zet(x + dx, y(stap) + 1); } };
  stempel('sleutel-g', 110, y(6));
  stempel('kop-zwart', 300, y(-4)); hulplijn(300, -2); hulplijn(300, -4);
  stempel('kruis', 300 - 6 - sjabloon('kruis', ia).breedte, y(-4));
  stempel('kop-zwart', 450, y(12)); hulplijn(450, 10); hulplijn(450, 12);
  stempel('mol', 450 - 6 - sjabloon('mol', ia).breedte, y(12));
  stempel('kop-zwart', 600, y(4));
  stempel('kruis', 600 - 4 - sjabloon('kruis', ia).breedte, y(4));
  return { beeld, y };
}

function voorbereid() {
  const { beeld, y } = blad();
  const zw = zwartWit(beeld);
  const schaal = meetSchaal(zw);
  const raster = vindBalken(zw, schaal);
  const kaal = verwijderLijnen(zw, raster, schaal);
  const koppen = zoekNootkoppen(kaal, raster, schaal);
  return { y, schaal, raster, kaal, koppen };
}
const op = (beeld, x, y) => beeld.pixels[y * beeld.breedte + x];

test('hulplijnen weghalen: de hulplijnen verdwijnen, de koppen en het origineel blijven', () => {
  const { y, schaal, raster, kaal, koppen } = voorbereid();
  assert.deepEqual(koppen[0].map((kop) => kop.stap), [-4, 12, 4]);
  const zonder = verwijderHulplijnen(kaal, raster, schaal, koppen);
  assert.equal(zonder.breedte, kaal.breedte);
  assert.equal(zonder.hoogte, kaal.hoogte);
  // Het stukje hulplijn links en rechts naast de kop is weg; het midden van de kop niet.
  for (const [x, stap] of [[294, -2], [294, -4], [327, -2], [444, 10], [477, 12]]) {
    assert.equal(op(kaal, x, y(stap)), 1, `hulplijn op ${x}, stap ${stap} stond er`);
    assert.equal(op(zonder, x, y(stap)), 0, `hulplijn op ${x}, stap ${stap} is weg`);
  }
  for (const kop of koppen[0]) assert.equal(op(zonder, kop.x, kop.y), 1, `kop op stap ${kop.stap} blijft`);
  assert.equal(op(kaal, 294, y(-2)), 1, 'het beeld dat erin ging, blijft gelijk');
});

test('hulplijnen weghalen: voortekens die een hulplijn raakten, worden gevonden', () => {
  const { schaal, raster, kaal, koppen } = voorbereid();
  const perKop = (beeld) => {
    const [tekens] = zoekVoortekens(beeld, raster, schaal, { koppen });
    return koppen[0].map((_, k) => tekens.find((teken) => teken.kop === k)?.soort ?? '-');
  };
  assert.deepEqual(perKop(kaal), ['-', '-', 'kruis'], 'met de hulplijnen erin worden ze gemist');
  assert.deepEqual(perKop(verwijderHulplijnen(kaal, raster, schaal, koppen)), ['kruis', 'mol', 'kruis']);
});
