import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('de eerste tab kan naar de partituur springen', async () => {
  const index = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  const css = await readFile(new URL('../public/editor.css', import.meta.url), 'utf8');

  assert.match(index, /class="skip"[^>]*href="#weergave"/);
  assert.match(index, /id="weergave"/);
  assert.match(css, /\.skip/);
});
