import test from 'node:test';
import assert from 'node:assert/strict';
import { vulRustGaten } from '../src/model/rustgaten.mjs';

// Een maat in 2/4 op een balk van 76 pixels hoog (y 556 tot 632); per element [soort, start, duur, x].
function stuk(elementen, { links = 955, rechts = 1187, regelbegin = false, teller = 2 } = {}) {
  return {
    partijen: [{
      id: 'P1',
      maten: [{
        nummer: '49', index: 0, regelbegin, maatsoort: { teller, noemer: 4 }, vak: { blad: 1, links, rechts, boven: 556, onder: 632 },
        elementen: elementen.map(([soort, start, duur, x]) => ({
          soort, start, duur, stem: 1, notenbalk: 1, zekerheid: 0.9, plek: { blad: 1, x, y: 600, breedte: 22, hoogte: 20 },
          ...(soort === 'noot' ? { toonhoogte: { stap: 'G', alter: 0, octaaf: 4 } } : { heleMaat: false }),
        })),
      }],
    }],
  };
}
const vorm = (uit) => uit.partituur.partijen[0].maten[0].elementen.map((e) => `${e.soort[0]}${e.start}/${e.duur}${e.zekerheid === 0.5 ? '*' : ''}`).join(' ');

test('achtste rust, noot, (gemiste rust), noot: de rust komt in het grote gat (Galop maat 49)', () => {
  const uit = vulRustGaten(stuk([['rust', 0, 240, 976], ['noot', 240, 240, 1024], ['noot', 480, 240, 1129]]));
  assert.equal(vorm(uit), 'r0/240 n240/240 r480/240* n720/240');
  assert.equal(uit.meldingen.length, 1);
  assert.equal(uit.meldingen[0].maat, 0);
  assert.match(uit.meldingen[0].tekst, /^Maat 49: de maat was te kort/);
});

test('een lege plek vooraan (ver na de maatstreep) krijgt de rust vooraan (Galop maat 15)', () => {
  const uit = vulRustGaten(stuk([['rust', 0, 240, 1670], ['rust', 240, 480, 1715]], { links: 1530, rechts: 1783 }));
  assert.equal(vorm(uit), 'r0/240* r240/240 r480/480');
});

test('een volle maat, gelijke gaten of één akkoord blijven zoals ze zijn', () => {
  const vol = stuk([['rust', 0, 240, 976], ['noot', 240, 240, 1024], ['rust', 480, 240, 1076], ['noot', 720, 240, 1129]]);
  assert.equal(vulRustGaten(vol).meldingen.length, 0);
  const gelijk = stuk([['noot', 0, 240, 976], ['noot', 240, 240, 1030], ['noot', 480, 240, 1084]]);
  assert.equal(vulRustGaten(gelijk).meldingen.length, 0);
  const akkoord = stuk([['noot', 0, 960, 1150], ['noot', 0, 960, 1150]], { teller: 6 });
  assert.equal(vulRustGaten(akkoord).meldingen.length, 0);
});

test('aan het begin van een regel telt de ruimte vóór het eerste element niet (daar staat de sleutel)', () => {
  const uit = vulRustGaten(stuk([['rust', 0, 240, 1670], ['rust', 240, 480, 1715]], { links: 1530, rechts: 1783, regelbegin: true }));
  assert.equal(uit.meldingen.length, 0);
});

test('vooraan, vergeleken met de gewone ruimte na de maatstreep op het blad: de rust komt vooraan (Galop maat 43)', () => {
  // Vijf maten "rust, noot, rust, noot" die 20 pixels na de maatstreep beginnen, en één maat "noot, rust, noot" die pas na 79 begint.
  const maat = (index, elementen) => ({
    nummer: String(index + 1), index, maatsoort: { teller: 2, noemer: 4 },
    vak: { blad: 1, links: index * 246, rechts: (index + 1) * 246, boven: 556, onder: 632 },
    elementen: elementen.map(([soort, start, x]) => ({ soort, start, duur: 240, stem: 1, notenbalk: 1, zekerheid: 0.9, plek: { blad: 1, x: index * 246 + x, y: 600, breedte: 22, hoogte: 20 } })),
  });
  const vol = [['rust', 0, 20], ['noot', 240, 77], ['rust', 480, 136], ['noot', 720, 193]];
  const maten = [0, 1, 2, 3, 4].map((index) => maat(index, vol));
  maten.push(maat(5, [['noot', 0, 79], ['rust', 240, 136], ['noot', 480, 189]]));
  const uit = vulRustGaten({ partijen: [{ id: 'P1', maten }] });
  assert.equal(uit.meldingen.length, 1);
  assert.equal(uit.partituur.partijen[0].maten[5].elementen.map((e) => `${e.soort[0]}${e.start}${e.zekerheid === 0.5 ? '*' : ''}`).join(' '), 'r0* n240 r480 n720');
});
