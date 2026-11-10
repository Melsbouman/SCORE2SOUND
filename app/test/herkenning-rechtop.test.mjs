import test from 'node:test';
import assert from 'node:assert/strict';
import { zetRechtop } from '../src/herkenning/rechtop.mjs';
import { draai } from '../src/herkenning/bladen.mjs';
import { zwartWit } from '../src/herkenning/beeld.mjs';
import { meetSchaal } from '../src/herkenning/schaal.mjs';
import { vindBalken } from '../src/herkenning/raster.mjs';
import { maakBlad } from './hulp/blad.mjs';

const aantalBalken = (grijs) => {
  const zw = zwartWit(grijs);
  return vindBalken(zw, meetSchaal(zw)).balken.length;
};

// Twee bladen naast elkaar met 40 witte kolommen ertussen.
function naastElkaar(beeld) {
  const breedte = beeld.breedte * 2 + 40;
  const samen = { breedte, hoogte: beeld.hoogte, pixels: new Uint8Array(breedte * beeld.hoogte).fill(255) };
  for (let y = 0; y < beeld.hoogte; y += 1) {
    const rij = beeld.pixels.subarray(y * beeld.breedte, (y + 1) * beeld.breedte);
    samen.pixels.set(rij, y * breedte);
    samen.pixels.set(rij, y * breedte + beeld.breedte + 40);
  }
  return samen;
}

test('rechtop: een blad dat rechtop staat blijft zoals het is', () => {
  const { beeld } = maakBlad({ balken: 2 });
  const uit = zetRechtop(beeld);
  assert.equal(uit.length, 1);
  assert.equal(uit[0].herkomst.draai, 0);
  assert.equal(uit[0].herkomst.helft, null);
  assert.equal(uit[0].pixels, beeld.pixels);
});

test('rechtop: een kwartslag gedraaid blad komt rechtop met evenveel balken', () => {
  const { beeld } = maakBlad({ balken: 2 });
  const uit = zetRechtop(draai(beeld, 90));
  assert.equal(uit.length, 1);
  assert.ok([90, 270].includes(uit[0].herkomst.draai));
  assert.equal(aantalBalken(uit[0]), aantalBalken(beeld));
});

test('rechtop: een liggend tweeluik wordt in twee bladen geknipt', () => {
  const { beeld } = maakBlad({ balken: 2 });
  const uit = zetRechtop(draai(naastElkaar(beeld), 270));
  assert.equal(uit.length, 2);
  assert.deepEqual(uit.map((b) => b.herkomst.helft), ['links', 'rechts']);
  for (const blad of uit) assert.equal(aantalBalken(blad), aantalBalken(beeld));
});

test('rechtop: een leeg wit blad komt ongewijzigd terug', () => {
  const leeg = { breedte: 400, hoogte: 300, pixels: new Uint8Array(400 * 300).fill(255) };
  const uit = zetRechtop(leeg);
  assert.equal(uit.length, 1);
  assert.equal(uit[0].pixels, leeg.pixels);
  assert.equal(uit[0].herkomst.draai, 0);
});

test('rechtop: een rechtop blad met één balk wordt niet gedraaid, ook als het breder is dan hoog', () => {
  const { beeld } = maakBlad({ balken: 1, breedte: 1600, hoogte: 600, boven: 200 });
  const uit = zetRechtop(beeld);
  assert.equal(uit.length, 1);
  assert.equal(uit[0].herkomst.draai, 0);
  assert.equal(uit[0].pixels, beeld.pixels);
});
