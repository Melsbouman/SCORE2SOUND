import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { lettersVoorBlad, systemenVan, voegLettersToe } from '../src/server/letters.mjs';

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

const blad = (woorden = '') => `<sheet><page>
  <system id="1">
    <stack id="0" left="100" right="500"/>
    <stack id="1" left="500" right="800"/>
    <stack id="2" left="800" right="980"/>
    <part id="1"><staff id="1" left="100" right="980"><lines><line><point x="100" y="300"/><point x="980" y="300"/></line></lines></staff></part>
  </system>${woorden}
</page></sheet>`;

test('systemen geven de bovenste notenlijn en de maten', () => {
  assert.deepEqual(systemenVan(blad()), [{ boven: 300, stacks: [{ links: 100, rechts: 500 }, { links: 500, rechts: 800 }, { links: 800, rechts: 980 }] }]);
});

test('een letter in het kader wordt gelezen en de volgende letter volgt het alfabet', () => {
  const woord = '<word value="[B]"><bounds x="505" y="240" w="40" h="30"/></word>';
  const letters = lettersVoorBlad({ xml: blad(woord), png }, { volgende: 'B' });
  assert.deepEqual(letters, [
    { systeem: 0, stack: 1, waarde: 'B', zekerheid: 0.9 },
    { systeem: 0, stack: 2, waarde: 'C', zekerheid: 0.5 },
  ]);
});

test('een kader dat als IB wordt gelezen krijgt de volgende letter', () => {
  const woord = '<word value="IB"><bounds x="505" y="240" w="40" h="30"/></word>';
  assert.deepEqual(lettersVoorBlad({ xml: blad(woord), png }, { volgende: 'B' }).map((l) => l.waarde), ['B', 'C']);
});

test('een breed kader accepteert alleen een getal van één tot vier cijfers', () => {
  const breedPng = maakPng(1000, 400, (vul) => {
    for (const y of [300, 318, 336, 354, 372]) vul(100, y, 880, 2);
    kader(vul, 500, 230, 72); vul(522, 245, 4, 22); vul(534, 245, 4, 22); vul(546, 245, 4, 22);
    kader(vul, 775, 230, 72); vul(797, 245, 4, 22); vul(809, 245, 4, 22);
  });
  const woorden = '<word value="104"><bounds x="505" y="240" w="55" h="30"/></word>'
    + '<word value="AB"><bounds x="780" y="240" w="55" h="30"/></word>';
  assert.deepEqual(lettersVoorBlad({ xml: blad(woorden), png: breedPng }), [
    { systeem: 0, stack: 1, waarde: '104', zekerheid: 0.9 },
  ]);
});

test('zonder gelezen woorden begint het alfabet bij A', () => {
  assert.deepEqual(lettersVoorBlad({ xml: blad(), png }).map((l) => l.waarde), ['A', 'B']);
});

test('de volgorde loopt door over bladen heen', () => {
  const status = { volgende: 'A' };
  lettersVoorBlad({ xml: blad(), png }, status);
  assert.deepEqual(lettersVoorBlad({ xml: blad(), png }, status).map((l) => l.waarde), ['C', 'D']);
});

test('een kader onder de notenbalk telt niet', () => {
  const ver = maakPng(1000, 700, (vul) => { kader(vul, 500, 500); teken(vul, 522, 515); });
  assert.deepEqual(lettersVoorBlad({ xml: blad(), png: ver }), []);
});

test('de letters komen als aanwijzing aan het begin van de maat, in elke partij', () => {
  const maten = () => [0, 1, 2].map((index) => ({ index, elementen: [{ soort: 'noot', start: 0 }] }));
  const partituur = { partijen: [{ id: 'P1', maten: maten() }, { id: 'P2', maten: maten() }] };
  const { partituur: uit, meldingen } = voegLettersToe(partituur, [{ nummer: 2, xml: blad(), png }]);
  for (const partij of uit.partijen) {
    assert.equal(partij.maten[0].elementen.length, 1);
    assert.deepEqual(partij.maten[1].elementen[0], { soort: 'aanwijzing', start: 0, type: 'letter', waarde: 'A', zekerheid: 0.5 });
    assert.equal(partij.maten[2].elementen[0].waarde, 'B');
    assert.equal(partij.maten[1].elementen[1].soort, 'noot');
  }
  assert.equal(partituur.partijen[0].maten[1].elementen.length, 1, 'het origineel blijft ongemoeid');
  assert.equal(meldingen.length, 2);
  assert.match(meldingen[0], /pagina 2.*letter A.*aangenomen/);
});

test('kaders vervangen de Audiveris-letters op het blad in elke partij', () => {
  const maten = () => [
    { index: 0, elementen: [{ soort: 'aanwijzing', start: 0, type: 'letter', waarde: 'I B' }] },
    { index: 1, elementen: [{ soort: 'aanwijzing', start: 0, type: 'letter', waarde: 'E' }] },
    { index: 2, elementen: [] },
  ];
  const partituur = { partijen: [{ id: 'P1', maten: maten() }, { id: 'P2', maten: maten() }] };
  const { partituur: uit } = voegLettersToe(partituur, [{ nummer: 1, xml: blad(), png }]);
  for (const partij of uit.partijen) {
    assert.deepEqual(partij.maten.map((maat) => maat.elementen.filter((element) => element.type === 'letter').map((element) => element.waarde)), [
      [],
      ['A'],
      ['B'],
    ]);
  }
});

test('een blad zonder kaders behoudt de Audiveris-letters', () => {
  const zonderKaders = maakPng(1000, 400, (vul) => {
    for (const y of [300, 318, 336, 354, 372]) vul(100, y, 880, 2);
  });
  const partituur = { partijen: [{ id: 'P1', maten: [
    { index: 0, elementen: [{ soort: 'aanwijzing', start: 0, type: 'letter', waarde: 'E' }] },
    { index: 1, elementen: [] },
    { index: 2, elementen: [] },
  ] }] };
  const { partituur: uit } = voegLettersToe(partituur, [{ nummer: 1, xml: blad(), png: zonderKaders }]);
  assert.equal(uit.partijen[0].maten[0].elementen[0].waarde, 'E');
});

test('maten van eerdere bladen schuiven de letters op', () => {
  const partituur = { partijen: [{ id: 'P1', maten: Array.from({ length: 6 }, (_, index) => ({ index, elementen: [] })) }] };
  const { partituur: uit } = voegLettersToe(partituur, [{ nummer: 1, xml: blad(), png: null }, { nummer: 2, xml: blad(), png }]);
  assert.deepEqual(uit.partijen[0].maten.map((m) => m.elementen[0]?.waarde ?? null), [null, null, null, null, 'A', 'B']);
});

test('een blad zonder afbeelding of met een kapotte afbeelding geeft een melding en geen fout', () => {
  const partituur = { partijen: [{ id: 'P1', maten: [{ index: 0, elementen: [] }] }] };
  const { partituur: uit, meldingen } = voegLettersToe(partituur, [{ nummer: 3, xml: blad(), png: Buffer.from('geen png') }]);
  assert.equal(uit.partijen[0].maten[0].elementen.length, 0);
  assert.match(meldingen[0], /pagina 3/);
});
