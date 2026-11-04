import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const bestanden = [
  '../public/js/views/editor.js',
  '../public/js/views/lint.js',
  '../public/js/views/aanduidingen.js',
];

test('elke editorknop heeft een toegankelijke naam', async () => {
  for (const bestand of bestanden) {
    const url = new URL(bestand, import.meta.url);
    const regels = (await readFile(url, 'utf8')).split('\n');

    for (const [index, regel] of regels.entries()) {
      if (!regel.includes("createElement('button')")) continue;

      const vervolg = regels.slice(index, index + 13).join('\n');
      assert.match(
        vervolg,
        /(?:\.textContent\s*=|aria-label)/,
        `${bestand}:${index + 1}: knop zonder textContent of aria-label binnen 6 regels`,
      );
    }
  }
});
