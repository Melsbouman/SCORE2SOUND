import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const weergave = await readFile(
  new URL('../public/js/weergave.js', import.meta.url),
  'utf8',
);
const css = await readFile(new URL('../public/app.css', import.meta.url), 'utf8');

test('de editor toont paginanummers en toegankelijke paginalabels', () => {
  assert.match(weergave, /bladmuziek__paginanr/);
  assert.match(css, /bladmuziek__paginanr/);
  assert.match(weergave, /pagina /);
  assert.match(weergave, / van /);

  const printBlok = css.slice(css.indexOf('@media print'));
  assert.match(
    printBlok,
    /\.bladmuziek__paginanr\s*\{[^}]*display:\s*none;/,
  );
});
