import assert from 'node:assert/strict';
import test from 'node:test';

import { kopUitOcr } from '../src/model/tekstlezerkop.mjs';

test('kopUitOcr geeft geen arrangeur terug als deze bekend is', () => {
  const ocr = {
    hoogte: 1000,
    regels: [
      {
        tekst: 'arr. Jan van Dijk',
        woorden: [{ tekst: 'arr.', y: 100 }],
      },
    ],
  };

  assert.deepEqual(kopUitOcr(ocr, { arrangeurBekend: true, tempoBekend: false }), {
    arrangeur: null,
    tempoWoord: null,
  });
});

test('kopUitOcr geeft geen tempo terug als deze bekend is', () => {
  const ocr = {
    hoogte: 1000,
    regels: [
      {
        tekst: 'Allegro',
        woorden: [{ tekst: 'Allegro', y: 200 }],
      },
    ],
  };

  assert.deepEqual(kopUitOcr(ocr, { arrangeurBekend: false, tempoBekend: true }), {
    arrangeur: null,
    tempoWoord: null,
  });
});

test('kopUitOcr geeft geen arrangeur terug als deze bekend is, ondanks tempo aanwezig', () => {
  const ocr = {
    hoogte: 1000,
    regels: [
      {
        tekst: 'arr. Jan van Dijk',
        woorden: [{ tekst: 'arr.', y: 100 }],
      },
      {
        tekst: 'Andante',
        woorden: [{ tekst: 'Andante', y: 180 }],
      },
    ],
  };

  assert.deepEqual(kopUitOcr(ocr, { arrangeurBekend: true, tempoBekend: false }), {
    arrangeur: null,
    tempoWoord: 'Andante',
  });
});

test('kopUitOcr geeft geen tempo terug als dit bekend is, ondanks arrangeur aanwezig', () => {
  const ocr = {
    hoogte: 1000,
    regels: [
      {
        tekst: 'arr. Jan van Dijk',
        woorden: [{ tekst: 'arr.', y: 100 }],
      },
      {
        tekst: 'Andante',
        woorden: [{ tekst: 'Andante', y: 180 }],
      },
    ],
  };

  assert.deepEqual(kopUitOcr(ocr, { arrangeurBekend: false, tempoBekend: true }), {
    arrangeur: 'Jan Van Dijk',
    tempoWoord: null,
  });
});