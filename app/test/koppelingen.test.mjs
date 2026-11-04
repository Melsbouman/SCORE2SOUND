import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('export gebruikt de gedeelde exportnaam', async () => {
  const bron = await readFile(new URL('../public/js/views/export.js', import.meta.url), 'utf8');

  assert.match(bron, /import\s*{\s*exportNaam\s*}\s*from\s*['"]\/src\/model\/exportnaam\.mjs['"]/);

  const bestandsnaam = bron.match(/function\s+bestandsnaam\s*\([^)]*\)\s*{[\s\S]*?\n}/)?.[0];
  assert.ok(bestandsnaam, 'De functie bestandsnaam bestaat');
  assert.doesNotMatch(bestandsnaam, /replace\(\/\[\^/);
});

test('de proef-API blijft bereikbaar zonder login', async () => {
  const bron = await readFile(new URL('../server.mjs', import.meta.url), 'utf8');

  const apiLijst = bron.match(/(?:const|let|var)\s+\w*API\w*\s*=\s*(?:new Set\s*\()?\[[\s\S]*?\n\];/i)?.[0];
  assert.ok(apiLijst, 'De lijst API bestaat');
  assert.match(apiLijst, /['"]\/api\/proef['"]/);

  const loginRegel = bron.split(/\r?\n/).find((regel) => regel.includes('if (') && regel.includes('/api/proef'));
  assert.ok(loginRegel, 'De regel die login afdwingt sluit /api/proef uit');
  assert.match(loginRegel, /(?:!==|!=)\s*['"]\/api\/proef['"]/);
});
