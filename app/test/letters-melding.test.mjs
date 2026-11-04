import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { voegLettersToe } from '../src/server/letters.mjs';

function maakPng(kaderXs) {
  const breedte = 1000;
  const hoogte = 400;
  const pixels = new Uint8Array(breedte * hoogte).fill(255);
  const vul = (x, y, w, h) => {
    for (let j = y; j < y + h; j += 1) {
      for (let i = x; i < x + w; i += 1) pixels[j * breedte + i] = 0;
    }
  };
  for (const y of [300, 318, 336, 354, 372]) vul(100, y, 880, 2);
  for (const x of kaderXs) {
    vul(x, 230, 52, 3);
    vul(x, 279, 52, 3);
    vul(x, 230, 3, 52);
    vul(x + 49, 230, 3, 52);
    vul(x + 22, 245, 8, 22);
  }
  const rijen = Buffer.alloc(hoogte * (breedte + 1));
  for (let y = 0; y < hoogte; y += 1) {
    Buffer.from(pixels.subarray(y * breedte, (y + 1) * breedte)).copy(rijen, y * (breedte + 1) + 1);
  }
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
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    blok('IHDR', ihdr),
    blok('IDAT', deflateSync(rijen)),
    blok('IEND', Buffer.alloc(0)),
  ]);
}

function maakBlad(xs) {
  const stacks = [
    '<stack id="0" left="100" right="500"/>',
    '<stack id="1" left="500" right="800"/>',
    '<stack id="2" left="800" right="980"/>',
  ].join('');
  const woorden = xs.map((x) => `<word value="[Z]"><bounds x="${x + 5}" y="240" w="40" h="30"/></word>`).join('');
  return {
    xml: `<sheet><page><system id="1">${stacks}<part id="1"><staff id="1"><lines><line><point x="100" y="300"/></line></lines></staff></part></system>${woorden}</page></sheet>`,
    png: maakPng(xs),
  };
}

function meldingenVoor(xs) {
  const partituur = { partijen: [{ id: 'P1', maten: [0, 1, 2].map((index) => ({ index, elementen: [] })) }] };
  return voegLettersToe(partituur, [{ nummer: 1, ...maakBlad(xs) }]).meldingen;
}

test('één onzekere letter krijgt de bestaande melding', () => {
  assert.deepEqual(meldingenVoor([500]), [
    'Op pagina 1 is de letter A aangenomen: de app kon hem niet lezen.',
  ]);
});

test('drie onzekere letters krijgen samen één melding', () => {
  assert.deepEqual(meldingenVoor([150, 500, 775]), [
    'Op pagina 1 zijn de letters A, B, C aangenomen: de app kon ze niet lezen.',
  ]);
});
