import test from 'node:test';
import assert from 'node:assert/strict';
import { zwartWit } from '../src/herkenning/beeld.mjs';
import { meetSchaal } from '../src/herkenning/schaal.mjs';
import { vindBalken } from '../src/herkenning/raster.mjs';
import { verwijderLijnen } from '../src/herkenning/vormen.mjs';
import { leesMaatnummers } from '../src/herkenning/maatnummers.mjs';
import { sjabloon } from '../src/herkenning/sjablonen.mjs';
import { maakBlad } from './hulp/blad.mjs';

const ia = 20;

function lees(beeld) {
  const zw = zwartWit(beeld);
  const schaal = meetSchaal(zw);
  const raster = vindBalken(zw, schaal);
  const kaal = verwijderLijnen(zw, raster, schaal);
  return leesMaatnummers(kaal, raster, schaal);
}

// Stempelt sjablonen op een blad; x is relatief aan het begin van de balk (zoals het raster dat meet).
function nieuwBlad(balken, teken) {
  const { beeld, verwacht } = maakBlad({ balken, koppen: false, maatstrepen: false, lijnafstand: ia, afstandBalken: 230 });
  const raster = vindBalken(zwartWit(beeld), meetSchaal(zwartWit(beeld)));
  const stempel = (naam, ax, ay) => {
    const t = sjabloon(naam, ia);
    for (let y = 0; y < t.hoogte; y += 1) {
      for (let x = 0; x < t.breedte; x += 1) {
        if (t.pixels[y * t.breedte + x]) beeld.pixels[(ay - t.ankerY + y) * beeld.breedte + ax - t.ankerX + x] = 0;
      }
    }
    return t;
  };
  teken({
    stempel,
    links: (b) => raster.balken[b].links,
    y: (b, stap) => Math.round(verwacht.balken[b].lijnen[0].a + (stap * ia) / 2),
  });
  return beeld;
}

test('maatnummer: 1 en 7 naast elkaar boven het begin van balk 0 geven 17; balk 1 zonder getal geeft null', () => {
  const beeld = nieuwBlad(2, ({ stempel, links, y }) => {
    const een = sjabloon('cijfer-1', ia);
    const x = links(0) + ia;
    stempel('cijfer-1', x + een.ankerX, y(0, -4));
    stempel('cijfer-7', x + een.breedte + Math.round(ia * 0.15) + sjabloon('cijfer-7', ia).ankerX, y(0, -4));
  });
  const nummers = lees(beeld);
  assert.equal(nummers.length, 2);
  assert.equal(nummers[0].nummer, 17);
  assert.ok(nummers[0].links < nummers[0].rechts && nummers[0].boven < nummers[0].onder);
  assert.equal(nummers[1], null);
});

test('maatnummer: een 5 boven het midden van de balk (niet bij het begin) geeft null', () => {
  const beeld = nieuwBlad(3, ({ stempel, links, y }) => {
    stempel('cijfer-5', links(2) + 10 * ia, y(2, -4));
  });
  const nummers = lees(beeld);
  assert.equal(nummers[2], null);
});
