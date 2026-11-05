import assert from 'node:assert/strict';
import test from 'node:test';

import { kopUitOcr } from '../src/model/tekstlezerkop.mjs';

const ocr = {
  breedte: 1654,
  hoogte: 2339,
  regels: [
    {
      tekst: 'arr. Alan frernie',
      woorden: [
        { tekst: 'arr.', x: 1200, y: 100, breedte: 50, hoogte: 20 },
        { tekst: 'Alan', x: 1260, y: 100, breedte: 50, hoogte: 20 },
        { tekst: 'frernie', x: 1320, y: 100, breedte: 80, hoogte: 20 },
      ],
    },
    {
      tekst: 'Vivace',
      woorden: [{ tekst: 'Vivace', x: 100, y: 140, breedte: 80, hoogte: 20 }],
    },
  ],
};

test('kopUitOcr leest arrangeur en tempowoord bovenaan het eerste blad', () => {
  assert.deepEqual(kopUitOcr(ocr, { arrangeurBekend: false, tempoBekend: false }), {
    arrangeur: 'Alan Frernie',
    tempoWoord: 'Vivace',
  });
});

test('kopUitOcr vervangt geen bekende arrangeur', () => {
  assert.equal(kopUitOcr(ocr, { arrangeurBekend: true, tempoBekend: false }).arrangeur, null);
});
