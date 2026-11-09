import test from 'node:test';
import assert from 'node:assert/strict';
import { zwartWit } from '../src/herkenning/beeld.mjs';
import { meetSchaal } from '../src/herkenning/schaal.mjs';
import { vindBalken } from '../src/herkenning/raster.mjs';
import { verwijderLijnen } from '../src/herkenning/vormen.mjs';
import { zoekNootkoppen } from '../src/herkenning/koppen.mjs';
import { sjabloon, SJABLOONNAMEN } from '../src/herkenning/sjablonen.mjs';
import { maakBlad } from './hulp/blad.mjs';

// Een blad met twee balken zonder eigen koppen, waarop we koppen uit het lettertype stempelen op bekende plekken.
function bladMetKoppen(koppen, { extra = () => {} } = {}) {
  const lijnafstand = 20;
  const { beeld, verwacht } = maakBlad({ balken: 2, koppen: false, maatstrepen: false, lijnafstand });
  const stempel = (naam, ax, ay) => {
    const t = sjabloon(naam, lijnafstand);
    for (let y = 0; y < t.hoogte; y += 1) {
      for (let x = 0; x < t.breedte; x += 1) {
        if (t.pixels[y * t.breedte + x]) beeld.pixels[(ay - t.ankerY + y) * beeld.breedte + (ax - t.ankerX + x)] = 0;
      }
    }
  };
  for (const kop of koppen) {
    const balk = verwacht.balken[kop.balk];
    const y = Math.round(balk.lijnen[0].a + (kop.stap * lijnafstand) / 2);
    stempel(`kop-${kop.soort}`, kop.x, y);
    // Hulplijnen voor koppen buiten de balk.
    for (let lijn = kop.stap <= -2 ? -2 : 10; kop.stap <= -2 ? lijn >= kop.stap : lijn <= kop.stap; lijn += kop.stap <= -2 ? -2 : 2) {
      if (kop.stap > -2 && kop.stap < 10) break;
      const yl = Math.round(balk.lijnen[0].a + (lijn * lijnafstand) / 2);
      for (let x = kop.x - 8; x <= kop.x + 36; x += 1) { beeld.pixels[yl * beeld.breedte + x] = 0; beeld.pixels[(yl + 1) * beeld.breedte + x] = 0; }
    }
  }
  extra({ beeld, verwacht, stempel, lijnafstand });
  return { beeld, verwacht };
}

function zoek(beeld) {
  const zw = zwartWit(beeld);
  const schaal = meetSchaal(zw);
  const raster = vindBalken(zw, schaal);
  return zoekNootkoppen(verwijderLijnen(zw, raster, schaal), raster, schaal);
}

test('de sjablonen uit Bravura zijn er en schalen mee met de lijnafstand', () => {
  for (const naam of ['kop-zwart', 'kop-half', 'kop-heel', 'rust-kwart', 'sleutel-g', 'kruis', 'mol']) assert.ok(SJABLOONNAMEN.includes(naam), naam);
  const klein = sjabloon('kop-zwart', 12);
  const groot = sjabloon('kop-zwart', 24);
  assert.ok(Math.abs(groot.breedte - 2 * klein.breedte) <= 1);
  assert.ok(Math.abs(groot.hoogte / 24 - 1) < 0.1, 'een zwarte kop is ongeveer een lijnafstand hoog');
  assert.equal(sjabloon('kop-half', 20).binnen.some((waarde) => waarde === 1), true, 'een halve kop heeft een gat');
});

test('nootkoppen op lijnen, tussenruimtes en hulplijnen, met de juiste soort en stap', () => {
  const koppen = [
    { balk: 0, x: 200, stap: 8, soort: 'zwart' }, { balk: 0, x: 300, stap: 5, soort: 'zwart' }, { balk: 0, x: 400, stap: 0, soort: 'half' },
    { balk: 0, x: 500, stap: 3, soort: 'heel' }, { balk: 0, x: 600, stap: -3, soort: 'zwart' }, { balk: 0, x: 700, stap: 11, soort: 'half' },
    { balk: 1, x: 250, stap: 4, soort: 'zwart' }, { balk: 1, x: 350, stap: 7, soort: 'heel' }, { balk: 1, x: 450, stap: 1, soort: 'zwart' },
  ];
  const gevonden = zoek(bladMetKoppen(koppen).beeld);
  for (const balk of [0, 1]) {
    const juist = koppen.filter((kop) => kop.balk === balk);
    assert.deepEqual(gevonden[balk].map((kop) => [kop.stap, kop.soort]), juist.map((kop) => [kop.stap, kop.soort]));
    gevonden[balk].forEach((kop, i) => assert.ok(Math.abs(kop.x - (juist[i].x + sjabloon(`kop-${juist[i].soort}`, 20).breedte / 2)) <= 2, `x ${kop.x}`));
  }
});

test('de krul van een vioolsleutel aan het begin en een kadertje ver boven de balk zijn geen koppen', () => {
  const { beeld } = bladMetKoppen([{ balk: 0, x: 400, stap: 4, soort: 'zwart' }], {
    extra: ({ verwacht, stempel }) => {
      const balk = verwacht.balken[0];
      stempel('sleutel-g', 105, Math.round(balk.lijnen[0].a + 3 * 20));
      // Een kadertje met een rondje erin, drie lijnafstanden boven de balk, zonder hulplijnen.
      stempel('kop-heel', 600, Math.round(balk.lijnen[0].a - 4 * 20));
    },
  });
  const gevonden = zoek(beeld);
  assert.deepEqual(gevonden[0].map((kop) => [kop.stap, kop.soort]), [[4, 'zwart']]);
});

// Een open kop met een dunne rand (zoals in veel gravures en op een lichte scan), schuin, tussen twee lijnen: de boven- en
// onderrand vallen op de lijnen en verdwijnen met het weghalen van de lijnen.
function dunneOpenKop(beeld, cx, cy, lijnafstand, binnen = 0.75) {
  const a = lijnafstand * 0.62;
  const b = lijnafstand * 0.47;
  const hoek = (-30 * Math.PI) / 180;
  for (let y = Math.floor(cy - lijnafstand); y <= cy + lijnafstand; y += 1) {
    for (let x = Math.floor(cx - lijnafstand); x <= cx + lijnafstand; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const u = (dx * Math.cos(hoek) + dy * Math.sin(hoek)) / a;
      const v = (-dx * Math.sin(hoek) + dy * Math.cos(hoek)) / b;
      const r = Math.sqrt(u * u + v * v);
      if (r <= 1 && r >= binnen) beeld.pixels[y * beeld.breedte + x] = 0;
    }
  }
}

function zoekMetLijnen(beeld) {
  const zw = zwartWit(beeld);
  const schaal = meetSchaal(zw);
  const raster = vindBalken(zw, schaal);
  return zoekNootkoppen(verwijderLijnen(zw, raster, schaal), raster, schaal, { zw });
}

test('een halve kop met een dunne rand tussen twee lijnen wordt gevonden; een haardunne ring, een mol en een herstellingsteken niet', () => {
  const { beeld } = bladMetKoppen([{ balk: 0, x: 200, stap: 4, soort: 'zwart' }], {
    extra: ({ beeld: blad, verwacht, stempel, lijnafstand }) => {
      const balk = verwacht.balken[0];
      const y = (stap) => Math.round(balk.lijnen[0].a + (stap * lijnafstand) / 2);
      dunneOpenKop(blad, 400, y(5), lijnafstand);
      dunneOpenKop(blad, 500, y(3), lijnafstand);
      stempel('mol', 600, y(5));
      stempel('herstel', 700, y(3));
      // Een haardunne ring (zoals het rondje van een mol op een scan): de buitenrand past, het gewone sjabloon niet genoeg.
      dunneOpenKop(blad, 800, y(5), lijnafstand, 0.86);
    },
  });
  const gevonden = zoekMetLijnen(beeld);
  assert.deepEqual(gevonden[0].map((kop) => [kop.stap, kop.soort]), [[4, 'zwart'], [5, 'half'], [3, 'half']]);
});

test('met het beeld met lijnen vinden we dezelfde koppen uit het lettertype als zonder', () => {
  const koppen = [
    { balk: 0, x: 200, stap: 8, soort: 'zwart' }, { balk: 0, x: 300, stap: 5, soort: 'half' }, { balk: 0, x: 400, stap: 0, soort: 'half' },
    { balk: 0, x: 500, stap: 3, soort: 'heel' }, { balk: 0, x: 600, stap: 4, soort: 'half' }, { balk: 1, x: 350, stap: 7, soort: 'heel' },
  ];
  const { beeld } = bladMetKoppen(koppen);
  const metLijnen = zoekMetLijnen(beeld);
  for (const balk of [0, 1]) assert.deepEqual(metLijnen[balk].map((kop) => [kop.stap, kop.soort]), koppen.filter((kop) => kop.balk === balk).map((kop) => [kop.stap, kop.soort]));
});

test('een halve kop een paar pixels onder zijn plek op de balk wordt gevonden, op de goede stap', () => {
  const { beeld, verwacht } = bladMetKoppen([], {
    extra: ({ beeld: blad, verwacht, lijnafstand }) => {
      const balk = verwacht.balken[0];
      const y = (stap) => Math.round(balk.lijnen[0].a + (stap * lijnafstand) / 2);
      dunneOpenKop(blad, 400, y(5) + 4, lijnafstand);
      dunneOpenKop(blad, 500, y(4) - 2, lijnafstand);
    },
  });
  const gevonden = zoekMetLijnen(beeld)[0];
  assert.deepEqual(gevonden.map((kop) => [kop.stap, kop.soort]), [[5, 'half'], [4, 'half']]);
  // De kop staat op de hoogte waar hij echt staat (voor de stok en de punt), niet op de plek van de stap.
  const a = verwacht.balken[0].lijnen[0].a;
  assert.ok(Math.abs(gevonden[0].y - (Math.round(a + 50) + 4)) <= 1, `y ${gevonden[0].y}`);
  assert.ok(Math.abs(gevonden[1].y - (Math.round(a + 40) - 2)) <= 1, `y ${gevonden[1].y}`);
});
