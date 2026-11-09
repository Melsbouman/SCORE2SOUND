import test from 'node:test';
import assert from 'node:assert/strict';
import { naarGrijs, otsuDrempel, zwartWit } from '../src/herkenning/beeld.mjs';
import { meetSchaal } from '../src/herkenning/schaal.mjs';
import { vindBalken } from '../src/herkenning/raster.mjs';
import { maakBlad } from './hulp/blad.mjs';

// Vergelijk gevonden balken met de verwachte: hetzelfde aantal, elke lijn op de goede hoogte (in het midden en aan de randen)
// en het begin en eind van de balk.
function controleer(gevonden, verwacht, { marge = 1.5, randMarge = 12 } = {}) {
  assert.equal(gevonden.balken.length, verwacht.balken.length, 'aantal balken');
  gevonden.balken.forEach((balk, s) => {
    const juist = verwacht.balken[s];
    for (const x of [juist.links + 20, (juist.links + juist.rechts) / 2, juist.rechts - 20]) {
      balk.lijnen.forEach((lijn, l) => {
        const y = lijn.a + lijn.b * x;
        const goed = juist.lijnen[l].a + juist.lijnen[l].b * x;
        assert.ok(Math.abs(y - goed) <= marge, `balk ${s}, lijn ${l}, x ${Math.round(x)}: ${y.toFixed(1)} in plaats van ${goed.toFixed(1)}`);
      });
    }
    assert.ok(Math.abs(balk.links - juist.links) <= randMarge, `balk ${s} links ${balk.links} in plaats van ${juist.links}`);
    assert.ok(Math.abs(balk.rechts - juist.rechts) <= randMarge, `balk ${s} rechts ${balk.rechts} in plaats van ${juist.rechts}`);
  });
}

test('grijs: zwart blijft zwart, wit blijft wit, doorzichtig is wit papier', () => {
  const rgba = new Uint8Array([0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 0, 0]);
  assert.deepEqual([...naarGrijs(rgba, 3, 1).pixels], [0, 255, 255]);
});

test('Otsu legt de drempel tussen inkt en papier', () => {
  const pixels = new Uint8Array([...Array(500).fill(30), ...Array(1500).fill(220)]);
  const drempel = otsuDrempel(pixels);
  assert.ok(drempel >= 30 && drempel < 220, `drempel ${drempel}`);
});

test('schaal: lijndikte 2 en lijnafstand 20 op een schoon blad', () => {
  const { beeld } = maakBlad();
  const schaal = meetSchaal(zwartWit(beeld));
  assert.ok(Math.abs(schaal.lijndikte - 2) < 0.5, `lijndikte ${schaal.lijndikte}`);
  assert.ok(Math.abs(schaal.lijnafstand - 20) < 1, `lijnafstand ${schaal.lijnafstand}`);
});

test('schaal: een andere maat (lijnafstand 14, lijndikte 1) wordt ook gemeten', () => {
  const { beeld } = maakBlad({ lijnafstand: 14, lijndikte: 1, afstandBalken: 150 });
  const schaal = meetSchaal(zwartWit(beeld));
  assert.ok(Math.abs(schaal.lijnafstand - 14) < 1, `lijnafstand ${schaal.lijnafstand}`);
});

test('schaal: een leeg blad of alleen tekst heeft geen notenbalken', () => {
  const leeg = { breedte: 300, hoogte: 300, pixels: new Uint8Array(300 * 300) };
  assert.equal(meetSchaal(leeg), null);
});

test('raster: vijf balken op een schoon blad, met nootkoppen, stokken en maatstrepen', () => {
  const { beeld, verwacht } = maakBlad();
  const zw = zwartWit(beeld);
  controleer(vindBalken(zw, meetSchaal(zw)), verwacht);
});

test('raster: een scheef blad (1 graad) geeft dezelfde balken en de helling', () => {
  const helling = Math.tan(Math.PI / 180);
  const { beeld, verwacht } = maakBlad({ helling });
  const zw = zwartWit(beeld);
  const gevonden = vindBalken(zw, meetSchaal(zw));
  controleer(gevonden, verwacht);
  assert.ok(Math.abs(gevonden.helling - helling) < 0.002, `helling ${gevonden.helling}`);
});

test('raster: ruis (2% van de pixels omgedraaid) verandert niets aan de balken', () => {
  const { beeld, verwacht } = maakBlad({ ruis: 0.02, zaad: 7 });
  const zw = zwartWit(beeld);
  controleer(vindBalken(zw, meetSchaal(zw)), verwacht, { marge: 2 });
});

test('raster: ongelijke belichting met Sauvola', () => {
  const { beeld, verwacht } = maakBlad({ achtergrond: 235, inkt: 40, verloop: 0.8, zaad: 3 });
  const zw = zwartWit(beeld, { methode: 'sauvola' });
  controleer(vindBalken(zw, meetSchaal(zw)), verwacht, { marge: 2 });
});

test('raster: balken die niet over de hele breedte lopen (ingesprongen eerste balk)', () => {
  const { beeld, verwacht } = maakBlad({ balken: 1, links: 300, rechts: 1100 });
  const zw = zwartWit(beeld);
  controleer(vindBalken(zw, meetSchaal(zw)), verwacht);
});

test('raster: een balk die halverwege een strook ophoudt krijgt toch het goede eind (ook met dikke lijnen)', () => {
  for (const [rechts, lijndikte] of [[1110, 2], [1120, 2], [1130, 2], [1100, 3], [1125, 4], [1090, 6]]) {
    const { beeld, verwacht } = maakBlad({ balken: 2, rechts, lijndikte, lijnafstand: lijndikte >= 4 ? 25 : 20, koppen: false });
    const zw = zwartWit(beeld);
    controleer(vindBalken(zw, meetSchaal(zw)), verwacht, { marge: 2, randMarge: 4 });
  }
  for (const links of [70, 80, 90]) {
    const { beeld, verwacht } = maakBlad({ balken: 2, links, koppen: false });
    const zw = zwartWit(beeld);
    controleer(vindBalken(zw, meetSchaal(zw)), verwacht, { marge: 2, randMarge: 4 });
  }
});

test('raster: noten op hulplijnen boven de balk schuiven de balk niet een lijn omhoog', () => {
  for (const hulplijnNoten of [8, 14]) {
    const { beeld, verwacht } = maakBlad({ balken: 3, hulplijnNoten, koppen: false });
    const zw = zwartWit(beeld);
    controleer(vindBalken(zw, meetSchaal(zw)), verwacht, { marge: 2 });
  }
});

test('raster: een dunne lijn vlak onder de bovenste lijn neemt de plek van een lijn niet in', () => {
  const { beeld, verwacht } = maakBlad({ balken: 2, extraLijn: { dy: 16 }, koppen: false });
  const zw = zwartWit(beeld);
  controleer(vindBalken(zw, meetSchaal(zw)), verwacht, { marge: 1.5 });
});

test('raster: zonder schaal (een leeg blad) geen balken en geen fout', () => {
  assert.deepEqual(vindBalken({ breedte: 10, hoogte: 10, pixels: new Uint8Array(100) }, null), { helling: 0, balken: [] });
});
