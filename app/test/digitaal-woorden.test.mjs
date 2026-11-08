import test from 'node:test';
import assert from 'node:assert/strict';
import { woordenUitPdf } from '../src/model/digitaal.mjs';
import { meermaatsRustenUitCijfers } from '../src/model/meermaatsrust.mjs';

// Pagina 100 x 100 punten, blad 1000 x 1000 pixels. 25 nootkoppen (Maestro 157) maken Maestro het muzieklettertype.
const koppen = Array.from({ length: 25 }, (_, i) => ({ lettertype: 'Maestro', code: 157, x: 2 + i, y: 10, grootte: 18 }));
const teken = (tekst, x, y, grootte = 10, lettertype = 'Times') => [...tekst].map((c, i) => ({ lettertype, code: c.charCodeAt(0), x: x + i * grootte / 2, y, grootte }));
const pagina = (tekens) => [{ pagina: 1, breedte: 100, hoogte: 100, tekens: [...koppen, ...tekens] }];
const bladen = [{ nummer: 1, breedte: 1000, hoogte: 1000 }];

test('tekst uit de pdf wordt regels met woorden in pixels van het blad', () => {
  const [blad] = woordenUitPdf(pagina([...teken('from', 10, 80), ...teken('bar', 35, 80), ...teken('41', 55, 80), ...teken('3', 70, 60)]), bladen);
  assert.equal(blad.blad, 1);
  assert.deepEqual(blad.regels.map((r) => r.tekst), ['from bar 41', '3']);
  assert.deepEqual(blad.regels[1].woorden[0], { tekst: '3', x: 700, y: 330, breedte: 50, hoogte: 70 });
});

test('het muzieklettertype doet niet mee', () => {
  const [blad] = woordenUitPdf(pagina([]), bladen);
  assert.deepEqual(blad.regels, []);
});

test('een klein cijfer boven een rustbalk in een digitale pdf wordt een meermaatsrust', () => {
  // Rustmaat van x 600 tot 900 pixels, balk 410-480; het cijfer 3 (Times 10 pt) staat midden erboven.
  const partituur = {
    partijen: [{ id: 'P1', naam: 'Cornet', maten: [
      { nummer: '1', index: 0, maatsoort: { teller: 4, noemer: 4 }, vak: { blad: 1, links: 300, rechts: 600, boven: 410, onder: 480 },
        elementen: [{ soort: 'noot', start: 0, duur: 1920, stem: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 } }] },
      { nummer: '2', index: 1, maatsoort: { teller: 4, noemer: 4 }, vak: { blad: 1, links: 600, rechts: 900, boven: 410, onder: 480 },
        elementen: [{ soort: 'rust', start: 0, duur: 1920, stem: 1, notenbalk: 1, heleMaat: true }] },
    ] }],
  };
  const woorden = woordenUitPdf(pagina(teken('3', 73, 60)), bladen);
  const uit = meermaatsRustenUitCijfers(partituur, woorden);
  assert.equal(uit.partijen[0].maten[1].maatrust, 3);
  assert.equal(uit.partijen[0].maten.length, 4);
});

test('een gescande pdf met een tekstlaag (Helvetica) heeft geen nootkop en geeft geen tweede mening', async () => {
  const { nootkopTeken, tweedeMening } = await import('../src/model/digitaal.mjs');
  const tekstlaag = [{ pagina: 1, breedte: 100, hoogte: 100, tekens: [
    ...Array.from({ length: 40 }, (_, i) => ({ lettertype: 'Helvetica', code: 32, x: i, y: 50, grootte: 10 })),
    ...Array.from({ length: 30 }, (_, i) => ({ lettertype: 'Helvetica', code: 101, x: i, y: 40, grootte: 10 })),
    ...Array.from({ length: 25 }, (_, i) => ({ lettertype: 'GlyphLessFont', code: 157, x: i, y: 30, grootte: 10 })),
  ] }];
  assert.equal(nootkopTeken(tekstlaag), null);
  const partituur = { bron: { bladen: [{ nummer: 1, breedte: 1000, hoogte: 1000 }] }, partijen: [{ id: 'P1', maten: [{ nummer: '1', index: 0, vak: { blad: 1, links: 0, rechts: 1000, boven: 400, onder: 480 }, elementen: [] }] }] };
  assert.deepEqual(tweedeMening(partituur, tekstlaag), []);
});
