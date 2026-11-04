import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const printCss = await readFile(new URL('../public/print.css', import.meta.url), 'utf8');

test('print-CSS toont SCORE2SOUND bij inloggen', () => {
  assert.match(
    printCss,
    /body\.inloggen-niet-ingelogd::before\s*{[^}]*content:\s*["']SCORE2SOUND["'];?[^}]*}/s,
  );
});

test('print-CSS vermeldt waarmee de afdruk is gemaakt', () => {
  assert.match(
    printCss,
    /body:not\(\.inloggen-niet-ingelogd\)::after\s*{[^}]*content:\s*["']Gemaakt met SCORE2SOUND["'];?[^}]*}/s,
  );
});
