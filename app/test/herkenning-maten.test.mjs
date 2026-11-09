import test from 'node:test';
import assert from 'node:assert/strict';
import { zwartWit } from '../src/herkenning/beeld.mjs';
import { meetSchaal } from '../src/herkenning/schaal.mjs';
import { vindBalken } from '../src/herkenning/raster.mjs';
import { vindMaten } from '../src/herkenning/maten.mjs';
import { maakBlad } from './hulp/blad.mjs';

function herken(opties) {
  const { beeld, verwacht } = maakBlad(opties);
  const zw = zwartWit(beeld);
  const schaal = meetSchaal(zw);
  const raster = vindBalken(zw, schaal);
  return { verwacht, raster, maten: vindMaten(zw, raster, schaal) };
}

test('maatstrepen: begin, een derde, twee derde en eind; drie maten per balk', () => {
  const { verwacht, maten } = herken({});
  assert.equal(maten.length, verwacht.balken.length);
  maten.forEach((balk, s) => {
    const juist = verwacht.balken[s].strepen.map((streep) => streep.x);
    assert.equal(balk.strepen.length, juist.length, `balk ${s}: ${balk.strepen.map((streep) => streep.links).join(',')}`);
    balk.strepen.forEach((streep, i) => assert.ok(Math.abs((streep.links + streep.rechts) / 2 - juist[i]) <= 1.5, `balk ${s} streep ${i}`));
    assert.equal(balk.maten.length, 3);
    // De maten sluiten op de strepen aan; de eerste begint na de beginstreep.
    assert.ok(Math.abs(balk.maten[0].links - balk.strepen[0].rechts) <= 1);
    assert.ok(Math.abs(balk.maten[1].links - juist[1]) <= 1.5);
    assert.ok(Math.abs(balk.maten[2].rechts - juist[3]) <= 1.5);
  });
});

test('maten: boven en onder zijn de bovenste en onderste lijn midden in de maat', () => {
  const { verwacht, maten } = herken({ helling: Math.tan(Math.PI / 180) });
  const lijnen = verwacht.balken[0].lijnen;
  for (const maat of maten[0].maten) {
    const midden = (maat.links + maat.rechts) / 2;
    assert.ok(Math.abs(maat.boven - (lijnen[0].a + lijnen[0].b * midden)) <= 1.5);
    assert.ok(Math.abs(maat.onder - (lijnen[4].a + lijnen[4].b * midden)) <= 1.5);
  }
});

test('stokken van nootkoppen en lange stokken door de hele balk zijn geen maatstrepen', () => {
  const { maten } = herken({ langeStokken: 5, zaad: 4 });
  for (const balk of maten) assert.equal(balk.strepen.length, 4, balk.strepen.map((streep) => streep.links).join(','));
});

test('een eindstreep (dun en dik) is één maatstreep van de soort eind', () => {
  const { maten } = herken({ balken: 2, eindstreep: true, koppen: false });
  for (const balk of maten) {
    assert.equal(balk.strepen.length, 4);
    assert.equal(balk.strepen.at(-1).soort, 'eind');
    assert.equal(balk.strepen[1].soort, 'enkel');
    assert.equal(balk.maten.length, 3);
  }
});

test('zonder streep aan het eind loopt de laatste maat tot het eind van de balk', () => {
  const { raster, maten } = herken({ balken: 1, strepen: [1 / 2], koppen: false });
  assert.equal(maten[0].maten.length, 2);
  assert.ok(Math.abs(maten[0].maten[0].links - raster.balken[0].links) <= 1);
  assert.ok(Math.abs(maten[0].maten[1].rechts - raster.balken[0].rechts) <= 1);
});

test('dikke maatstrepen bij een grove scan (lijnafstand 25, lijndikte 4)', () => {
  const { maten } = herken({ balken: 2, lijnafstand: 25, lijndikte: 4, streepDikte: 4, koppen: false });
  for (const balk of maten) assert.deepEqual(balk.strepen.map((streep) => streep.soort), ['enkel', 'enkel', 'enkel', 'enkel']);
});

test('een rij overbindingen vlak boven de balk schuift de balk niet een lijn omhoog en verbergt geen maatstrepen', () => {
  const { verwacht, raster, maten } = herken({ balken: 3, bogen: true, koppen: false });
  raster.balken.forEach((balk, s) => {
    const midden = 600;
    assert.ok(Math.abs(balk.lijnen[0].a + balk.lijnen[0].b * midden - (verwacht.balken[s].lijnen[0].a + verwacht.balken[s].lijnen[0].b * midden)) <= 1.5, `balk ${s}`);
  });
  for (const balk of maten) assert.equal(balk.maten.length, 3);
});

test('een herhaalteken na sleutel en voortekening maakt geen nepmaat aan het begin', () => {
  const { verwacht, maten } = herken({ balken: 2, beginHerhaling: true, strepen: [1 / 3, 2 / 3, 1], koppen: false });
  maten.forEach((balk, s) => {
    assert.equal(balk.maten.length, 3, balk.maten.map((maat) => `${maat.links}-${maat.rechts}`).join(' '));
    assert.ok(balk.maten[0].links > verwacht.balken[s].herhaling, 'de eerste maat begint na het herhaalteken');
  });
});

test('een C-sleutel midden in de balk is geen maatstreep', () => {
  const { maten } = herken({ balken: 2, cSleutel: 0.5, koppen: false });
  for (const balk of maten) {
    assert.equal(balk.strepen.length, 4, balk.strepen.map((streep) => `${streep.links}:${streep.soort}`).join(' '));
    assert.equal(balk.maten.length, 3);
  }
});

test('een stok van de onderste lijn naar een waardestreep op de bovenste lijn is geen maatstreep', () => {
  const { maten } = herken({ balken: 2, stokOverBalk: 5, koppen: false });
  for (const balk of maten) assert.equal(balk.strepen.length, 4, balk.strepen.map((streep) => streep.links).join(','));
});

test('een dunne lijn boven de balk en noten op de onderste lijn schuiven een goede balk niet', () => {
  const { verwacht, raster, maten } = herken({ balken: 2, dunneLijnBoven: true, notenOpOnderlijn: true, koppen: false });
  raster.balken.forEach((balk, s) => {
    const y = (lijn) => lijn.a + lijn.b * 600;
    assert.ok(Math.abs(y(balk.lijnen[0]) - y(verwacht.balken[s].lijnen[0])) <= 1.5, `balk ${s}`);
  });
  for (const balk of maten) assert.equal(balk.maten.length, 3);
});
