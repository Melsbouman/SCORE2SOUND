import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const paginaMap = new URL('../public/', import.meta.url);
const paginas = ['welkom.html', 'index.html', 'voorwaarden.html'];

for (const pagina of paginas) {
  test(`${pagina} bevat de vereiste basisgegevens`, async () => {
    const html = await readFile(new URL(pagina, paginaMap), 'utf8');

    assert.match(html, /<html\b[^>]*\blang=["']nl["'][^>]*>/i);
    assert.match(html, /<title\b[^>]*>\s*[^<\s][\s\S]*?<\/title>/i);
    assert.match(html, /<meta\b[^>]*\bname=["']viewport["'][^>]*>/i);

    if (pagina === 'welkom.html') {
      assert.match(html, /<meta\b[^>]*\bname=["']description["'][^>]*>/i);
    }
  });
}
