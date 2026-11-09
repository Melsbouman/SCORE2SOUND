import test from 'node:test';
import assert from 'node:assert/strict';
import { leesFoutmelding } from '../src/server/audiveris.mjs';

test('zonder notenbalken zegt de melding dat een liggend blad of twee pagina\'s naast elkaar nog niet gaan', () => {
  const tekst = leesFoutmelding('StepException: No system found');
  assert.match(tekst, /geen notenbalken/);
  assert.match(tekst, /Staat het blad rechtop\?/);
  assert.match(tekst, /twee pagina's naast elkaar/);
});
