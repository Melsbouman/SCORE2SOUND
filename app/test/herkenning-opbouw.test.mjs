import test from 'node:test';
import assert from 'node:assert/strict';
import { bouwPartituur, nootOpStap, alterUitVoortekening } from '../src/herkenning/opbouw.mjs';

const ia = 20;
// Een balk van vijf vlakke lijnen met de bovenste lijn op y0; stap 0 is de bovenste lijn.
const balk = (y0) => ({ lijnen: [0, 1, 2, 3, 4].map((i) => ({ a: y0 + i * ia, b: 0, links: 100, rechts: 1100 })), links: 100, rechts: 1100 });
const y = (y0, stap) => y0 + (stap * ia) / 2;
const vak = (links, rechts, y0) => ({ links, rechts, boven: y0, onder: y0 + 4 * ia });
const kop = (x, y0, stap, duur = 480, soort = 'zwart') => ({ x, y: y(y0, stap), stap, soort, duur });
const rust = (x, soort) => ({ x, soort, links: x - 8, rechts: x + 8 });

// Bladzijde 1: een balk met vioolsleutel, één mol en 3/4, en een balk met bassleutel zonder voortekening.
// Bladzijde 2: een balk met altsleutel.
function paginas() {
  const een = {
    blad: 1, breedte: 1200, hoogte: 1500, schaal: { lijnafstand: ia },
    raster: { balken: [balk(200), balk(450)] },
    balkkoppen: [
      { sleutel: { soort: 'G', lijn: 2 }, voortekening: { aantal: -1, tekens: [] }, maatsoort: { teller: 3, noemer: 4 }, einde: 180 },
      { sleutel: { soort: 'F', lijn: 4 }, voortekening: { aantal: 0, tekens: [] }, maatsoort: null, einde: 170 },
    ],
    maten: [
      { strepen: [{ links: 499, rechts: 501, soort: 'enkel' }, { links: 1098, rechts: 1100, soort: 'dubbel' }], maten: [vak(100, 500, 200), vak(500, 1100, 200)] },
      { strepen: [], maten: [vak(100, 400, 450), vak(400, 700, 450), vak(700, 1100, 450)] },
    ],
    noten: [
      // Maat 1: b (mol uit de voortekening), b met herstel, b (het herstel geldt nog). Maat 2: akkoord e-g (halve), dan een rust.
      [kop(200, 200, 4), kop(300, 200, 4), kop(400, 200, 4), kop(450, 200, -3), kop(600, 200, 8, 960, 'half'), kop(601, 200, 6, 960, 'half'), kop(900, 200, 4)],
      // Maat 3: f (stap 2 in de bassleutel) en g (stap 8).
      [kop(200, 450, 2), kop(300, 450, 8, 960, 'half')],
    ],
    voortekens: [[{ kop: 1, soort: 'herstel', haakjes: false }], []],
    rusten: [[rust(800, 'kwart')], [rust(550, 'heel'), { x: 900, soort: 'meermaats', links: 750, rechts: 1050 }]],
    aantallen: [[], [{ x: 900, links: 750, rechts: 1050, aantal: 3 }]],
  };
  const twee = {
    blad: 2, breedte: 1200, hoogte: 1500, schaal: { lijnafstand: ia },
    raster: { balken: [balk(300)] },
    balkkoppen: [{ sleutel: { soort: 'C', lijn: 3 }, voortekening: { aantal: 2, tekens: [] }, maatsoort: { teller: 4, noemer: 4, symbool: 'C' }, einde: 180 }],
    maten: [{ strepen: [{ links: 1092, rechts: 1100, soort: 'eind' }], maten: [vak(100, 1100, 300)] }],
    noten: [[kop(300, 300, 4, 480), kop(400, 300, 0, 480), kop(500, 300, 3, 960, 'half')]],
    voortekens: [[]],
    rusten: [[]],
  };
  return [een, twee];
}

test('opbouw: noot op een stap bij G-, F- en C-sleutel, en de voortekening', () => {
  assert.deepEqual(nootOpStap(0), { stap: 'F', octaaf: 5 });
  assert.deepEqual(nootOpStap(6), { stap: 'G', octaaf: 4 });
  assert.deepEqual(nootOpStap(10), { stap: 'C', octaaf: 4 });
  assert.deepEqual(nootOpStap(-2, { teken: 'G', lijn: 2 }), { stap: 'A', octaaf: 5 });
  assert.deepEqual(nootOpStap(2, { teken: 'F', lijn: 4 }), { stap: 'F', octaaf: 3 });
  assert.deepEqual(nootOpStap(0, { teken: 'F', lijn: 4 }), { stap: 'A', octaaf: 3 });
  assert.deepEqual(nootOpStap(4, { teken: 'C', lijn: 3 }), { stap: 'C', octaaf: 4 });
  assert.deepEqual(nootOpStap(2, { teken: 'C', lijn: 4 }), { stap: 'C', octaaf: 4 });
  assert.equal(alterUitVoortekening('B', -1), -1);
  assert.equal(alterUitVoortekening('E', -1), 0);
  assert.equal(alterUitVoortekening('C', 2), 1);
  assert.equal(alterUitVoortekening('G', 2), 0);
});

test('opbouw: maten met nummer, vak, regel- en paginabegin, en een meermaatsrust van drie maten', () => {
  const partituur = bouwPartituur(paginas(), { titel: 'Proef' });
  assert.equal(partituur.titel, 'Proef');
  assert.equal(partituur.partijen.length, 1);
  const { maten } = partituur.partijen[0];
  assert.equal(maten.length, 8);
  assert.deepEqual(maten.map((m) => m.nummer), ['1', '2', '3', '4', '5', '6', '7', '8']);
  assert.deepEqual(maten.map((m) => m.index), [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(maten.map((m) => m.regelbegin), [true, false, true, false, false, false, false, true]);
  assert.deepEqual(maten.map((m) => m.paginabegin), [true, false, false, false, false, false, false, true]);
  assert.deepEqual(maten[0].vak, { blad: 1, links: 100, rechts: 500, boven: 200, onder: 280 });
  assert.equal(maten[7].vak.blad, 2);
  assert.equal(maten[1].maatstreep, 'dubbel');
  assert.equal(maten[0].maatstreep, undefined);
  // De meermaatsrust: maat 5 met maatrust 3, maten 6 en 7 verborgen, elk met een rust van een hele maat (3/4).
  assert.equal(maten[4].maatrust, 3);
  assert.equal(maten[5].verborgen, true);
  assert.equal(maten[6].verborgen, true);
  for (const m of [4, 5, 6]) assert.deepEqual(maten[m].elementen.map((e) => [e.soort, e.duur, e.heleMaat]), [['rust', 1440, true]]);
  assert.equal(maten[7].maatstreep, 'eind');
  assert.equal(partituur.bron, undefined, 'de keten in de browser zet de bron zelf');
  // Verborgen maten hebben geen eigen plek op het blad.
  assert.ok(maten[4].vak && !maten[5].vak && !maten[6].vak);
});

test('opbouw: sleutel, toonsoort en maatsoort in elke maat, ook als ze niet veranderen', () => {
  const { maten } = bouwPartituur(paginas()).partijen[0];
  assert.deepEqual(maten.map((m) => m.sleutels[0].teken), ['G', 'G', 'F', 'F', 'F', 'F', 'F', 'C']);
  assert.deepEqual(maten.map((m) => m.toonsoort.kwinten), [-1, -1, 0, 0, 0, 0, 0, 2]);
  assert.ok(maten.slice(0, 7).every((m) => m.maatsoort.teller === 3 && m.maatsoort.noemer === 4 && !m.maatsoort.symbool));
  assert.deepEqual(maten[7].maatsoort, { teller: 4, noemer: 4, symbool: 'common' });
  assert.deepEqual(maten[7].sleutels[0], { teken: 'C', lijn: 3, notenbalk: 1, octaafVerschuiving: 0 });
});

test('opbouw: toonhoogte met voortekening en voortekens die tot het eind van de maat gelden', () => {
  const { maten } = bouwPartituur(paginas()).partijen[0];
  const hoogtes = (m) => maten[m].elementen.filter((e) => e.soort === 'noot').map((e) => `${e.toonhoogte.stap}${e.toonhoogte.alter}${e.toonhoogte.octaaf}`);
  // Het herstel geldt voor b4 tot het eind van de maat, niet voor b5 en niet in de volgende maat.
  assert.deepEqual(hoogtes(0), ['B-14', 'B04', 'B04', 'B-15']);
  assert.deepEqual(hoogtes(1), ['E04', 'G04', 'B-14']);
  assert.deepEqual(hoogtes(2), ['F03', 'G02']);
  // Altsleutel met twee kruisen (fis en cis): c4 op de middelste lijn wordt cis, g4 en d4 niet.
  assert.deepEqual(hoogtes(7), ['C14', 'G04', 'D04']);
});

test('opbouw: starts op volgorde, akkoorden samen, rusten en een hele rust die de maat vult', () => {
  const { maten } = bouwPartituur(paginas()).partijen[0];
  const kort = (m) => maten[m].elementen.map((e) => [e.soort, e.start, e.duur, e.akkoord ?? null, e.heleMaat ?? null]);
  assert.deepEqual(kort(0), [['noot', 0, 480, false, null], ['noot', 480, 480, false, null], ['noot', 960, 480, false, null], ['noot', 1440, 480, false, null]]);
  assert.deepEqual(kort(1), [['noot', 0, 960, false, null], ['noot', 0, 960, true, null], ['rust', 960, 480, null, null], ['noot', 1440, 480, false, null]]);
  // Een rust krijgt een plek op de hoogte van het midden van de balk.
  const rust = maten[1].elementen.find((e) => e.soort === 'rust');
  assert.equal(rust.plek.y + rust.plek.hoogte / 2, 240);
  assert.deepEqual(kort(3), [['rust', 0, 1440, null, true]]);
  const noot = maten[0].elementen[0];
  assert.equal(noot.stem, 1);
  assert.equal(noot.notenbalk, 1);
  assert.equal(noot.plek.blad, 1);
  assert.ok(noot.zekerheid > 0 && noot.zekerheid <= 1);
});

test('opbouw: zonder balkkop geldt de vioolsleutel en 4/4; een lege maat heeft geen elementen', () => {
  const pagina = {
    blad: 1, schaal: { lijnafstand: ia }, raster: { balken: [balk(200)] }, balkkoppen: [null],
    maten: [{ strepen: [], maten: [vak(100, 1100, 200)] }], noten: [[]], voortekens: [[]], rusten: [[]],
  };
  const [maat] = bouwPartituur([pagina]).partijen[0].maten;
  assert.deepEqual(maat.sleutels[0].teken, 'G');
  assert.deepEqual(maat.maatsoort, { teller: 4, noemer: 4 });
  assert.deepEqual(maat.elementen, []);
});

test('opbouw: waardestrepen, een akkoord met een secunde, en een meermaatsrust zonder getal', () => {
  const noot = (x, stap, stokX, balk) => ({ x, y: y(200, stap), stap, soort: 'zwart', duur: 240, stok: { richting: 'op', x: stokX, eind: 150 }, ...(balk ? { balk } : {}) });
  const pagina = {
    blad: 1, schaal: { lijnafstand: ia }, raster: { balken: [balk(200), balk(450)] },
    balkkoppen: [{ sleutel: { soort: 'G', lijn: 2 }, voortekening: { aantal: 0, tekens: [] }, maatsoort: { teller: 2, noemer: 4 }, einde: 180 }, null],
    maten: [{ strepen: [], maten: [vak(100, 600, 200)] }, { strepen: [], maten: [vak(100, 600, 450), vak(600, 1100, 450)] }],
    noten: [[
      // Twee achtsten onder één streep (de streep loopt van stok 220 tot stok 270), dan een akkoord f-g (secunde: de g staat
      // een kopbreedte naast de f, aan dezelfde stok), dan een losse achtste met vlag.
      noot(210, 4, 220, { links: 220, rechts: 270 }), noot(260, 4, 270, { links: 220, rechts: 270 }),
      noot(350, 7, 362), noot(373, 6, 362),
      noot(450, 4, 460),
    ], []],
    voortekens: [[], []],
    rusten: [[], [{ x: 350, soort: 'meermaats', links: 200, rechts: 500 }, { x: 850, soort: 'meermaats', links: 700, rechts: 1000 }]],
    aantallen: [[], []],
  };
  const { maten } = bouwPartituur([pagina]).partijen[0];
  const noten = maten[0].elementen;
  assert.deepEqual(noten.map((e) => e.balk ?? null), ['begin', 'eind', null, null, null]);
  assert.deepEqual(noten.map((e) => [e.start, e.akkoord]), [[0, false], [240, false], [480, false], [480, true], [720, false]]);
  // Twee meermaatsrusten zonder getal: elk één maat, rood (zekerheid 0,3).
  assert.equal(maten.length, 3);
  assert.deepEqual(maten.slice(1).map((m) => [m.maatrust, m.elementen[0].zekerheid]), [[1, 0.3], [1, 0.3]]);
});

test('opbouw: paginabegin op de eerste maat van een blad, ook als de eerste balk geen maten heeft', () => {
  const pagina = {
    blad: 1, schaal: { lijnafstand: ia }, raster: { balken: [balk(200), balk(450)] }, balkkoppen: [null, null],
    maten: [{ strepen: [], maten: [] }, { strepen: [], maten: [vak(100, 600, 450), vak(600, 1100, 450)] }],
    noten: [[], []], voortekens: [[], []], rusten: [[], []],
  };
  const { maten } = bouwPartituur([pagina]).partijen[0];
  assert.deepEqual(maten.map((m) => [m.paginabegin, m.regelbegin]), [[true, true], [false, false]]);
});

test('opbouw: herhaaltekens bij de maatstrepen worden herhaling.begin en herhaling.eind', () => {
  const pagina = {
    blad: 1, schaal: { lijnafstand: ia }, raster: { balken: [balk(200)] }, balkkoppen: [null],
    maten: [{
      strepen: [
        { links: 300, rechts: 318, soort: 'begin', herhaling: 'begin' },
        { links: 599, rechts: 601, soort: 'enkel' },
        { links: 890, rechts: 908, soort: 'eind', herhaling: 'eind' },
        { links: 1090, rechts: 1100, soort: 'eind' },
      ],
      maten: [vak(100, 309, 200), vak(318, 600, 200), vak(600, 899, 200), vak(899, 1100, 200)],
    }],
    noten: [[]], voortekens: [[]], rusten: [[]],
  };
  const { maten } = bouwPartituur([pagina]).partijen[0];
  assert.deepEqual(maten.map((m) => [m.herhaling.begin, m.herhaling.eind]), [[false, false], [true, false], [false, true], [false, false]]);
  // Bij een herhaling eind volgt de streep uit het herhaalteken; de eindstreep aan het eind blijft.
  assert.deepEqual(maten.map((m) => m.maatstreep ?? null), [null, null, null, 'eind']);
});

test('opbouw: een herhaling rond een meermaatsrust staat alleen op de eerste en de laatste maat', () => {
  const pagina = {
    blad: 1, schaal: { lijnafstand: ia }, raster: { balken: [balk(200)] }, balkkoppen: [null],
    maten: [{
      strepen: [{ links: 300, rechts: 318, soort: 'begin', herhaling: 'begin' }, { links: 890, rechts: 908, soort: 'eind', herhaling: 'eind' }],
      maten: [vak(100, 309, 200), vak(318, 899, 200), vak(899, 1100, 200)],
    }],
    noten: [[]], voortekens: [[]], rusten: [[{ x: 600, soort: 'meermaats', links: 400, rechts: 800 }]],
    aantallen: [[{ x: 600, aantal: 3 }]],
  };
  const { maten } = bouwPartituur([pagina]).partijen[0];
  assert.deepEqual(maten.map((m) => [m.herhaling.begin, m.herhaling.eind, m.verborgen ?? false]), [
    [false, false, false], [true, false, false], [false, false, true], [false, true, true], [false, false, false],
  ]);
});

test('opbouw: een groepje met een cijfer wordt een triool (3 in de tijd van 2)', () => {
  const noot = (x, stap) => ({ x, y: y(200, stap), stap, soort: 'zwart', duur: 240 });
  const pagina = {
    blad: 1, schaal: { lijnafstand: ia }, raster: { balken: [balk(200)] },
    balkkoppen: [{ sleutel: { soort: 'G', lijn: 2 }, voortekening: { aantal: 0, tekens: [] }, maatsoort: { teller: 2, noemer: 4 }, einde: 180 }],
    maten: [{ strepen: [], maten: [vak(100, 1100, 200)] }],
    noten: [[noot(200, 4), noot(260, 5), noot(320, 6), noot(400, 4), noot(460, 4), { x: 600, y: y(200, 4), stap: 4, soort: 'zwart', duur: 480 }]],
    voortekens: [[]], rusten: [[]],
    triolen: [[{ koppen: [0, 1, 2], aantal: 3, x: 260 }, { koppen: [3, 4], aantal: 9, x: 430 }]],
  };
  const [maat] = bouwPartituur([pagina]).partijen[0].maten;
  assert.deepEqual(maat.elementen.map((e) => [e.start, e.duur]), [[0, 160], [160, 160], [320, 160], [480, 240], [720, 240], [960, 480]]);
  assert.deepEqual(maat.elementen.slice(0, 3).map((e) => e.tuplet), [
    { aantal: 3, normaal: 2, begin: true, eind: false }, { aantal: 3, normaal: 2, begin: false, eind: false }, { aantal: 3, normaal: 2, begin: false, eind: true },
  ]);
  // Een onbekend cijfer (9) verandert niets.
  assert.equal(maat.elementen[3].tuplet, undefined);
});

// Secundes in een akkoord: twee koppen een stap uit elkaar staan naast elkaar. Maat 1: twee hele noten (g en a, zonder stok).
// Maat 2: een achtste g met stok omhoog en de a rechts tegen die stok (duren.mjs vond voor de a geen stok), dan een achtste rust
// en een kwart. Maat 3: stok omlaag, de g links tegen de stok zonder eigen stok, de a met de stok (een achtste). Maat 4: twee
// gewone kwarten naast elkaar (g, a) met elk een stok: geen akkoord.
test('opbouw: een secunde in een akkoord (koppen naast elkaar) start samen en duurt even lang', () => {
  const y0 = 200;
  const metStok = (k, richting, x) => ({ ...k, stok: { richting, x, eind: k.y + (richting === 'op' ? -70 : 70) } });
  const pagina = {
    blad: 1, breedte: 1200, hoogte: 600, schaal: { lijnafstand: ia },
    raster: { balken: [balk(y0)] },
    balkkoppen: [{ sleutel: { soort: 'G', lijn: 2 }, voortekening: { aantal: 0, tekens: [] }, maatsoort: { teller: 2, noemer: 4 }, einde: 150 }],
    maten: [{ strepen: [], maten: [vak(150, 350, y0), vak(350, 600, y0), vak(600, 850, y0), vak(850, 1100, y0)] }],
    noten: [[
      kop(200, y0, 6, 1920, 'heel'), kop(233, y0, 5, 1920, 'heel'),
      metStok(kop(400, y0, 6, 240), 'op', 411), kop(423, y0, 5, 480),
      kop(650, y0, 6, 480), metStok(kop(673, y0, 5, 240), 'neer', 662),
      metStok(kop(900, y0, 6, 480), 'op', 911), metStok(kop(935, y0, 5, 480), 'op', 946),
    ]],
    voortekens: [[]],
    rusten: [[rust(480, '8'), rust(530, 'kwart'), rust(720, '8'), rust(780, 'kwart')]],
  };
  const maten = bouwPartituur([pagina]).partijen[0].maten;
  const kort = (maat) => maat.elementen.map((e) => (e.soort === 'noot' ? `${e.toonhoogte.stap}${e.start}:${e.duur}${e.akkoord ? '+' : ''}` : `r${e.start}:${e.duur}`));
  assert.deepEqual(kort(maten[0]), ['G0:1920', 'A0:1920+']);
  assert.deepEqual(kort(maten[1]), ['G0:240', 'A0:240+', 'r240:240', 'r480:480']);
  assert.deepEqual(kort(maten[2]), ['G0:240', 'A0:240+', 'r240:240', 'r480:480']);
  assert.deepEqual(kort(maten[3]), ['G0:480', 'A480:480']);
});

// Secundes binnen grotere akkoorden en onder een waardestreep: de kop met de stok bepaalt het akkoord.
test('opbouw: een secunde in een akkoord van drie, tegen een andere kop dan de eerste, en onder een waardestreep', () => {
  const y0 = 200;
  const stok = (k, richting, x, balkLinks, balkRechts) => ({ ...k, stok: { richting, x, eind: k.y + (richting === 'op' ? -70 : 70) },
    ...(balkLinks !== undefined ? { balk: { links: balkLinks, rechts: balkRechts } } : {}) });
  const pagina = {
    blad: 1, breedte: 1200, hoogte: 600, schaal: { lijnafstand: ia },
    raster: { balken: [balk(y0)] },
    balkkoppen: [{ sleutel: { soort: 'G', lijn: 2 }, voortekening: { aantal: 0, tekens: [] }, maatsoort: { teller: 2, noemer: 4 }, einde: 150 }],
    maten: [{ strepen: [], maten: [vak(150, 350, y0), vak(350, 600, y0), vak(600, 1100, y0)] }],
    noten: [[
      // Maat 1: e-g-a, stok omlaag: de g links zonder stok, de a en de e rechts met de stok.
      kop(200, y0, 6, 480), stok(kop(223, y0, 5, 480), 'neer', 212), stok(kop(223, y0, 8, 480), 'neer', 212),
      // Maat 2: a en e links met een stok omhoog, de f rechts tegen de stok (een secunde met de e, niet met de a).
      stok(kop(400, y0, 5, 480), 'op', 411), stok(kop(400, y0, 8, 480), 'op', 411), kop(423, y0, 7, 480),
      // Maat 3: vier achtsten onder één waardestreep (stok omlaag); de tweede is een secunde g-a met de g links zonder stok.
      stok(kop(650, y0, 4, 240), 'neer', 639, 639, 900), kop(727, y0, 6, 480), stok(kop(750, y0, 5, 240), 'neer', 739, 639, 900),
      stok(kop(820, y0, 4, 240), 'neer', 809, 639, 900), stok(kop(900, y0, 3, 240), 'neer', 889, 639, 900),
    ]],
    voortekens: [[]],
    rusten: [[]],
  };
  const maten = bouwPartituur([pagina]).partijen[0].maten;
  const kort = (maat) => maat.elementen.map((e) => `${e.toonhoogte.stap}${e.start}:${e.duur}${e.akkoord ? '+' : ''}${e.balk ? `/${e.balk}` : ''}`);
  assert.deepEqual(kort(maten[0]), ['G0:480', 'A0:480+', 'E0:480+']);
  assert.deepEqual(kort(maten[1]), ['A0:480', 'E0:480+', 'F0:480+']);
  assert.deepEqual(kort(maten[2]), ['B0:240/begin', 'G240:240/midden', 'A240:240+', 'B480:240/midden', 'C720:240/eind']);
});

test('opbouw: een rust met een punt duurt anderhalf keer zo lang', () => {
  const y0 = 200;
  const pagina = {
    blad: 1, breedte: 1200, hoogte: 600, schaal: { lijnafstand: ia },
    raster: { balken: [balk(y0)] },
    balkkoppen: [{ sleutel: { soort: 'G', lijn: 2 }, voortekening: { aantal: 0, tekens: [] }, maatsoort: { teller: 9, noemer: 8 }, einde: 150 }],
    maten: [{ strepen: [], maten: [vak(150, 1100, y0)] }],
    noten: [[kop(200, y0, 4, 720)]],
    voortekens: [[]],
    rusten: [[{ ...rust(400, 'kwart'), punt: true }, { ...rust(600, '8'), punt: true }, rust(800, '8')]],
  };
  const maat = bouwPartituur([pagina]).partijen[0].maten[0];
  assert.deepEqual(maat.elementen.map((e) => `${e.soort}${e.start}:${e.duur}`), ['noot0:720', 'rust720:720', 'rust1440:360', 'rust1800:240']);
});

// Een maatsoort waarvan de cijfers niet zeker gelezen zijn (kop.mjs geeft opties): de optie waar de meeste maten in passen.
test('opbouw: een onzekere maatsoort wordt de optie waar de maten in passen, ook op de balken erna', () => {
  const kwarten = (x0, n, y0) => Array.from({ length: n }, (_, i) => kop(x0 + i * 60, y0, 4));
  const pagina = {
    blad: 1, schaal: { lijnafstand: ia }, raster: { balken: [balk(200), balk(450)] },
    balkkoppen: [
      // 5/4 lijkt het meest (een vage 3 lijkt op een 5), maar de maten duren drie kwart.
      { sleutel: { soort: 'G', lijn: 2 }, voortekening: { aantal: 0, tekens: [] }, maatsoort: null, maatsoortOpties: [{ teller: 5, noemer: 4 }, { teller: 3, noemer: 4 }], einde: 180 },
      { sleutel: { soort: 'G', lijn: 2 }, voortekening: { aantal: 0, tekens: [] }, maatsoort: null, einde: 180 },
    ],
    maten: [
      { strepen: [], maten: [vak(180, 500, 200), vak(500, 800, 200), vak(800, 1100, 200)] },
      { strepen: [], maten: [vak(180, 600, 450), vak(600, 1100, 450)] },
    ],
    noten: [[...kwarten(220, 3, 200), ...kwarten(520, 3, 200), ...kwarten(820, 2, 200)], kwarten(220, 3, 450)],
    voortekens: [[], []],
    // De laatste maat heeft alleen een hele rust: die vult de maat, met de lengte van de gekozen maatsoort.
    rusten: [[], [rust(850, 'heel')]],
  };
  const { maten } = bouwPartituur([pagina]).partijen[0];
  assert.deepEqual(maten.map((m) => `${m.maatsoort.teller}/${m.maatsoort.noemer}`), ['3/4', '3/4', '3/4', '3/4', '3/4']);
  assert.deepEqual(maten[4].elementen.map((e) => [e.duur, e.heleMaat]), [[1440, true]]);
});

test('opbouw: past geen optie, dan blijft de maatsoort die al gold', () => {
  const kwarten = (x0, n, y0) => Array.from({ length: n }, (_, i) => kop(x0 + i * 60, y0, 4));
  const kopMet = (maatsoort, opties) => ({ sleutel: { soort: 'G', lijn: 2 }, voortekening: { aantal: 0, tekens: [] }, maatsoort, ...(opties ? { maatsoortOpties: opties } : {}), einde: 180 });
  const pagina = {
    blad: 1, schaal: { lijnafstand: ia }, raster: { balken: [balk(200), balk(450)] },
    balkkoppen: [kopMet({ teller: 2, noemer: 4 }), kopMet(null, [{ teller: 5, noemer: 4 }, { teller: 6, noemer: 4 }])],
    maten: [{ strepen: [], maten: [vak(180, 1100, 200)] }, { strepen: [], maten: [vak(180, 600, 450), vak(600, 1100, 450)] }],
    noten: [kwarten(220, 2, 200), [...kwarten(220, 2, 450), ...kwarten(620, 2, 450)]],
    voortekens: [[], []],
    rusten: [[], []],
  };
  const { maten } = bouwPartituur([pagina]).partijen[0];
  assert.deepEqual(maten.map((m) => `${m.maatsoort.teller}/${m.maatsoort.noemer}`), ['2/4', '2/4', '2/4']);
});

// Een zeker gelezen maatsoort blijft, tenzij er geen enkele maat in past en in een optie minstens drie en twee derde van de
// maten (een 2 die als 9 gelezen is).
test('opbouw: een zekere maatsoort waar geen maat in past, wijkt voor de optie waar de meeste maten in passen', () => {
  const halven = (x0, n, y0) => Array.from({ length: n }, (_, i) => kop(x0 + i * 100, y0, 4, 960, 'half'));
  const kwarten = (x0, n, y0) => Array.from({ length: n }, (_, i) => kop(x0 + i * 60, y0, 4));
  const kopMet = (teller, noemer, opties) => ({ sleutel: { soort: 'G', lijn: 2 }, voortekening: { aantal: 0, tekens: [] }, maatsoort: { teller, noemer }, maatsoortOpties: opties, einde: 180 });
  const pagina = {
    blad: 1, schaal: { lijnafstand: ia }, raster: { balken: [balk(200), balk(450), balk(700)] },
    balkkoppen: [
      // 9/2 gelezen, de drie maten duren twee halve: 2/2.
      kopMet(9, 2, [{ teller: 9, noemer: 2 }, { teller: 2, noemer: 2 }, { teller: 6, noemer: 2 }]),
      // 3/4 gelezen en de maten passen erin: dat blijft.
      kopMet(3, 4, [{ teller: 3, noemer: 4 }, { teller: 5, noemer: 4 }]),
      // 3/4 gelezen, geen maat past, maar maar twee van de drie maten passen in 5/4: dat is te weinig, dus 3/4 blijft.
      kopMet(3, 4, [{ teller: 3, noemer: 4 }, { teller: 5, noemer: 4 }]),
    ],
    maten: [
      { strepen: [], maten: [vak(180, 480, 200), vak(480, 780, 200), vak(780, 1100, 200)] },
      { strepen: [], maten: [vak(180, 600, 450), vak(600, 1100, 450)] },
      { strepen: [], maten: [vak(180, 500, 700), vak(500, 800, 700), vak(800, 1100, 700)] },
    ],
    noten: [
      [...halven(200, 2, 200), ...halven(500, 2, 200), ...halven(800, 2, 200)],
      [...kwarten(220, 3, 450), ...kwarten(620, 3, 450)],
      [...kwarten(200, 5, 700), ...kwarten(520, 5, 700), ...kwarten(820, 2, 700)],
    ],
    voortekens: [[], [], []],
    rusten: [[], [], []],
  };
  const { maten } = bouwPartituur([pagina]).partijen[0];
  assert.deepEqual(maten.map((m) => `${m.maatsoort.teller}/${m.maatsoort.noemer}`), ['2/2', '2/2', '2/2', '3/4', '3/4', '3/4', '3/4', '3/4']);
});
