import test from 'node:test';
import assert from 'node:assert/strict';
import { meermaatsRustenUitCijfers } from '../src/model/meermaatsrust.mjs';

// Een partij in 4/4. Elke maat: 'R' (alleen een hele rust), 'N' (een noot) of 'L' (leeg). Maat i staat op het blad van x = 200 + 200*i
// tot 400 + 200*i, met de balk van y = 136 tot 221 (zoals Audiveris op 300 dpi).
function partij(id, soorten) {
  return {
    id,
    naam: id,
    maten: soorten.map((soort, index) => ({
      nummer: String(index + 1),
      index,
      maatsoort: { teller: 4, noemer: 4 },
      vak: { blad: 1, links: 200 + 200 * index, rechts: 400 + 200 * index, boven: 136, onder: 221 },
      elementen: soort === 'R'
        ? [{ soort: 'rust', start: 0, duur: 1920, stem: 1, notenbalk: 1, heleMaat: true, zekerheid: 1 }]
        : soort === 'N'
          ? [{ soort: 'noot', start: 0, duur: 1920, stem: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 }, zekerheid: 1 }]
          : [],
    })),
  };
}

const ocr = (woorden) => [{ blad: 1, regels: woorden.map((w) => ({ tekst: w.tekst, woorden: [w] })) }];
// Een cijfer midden boven maat i (index), net boven de balk.
const cijferBoven = (index, tekst, y = 82) => ({ tekst, x: 290 + 200 * index, y, breedte: 32, hoogte: 44 });

test('een cijfer boven een rustmaat maakt er een meermaatsrust van', () => {
  const p = { partijen: [partij('P1', ['N', 'N', 'R', 'N'])] };
  const uit = meermaatsRustenUitCijfers(p, ocr([cijferBoven(2, '3')]));
  const maten = uit.partijen[0].maten;
  assert.equal(maten.length, 6);
  assert.equal(maten[2].maatrust, 3);
  assert.equal(maten[3].verborgen, true);
  assert.equal(maten[4].verborgen, true);
  assert.equal(maten[3].maatrust, undefined);
  assert.deepEqual(maten.map((m) => m.nummer), ['1', '2', '3', '4', '5', '6']);
  assert.deepEqual(maten.map((m) => m.index), [0, 1, 2, 3, 4, 5]);
  assert.equal(maten[5].elementen[0].soort, 'noot');
});

test('de rust van de meermaatsrust wordt rood om na te kijken, de verborgen maten niet', () => {
  const p = { partijen: [partij('P1', ['R', 'N'])] };
  const maten = meermaatsRustenUitCijfers(p, ocr([cijferBoven(0, '4')])).partijen[0].maten;
  assert.equal(maten[0].elementen[0].zekerheid, 0.75);
  assert.equal(maten[1].elementen[0].zekerheid, 1);
  assert.equal(maten[1].vak, undefined);
});

test('een lege maat krijgt een hele rust', () => {
  const p = { partijen: [partij('P1', ['L', 'N'])] };
  const maten = meermaatsRustenUitCijfers(p, ocr([cijferBoven(0, '2')])).partijen[0].maten;
  assert.equal(maten[0].maatrust, 2);
  assert.equal(maten[0].elementen.filter((e) => e.soort === 'rust').length, 1);
  assert.equal(maten[0].elementen[0].duur, 1920);
});

test('een cijfer boven een maat met noten telt niet', () => {
  const p = { partijen: [partij('P1', ['N', 'N'])] };
  const uit = meermaatsRustenUitCijfers(p, ocr([cijferBoven(1, '3')]));
  assert.equal(uit.partijen[0].maten.length, 2);
});

test('een cijfer ver boven de balk of naast de maat telt niet', () => {
  const p = { partijen: [partij('P1', ['R', 'R'])] };
  const veraf = meermaatsRustenUitCijfers(p, ocr([cijferBoven(0, '3', -200)]));
  assert.equal(veraf.partijen[0].maten.length, 2);
  const naast = meermaatsRustenUitCijfers(p, ocr([{ tekst: '3', x: 1500, y: 82, breedte: 32, hoogte: 44 }]));
  assert.equal(naast.partijen[0].maten.length, 2);
});

test('woorden, 1 en getallen boven 99 tellen niet', () => {
  const p = { partijen: [partij('P1', ['R', 'R', 'R'])] };
  const uit = meermaatsRustenUitCijfers(p, ocr([cijferBoven(0, 'rit.'), cijferBoven(1, '1'), cijferBoven(2, '120')]));
  assert.equal(uit.partijen[0].maten.length, 3);
});

test('bij meerdere partijen alleen als alle partijen rust hebben, en dan in alle partijen', () => {
  const samen = { partijen: [partij('P1', ['R', 'N']), partij('P2', ['R', 'N'])] };
  const uit = meermaatsRustenUitCijfers(samen, ocr([cijferBoven(0, '3')]));
  assert.deepEqual(uit.partijen.map((p) => p.maten.length), [4, 4]);
  const anders = { partijen: [partij('P1', ['R', 'N']), partij('P2', ['N', 'N'])] };
  const niet = meermaatsRustenUitCijfers(anders, ocr([cijferBoven(0, '3')]));
  assert.deepEqual(niet.partijen.map((p) => p.maten.length), [2, 2]);
});

test('een maat zonder vak of een bestaande meermaatsrust blijft zoals hij is', () => {
  const p = { partijen: [partij('P1', ['R', 'R'])] };
  delete p.partijen[0].maten[0].vak;
  p.partijen[0].maten[1].maatrust = 2;
  const uit = meermaatsRustenUitCijfers(p, ocr([cijferBoven(0, '3'), cijferBoven(1, '5')]));
  assert.equal(uit.partijen[0].maten.length, 2);
});
