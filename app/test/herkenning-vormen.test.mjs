import test from 'node:test';
import assert from 'node:assert/strict';
import { verwijderLijnen, vindVormen } from '../src/herkenning/vormen.mjs';

// Een klein zwart-witbeeld (1 = zwart): vijf notenbalklijnen van 2 pixels dik, een nootkop die twee lijnen raakt,
// een stok dwars door alle lijnen en een los blokje onder de balk.
const breedte = 200;
const hoogte = 120;
function maakBeeld() {
  const pixels = new Uint8Array(breedte * hoogte);
  const zet = (x, y) => { pixels[y * breedte + x] = 1; };
  for (const y of [30, 40, 50, 60, 70]) for (let x = 10; x <= 190; x += 1) { zet(x, y); zet(x, y + 1); }
  for (let y = 0; y < hoogte; y += 1) for (let x = 0; x < breedte; x += 1) if ((x - 60) ** 2 + (y - 45) ** 2 <= 25) zet(x, y);
  for (let y = 20; y <= 80; y += 1) { zet(100, y); zet(101, y); }
  for (let y = 90; y <= 94; y += 1) for (let x = 150; x <= 154; x += 1) zet(x, y);
  return { breedte, hoogte, pixels };
}
const raster = {
  helling: 0,
  balken: [{
    lijnen: [30, 40, 50, 60, 70].map((y) => ({ a: y + 0.5, b: 0, links: 10, rechts: 190 })),
    links: 10, rechts: 190, lijnafstand: 10,
  }],
};
const schaal = { lijndikte: 2, lijndikteMax: 2, lijnafstand: 10, balkdikte: null };
const op = (beeld, x, y) => beeld.pixels[y * beeld.breedte + x];

test('lijnen weghalen: kale lijnstukken verdwijnen, wat een lijn kruist blijft staan', () => {
  const beeld = maakBeeld();
  const schoon = verwijderLijnen(beeld, raster, schaal);
  assert.equal(op(schoon, 30, 30), 0);
  assert.equal(op(schoon, 30, 31), 0);
  assert.equal(op(schoon, 180, 70), 0);
  assert.equal(op(schoon, 60, 45), 1, 'midden van de nootkop');
  assert.equal(op(schoon, 60, 40), 1, 'de lijn door de nootkop hoort bij de kop');
  assert.equal(op(schoon, 100, 30), 1, 'de stok blijft heel');
  assert.equal(op(schoon, 101, 60), 1);
  assert.equal(op(schoon, 152, 92), 1, 'het blokje blijft');
  assert.equal(op(beeld, 30, 30), 1, 'het oorspronkelijke beeld blijft gelijk');
});

test('vormen: drie losse vormen met hun kader, van links naar rechts', () => {
  const { labels, vormen } = vindVormen(verwijderLijnen(maakBeeld(), raster, schaal));
  assert.equal(vormen.length, 3);
  const [kop, stok, blok] = vormen;
  assert.deepEqual([kop.links, kop.rechts], [55, 65]);
  assert.ok(kop.boven >= 40 && kop.boven <= 41 && kop.onder >= 49 && kop.onder <= 51, `kop ${kop.boven}..${kop.onder}`);
  assert.deepEqual([stok.links, stok.rechts, stok.boven, stok.onder], [100, 101, 20, 80]);
  assert.deepEqual([blok.links, blok.rechts, blok.boven, blok.onder, blok.pixels], [150, 154, 90, 94, 25]);
  assert.equal(labels[45 * breedte + 60], kop.id);
  assert.equal(labels[92 * breedte + 152], blok.id);
  assert.equal(labels[5 * breedte + 5], 0, 'wit heeft label 0');
  assert.deepEqual(vormen.map((vorm) => vorm.id), [1, 2, 3]);
});

test('vormen: schuin aangrenzende pixels horen bij dezelfde vorm (8 buren)', () => {
  const pixels = new Uint8Array(25);
  for (const [x, y] of [[0, 0], [1, 1], [2, 2], [4, 4]]) pixels[y * 5 + x] = 1;
  const { vormen } = vindVormen({ breedte: 5, hoogte: 5, pixels });
  assert.deepEqual(vormen.map((vorm) => vorm.pixels), [3, 1]);
});

test('vormen: minPixels laat kleine vormen (ruis) weg', () => {
  const { vormen } = vindVormen(verwijderLijnen(maakBeeld(), raster, schaal), { minPixels: 30 });
  assert.equal(vormen.length, 2);
  assert.ok(vormen.every((vorm) => vorm.pixels >= 30));
});

test('vormen: een groot beeld met veel vormen gaat snel en zonder stack overflow', () => {
  const groot = { breedte: 3000, hoogte: 3000, pixels: new Uint8Array(9e6) };
  for (let y = 0; y < 3000; y += 1) groot.pixels[y * 3000 + 1500] = 1;
  for (let y = 0; y < 3000; y += 4) for (let x = 0; x < 1400; x += 4) groot.pixels[y * 3000 + x] = 1;
  const begin = Date.now();
  const { vormen } = vindVormen(groot);
  assert.equal(vormen.length, 750 * 350 + 1);
  assert.ok(Date.now() - begin < 5000, `${Date.now() - begin} ms`);
});

test('lijnen weghalen: een lijn waarvan het begin te laat gevolgd is, verdwijnt toch tot het begin van de balk', () => {
  const beeld = maakBeeld();
  // Het begin van de bovenste lijn is verkeerd gevolgd (een sleutel kruist hem): links op 120 in plaats van 10.
  const scheef = { ...raster, balken: [{ ...raster.balken[0], lijnen: raster.balken[0].lijnen.map((lijn, i) => (i === 0 ? { ...lijn, links: 120 } : lijn)) }] };
  const schoon = verwijderLijnen(beeld, scheef, schaal);
  assert.equal(op(schoon, 30, 30), 0, 'het begin van de bovenste lijn is ook weg');
  assert.equal(op(schoon, 12, 31), 0);
});
