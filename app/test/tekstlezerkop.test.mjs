import assert from 'node:assert/strict';
import test from 'node:test';

import { kopUitOcr } from '../src/model/tekstlezerkop.mjs';

test('kopUitOcr leest een arrangeur en tempowoord uit de kop', () => {
  const ocr = {
    hoogte: 1000,
    regels: [
      {
        tekst: 'arr. jan van dijk',
        woorden: [{ tekst: 'arr.', y: 100 }],
      },
      {
        tekst: 'Andante',
        woorden: [{ tekst: 'Andante', y: 180 }],
      },
    ],
  };

  assert.deepEqual(kopUitOcr(ocr, { arrangeurBekend: false, tempoBekend: false }), {
    arrangeur: 'Jan Van Dijk',
    tempoWoord: 'Andante',
  });
});

test('kopUitOcr geeft lege waarden terug als OCR ontbreekt', () => {
  assert.deepEqual(kopUitOcr(undefined, { arrangeurBekend: false, tempoBekend: false }), {
    arrangeur: null,
    tempoWoord: null,
  });
});

test('kopUitOcr slaat gegevens over die al bekend zijn', () => {
  const ocr = {
    hoogte: 1000,
    regels: [{
      tekst: 'arr. Marie de Boer',
      woorden: [{ tekst: 'Presto', y: 100 }],
    }],
  };

  assert.deepEqual(kopUitOcr(ocr, { arrangeurBekend: true, tempoBekend: true }), {
    arrangeur: null,
    tempoWoord: null,
  });
});

test('kopUitOcr accepteert grensposities en een tempowoord met één afwijkende letter', () => {
  const ocr = {
    hoogte: 1000,
    regels: [
      {
        tekst: 'arr Bob Smit',
        woorden: [{ tekst: 'arr', y: 150 }],
      },
      {
        tekst: 'Allegro',
        woorden: [{ tekst: 'Allegto', y: 200 }],
      },
    ],
  };

  assert.deepEqual(kopUitOcr(ocr, { arrangeurBekend: false, tempoBekend: false }), {
    arrangeur: 'Bob Smit',
    tempoWoord: 'Allegro',
  });
});
