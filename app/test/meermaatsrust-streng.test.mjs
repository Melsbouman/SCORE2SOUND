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

test('een cijfer aan de rand van de maat (zoals een maatnummer) telt niet', () => {
  const p = { partijen: [partij('P1', ['R', 'N'])] };
  const links = meermaatsRustenUitCijfers(p, ocr([{ tekst: '9', x: 205, y: 82, breedte: 32, hoogte: 44 }]));
  assert.equal(links.partijen[0].maten.length, 2);
});

test('een klein cijfer telt niet', () => {
  const p = { partijen: [partij('P1', ['R', 'N'])] };
  const klein = meermaatsRustenUitCijfers(p, ocr([{ tekst: '9', x: 290, y: 106, breedte: 14, hoogte: 20 }]));
  assert.equal(klein.partijen[0].maten.length, 2);
});
