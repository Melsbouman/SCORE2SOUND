import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { leesPng, vindKaders } from '../src/server/kaders.mjs';

// Een grijs PNG-plaatje (8 bit, zonder filter) uit een lijst rechthoeken: zwart is 0, wit is 255.
function maakPng(breedte, hoogte, tekenen) {
  const pixels = new Uint8Array(breedte * hoogte).fill(255);
  const vul = (x, y, w, h) => { for (let j = y; j < y + h; j += 1) for (let i = x; i < x + w; i += 1) pixels[j * breedte + i] = 0; };
  tekenen(vul);
  const rijen = Buffer.alloc(hoogte * (breedte + 1));
  for (let y = 0; y < hoogte; y += 1) Buffer.from(pixels.subarray(y * breedte, (y + 1) * breedte)).copy(rijen, y * (breedte + 1) + 1);
  const blok = (soort, inhoud) => {
    const kop = Buffer.alloc(8);
    kop.writeUInt32BE(inhoud.length, 0);
    kop.write(soort, 4, 'latin1');
    return Buffer.concat([kop, inhoud, Buffer.alloc(4)]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(breedte, 0);
  ihdr.writeUInt32BE(hoogte, 4);
  ihdr[8] = 8;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), blok('IHDR', ihdr), blok('IDAT', deflateSync(rijen)), blok('IEND', Buffer.alloc(0))]);
}

const kader = (vul, x, y, w = 52, h = 52) => {
  vul(x, y, w, 3);
  vul(x, y + h - 3, w, 3);
  vul(x, y, 3, h);
  vul(x + w - 3, y, 3, h);
};
const teken = (vul, x, y) => vul(x, y, 8, 22); // een "letter": een blokje in het kader

const png = maakPng(1000, 400, (vul) => {
  for (const y of [300, 318, 336, 354, 372]) vul(100, y, 880, 2); // notenbalk
  kader(vul, 500, 230); teken(vul, 522, 245); // eerste kader, hoort bij de maat die op x=500 begint
  kader(vul, 775, 230); teken(vul, 797, 245); // tweede kader
  kader(vul, 300, 100); // leeg kader: geen letter
  vul(600, 100, 52, 52); // een gevulde vlek: geen kader
});

test('een PNG wordt gelezen als zwart en wit', () => {
  const beeld = leesPng(png);
  assert.equal(beeld.breedte, 1000);
  assert.equal(beeld.hoogte, 400);
  assert.equal(beeld.zwart[300 * 1000 + 200], 1);
  assert.equal(beeld.zwart[10 * 1000 + 10], 0);
});

test('kaders met iets erin worden gevonden, lege kaders en vlekken niet', () => {
  const kaders = vindKaders(leesPng(png));
  assert.deepEqual(kaders.map(({ x, y, w, h }) => ({ x, y, w, h })).sort((a, b) => a.x - b.x), [
    { x: 500, y: 230, w: 52, h: 52 },
    { x: 775, y: 230, w: 52, h: 52 },
  ]);
});
