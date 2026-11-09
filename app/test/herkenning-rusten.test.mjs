import test from 'node:test';
import assert from 'node:assert/strict';
import { zwartWit } from '../src/herkenning/beeld.mjs';
import { meetSchaal } from '../src/herkenning/schaal.mjs';
import { vindBalken } from '../src/herkenning/raster.mjs';
import { verwijderLijnen } from '../src/herkenning/vormen.mjs';
import { zoekNootkoppen } from '../src/herkenning/koppen.mjs';
import { zoekRusten } from '../src/herkenning/rusten.mjs';
import { sjabloon } from '../src/herkenning/sjablonen.mjs';
import { maakBlad } from './hulp/blad.mjs';

const ia = 20;

// Een balk met rusten uit Bravura op hun gewone plek, een meermaatsrust (dikke balk met streepjes) die tegen de sleutel aan
// begint, een kop met een kruis ervoor, en een cijfer 7 midden in de balk zou een achtste rust kunnen lijken.
function bladMetRusten() {
  const { beeld, verwacht } = maakBlad({ balken: 1, koppen: false, maatstrepen: false, lijnafstand: ia });
  const lijn0 = verwacht.balken[0].lijnen[0].a;
  const yOp = (stap) => Math.round(lijn0 + (stap * ia) / 2);
  const zet = (x, y) => { beeld.pixels[Math.round(y) * beeld.breedte + Math.round(x)] = 0; };
  const vlak = (x0, x1, y0, y1) => { for (let x = x0; x <= x1; x += 1) for (let y = y0; y <= y1; y += 1) zet(x, y); };
  const stempel = (naam, ax, ay) => {
    const t = sjabloon(naam, ia);
    for (let y = 0; y < t.hoogte; y += 1) for (let x = 0; x < t.breedte; x += 1) if (t.pixels[y * t.breedte + x]) zet(ax - t.ankerX + x, ay - t.ankerY + y);
  };
  stempel('sleutel-g', 105, yOp(6));
  // Meermaatsrust van 140 tot 260, vast aan de sleutel.
  vlak(132, 260, yOp(4) - 5, yOp(4) + 5);
  vlak(140, 142, yOp(2), yOp(6));
  vlak(258, 260, yOp(2), yOp(6));
  vlak(128, 140, yOp(4) - 1, yOp(4) + 1);
  stempel('rust-kwart', 320, yOp(4));
  stempel('rust-8', 400, yOp(4));
  stempel('rust-16', 470, yOp(4));
  vlak(540, 565, yOp(2), yOp(3) - 1); // hele rust: hangt onder de tweede lijn
  vlak(620, 645, yOp(3) + 1, yOp(4)); // halve rust: staat op de middelste lijn
  stempel('kruis', 700, yOp(5));
  stempel('kop-zwart', 728, yOp(5));
  return beeld;
}

test('rusten: kwart, achtste, zestiende, hele en halve, en een meermaatsrust die aan de sleutel vastzit', () => {
  const zw = zwartWit(bladMetRusten());
  const schaal = meetSchaal(zw);
  const raster = vindBalken(zw, schaal);
  const kaal = verwijderLijnen(zw, raster, schaal);
  const koppen = zoekNootkoppen(kaal, raster, schaal);
  const [rusten] = zoekRusten(kaal, raster, schaal, { koppen });
  assert.deepEqual(rusten.map((rust) => rust.soort), ['meermaats', 'kwart', '8', '16', 'heel', 'half']);
  assert.ok(Math.abs(rusten[0].rechts - 260) <= 3, `meermaats tot ${rusten[0].rechts}`);
});

// Twee noten onder de balk met hun stokken omhoog tot een dubbele waardestreep op de middelste lijn, ver uit elkaar (een
// voorteken ertussen maakt het stuk tussen de stokken lang). Dat is geen meermaatsrust; een echte meermaatsrust ernaast wel.
test('rusten: waardestrepen op de middelste lijn tussen twee stokken zijn geen meermaatsrust', () => {
  const { beeld, verwacht } = maakBlad({ balken: 1, koppen: false, maatstrepen: false, lijnafstand: ia });
  const lijn0 = verwacht.balken[0].lijnen[0].a;
  const yOp = (stap) => Math.round(lijn0 + (stap * ia) / 2);
  const zet = (x, y) => { beeld.pixels[Math.round(y) * beeld.breedte + Math.round(x)] = 0; };
  const vlak = (x0, x1, y0, y1) => { for (let x = x0; x <= x1; x += 1) for (let y = y0; y <= y1; y += 1) zet(x, y); };
  const stempel = (naam, ax, ay) => {
    const t = sjabloon(naam, ia);
    for (let y = 0; y < t.hoogte; y += 1) for (let x = 0; x < t.breedte; x += 1) if (t.pixels[y * t.breedte + x]) zet(ax - t.ankerX + x, ay - t.ankerY + y);
  };
  stempel('sleutel-g', 105, yOp(6));
  // Waardestrepen: een op de middelste lijn, een daarboven; stokken op 300 en 362 omlaag naar koppen op stap 9.
  vlak(300, 362, yOp(4) - 4, yOp(4) + 4);
  vlak(300, 362, yOp(2) - 4, yOp(2) + 4);
  for (const x of [300, 362]) { vlak(x, x + 1, yOp(2), yOp(9)); stempel('kop-zwart', x - sjabloon('kop-zwart', ia).breedte + 2, yOp(9)); }
  // Een echte meermaatsrust verderop.
  vlak(600, 720, yOp(4) - 5, yOp(4) + 5);
  vlak(600, 602, yOp(2), yOp(6));
  vlak(718, 720, yOp(2), yOp(6));
  const zw = zwartWit(beeld);
  const schaal = meetSchaal(zw);
  const raster = vindBalken(zw, schaal);
  const kaal = verwijderLijnen(zw, raster, schaal);
  const koppen = zoekNootkoppen(kaal, raster, schaal);
  const [rusten] = zoekRusten(kaal, raster, schaal, { koppen });
  assert.deepEqual(rusten.filter((rust) => rust.soort === 'meermaats').map((rust) => Math.round(rust.x / 10)), [66]);
});

// Een meermaatsrust met een dun streepje (1 pixel) aan het eind en direct daarachter een maatstreep: de maatstreep is geen stok.
test('rusten: een maatstreep vlak na het eind van een meermaatsrust is geen stok', () => {
  const { beeld, verwacht } = maakBlad({ balken: 1, koppen: false, maatstrepen: false, lijnafstand: ia });
  const lijn0 = verwacht.balken[0].lijnen[0].a;
  const yOp = (stap) => Math.round(lijn0 + (stap * ia) / 2);
  const vlak = (x0, x1, y0, y1) => { for (let x = x0; x <= x1; x += 1) for (let y = y0; y <= y1; y += 1) beeld.pixels[y * beeld.breedte + x] = 0; };
  const t = sjabloon('sleutel-g', ia);
  for (let y = 0; y < t.hoogte; y += 1) for (let x = 0; x < t.breedte; x += 1) if (t.pixels[y * t.breedte + x]) beeld.pixels[(yOp(6) - t.ankerY + y) * beeld.breedte + 105 + x] = 0;
  vlak(300, 420, yOp(4) - 5, yOp(4) + 5);
  vlak(300, 300, yOp(2), yOp(6));
  vlak(420, 420, yOp(2), yOp(6));
  vlak(422, 423, yOp(0), yOp(8));
  const zw = zwartWit(beeld);
  const schaal = meetSchaal(zw);
  const raster = vindBalken(zw, schaal);
  const kaal = verwijderLijnen(zw, raster, schaal);
  const [rusten] = zoekRusten(kaal, raster, schaal, { koppen: zoekNootkoppen(kaal, raster, schaal) });
  assert.deepEqual(rusten.map((rust) => rust.soort), ['meermaats']);
});
