import test from 'node:test';
import assert from 'node:assert/strict';

import { telPdfPaginas } from '../src/server/pdfpaginas.mjs';

test('telt pagina-objecten en niet het Pages-object', () => {
  const pdf = Buffer.from('/Type /Page /Type /Pages /Type /Page /Type /Page', 'latin1');

  assert.equal(telPdfPaginas(pdf), 3);
});

test('telt ook /Type/Page zonder spatie', () => {
  const pdf = Buffer.from('/Type/Page', 'latin1');

  assert.equal(telPdfPaginas(pdf), 1);
});

test('telt 61 pagina-objecten', () => {
  const pdf = Buffer.from(Array(61).fill('/Type /Page').join('\n'), 'latin1');

  assert.equal(telPdfPaginas(pdf), 61);
});

test('geeft 0 voor tekst zonder pagina-objecten', () => {
  const pdf = Buffer.from('geen pagina-objecten', 'latin1');

  assert.equal(telPdfPaginas(pdf), 0);
});

test('telt /Type /Pagesomething niet mee', () => {
  const pdf = Buffer.from('/Type /Pagesomething', 'latin1');

  assert.equal(telPdfPaginas(pdf), 0);
});
