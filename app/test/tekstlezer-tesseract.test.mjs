import assert from 'node:assert/strict';
import test from 'node:test';

import { leesTesseractTsv } from '../src/server/tekstlezer.mjs';

// Een stukje echte tsv-uitvoer van Tesseract (tesseract blad.png stdout --psm 11 tsv): pagina, blok, alinea, regel, woorden.
const TSV = [
  'level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext',
  '1\t1\t0\t0\t0\t0\t0\t0\t2481\t3508\t-1\t',
  '2\t1\t1\t0\t0\t0\t240\t210\t180\t44\t-1\t',
  '3\t1\t1\t1\t0\t0\t240\t210\t180\t44\t-1\t',
  '4\t1\t1\t1\t1\t0\t240\t210\t180\t44\t-1\t',
  '5\t1\t1\t1\t1\t1\t240\t210\t120\t44\t91.5\tAllegro',
  '5\t1\t1\t1\t1\t2\t380\t214\t40\t40\t87.25\tcon',
  '5\t1\t1\t1\t1\t3\t430\t214\t20\t40\t-1\t ',
  '2\t1\t2\t0\t0\t0\t1015\t82\t32\t44\t-1\t',
  '5\t1\t2\t1\t1\t1\t1015\t82\t32\t44\t95\t3',
].join('\n');

test('de tsv van Tesseract wordt regels met woordvakken en zekerheid', () => {
  assert.deepEqual(leesTesseractTsv(TSV), {
    breedte: 2481,
    hoogte: 3508,
    regels: [
      {
        tekst: 'Allegro con',
        woorden: [
          { tekst: 'Allegro', x: 240, y: 210, breedte: 120, hoogte: 44, zekerheid: 0.915 },
          { tekst: 'con', x: 380, y: 214, breedte: 40, hoogte: 40, zekerheid: 0.873 },
        ],
      },
      { tekst: '3', woorden: [{ tekst: '3', x: 1015, y: 82, breedte: 32, hoogte: 44, zekerheid: 0.95 }] },
    ],
  });
});

test('lege of onbekende uitvoer geeft geen regels', () => {
  assert.deepEqual(leesTesseractTsv(''), { breedte: 0, hoogte: 0, regels: [] });
  assert.deepEqual(leesTesseractTsv('iets anders\nzonder kolommen'), { breedte: 0, hoogte: 0, regels: [] });
});
